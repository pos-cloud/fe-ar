import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import * as admin from 'firebase-admin';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export type CuitStatus = 'pending_csr' | 'pending_crt' | 'ready';

export interface CuitDoc {
  accountId: string;
  name: string;
  status: CuitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyDoc {
  hash: string;
  prefix: string;
  active: boolean;
  createdAt: string;
}

export interface AccountDoc {
  email: string | null;
  name: string | null;
  createdAt: string;
  apiKey?: ApiKeyDoc | null;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) {
      this.ready = true;
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID') || 'fe-ar-poscloud';
    const json = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    const credPath = this.findServiceAccountPath();

    try {
      if (json) {
        const parsed = JSON.parse(json);
        admin.initializeApp({
          credential: admin.credential.cert(parsed),
          projectId: parsed.project_id || projectId,
        });
        this.ready = true;
      } else if (credPath) {
        admin.initializeApp({
          credential: admin.credential.cert(credPath),
          projectId,
        });
        this.ready = true;
        this.logger.log(`Firebase Admin listo (${projectId})`);
      } else {
        this.logger.warn(
          'Firebase Admin no inicializado: falta *firebase-adminsdk*.json en la raíz de /app (en el server: /home/fe-ar/firebase-adminsdk.json). /v1/* no va a andar; el POS sí.',
        );
      }
    } catch (error) {
      this.logger.error(`No se pudo inicializar Firebase Admin: ${error.message}`);
    }
  }

  private findServiceAccountPath(): string | undefined {
    const fromEnv = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (fromEnv && existsSync(fromEnv)) {
      return fromEnv;
    }
    try {
      const match = readdirSync(process.cwd()).find(
        file => file.includes('firebase-adminsdk') && file.endsWith('.json'),
      );
      return match ? join(process.cwd(), match) : undefined;
    } catch {
      return undefined;
    }
  }

  assertReady() {
    if (!this.ready) {
      throw new ServiceUnavailableException(
        'Firebase no configurado. Falta *firebase-adminsdk*.json en la raíz de /app.',
      );
    }
  }

  get auth() {
    this.assertReady();
    return admin.auth();
  }

  get db() {
    this.assertReady();
    return admin.firestore();
  }

  async verifyIdToken(token: string) {
    return this.auth.verifyIdToken(token);
  }

  async ensureAccount(uid: string, email?: string, name?: string) {
    const ref = this.db.doc(`accounts/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        email: email || null,
        name: name || null,
        apiKey: null,
        createdAt: new Date().toISOString(),
      });
    }
    return this.publicAccount(
      uid,
      snap.exists
        ? (snap.data() as AccountDoc)
        : {
            email: email || null,
            name: name || null,
            createdAt: new Date().toISOString(),
            apiKey: null,
          },
    );
  }

  async getAccount(uid: string) {
    const snap = await this.db.doc(`accounts/${uid}`).get();
    if (!snap.exists) {
      return null;
    }
    return this.publicAccount(uid, snap.data() as AccountDoc);
  }

  private publicAccount(uid: string, data: AccountDoc) {
    const apiKey = data.apiKey
      ? { prefix: data.apiKey.prefix, active: data.apiKey.active, createdAt: data.apiKey.createdAt }
      : null;
    return {
      uid,
      email: data.email || null,
      name: data.name || null,
      createdAt: data.createdAt,
      apiKey,
    };
  }

  async listCuits(accountId: string): Promise<Array<CuitDoc & { cuit: string }>> {
    const snap = await this.db.collection('cuits').where('accountId', '==', accountId).get();
    return snap.docs.map(doc => ({ cuit: doc.id, ...(doc.data() as CuitDoc) }));
  }

  async getCuit(cuit: string): Promise<(CuitDoc & { cuit: string }) | null> {
    const snap = await this.db.doc(`cuits/${cuit}`).get();
    if (!snap.exists) {
      return null;
    }
    return { cuit, ...(snap.data() as CuitDoc) };
  }

  async upsertCuit(cuit: string, accountId: string, name: string, status?: CuitStatus) {
    const existing = await this.getCuit(cuit);
    if (existing && existing.accountId !== accountId) {
      throw new Error('CUIT_TAKEN');
    }
    const now = new Date().toISOString();
    const payload: CuitDoc = {
      accountId,
      name: name || existing?.name || cuit,
      status: status || existing?.status || 'pending_csr',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await this.db.doc(`cuits/${cuit}`).set(payload, { merge: true });
    return { cuit, ...payload };
  }

  async setCuitStatus(cuit: string, status: CuitStatus) {
    await this.db
      .doc(`cuits/${cuit}`)
      .set({ status, updatedAt: new Date().toISOString() }, { merge: true });
  }

  hashApiKey(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  async createApiKey(uid: string) {
    const snap = await this.db.doc(`accounts/${uid}`).get();
    const rotated = !!(snap.exists && (snap.data() as AccountDoc).apiKey);

    const secret = randomBytes(24).toString('hex');
    const raw = `fp_live_${uid}_${secret}`;
    const apiKey: ApiKeyDoc = {
      hash: this.hashApiKey(raw),
      prefix: `fp_live_${uid}_${secret.slice(0, 4)}…`,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await this.db.doc(`accounts/${uid}`).set({ apiKey }, { merge: true });
    return { raw, prefix: apiKey.prefix, createdAt: apiKey.createdAt, rotated };
  }

  async listApiKeys(uid: string) {
    const account = await this.getAccount(uid);
    if (!account?.apiKey) {
      return [];
    }
    return [
      {
        keyId: 'current',
        prefix: account.apiKey.prefix,
        active: account.apiKey.active,
        createdAt: account.apiKey.createdAt,
      },
    ];
  }

  async verifyApiKey(raw: string): Promise<{ uid: string; keyId: string }> {
    const match = raw.match(/^fp_live_([^_]+)_(.+)$/);
    if (!match) {
      throw new Error('INVALID_KEY_FORMAT');
    }
    const uid = match[1];
    const snap = await this.db.doc(`accounts/${uid}`).get();
    const stored = snap.exists
      ? ((snap.data() as AccountDoc).apiKey as ApiKeyDoc | undefined)
      : undefined;
    if (!stored?.active || !stored.hash) {
      throw new Error('INVALID_KEY');
    }
    const incomingHash = this.hashApiKey(raw);
    if (stored.hash.length === incomingHash.length) {
      const a = Buffer.from(stored.hash, 'utf8');
      const b = Buffer.from(incomingHash, 'utf8');
      if (timingSafeEqual(a, b)) {
        return { uid, keyId: 'current' };
      }
    }
    throw new Error('INVALID_KEY');
  }

  periodId(date = new Date()) {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}`;
  }

  async incrementInvoice(
    uid: string,
    event: {
      cuit: string;
      tipoComprobante: number;
      puntoVenta: number;
      cae: string;
      number: number;
    },
  ) {
    const period = this.periodId();
    const usageRef = this.db.doc(`accounts/${uid}/usage/${period}`);
    await this.db.runTransaction(async tx => {
      const snap = await tx.get(usageRef);
      const invoiceCount = (snap.exists ? snap.get('invoiceCount') : 0) || 0;
      tx.set(
        usageRef,
        {
          invoiceCount: invoiceCount + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    });
    await this.db.collection(`accounts/${uid}/usage/${period}/events`).add({
      ...event,
      at: new Date().toISOString(),
    });
  }

  async getUsage(uid: string, period?: string) {
    const id = period || this.periodId();
    const [usageSnap, cuits] = await Promise.all([
      this.db.doc(`accounts/${uid}/usage/${id}`).get(),
      this.listCuits(uid),
    ]);
    return {
      period: id,
      cuitCount: cuits.length,
      invoiceCount: usageSnap.exists ? usageSnap.get('invoiceCount') || 0 : 0,
    };
  }

  async listUsageEvents(uid: string, period?: string) {
    const id = period || this.periodId();
    const snap = await this.db.collection(`accounts/${uid}/usage/${id}/events`).limit(200).get();
    const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return rows.sort((a: any, b: any) => `${b.at}`.localeCompare(`${a.at}`));
  }
}

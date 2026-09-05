import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { PadronService } from './padron/padron.service';
import { PadronCondicionIva, PadronImpuesto, PadronPersona } from './padron/padron.types';
import { WSAA_SERVICE_PADRON, WsaaService } from './wsaa/wsaa.service';

const CUIT_RE = /^\d{11}$/;
const IMPUESTO_IVA = 30;
const IMPUESTO_IVA_EXENTO = 32;
const IMPUESTO_IVA_RNI = 33;
const IMPUESTO_IVA_NO_ALCANZADO = 34;
const IMPUESTOS_MONOTRIBUTO = new Set([20, 21, 22, 23, 24, 308]);

@Injectable()
export class AfipPadronService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly wsaaService: WsaaService,
    private readonly padronService: PadronService,
  ) {}

  async lookup(accountId: string, cuitConsultado: string, consultante: string): Promise<PadronPersona> {
    const cuit = this.sanitizeCuit(cuitConsultado, 'CUIT a consultar');
    const representada = await this.resolveConsultante(accountId, consultante);

    try {
      const vigente = await this.wsaaService.getIfNotExpired(representada, WSAA_SERVICE_PADRON);
      if (!vigente) {
        await this.wsaaService.generarTA(representada, WSAA_SERVICE_PADRON);
      }
    } catch (error) {
      this.throwAfip(error, 'No se pudo autenticar ante ARCA para consultar el padrón');
    }

    const TA = await this.wsaaService.getTA(representada, WSAA_SERVICE_PADRON);
    const token = TA?.credentials?.[0]?.token?.[0];
    const sign = TA?.credentials?.[0]?.sign?.[0];
    if (!token || !sign) {
      throw new BadRequestException(
        'No se pudo obtener el ticket de acceso de ARCA para el padrón',
      );
    }

    let raw: unknown;
    try {
      raw = await this.padronService.getPersona(token, sign, representada, cuit);
    } catch (error) {
      this.throwAfip(error);
    }

    return this.mapPersona(cuit, raw);
  }

  private async resolveConsultante(accountId: string, consultante: string): Promise<string> {
    const sanitized = this.sanitizeCuit(consultante, 'CUIT consultante');
    const record = await this.firebase.getCuit(sanitized);
    if (!record || record.accountId !== accountId) {
      throw new ForbiddenException('El CUIT consultante no pertenece a esta cuenta');
    }
    if (record.status !== 'ready') {
      throw new BadRequestException(
        'El CUIT consultante no tiene certificado listo para autenticar ante ARCA',
      );
    }
    return sanitized;
  }

  private sanitizeCuit(value: string, label: string): string {
    const sanitized = `${value || ''}`.replace(/-/g, '');
    if (!CUIT_RE.test(sanitized)) {
      throw new BadRequestException(`${label} inválido`);
    }
    return sanitized;
  }

  private mapPersona(cuit: string, raw: unknown): PadronPersona {
    const persona = this.extractPersonaReturn(raw);
    const datosGenerales = this.first(persona?.datosGenerales);
    const errorConstancia = this.first(persona?.errorConstancia);
    const errores = this.collectErrors(persona);

    if (!datosGenerales) {
      this.throwFromConstancia(cuit, errores, errorConstancia);
    }

    const impuestos = this.collectImpuestos(persona);
    const response: PadronPersona = { cuit };
    const razonSocial = this.razonSocial(datosGenerales);
    if (razonSocial) response.razonSocial = razonSocial;
    if (datosGenerales.tipoPersona) response.tipoPersona = String(datosGenerales.tipoPersona);
    if (datosGenerales.estadoClave) response.estadoClave = String(datosGenerales.estadoClave);
    if (datosGenerales.tipoClave) response.tipoClave = String(datosGenerales.tipoClave);

    const condicionIva = this.mapCondicionIva(persona, impuestos);
    if (condicionIva) response.condicionIva = condicionIva;

    const domicilio = this.mapDomicilio(this.first(datosGenerales.domicilioFiscal));
    if (domicilio) response.domicilio = domicilio;
    if (impuestos.length) response.impuestos = impuestos;

    return response;
  }

  private extractPersonaReturn(raw: unknown): any {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    return (
      data.personaReturn ||
      (data.getPersona_v2Response as Record<string, unknown> | undefined)?.personaReturn ||
      data
    );
  }

  private razonSocial(datosGenerales: any): string | undefined {
    if (datosGenerales?.razonSocial) return String(datosGenerales.razonSocial);
    const apellido = datosGenerales?.apellido ? String(datosGenerales.apellido) : '';
    const nombre = datosGenerales?.nombre ? String(datosGenerales.nombre) : '';
    const composed = [apellido, nombre].filter(Boolean).join(', ');
    return composed || undefined;
  }

  private mapDomicilio(domicilio: any): PadronPersona['domicilio'] | undefined {
    if (!domicilio) return undefined;
    const mapped: PadronPersona['domicilio'] = {};
    if (domicilio.direccion) mapped.direccion = String(domicilio.direccion);
    if (domicilio.localidad) mapped.localidad = String(domicilio.localidad);
    if (domicilio.descripcionProvincia) mapped.provincia = String(domicilio.descripcionProvincia);
    if (domicilio.codPostal) mapped.codPostal = String(domicilio.codPostal);
    return Object.keys(mapped).length ? mapped : undefined;
  }

  private collectImpuestos(persona: any): PadronImpuesto[] {
    const regimen = this.first(persona?.datosRegimenGeneral);
    const monotributo = this.first(persona?.datosMonotributo);
    const raw = [...this.asArray(regimen?.impuesto), ...this.asArray(monotributo?.impuesto)];
    const seen = new Set<number>();
    const impuestos: PadronImpuesto[] = [];
    for (const item of raw) {
      const id = Number(item?.idImpuesto);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      const mapped: PadronImpuesto = { id };
      if (item.descripcionImpuesto) mapped.descripcion = String(item.descripcionImpuesto);
      if (item.estadoImpuesto) mapped.estado = String(item.estadoImpuesto);
      impuestos.push(mapped);
    }
    return impuestos;
  }

  private mapCondicionIva(
    persona: any,
    impuestos: PadronImpuesto[],
  ): PadronCondicionIva | undefined {
    const monotributo = this.first(persona?.datosMonotributo);
    const activo = (imp: PadronImpuesto) => !imp.estado || /activo/i.test(imp.estado);

    const monoImpuesto = impuestos.find(imp => IMPUESTOS_MONOTRIBUTO.has(imp.id) && activo(imp));
    if (monotributo?.categoriaMonotributo || monoImpuesto) {
      return { id: 6, descripcion: 'Responsable Monotributo' };
    }

    const iva = impuestos.find(imp => imp.id === IMPUESTO_IVA && activo(imp));
    if (iva) {
      return { id: 1, descripcion: iva.descripcion || 'IVA Responsable Inscripto' };
    }

    const exento = impuestos.find(imp => imp.id === IMPUESTO_IVA_EXENTO && activo(imp));
    if (exento) {
      return { id: 4, descripcion: exento.descripcion || 'IVA Sujeto Exento' };
    }

    const noAlcanzado = impuestos.find(imp => imp.id === IMPUESTO_IVA_NO_ALCANZADO && activo(imp));
    if (noAlcanzado) {
      return { id: 15, descripcion: noAlcanzado.descripcion || 'IVA No Alcanzado' };
    }

    const rni = impuestos.find(imp => imp.id === IMPUESTO_IVA_RNI && activo(imp));
    if (rni) {
      return { id: 7, descripcion: rni.descripcion || 'IVA Responsable No Inscripto' };
    }

    return undefined;
  }

  private collectErrors(persona: any): string[] {
    const buckets = [
      this.first(persona?.errorConstancia),
      this.first(persona?.errorMonotributo),
      this.first(persona?.errorRegimenGeneral),
    ];
    const messages: string[] = [];
    for (const bucket of buckets) {
      if (!bucket) continue;
      for (const error of this.asArray(bucket.error)) {
        if (error) messages.push(String(error));
      }
      if (bucket.mensaje) messages.push(String(bucket.mensaje));
    }
    return messages;
  }

  private throwFromConstancia(cuit: string, errores: string[], errorConstancia: any) {
    const joined = errores.join(' | ');
    if (this.isNotFound(joined) || this.isNotFound(errorConstancia)) {
      throw new NotFoundException(joined || `No se encontró la persona ${cuit} en ARCA`);
    }
    if (joined) {
      throw new BadRequestException(joined);
    }
    throw new NotFoundException(`No se encontró la persona ${cuit} en ARCA`);
  }

  private throwAfip(error: unknown, fallback = 'Error de ARCA al consultar el padrón'): never {
    if (error instanceof HttpException) {
      throw error;
    }
    const message = this.afipErrorMessage(error) || fallback;
    if (this.isNotFound(message)) {
      throw new NotFoundException(message);
    }
    throw new BadRequestException(message);
  }

  private isNotFound(value: unknown): boolean {
    const text = typeof value === 'string' ? value : JSON.stringify(value || '');
    return /no existe persona/i.test(text);
  }

  private afipErrorMessage(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    const e = error as Record<string, any>;
    const fault =
      e.root?.Envelope?.Body?.Fault?.faultstring ||
      e.root?.['soap:Envelope']?.['soap:Body']?.['soap:Fault']?.faultstring ||
      e.body?.Fault?.faultstring ||
      e.faultstring ||
      e.message;
    if (Array.isArray(fault)) return String(fault[0] || '');
    return fault ? String(fault) : '';
  }

  private first<T>(value: T | T[] | undefined | null): T | undefined {
    if (value == null) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private asArray<T>(value: T | T[] | undefined | null): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = (req.headers.authorization || '') as string;
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Falta Bearer token de Firebase');
    }
    try {
      const decoded = await this.firebase.verifyIdToken(token);
      await this.firebase.ensureAccount(decoded.uid, decoded.email, decoded.name);
      req.accountId = decoded.uid;
      req.firebaseUser = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Token de Firebase inválido');
    }
  }
}

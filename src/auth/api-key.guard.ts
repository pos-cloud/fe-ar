import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = (req.headers['x-api-key'] || '') as string;
    if (!raw) {
      throw new UnauthorizedException('Falta header X-API-Key');
    }
    try {
      const { uid, keyId } = await this.firebase.verifyApiKey(raw);
      req.accountId = uid;
      req.apiKeyId = keyId;
      return true;
    } catch {
      throw new UnauthorizedException('API key inválida');
    }
  }
}

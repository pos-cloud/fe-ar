import { Global, Module } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [FirebaseService, FirebaseAuthGuard, ApiKeyGuard],
  exports: [FirebaseService, FirebaseAuthGuard, ApiKeyGuard],
})
export class FirebaseModule {}

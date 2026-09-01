import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SoapHelperService } from './afip/soap-helper/soap-helper.service';
import { WsaaService } from './afip/wsaa/wsaa.service';
import { Wsfev1Service } from './afip/wsfev1/wsfev1.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CertModule } from './cert/cert.module';
import { FirebaseModule } from './firebase/firebase.module';
import { V1Module } from './v1/v1.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    FirebaseModule,
    CertModule,
    V1Module,
  ],
  controllers: [AppController],
  providers: [AppService, WsaaService, Wsfev1Service, SoapHelperService],
})
export class AppModule {}

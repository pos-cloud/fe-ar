import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WsaaService } from './afip/wsaa/wsaa.service';
import { Wsfev1Service } from './afip/wsfev1/wsfev1.service';
import { SoapHelperService } from './afip/soap-helper/soap-helper.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, WsaaService, Wsfev1Service, SoapHelperService],
})
export class AppModule {}

import { Injectable } from '@nestjs/common';
import { WsaaService } from './afip/wsaa/wsaa.service';
import { Wsfev1Service } from './afip/wsfev1/wsfev1.service';

@Injectable()
export class AppService {
  constructor(
    private readonly wsaaService: WsaaService,
    private readonly wsfev1Service: Wsfev1Service,
  ) {}
  async login(): void {
    let response = await this.wsaaService.login();
    return response;
  }
}

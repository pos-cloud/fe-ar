import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';

@Injectable()
export class Wsfev1Service {
  private readonly logger = new Logger('Wsfev1Service');
  address: string;
  database: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.address = path.join(__dirname, 'wsfev1.wsdl');
  }

  private checkErrors(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  async openTokenDeAcceso(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
  async FECompUltimoAutorizado(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
  async FECAESolicitar(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
  async recuperaLastCMP(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
}

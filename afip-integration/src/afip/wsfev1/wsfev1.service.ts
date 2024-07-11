import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';

@Injectable()
export class Wsfev1Service {
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
  async openTokenDeAcceso(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  async FECompUltimoAutorizado(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  async FECAESolicitar(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  async recuperaLastCMP(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { FECompUltimoAutorizado } from '../../models';

@Injectable()
export class Wsfev1Service {
  private readonly logger = new Logger('Wsfev1Service');
  private readonly endpoint = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
  private readonly TAFilename: string = 'TA.xml';

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.address = this.getFilePath('', 'wsfev1.wsdl');
  }

  private getFilePath(folder: string, file: string): string {
    return path.join(__dirname, folder, file);
  }

  private checkErrors(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  async openTA(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
  async FECompUltimoAutorizado(
    Token,
    Sign,
    Cuit,
    PtoVta,
    CbteTipo,
  ): Promise<any> {
    try {
      let client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );
      let xml = {
        Auth: { Token, Sign, Cuit },
        PtoVta,
        CbteTipo,
      };
      let aux = await this.soapHelper.callEndpoint(
        client,
        'FECompUltimoAutorizado',
        xml,
      );
      let response: FECompUltimoAutorizado = (
        aux as { FECompUltimoAutorizadoResult: unknown }
      ).FECompUltimoAutorizadoResult as FECompUltimoAutorizado;
      return response;
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

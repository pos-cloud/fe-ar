import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { FECAESolicitar, FECompUltimoAutorizado } from '../../models';
import { SoapHelperService } from '../soap-helper/soap-helper.service';

@Injectable()
export class Wsfev1Service {
  private readonly logger = new Logger('Wsfev1Service');
  private readonly endpoint: string;
  private readonly TAFilename: string = 'TA.xml';

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    if (['development', 'local'].includes(process.env.NODE_ENV)) {
      this.address = this.getFilePath('', 'wsfev1.wsdl');
      this.endpoint = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
    } else if (process.env.NODE_ENV == 'production') {
      this.address = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL';
      this.endpoint = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';
    }
  }

  private getFilePath(folder: string, file: string): string {
    return path.join(__dirname, folder, file);
  }

  async openTA(): Promise<void> {
    try {
    } catch (error) {
      throw error;
    }
  }
  async buscarUltimoComprobanteAutorizado(Token, Sign, Cuit, PtoVta, CbteTipo): Promise<any> {
    try {
      const client = await this.soapHelper.createClient(this.address, this.endpoint);
      const xml = {
        Auth: { Token, Sign, Cuit },
        PtoVta,
        CbteTipo,
      };
      const aux = await this.soapHelper.callEndpoint(client, 'FECompUltimoAutorizado', xml);
      const response: FECompUltimoAutorizado = (aux as { FECompUltimoAutorizadoResult: unknown })
        .FECompUltimoAutorizadoResult as FECompUltimoAutorizado;
      return response;
    } catch (error) {
      throw error;
    }
  }
  async solicitarCAE(Token, Sign, Cuit, FeCabReq, FECAEDetRequest): Promise<FECAESolicitar> {
    try {
      const client = await this.soapHelper.createClient(this.address, this.endpoint);

      const xml = {
        Auth: { Token, Sign, Cuit },
        FeCAEReq: {
          FeCabReq,
          FeDetReq: {
            FECAEDetRequest,
          },
        },
      };
      const aux = await this.soapHelper.callEndpoint(client, 'FECAESolicitar', xml);
      const response: FECAESolicitar = (aux as { FECAESolicitarResult: unknown })
        .FECAESolicitarResult as FECAESolicitar;
      if (!!response.Errors && !!response.Errors.Err.length) {
        const errors = response.Errors.Err.map(error => `${error.Code} - ${error.Msg}`).join(', ');
        throw new Error(errors);
      }
      return response;
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

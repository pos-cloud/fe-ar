import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';

@Injectable()
export class PadronService {
  private readonly logger = new Logger('PadronService');
  private readonly endpoint: string;

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    if (['development', 'local'].includes(process.env.NODE_ENV)) {
      this.address = this.getFilePath('', 'personaServiceA5.wsdl');
      this.endpoint = 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5';
    } else if (process.env.NODE_ENV == 'production') {
      this.address = 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5?WSDL';
      this.endpoint = 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA5';
    }
  }

  private getFilePath(folder: string, file: string): string {
    return path.join(__dirname, folder, file);
  }

  async getPersona(
    token: string,
    sign: string,
    cuitRepresentada: string,
    idPersona: string,
  ): Promise<unknown> {
    try {
      const client = await this.soapHelper.createClient(this.address, this.endpoint);
      const xml = {
        token,
        sign,
        cuitRepresentada: Number(cuitRepresentada),
        idPersona: Number(idPersona),
      };
      return await this.soapHelper.callEndpoint(client, 'getPersona_v2', xml);
    } catch (error) {
      this.logger.error(`Error consultando padrón: ${error?.message || error}`);
      throw error;
    }
  }
}

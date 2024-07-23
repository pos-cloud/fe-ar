import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { FECompUltimoAutorizado, FECAESolicitar } from '../../models';

@Injectable()
export class Wsfev1Service {
  private readonly logger = new Logger('Wsfev1Service');
  private readonly endpoint: string;
  private readonly TAFilename: string = 'TA.xml';

  address: string;
  constructor(
    private configService: ConfigService,
    private readonly soapHelper: SoapHelperService,
  ) {
    this.address = this.getFilePath(
      '',
      this.configService.get<string>('SERVICEWSDL'),
    );
    this.endpoint = this.configService.get<string>('SERVICEENDPOINT');
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
  async buscarUltimoComprobanteAutorizado(
    Token,
    Sign,
    Cuit,
    PtoVta,
    CbteTipo,
  ): Promise<any> {
    try {
      const client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );
      const xml = {
        Auth: { Token, Sign, Cuit },
        PtoVta,
        CbteTipo,
      };
      const aux = await this.soapHelper.callEndpoint(
        client,
        'FECompUltimoAutorizado',
        xml,
      );
      const response: FECompUltimoAutorizado = (
        aux as { FECompUltimoAutorizadoResult: unknown }
      ).FECompUltimoAutorizadoResult as FECompUltimoAutorizado;
      return response;
    } catch (error) {
      throw error;
    }
  }
  async solicitarCAE(
    Token,
    Sign,
    Cuit,
    vatCondition,
    cbte,
    PtoVta,
    regfe,
    regfetrib,
    regfeiva,
    Opcional,
    CbteAsoc,
  ): Promise<FECAESolicitar> {
    try {
      const client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );

      if (cbte == '0') {
        // para
        cbte = '1';
      }
      const xml = {
        Auth: { Token, Sign, Cuit },
        FeCAEReq: {
          FeCabReq: {
            CantReg: 1,
            PtoVta,
            CbteTipo: regfe['CbteTipo'],
          },
          FeDetReq: {
            FECAEDetRequest: {
              Concepto: regfe.Concepto,
              DocTipo: regfe.DocTipo,
              DocNro: regfe.DocNro,
              CbteDesde: cbte,
              CbteHasta: cbte,
              CbteFch: regfe.CbteFch,
              ImpNeto: regfe['ImpNeto'],
              ImpTotConc: regfe['ImpTotConc'],
              ImpIVA: regfe['ImpIVA'],
              ImpTrib: regfe['ImpTrib'],
              ImpOpEx: regfe['ImpOpEx'],
              ImpTotal: regfe['ImpTotal'],
              FchServDesde: regfe['FchServDesde'],
              FchServHasta: regfe['FchServHasta'],
              FchVtoPago: regfe['FchVtoPago'],
              MonId: regfe['MonId'],
              MonCotiz: regfe['MonCotiz'],
              Tributos: {
                Tributo: {
                  Id: regfetrib['Id'],
                  Desc: regfetrib['Desc'],
                  BaseImp: regfetrib['BaseImp'],
                  Alic: regfetrib['Alic'],
                  Importe: regfetrib['Importe'],
                },
              },
              Iva: {
                AlicIva: {
                  Id: regfeiva['Id'],
                  BaseIm: regfeiva['BaseImp'],
                  Importe: regfeiva['Importe'],
                },
              },
            },
          },
        },
      };
      if (CbteAsoc) {
        xml.FeCAEReq.FeDetReq.FECAEDetRequest['CbtesAsoc'] = {
          CbteAsoc,
        };
      }
      if (Opcional) {
        xml.FeCAEReq.FeDetReq.FECAEDetRequest['Opcionales'] = {
          Opcional,
        };
      }

      if (vatCondition == 6 || regfeiva['Id'] === 0) {
        xml['FeCAEReq']['FeDetReq']['FECAEDetRequest']['Iva'] = null;
      }
      const aux = await this.soapHelper.callEndpoint(
        client,
        'FECAESolicitar',
        xml,
      );
      const response: FECAESolicitar = (
        aux as { FECAESolicitarResult: unknown }
      ).FECAESolicitarResult as FECAESolicitar;
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

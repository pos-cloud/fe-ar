import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { FECompUltimoAutorizado, FECAESolicitar } from '../../models';

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
  async buscarUltimoComprobanteAutorizado(
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
  async solicitarCAE(
    Token,
    Sign,
    Cuit,
    vatCondition,
    cbte,
    PtoVta,
    regfe,
    regfeasoc,
    regfetrib,
    regfeiva,
    opcional,
    canceled
  ): Promise<FECAESolicitar> {
    try {
      let client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );

      if (cbte == '0') {
        // para
        cbte = '1';
      }
      let xml = {
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
              Opcionales: {
                Opcional: opcional,
              },
            },
          },
        },
      };
      if (canceled) {
        xml.FeCAEReq.FeDetReq.FECAEDetRequest['CbtesAsoc'] = canceled;
      }

      if (vatCondition == 6 || regfeiva['Id'] === 0) {
        xml['FeCAEReq']['FeDetReq']['FECAEDetRequest']['Iva'] = null;
      }
      let aux = await this.soapHelper.callEndpoint(
        client,
        'FECAESolicitar',
        xml,
      );
      let response: FECAESolicitar = (aux as { FECAESolicitarResult: unknown })
        .FECAESolicitarResult as FECAESolicitar;
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

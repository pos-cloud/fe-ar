import { Body, Controller, Post } from '@nestjs/common';
import moment from 'moment-timezone';
import { WsaaService } from './afip/wsaa/wsaa.service';
import { Wsfev1Service } from './afip/wsfev1/wsfev1.service';
import { CanceledTransaction, Transaction, TransactionConfig } from './models';

@Controller()
export class AppController {
  constructor(
    private readonly wsaaService: WsaaService,
    private readonly wsfev1Service: Wsfev1Service,
  ) {}

  @Post('validate-transaction')
  async validateTransaction(
    @Body('config') config: TransactionConfig,
    @Body('transaction') transaction: Transaction,
    @Body('canceledTransactions') canceledTransactions: CanceledTransaction,
  ): Promise<any> {
    try {
      // console.log('---REQUEST---');
      // console.log('config', config);
      // console.log('transaction', transaction);
      // console.log('canceledTransactions', canceledTransactions);
      // console.log('---REQUEST---');

      const cuit = `${config.companyIdentificationValue}`.replaceAll('-', '');
      const vatCondition = config.vatCondition;
      if (!transaction.type.codes.length) {
        throw new Error('Códigos AFIP no definidos');
      }
      const expirationTime = await this.wsaaService.getIfNotExpired(cuit);
      if (!expirationTime) {
        try {
          await this.wsaaService.generarTA(cuit);
        } catch (error) {
          return {
            status: '',
            message: error.toString(),
          };
        }
      }
      const TA = await this.wsaaService.getTA(cuit);

      const doctipo = transaction?.company?.identificationType?.code ?? 96;
      const docnumber = transaction?.company?.identificationValue?.replaceAll('-', '') ?? 0;

      const tipcomp = transaction.type.codes.find(item => item.letter == transaction.letter).code;

      const ptovta = transaction.origin;
      const tipocbte = tipcomp;

      // Obtener la fecha actual en la zona horaria de Argentina
      let cbteFecha = moment.tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');

      if (transaction?.endDate) {
        const endDate = moment.tz(transaction.endDate, 'America/Argentina/Buenos_Aires');
        cbteFecha = endDate.format('YYYYMMDD');
      }

      const baseimp = 0;
      let impIVA = 0;
      let impneto = 0;
      let exempt = 0;
      const impTotal = Math.floor(transaction.totalPrice * 100) / 100;
      const aliCuotaIVA = [];

      if (transaction.letter !== 'C') {
        exempt = Math.floor(transaction.exempt * 100) / 100;
        if (transaction.taxes.length > 0) {
          for (let i = 0; i < transaction.taxes.length; i++) {
            aliCuotaIVA.push({
              Id: transaction.taxes[i].tax.code, // Asigna el ID correcto
              BaseImp: Math.floor(transaction.taxes[i].taxBase * 100) / 100, // Base imponible
              Importe: Math.floor(transaction.taxes[i].taxAmount * 100) / 100, // Importe de IVA
            });
            impneto += Math.floor(transaction.taxes[i].taxBase * 100) / 100;
            impIVA += Math.floor(transaction.taxes[i].taxAmount * 100) / 100;
          }
        }
      } else {
        impneto = Math.floor(transaction.totalPrice * 100) / 100;
      }
      const datosDeUltimoComprobanteAutorizado =
        await this.wsfev1Service.buscarUltimoComprobanteAutorizado(
          TA.credentials[0].token[0],
          TA.credentials[0].sign[0],
          cuit,
          ptovta,
          tipocbte,
        );
      const nro = datosDeUltimoComprobanteAutorizado.CbteNro;
      if (typeof nro !== 'number') {
        throw new Error('Último comprobante autorizado no es numérico');
      }
      const nro1 = nro + 1;
      const regfe = {};
      regfe['CbteTipo'] = tipocbte;
      regfe['Concepto'] = 1; //Productos: 1 ---- Servicios: 2 ---- Prod y Serv: 3
      regfe['DocTipo'] = doctipo; //80=CUIT -- 96 DNI --- 99 general cons final
      regfe['DocNro'] = docnumber; //0 para consumidor final / importe menor a 1000
      regfe['CbteFch'] = cbteFecha; // fecha emision de factura
      regfe['ImpNeto'] = Math.floor(impneto * 100) / 100; // Imp Neto
      regfe['ImpTotConc'] = exempt; // no gravado
      regfe['ImpIVA'] = Math.floor(impIVA * 100) / 100; // IVA liquidado
      regfe['ImpTrib'] = 0; // otros tributos
      regfe['ImpOpEx'] = 0; // operacion exentas
      regfe['ImpTotal'] = impTotal; // total de la factura. ImpNeto + ImpTotConc + ImpIVA + ImpTrib + ImpOpEx
      regfe['FchServDesde'] = null; // solo concepto 2 o 3
      regfe['FchServHasta'] = null; // solo concepto 2 o 3
      regfe['FchVtoPago'] = null; // solo concepto 2 o 3
      regfe['MonId'] = 'PES'; // Id de moneda 'PES'
      regfe['MonCotiz'] = 1; // Cotizacion moneda. Solo exportacion
      // Detalle de otros tributos
      const regfetrib = {};
      regfetrib['Id'] = 1;
      regfetrib['Desc'] = '';
      regfetrib['BaseImp'] = 0;
      regfetrib['Alic'] = 0;
      regfetrib['Importe'] = 0;

      const regfeiva = {};

      if (baseimp !== 0) {
        regfeiva['Id'] = 5;
        regfeiva['BaseImp'] = impneto;
        regfeiva['Importe'] = Math.floor(impIVA * 100) / 100;
      } else {
        regfeiva['Id'] = 0;
        regfeiva['BaseImp'] = 0;
        regfeiva['Importe'] = 0;
      }

      const Opcional = transaction?.optionalAFIP?.value
        ? {
            Id: transaction.optionalAFIP.id,
            Valor: transaction.optionalAFIP.value,
          }
        : null;

      const CbteAsoc = canceledTransactions
        ? {
            Tipo: canceledTransactions.code,
            PtoVta: canceledTransactions.origin,
            Nro: canceledTransactions.number,
          }
        : null;

      const FeCabReq = {
        CantReg: 1,
        PtoVta: ptovta,
        CbteTipo: regfe['CbteTipo'],
      };
      const FECAEDetRequest = {
        Concepto: regfe['Concepto'],
        DocTipo: regfe['DocTipo'],
        DocNro: regfe['DocNro'],
        CbteDesde: nro1,
        CbteHasta: nro1,
        CbteFch: regfe['CbteFch'],
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
          AlicIva: aliCuotaIVA.length > 0 ? aliCuotaIVA : null,
        },
      };
      if (CbteAsoc) {
        FECAEDetRequest['CbtesAsoc'] = {
          CbteAsoc,
        };
      }
      if (Opcional) {
        FECAEDetRequest['Opcionales'] = {
          Opcional,
        };
      }

      if (vatCondition == 6) {
        FECAEDetRequest['Iva'] = null;
      }
      const caeData = await this.wsfev1Service.solicitarCAE(
        TA.credentials[0].token,
        TA.credentials[0].sign,
        cuit,
        FeCabReq,
        FECAEDetRequest,
      );

      const message =
        caeData.FeDetResp.FECAEDetResponse[0].CAE == ''
          ? caeData.FeDetResp.FECAEDetResponse[0].Observaciones.Obs.map(
              observacion => `${observacion.Code} - ${observacion.Msg}`,
            ).join(', ')
          : 'Successful';

      // console.log('---AFIP---');
      // console.log('CUIT:', cuit);
      // console.log('Body:', JSON.stringify(FeCabReq));
      // console.log('Body2:', JSON.stringify(FECAEDetRequest));
      // console.log('---AFIP---');

      return {
        data: {
          caeData,
          number: nro1,
          CAE: caeData.FeDetResp.FECAEDetResponse[0].CAE,
          CAEExpirationDate: caeData.FeDetResp.FECAEDetResponse[0].CAEFchVto,
        },
        message,
      };
    } catch (error) {
      console.log(error);
      return {
        status: 'Error',
        message: error.message,
      };
    }
  }
}

import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { WsaaService } from './wsaa/wsaa.service';
import { Wsfev1Service } from './wsfev1/wsfev1.service';
import { IssueInvoiceDto } from '../v1/dto/issue-invoice.dto';

@Injectable()
export class AfipInvoiceService {
  constructor(
    private readonly wsaaService: WsaaService,
    private readonly wsfev1Service: Wsfev1Service,
  ) {}

  async issue(dto: IssueInvoiceDto) {
    const cuit = `${dto.cuit}`.replace(/-/g, '');
    const vatCondition = dto.vatCondition;
    const expirationTime = await this.wsaaService.getIfNotExpired(cuit);
    if (!expirationTime) {
      await this.wsaaService.generarTA(cuit);
    }
    const TA = await this.wsaaService.getTA(cuit);

    let cbteFecha = moment().tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
    if (dto.fecha) {
      const parsed = moment.tz(
        dto.fecha.replace(/-/g, ''),
        'YYYYMMDD',
        'America/Argentina/Buenos_Aires',
      );
      if (parsed.isValid()) {
        cbteFecha = parsed.format('YYYYMMDD');
      }
    }

    const ultimo = await this.wsfev1Service.buscarUltimoComprobanteAutorizado(
      TA.credentials[0].token[0],
      TA.credentials[0].sign[0],
      cuit,
      dto.puntoVenta,
      dto.tipoComprobante,
    );
    const nro = ultimo.CbteNro;
    if (typeof nro !== 'number') {
      throw new Error('Último comprobante autorizado no es numérico');
    }
    const nro1 = nro + 1;

    const aliCuotaIVA = (dto.ivas || []).map(item => ({
      Id: item.id,
      BaseImp: Math.round(item.baseImp * 100) / 100,
      Importe: Math.round(item.importe * 100) / 100,
    }));

    const impNeto = Math.round(dto.importes.neto * 100) / 100;
    const impIVA = Math.round(dto.importes.iva * 100) / 100;
    const impOpEx = vatCondition != 6 ? Math.round(dto.importes.exento * 100) / 100 : 0;
    const impTotConc = Math.round((dto.importes.noGravado || 0) * 100) / 100;
    const impTotal =
      Math.round((impNeto + impTotConc + impIVA + impOpEx) * 100) / 100;

    const FeCabReq = {
      CantReg: 1,
      PtoVta: dto.puntoVenta,
      CbteTipo: dto.tipoComprobante,
    };

    const FECAEDetRequest: Record<string, unknown> = {
      Concepto: 1,
      DocTipo: dto.receptor.docTipo,
      DocNro: `${dto.receptor.docNro}`.replace(/-/g, ''),
      CbteDesde: nro1,
      CbteHasta: nro1,
      CbteFch: cbteFecha,
      ImpNeto: impNeto,
      ImpTotConc: impTotConc,
      ImpIVA: impIVA,
      ImpTrib: 0,
      ImpOpEx: impOpEx,
      ImpTotal: dto.importes.total ? Math.round(dto.importes.total * 100) / 100 : impTotal,
      FchServDesde: null,
      FchServHasta: null,
      FchVtoPago: null,
      MonId: 'PES',
      MonCotiz: 1,
      CondicionIVAReceptorId: dto.receptor.condicionIva ?? 5,
    };

    if (aliCuotaIVA.length > 0) {
      FECAEDetRequest.Iva = { AlicIva: aliCuotaIVA };
    }
    if (vatCondition == 6) {
      FECAEDetRequest.Iva = null;
    }

    if (dto.comprobantesAsociados?.length) {
      const first = dto.comprobantesAsociados[0];
      FECAEDetRequest.CbtesAsoc = {
        CbteAsoc: {
          Tipo: first.tipo,
          PtoVta: first.puntoVenta,
          Nro: first.numero,
        },
      };
    }

    const caeData = await this.wsfev1Service.solicitarCAE(
      TA.credentials[0].token,
      TA.credentials[0].sign,
      cuit,
      FeCabReq,
      FECAEDetRequest,
    );

    const det = caeData.FeDetResp.FECAEDetResponse[0];
    const message =
      det.CAE == ''
        ? det.Observaciones.Obs.map(observacion => `${observacion.Code} - ${observacion.Msg}`).join(
            ', ',
          )
        : 'Successful';

    return {
      data: {
        caeData,
        number: nro1,
        CAE: det.CAE,
        CAEExpirationDate: det.CAEFchVto,
      },
      message,
    };
  }
}

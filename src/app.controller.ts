import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { WsaaService } from './afip/wsaa/wsaa.service';
import { Wsfev1Service } from './afip/wsfev1/wsfev1.service';
import { Transaction, TransactionConfig } from './models';
@Controller()
export class AppController {
  constructor(
    private readonly wsaaService: WsaaService,
    private readonly wsfev1Service: Wsfev1Service,
  ) {}

  @Post(':cuit')
  async test(
    @Body('config') config: TransactionConfig,
    @Body('transaction') transaction: Transaction,
    @Param('cuit') cuit: string,
  ): Promise<any> {
    try {
      if (!transaction.type.codes.length) {
        throw new Error('Códigos AFIP no definidos');
      }
      const expirationTime = await this.wsaaService.getIfNotExpired(cuit);
      if (!expirationTime) {
        const response = await this.wsaaService.generarTA(cuit);
        console.log(response);
      }
      let TA = await this.wsaaService.getTA(cuit);

      let doctipo = transaction.company.identificationType.code;
      let docnumber = transaction.company.identificationValue;

      let tipcomp = transaction.type.codes.find(
        (item) => item.letter == transaction.letter,
      ).code;

      let ptovta = transaction.origin;
      let tipocbte = tipcomp;
      let cbteFecha = new Date();
      let baseimp = 0;
      let impiva = 0;
      let impneto = 0;
      let exempt = 0;
      if (transaction.letter == 'C') {
        exempt = transaction.exempt;
        if (transaction.taxes.length > 0) {
          for (let i = 0; i < transaction.taxes.length; i++) {
            baseimp = transaction.taxes[i].percentage;
            impneto = impneto + transaction.taxes[i].taxBase;
            impiva = impiva + transaction.taxes[i].taxAmount;
          }
        } else {
          impneto = impneto + transaction.totalPrice;
        }
      }
      let nro = await this.wsfev1Service.FECompUltimoAutorizado(
        TA.credentials[0].token[0],
        TA.credentials[0].sign[0],
        cuit,
        ptovta,
        tipocbte,
      );
      return nro;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  @Post('validate-transaction')
  transaction(
    @Body('config') config: Object,
    @Body('transaction') transaction: Object,
  ): Object {
    return {};
  }
}

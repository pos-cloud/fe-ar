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

  @Post('validate-transaction')
  async test(
    @Body('config') config: TransactionConfig,
    @Body('transaction') transaction: Transaction,
  ): Promise<any> {
    try {
      let cuit = `${config.companyIdentificationValue}`;
      let vatCondition = config.vatCondition;
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
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      let cbteFecha = `${year}${month}${day}`;
      let baseimp = 0;
      let impiva = 0;
      let impneto = 0;
      let exempt = 0;
      if (transaction.letter !== 'C') {
        exempt = transaction.exempt;
        if (transaction.taxes.length > 0) {
          for (let i = 0; i < transaction.taxes.length; i++) {
            baseimp = transaction.taxes[i].percentage;
            impneto = impneto + transaction.taxes[i].taxBase;
            impiva = impiva + transaction.taxes[i].taxAmount;
          }
        }
      } else {
        impneto = impneto + transaction.totalPrice;
      }
      let datosDeUltimoComprobanteAutorizado =
        await this.wsfev1Service.buscarUltimoComprobanteAutorizado(
          TA.credentials[0].token[0],
          TA.credentials[0].sign[0],
          cuit,
          ptovta,
          tipocbte,
        );
      let nro = datosDeUltimoComprobanteAutorizado.CbteNro;
      if (typeof nro !== 'number') {
        throw new Error('Último comprobante autorizado no es numérico');
      }
      let nro1 = nro + 1;
      let regfe = {};
      regfe['CbteTipo'] = tipocbte;
      regfe['Concepto'] = 1; //Productos: 1 ---- Servicios: 2 ---- Prod y Serv: 3
      regfe['DocTipo'] = doctipo; //80=CUIT -- 96 DNI --- 99 general cons final
      regfe['DocNro'] = docnumber; //0 para consumidor final / importe menor a 1000
      regfe['CbteFch'] = cbteFecha; // fecha emision de factura
      regfe['ImpNeto'] = impneto; // Imp Neto
      regfe['ImpTotConc'] = exempt; // no gravado
      regfe['ImpIVA'] = impiva; // IVA liquidado
      regfe['ImpTrib'] = 0; // otros tributos
      regfe['ImpOpEx'] = 0; // operacion exentas
      regfe['ImpTotal'] = transaction['totalPrice']; // total de la factura. ImpNeto + ImpTotConc + ImpIVA + ImpTrib + ImpOpEx
      regfe['FchServDesde'] = null; // solo concepto 2 o 3
      regfe['FchServHasta'] = null; // solo concepto 2 o 3
      regfe['FchVtoPago'] = null; // solo concepto 2 o 3
      regfe['MonId'] = 'PES'; // Id de moneda 'PES'
      regfe['MonCotiz'] = 1; // Cotizacion moneda. Solo exportacion

      // Comprobantes asociados (solo notas de crédito y débito):
      let regfeasoc = {};
      regfeasoc['Tipo'] = 91; //91; //tipo 91|5
      regfeasoc['PtoVta'] = 1;
      regfeasoc['Nro'] = 1;

      // Detalle de otros tributos
      let regfetrib = {};
      regfetrib['Id'] = 1;
      regfetrib['Desc'] = '';
      regfetrib['BaseImp'] = 0;
      regfetrib['Alic'] = 0;
      regfetrib['Importe'] = 0;

      let regfeiva = {};

      if (baseimp !== 0) {
        regfeiva['Id'] = 5;
        regfeiva['BaseImp'] = impneto;
        regfeiva['Importe'] = impiva;
      } else {
        regfeiva['Id'] = 0;
        regfeiva['BaseImp'] = 0;
        regfeiva['Importe'] = 0;
      }

      let caeData = await this.wsfev1Service.solicitarCAE(
        TA.credentials[0].token,
        TA.credentials[0].sign,
        cuit,
        vatCondition,
        nro1,
        ptovta,
        regfe,
        regfeasoc,
        regfetrib,
        regfeiva,
      );
      /*
	if ($caenum != "") {
		
		$CAEExpirationDate = str_split($caefvt, 2)[3]."/".str_split($caefvt, 2)[2]."/".str_split($caefvt, 4)[0]." 00:00:00";
		
		$result ='{
			"status":"OK",
			"number":'.$numero.',
			"CAE":"'.$caenum.'",
			"CAEExpirationDate":"'.$CAEExpirationDate.'"
		}';
		file_put_contents($pathLogs, date("d/m/Y h:i:s") ." - Response - ".$result."\n", FILE_APPEND | LOCK_EX);
		echo $result;
	} else {
		if(empty($err)) {
			$err ='{
				"status":"err",
				"code":"'.$wsfev1->Code.'",
				"message":"'.$wsfev1->Msg.'",
				"observationCode":"'.$wsfev1->ObsCod.'",
				"observationMessage":"'.$wsfev1->ObsMsg.'",
				"observationCode2":"'.$wsfev1->ObsCode2.'",
				"observationMessage2":"'.$wsfev1->ObsMsg2.'"
			}';
			file_put_contents($pathLogs, date("d/m/Y h:i:s") ." - Response - ".$err."\n", FILE_APPEND | LOCK_EX);
			echo $err;
		}
	}

      */

      return {
        status: 'OK',
        number: nro1,
        CAE: caeData.FeDetResp.FECAEDetResponse[0].CAE,
        CAEExpirationDate: caeData.FeDetResp.FECAEDetResponse[0].CAEFchVto,
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

import { Module } from '@nestjs/common';
import { AfipInvoiceService } from '../afip/afip-invoice.service';
import { AfipPadronService } from '../afip/afip-padron.service';
import { PadronService } from '../afip/padron/padron.service';
import { SoapHelperService } from '../afip/soap-helper/soap-helper.service';
import { WsaaService } from '../afip/wsaa/wsaa.service';
import { Wsfev1Service } from '../afip/wsfev1/wsfev1.service';
import { CertModule } from '../cert/cert.module';
import { AccountController } from './account.controller';
import { CertsV1Controller } from './certs.controller';
import { InvoicesController } from './invoices.controller';
import { PadronController } from './padron.controller';

@Module({
  imports: [CertModule],
  controllers: [InvoicesController, CertsV1Controller, AccountController, PadronController],
  providers: [
    AfipInvoiceService,
    AfipPadronService,
    PadronService,
    WsaaService,
    Wsfev1Service,
    SoapHelperService,
  ],
})
export class V1Module {}

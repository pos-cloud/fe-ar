import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AccountId } from '../auth/account-id.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FirebaseService } from '../firebase/firebase.service';
import { AfipInvoiceService } from '../afip/afip-invoice.service';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';

@Controller('v1/invoices')
@UseGuards(ApiKeyGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InvoicesController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly afipInvoice: AfipInvoiceService,
  ) {}

  @Post()
  async create(@Body() dto: IssueInvoiceDto, @AccountId() accountId: string) {
    const cuit = `${dto.cuit}`.replace(/-/g, '');
    const record = await this.firebase.getCuit(cuit);
    if (!record || record.accountId !== accountId) {
      throw new ForbiddenException('El CUIT no pertenece a esta cuenta');
    }
    if (record.status !== 'ready') {
      throw new BadRequestException('El certificado de este CUIT no está listo');
    }

    const result = await this.afipInvoice.issue({ ...dto, cuit });
    if (result.data?.CAE) {
      await this.firebase.incrementInvoice(accountId, {
        cuit,
        tipoComprobante: dto.tipoComprobante,
        puntoVenta: dto.puntoVenta,
        cae: result.data.CAE,
        number: result.data.number,
      });
    }
    return result;
  }
}

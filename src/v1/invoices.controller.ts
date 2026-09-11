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
import {
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AccountId } from '../auth/account-id.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { FirebaseService } from '../firebase/firebase.service';
import { AfipInvoiceService } from '../afip/afip-invoice.service';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import {
  facturaAExample,
  facturaBExample,
  facturaCExample,
  facturaServiciosUsdExample,
  invoiceErrorExample,
  invoiceOkExample,
  notaCreditoExample,
} from './swagger-examples';

@ApiTags('Facturar')
@ApiSecurity('api-key')
@ApiHeader({ name: 'X-API-Key', required: true, description: 'API key fp_live_… de Administración' })
@Controller('v1/invoices')
@UseGuards(ApiKeyGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class InvoicesController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly afipInvoice: AfipInvoiceService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Emitir comprobante',
    description:
      'El número lo asigna ARCA (último autorizado + 1). No lo mandes en el body.\n\n' +
      '**Try it out emite un comprobante real** si la key y el CUIT están en producción.',
  })
  @ApiBody({
    type: IssueInvoiceDto,
    examples: {
      facturaB: { summary: 'Factura B — consumidor final', value: facturaBExample },
      facturaA: { summary: 'Factura A — RI, IVA 21%', value: facturaAExample },
      facturaC: { summary: 'Factura C — emisor monotributista', value: facturaCExample },
      notaCredito: { summary: 'Nota de crédito B asociada', value: notaCreditoExample },
      serviciosUsd: {
        summary: 'Factura A — servicios en USD',
        value: facturaServiciosUsdExample,
      },
    },
  })
  @ApiOkResponse({
    description: 'Si `data.CAE` viene vacío, `message` trae la observación de ARCA.',
    schema: {
      example: invoiceOkExample,
      examples: {
        ok: { summary: 'Autorizada', value: invoiceOkExample },
        observacion: { summary: 'Observación ARCA', value: invoiceErrorExample },
      },
    },
  })
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

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AfipPadronService } from '../afip/afip-padron.service';
import { AccountId } from '../auth/account-id.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { PadronPersonaDto } from './dto/padron.dto';
import { padronOkExample } from './swagger-examples';

@ApiTags('Padrón')
@ApiSecurity('api-key')
@ApiHeader({ name: 'X-API-Key', required: true, description: 'API key fp_live_… de Administración' })
@Controller('v1/padron')
@UseGuards(ApiKeyGuard)
export class PadronController {
  constructor(private readonly afipPadron: AfipPadronService) {}

  @Get(':cuit')
  @ApiOperation({
    summary: 'Consultar contribuyente en ARCA',
    description:
      'Dos datos: `cuit` es el contribuyente a buscar. `consultante` es tu CUIT con certificado, el que se autentica ante ARCA.',
  })
  @ApiParam({ name: 'cuit', example: '30712345678', description: 'CUIT a consultar en ARCA' })
  @ApiQuery({
    name: 'consultante',
    required: true,
    example: '20378228922',
    description: 'CUIT con certificado listo (el que consulta)',
  })
  @ApiOkResponse({ type: PadronPersonaDto, schema: { example: padronOkExample } })
  async get(
    @Param('cuit') cuit: string,
    @Query('consultante') consultante: string,
    @AccountId() accountId: string,
  ) {
    return this.afipPadron.lookup(accountId, cuit, consultante);
  }
}

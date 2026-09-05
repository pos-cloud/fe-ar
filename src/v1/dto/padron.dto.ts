import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PadronCondicionIvaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'IVA Responsable Inscripto' })
  descripcion: string;
}

export class PadronDomicilioDto {
  @ApiPropertyOptional({ example: 'CALLE 1' })
  direccion?: string;

  @ApiPropertyOptional({ example: 'CABA' })
  localidad?: string;

  @ApiPropertyOptional({ example: 'CIUDAD AUTONOMA BUENOS AIRES' })
  provincia?: string;

  @ApiPropertyOptional({ example: '1000' })
  codPostal?: string;
}

export class PadronImpuestoDto {
  @ApiProperty({ example: 30 })
  id: number;

  @ApiPropertyOptional({ example: 'IVA' })
  descripcion?: string;

  @ApiPropertyOptional({ example: 'ACTIVO' })
  estado?: string;
}

export class PadronPersonaDto {
  @ApiProperty({ example: '30712345678' })
  cuit: string;

  @ApiPropertyOptional({ example: 'EMPRESA SA' })
  razonSocial?: string;

  @ApiPropertyOptional({ example: 'JURIDICA' })
  tipoPersona?: string;

  @ApiPropertyOptional({ example: 'ACTIVO' })
  estadoClave?: string;

  @ApiPropertyOptional({ example: 'CUIT' })
  tipoClave?: string;

  @ApiPropertyOptional({ type: PadronCondicionIvaDto })
  condicionIva?: PadronCondicionIvaDto;

  @ApiPropertyOptional({ type: PadronDomicilioDto })
  domicilio?: PadronDomicilioDto;

  @ApiPropertyOptional({ type: [PadronImpuestoDto] })
  impuestos?: PadronImpuestoDto[];
}

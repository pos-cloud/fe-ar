import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceptorDto {
  @ApiProperty({ example: 99, description: 'Tipo de documento AFIP. 99 = consumidor final.' })
  @IsNumber()
  docTipo: number;

  @ApiProperty({ example: '0', description: 'Número de documento. 0 si es consumidor final.' })
  @IsString()
  docNro: string;

  @ApiProperty({ example: 5, description: 'Condición IVA del receptor. 5 = consumidor final.' })
  @IsNumber()
  condicionIva: number;
}

export class ImportesDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  neto: number;

  @ApiProperty({ example: 210 })
  @IsNumber()
  iva: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  exento: number;

  @ApiProperty({ example: 1210 })
  @IsNumber()
  total: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  noGravado?: number;
}

export class IvaAlicDto {
  @ApiProperty({ example: 5, description: 'Id de alícuota AFIP. 5 = 21%.' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  baseImp: number;

  @ApiProperty({ example: 210 })
  @IsNumber()
  importe: number;
}

export class ComprobanteAsocDto {
  @ApiProperty({ example: 6 })
  @IsNumber()
  tipo: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  puntoVenta: number;

  @ApiProperty({ example: 128 })
  @IsNumber()
  numero: number;
}

export class IssueInvoiceDto {
  @ApiProperty({
    example: '20378228922',
    description: 'CUIT emisor, con o sin guiones. Tiene que estar dado de alta en tu cuenta, con CRT listo.',
  })
  @IsString()
  cuit: string;

  @ApiProperty({ example: 1, description: 'Punto de venta habilitado en ARCA.' })
  @IsNumber()
  puntoVenta: number;

  @ApiProperty({ example: 6, description: 'Código AFIP. 6 = Factura B. Ver Tablas en el portal.' })
  @IsNumber()
  tipoComprobante: number;

  @ApiPropertyOptional({
    example: '2026-08-29',
    description: 'YYYY-MM-DD o YYYYMMDD. Si no va, usa hoy (AR).',
  })
  @IsOptional()
  @IsString()
  fecha?: string;

  @ApiProperty({ type: ReceptorDto })
  @ValidateNested()
  @Type(() => ReceptorDto)
  receptor: ReceptorDto;

  @ApiProperty({ type: ImportesDto })
  @ValidateNested()
  @Type(() => ImportesDto)
  importes: ImportesDto;

  @ApiPropertyOptional({ type: [IvaAlicDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IvaAlicDto)
  ivas?: IvaAlicDto[];

  @ApiPropertyOptional({ type: [ComprobanteAsocDto], description: 'NC/ND: comprobante original.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComprobanteAsocDto)
  comprobantesAsociados?: ComprobanteAsocDto[];

  @ApiPropertyOptional({
    example: 6,
    description: 'Condición IVA del emisor. 6 = monotributista (no informa IVA).',
  })
  @IsOptional()
  @IsNumber()
  vatCondition?: number;

  @ApiPropertyOptional({
    example: 2,
    description: '1 = productos (default), 2 = servicios, 3 = productos y servicios. Si es 2 o 3, ARCA exige las fechas de servicio.',
  })
  @IsOptional()
  @IsIn([1, 2, 3])
  concepto?: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Inicio del período facturado. Obligatorio si concepto es 2 o 3. YYYY-MM-DD o YYYYMMDD.',
  })
  @IsOptional()
  @IsString()
  fechaServicioDesde?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Fin del período facturado. Obligatorio si concepto es 2 o 3.',
  })
  @IsOptional()
  @IsString()
  fechaServicioHasta?: string;

  @ApiPropertyOptional({
    example: '2026-10-10',
    description: 'Vencimiento del pago. Obligatorio si concepto es 2 o 3.',
  })
  @IsOptional()
  @IsString()
  fechaVtoPago?: string;

  @ApiPropertyOptional({
    example: 'DOL',
    description: 'Código AFIP de moneda. PES (default), DOL, EUR. También acepta ARS y USD.',
  })
  @IsOptional()
  @IsString()
  moneda?: string;

  @ApiPropertyOptional({
    example: 1450.5,
    description: 'Cotización a pesos. Obligatoria si moneda no es PES. En PES se ignora y va 1.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  cotizacion?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si la moneda no es PES: si se cancela en esa moneda (CanMisMonExt). Default true.',
  })
  @IsOptional()
  @IsBoolean()
  cancelaMismaMoneda?: boolean;
}

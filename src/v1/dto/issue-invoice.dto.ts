import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

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
}

import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class ReceptorDto {
  @IsNumber()
  docTipo: number;

  @IsString()
  docNro: string;

  @IsNumber()
  condicionIva: number;
}

class ImportesDto {
  @IsNumber()
  neto: number;

  @IsNumber()
  iva: number;

  @IsNumber()
  exento: number;

  @IsNumber()
  total: number;

  @IsOptional()
  @IsNumber()
  noGravado?: number;
}

class IvaAlicDto {
  @IsNumber()
  id: number;

  @IsNumber()
  baseImp: number;

  @IsNumber()
  importe: number;
}

class ComprobanteAsocDto {
  @IsNumber()
  tipo: number;

  @IsNumber()
  puntoVenta: number;

  @IsNumber()
  numero: number;
}

export class IssueInvoiceDto {
  @IsString()
  cuit: string;

  @IsNumber()
  puntoVenta: number;

  @IsNumber()
  tipoComprobante: number;

  @IsOptional()
  @IsString()
  fecha?: string;

  @ValidateNested()
  @Type(() => ReceptorDto)
  receptor: ReceptorDto;

  @ValidateNested()
  @Type(() => ImportesDto)
  importes: ImportesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IvaAlicDto)
  ivas?: IvaAlicDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComprobanteAsocDto)
  comprobantesAsociados?: ComprobanteAsocDto[];

  @IsOptional()
  @IsNumber()
  vatCondition?: number;
}

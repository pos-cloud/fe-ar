import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCuitDto {
  @IsString()
  @Transform(({ value }) => `${value}`.replace(/-/g, ''))
  @Matches(/^\d{11}$/, { message: 'CUIT inválido' })
  cuit: string;

  @IsString()
  @MinLength(2, { message: 'Nombre de fantasía requerido' })
  name: string;
}

export class CreateCertV1Dto {
  @IsString()
  @Transform(({ value }) => `${value}`.replace(/-/g, ''))
  cuit: string;

  @IsOptional()
  @IsString()
  name?: string;
}

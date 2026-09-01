import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCuitDto {
  @IsString()
  @Transform(({ value }) => `${value}`.replace(/-/g, ''))
  cuit: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateCertV1Dto {
  @IsString()
  @Transform(({ value }) => `${value}`.replace(/-/g, ''))
  cuit: string;

  @IsOptional()
  @IsString()
  name?: string;
}

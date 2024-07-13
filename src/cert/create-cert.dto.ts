import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCertDto {
  @IsString()
  @Transform(({ value }) => value.replace(/ /g, ''))
  companyName: string;

  @IsString()
  @Transform(({ value }) => value.replace(/-/g, ''))
  companyCUIT: string;
}

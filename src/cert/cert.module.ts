import { Module } from '@nestjs/common';
import { CertController } from './cert.controller';
import { CertService } from './cert.service';

@Module({
  controllers: [CertController],
  providers: [CertService],
})
export class CertModule {}

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { Stream } from 'stream';
import { AccountId } from '../auth/account-id.decorator';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CertService } from '../cert/cert.service';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCertV1Dto } from './dto/cuit.dto';

@Controller('v1/certs')
@UseGuards(ApiKeyGuard)
export class CertsV1Controller {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly certService: CertService,
  ) {}

  private async assertCuit(cuit: string, accountId: string) {
    const sanitized = cuit.replace(/-/g, '');
    const record = await this.firebase.getCuit(sanitized);
    if (!record || record.accountId !== accountId) {
      throw new ForbiddenException('El CUIT no pertenece a esta cuenta');
    }
    return record;
  }

  @Post()
  async generate(@Body() dto: CreateCertV1Dto, @AccountId() accountId: string, @Res() res: Response) {
    const cuit = dto.cuit.replace(/-/g, '');
    let record = await this.firebase.getCuit(cuit);
    if (!record) {
      record = await this.firebase.upsertCuit(cuit, accountId, dto.name || cuit, 'pending_csr');
    } else if (record.accountId !== accountId) {
      throw new ForbiddenException('El CUIT no pertenece a esta cuenta');
    }

    const fileStream: Stream = await this.certService.generateCert({
      companyName: dto.name || record.name || 'FEAR',
      companyCUIT: cuit,
    });
    await this.firebase.setCuitStatus(cuit, 'pending_crt');

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${cuit}.csr"`,
    });
    fileStream.pipe(res);
  }

  @Post(':cuit/crt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const { mkdirSync } = require('fs');
          const companyCUIT = req.params.cuit.replace(/-/g, '');
          const dir = join('_keys', companyCUIT);
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => cb(null, 'poscloud.crt'),
      }),
    }),
  )
  async uploadCrt(
    @UploadedFile() file: Express.Multer.File,
    @Param('cuit') cuit: string,
    @AccountId() accountId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Por favor, seleccioná un archivo .crt');
    }
    const sanitized = cuit.replace(/-/g, '');
    await this.assertCuit(sanitized, accountId);
    await fs.mkdir(join('_keys', sanitized), { recursive: true });
    await this.firebase.setCuitStatus(sanitized, 'ready');
    return { message: 'Certificado subido.' };
  }

  @Post(':cuit/renew')
  async renew(@Param('cuit') cuit: string, @AccountId() accountId: string, @Res() res: Response) {
    const sanitized = cuit.replace(/-/g, '');
    const record = await this.assertCuit(sanitized, accountId);
    const fileStream: Stream = await this.certService.generateCert({
      companyName: record.name || 'FEAR',
      companyCUIT: sanitized,
    });
    await this.firebase.setCuitStatus(sanitized, 'pending_crt');
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitized}.csr"`,
    });
    fileStream.pipe(res);
  }
}

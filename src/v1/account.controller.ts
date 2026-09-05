import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { AccountId } from '../auth/account-id.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CertService } from '../cert/cert.service';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCuitDto } from './dto/cuit.dto';

@ApiExcludeController()
@Controller('v1')
@UseGuards(FirebaseAuthGuard)
export class AccountController {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly certService: CertService,
  ) {}

  @Get('account')
  async account(@AccountId() uid: string) {
    return this.firebase.getAccount(uid);
  }

  @Get('cuits')
  async cuits(@AccountId() uid: string) {
    return this.firebase.listCuits(uid);
  }

  @Post('cuits')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createCuit(@AccountId() uid: string, @Body() dto: CreateCuitDto) {
    try {
      return await this.firebase.upsertCuit(dto.cuit, uid, dto.name);
    } catch (error) {
      if (error.message === 'CUIT_TAKEN') {
        throw new ConflictException('Ese CUIT ya está asociado a otra cuenta');
      }
      throw error;
    }
  }

  @Get('cuits/:cuit/csr')
  async downloadCsr(@Param('cuit') cuit: string, @AccountId() uid: string, @Res() res: Response) {
    const record = await this.assertOwnCuit(cuit, uid);
    const csrPath = join('_keys', record.cuit, 'poscloud.csr');
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${record.cuit}.csr"`,
    });
    if (existsSync(csrPath)) {
      if (record.status === 'pending_csr') {
        await this.firebase.setCuitStatus(record.cuit, 'pending_crt');
      }
      createReadStream(csrPath).pipe(res);
      return;
    }
    const fileStream = await this.certService.generateCert({
      companyName: record.name || 'FEAR',
      companyCUIT: record.cuit,
    });
    if (record.status === 'pending_csr') {
      await this.firebase.setCuitStatus(record.cuit, 'pending_crt');
    }
    fileStream.pipe(res);
  }

  @Post('cuits/:cuit/crt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const { mkdirSync } = require('fs');
          const dir = join('_keys', `${req.params.cuit}`.replace(/-/g, ''));
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
    @AccountId() uid: string,
  ) {
    if (!file) {
      throw new BadRequestException('Por favor, seleccioná un archivo .crt');
    }
    try {
      const record = await this.assertOwnCuit(cuit, uid);
      await this.firebase.setCuitStatus(record.cuit, 'ready');
      return { message: 'Certificado subido.' };
    } catch (error) {
      await fs.unlink(join('_keys', `${cuit}`.replace(/-/g, ''), 'poscloud.crt')).catch(() => undefined);
      throw error;
    }
  }

  @Get('usage')
  async usage(@AccountId() uid: string, @Query('period') period?: string) {
    return this.firebase.getUsage(uid, period);
  }

  @Get('usage/events')
  async events(@AccountId() uid: string, @Query('period') period?: string) {
    return this.firebase.listUsageEvents(uid, period);
  }

  @Get('api-keys')
  async listKeys(@AccountId() uid: string) {
    return this.firebase.listApiKeys(uid);
  }

  @Post('api-keys')
  async createKey(@AccountId() uid: string) {
    return this.firebase.createApiKey(uid);
  }

  private async assertOwnCuit(cuit: string, uid: string) {
    const sanitized = `${cuit}`.replace(/-/g, '');
    const record = await this.firebase.getCuit(sanitized);
    if (!record || record.accountId !== uid) {
      throw new ForbiddenException('El CUIT no pertenece a esta cuenta');
    }
    return record;
  }
}

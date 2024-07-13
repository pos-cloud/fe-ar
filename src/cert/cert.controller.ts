import { Controller, Post, Body, Res, Get, Param } from '@nestjs/common';
import { CertService } from './cert.service';
import { CreateCertDto } from './create-cert.dto';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('cert')
export class CertController {
  constructor(private readonly certService: CertService) {}

  @Post()
  async generateCert(
    @Body() createCertDto: CreateCertDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.certService.generateCert(createCertDto);
      return res.status(200).json(result);
    } catch (error) {
      return res
        .status(500)
        .send(`Error al generar el certificado: ${error.message}`);
    }
  }

  @Get(':companyCUIT/csr')
  async downloadCSR(
    @Param('companyCUIT') companyCUIT: string,
    @Res() res: Response,
  ) {
    try {
      const basePath = path.resolve(__dirname, `../../_keys`);
      const csrFilePath = path.join(basePath, `${companyCUIT}/poscloud.csr`);
      if (fs.existsSync(csrFilePath)) {
        res.download(csrFilePath, 'poscloud.csr');
      } else {
        res.status(404).send('Archivo .csr no encontrado');
      }
    } catch (error) {
      res
        .status(500)
        .send(`Error al descargar el archivo .csr: ${error.message}`);
    }
  }
}

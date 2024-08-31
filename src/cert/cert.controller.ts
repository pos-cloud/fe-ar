import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { promises as fs } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { Stream } from 'stream';
import { CertService } from './cert.service';
import { CreateCertDto } from './create-cert.dto';

@Controller('cert')
export class CertController {
  constructor(private readonly certService: CertService) {}

  @Post()
  async generateCert(@Body() createCertDto: CreateCertDto, @Res() res: Response) {
    try {
      const fileStream: Stream = await this.certService.generateCert(createCertDto);

      // Configura la respuesta para la descarga del archivo
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="poscloud.csr"`,
      });

      // Envía el archivo a través del stream
      fileStream.pipe(res);
    } catch (error) {
      return res.status(500).send(`Error al generar el certificado: ${error.message}`);
    }
  }

  @Post('upload-crt/:companyCUIT')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Obtén el companyCUIT de los parámetros de la URL
          const companyCUIT = req.params.companyCUIT.replace(/-/g, '');
          const dir = join('_keys', companyCUIT);
          cb(null, dir); // Establece el directorio destino
        },
        filename: (req, file, cb) => {
          // Usa el nombre fijo 'poscloud.crt' para el archivo
          cb(null, 'poscloud.crt');
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('companyCUIT') companyCUIT: string,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('Por favor, seleccione un archivo .crt');
    }

    const targetDir = join('_keys', companyCUIT).replace(/-/g, '');

    try {
      await fs.mkdir(targetDir, { recursive: true });

      return res.status(201).json({ message: 'Certificado subido.' });
    } catch (error) {
      return res.status(500).json({ error: 'Error while processing file' });
    }
  }
}

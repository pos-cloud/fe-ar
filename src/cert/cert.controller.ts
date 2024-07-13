import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CertService } from './cert.service';
import { CreateCertDto } from './create-cert.dto';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
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

  @Post('upload-crt/:companyCUIT')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const { companyCUIT } = req.params;
          const uploadPath = `./_keys/${companyCUIT}/`;
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const ext = extname(file.originalname);
          const filename = `poscloud${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype !== 'application/x-x509-ca-cert' &&
          file.mimetype !== 'application/pkix-cert'
        ) {
          return callback(
            new HttpException(
              'Only .crt files are allowed!',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadCrt(
    @UploadedFile() file: Express.Multer.File,
    @Body('companyCUIT') companyCUIT: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded!', HttpStatus.BAD_REQUEST);
    }

    return res.status(201).json({
      message: 'Archivo subido exitosamente!',
    });
  }
}

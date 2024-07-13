import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import * as mkdirp from 'mkdirp';
import { CreateCertDto } from './create-cert.dto';

@Injectable()
export class CertService {
  async generateCert(
    createCertDto: CreateCertDto,
  ): Promise<{ message: string }> {
    try {
      const { companyName, companyCUIT } = createCertDto;

      const databasePath = `./_keys`;
      const sanitizedCUIT = companyCUIT.replace(/-/g, '');
      const sanitizedName = companyName.replace(/ /g, '');

      mkdirp.sync(`${databasePath}/${sanitizedCUIT}`);

      const subj = `//C=AR/O=${sanitizedName}/CN=POSCLOUD/serialNumber=CUIT ${sanitizedCUIT}`;

      await this.executeCommand(`
        openssl genrsa -out ${databasePath}/${sanitizedCUIT}/poscloud.key 2048`);
      await this.executeCommand(`
        openssl req -new -key ${databasePath}/${sanitizedCUIT}/poscloud.key -subj "${subj}" -out ${databasePath}/${sanitizedCUIT}/poscloud.csr`);

      return { message: 'Generado Correctamente!' };
    } catch (error) {
      throw new Error(`Error al generar el certificado: ${error.message}`);
    }
  }

  private executeCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(command, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

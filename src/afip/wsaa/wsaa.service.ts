import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { TicketDeAcceso, LoginCmsReturn } from '../../models';

@Injectable()
export class WsaaService {
  private readonly logger = new Logger('WsaaService');
  private readonly endpoint =
    'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
  private readonly TAFilename: string = 'TA.xml';
  private TA: TicketDeAcceso = {
    header: {
      expirationTime: '',
      generationTime: '',
      uniqueId: 1,
    },
  };
  private readonly cert: string = 'poscloud.pem';
  private readonly keysFolder: string = '../../../_keys';
  private readonly PRIVATEKEY: string = 'poscloud.key';
  private readonly PASSPHRASE: string = '';
  private readonly pathLogs: string = './logs';

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.address = this.getFilePath('', 'wsaa.wsdl');
  }

  private formatDate(date) {
    const pad = (number) => (number < 10 ? '0' : '') + number;

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const timezoneOffset = -date.getTimezoneOffset();
    const sign = timezoneOffset >= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
    const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
  }
  private async signTRA(cuit: string): Promise<string> {
    try {
      const inputFilePath = this.getFilePath(`../resources/${cuit}`, 'TRA.xml');
      const outputFilePath = this.getFilePath(
        `../resources/${cuit}`,
        'TRA.tmp',
      );
      const certPath = this.getFilePath(
        `${this.keysFolder}/${cuit}`,
        this.cert,
      );
      const privateKeyPath = this.getFilePath(
        `${this.keysFolder}/${cuit}`,
        this.PRIVATEKEY,
      );

      await this.signWithOpenSSL(
        inputFilePath,
        outputFilePath,
        certPath,
        privateKeyPath,
        this.PASSPHRASE,
      );

      const CMS = await this.extractSignedContent(outputFilePath);
      await fs.unlink(outputFilePath);

      return CMS;
    } catch (error) {
      this.logger.error(`ERROR generating CMS signature: ${error.toString()}`);
      throw new Error(JSON.stringify(error));
    }
  }
  private getFilePath(folder: string, file: string): string {
    return path.join(__dirname, folder, file);
  }

  private signWithOpenSSL(
    inputFile: string,
    outputFile: string,
    cert: string,
    privateKey: string,
    passphrase: string,
  ): boolean {
    try {
      const result = spawnSync('openssl', [
        'cms',
        '-sign',
        '-in',
        inputFile,
        '-out',
        outputFile,
        '-signer',
        cert,
        '-inkey',
        privateKey,
        '-nodetach',
        '-outform',
        'PEM',
      ]);

      if (result.status !== 0) {
        this.logger.error(`OpenSSL error: ${result.stderr.toString()}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error signing with OpenSSL: ${error.message}`);
      return false;
    }
  }
  private async extractSignedContent(filePath: string): Promise<string> {
    const fileContent = await fs.readFile(filePath, 'utf8');
    let lines = fileContent.split('\n');
    lines.pop();
    lines.pop();
    lines.shift();

    let CMS = lines.join('\n');
    return CMS;
  }

  async getExpiration(): Promise<string | boolean> {
    try {
      if (!this.TA) {
        const TAFilePath = path.join('../resources', this.TAFilename);
        try {
          const TAFile = await fs.readFile(TAFilePath, 'utf8');
          const TAObject = await this.soapHelper.xml2Array(TAFile);
          this.TA = TAObject;
        } catch (error) {
          this.logger.error(`Error reading TA file: ${error.message}`);
          return false;
        }
      }

      if (this.TA && this.TA.header && this.TA.header.expirationTime) {
        const expirationTime = this.TA.header.expirationTime;
        const formattedExpirationTime = expirationTime
          .replace('T', ' ')
          .substring(0, 19);
        return formattedExpirationTime;
      }

      return false;
    } catch (error) {
      throw error;
    }
  }

  async generarTA(cuit: string): Promise<Object> {
    try {
      let xml = await this.createTRA(cuit);
      let cms = await this.signTRA(cuit);
      let response = await this.callWSAA(cms, cuit);
      return response;
    } catch (error) {
      throw error;
    }
  }

  private async createTRA(cuit: string): Promise<Object> {
    try {
      let traJson = {
        version: '1.0',
        header: {
          uniqueId: Math.floor(Date.now() / 1000),
          generationTime: this.formatDate(new Date(Date.now() - 60000)),
          expirationTime: this.formatDate(new Date(Date.now() + 60000)),
        },
      };
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="${traJson.version}">
    <header>
        <uniqueId>${traJson.header.uniqueId}</uniqueId>
        <generationTime>${traJson.header.generationTime}</generationTime>
        <expirationTime>${traJson.header.expirationTime}</expirationTime>
    </header>
    <service>wsfe</service>
</loginTicketRequest>
      `;
      const filePath = this.getFilePath(`../resources/${cuit}`, 'TRA.xml');
      const dirPath = path.dirname(filePath);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
      await fs.writeFile(filePath, `${xml}`, 'utf8');
      return xml;
    } catch (error) {
      throw error;
    }
  }
  private async callWSAA(cms: Object, cuit: string): Promise<Object> {
    try {
      let client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );

      let xml = {
        in0: cms,
      };
      let response: LoginCmsReturn = await this.soapHelper.callEndpoint(
        client,
        'loginCms',
        xml,
      );
      const filePath = this.getFilePath(`../resources/${cuit}`, 'TA.xml');
      const dirPath = path.dirname(filePath);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
      await fs.writeFile(filePath, `${response.loginCmsReturn}`, 'utf8');
      return response;
    } catch (error) {
      throw error;
    }
  }
}

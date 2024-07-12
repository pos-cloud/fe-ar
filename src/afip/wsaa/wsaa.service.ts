import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { TicketDeAcceso } from '../../models';

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
  private readonly cert: string = 'poscloud.crt';
  private readonly PRIVATEKEY: string = 'poscloud.key';
  private readonly PASSPHRASE: string = '';
  private readonly pathLogs: string = './logs';

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.address = this.getFilePath('', 'wsaa.wsdl');
  }

  private async signTRA(): Promise<string> {
    try {
      const inputFilePath = this.getFilePath('../resources', 'TRA.xml');
      const outputFilePath = this.getFilePath('../resources', 'TRA.tmp');
      const certPath = this.getFilePath('../resources', this.cert);
      const privateKeyPath = this.getFilePath('../resources', this.PRIVATEKEY);

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
      this.logger.error(
        `ERROR generating PKCS#7 signature: ${error.toString()}`,
      );
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
        'smime',
        '-sign',
        '-in',
        inputFile,
        '-out',
        outputFile,
        '-signer',
        cert,
        '-inkey',
        privateKey,
        '-passin',
        `pass:${passphrase}`,
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
    console.log(fileContent);
    const lines = fileContent.split('\n');
    lines.splice(lines.length - 2, 2);
    lines.splice(0, 1);
    let CMS = lines.join('\n');
    console.log(CMS);
    return CMS;
  }

  async getExpiration(): Promise<string | boolean> {
    try {
      if (!this.TA) {
        const TAFilePath = path.join('../recursos', this.TAFilename);
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

  async generarTA(): Promise<Object> {
    try {
      let xml = await this.createTRA();
      let cms = await this.signTRA();
      let response = await this.callWSAA(cms);
      return xml;
    } catch (error) {
      throw error;
    }
  }

  private async createTRA(): Promise<Object> {
    try {
      let traJson = {
        loginTicketRequest: {
          version: '1.0',
          header: {
            uniqueId: Math.floor(Date.now() / 1000),
            generationTime: new Date(Date.now() - 60000).toISOString(),
            expirationTime: new Date(Date.now() + 60000).toISOString(),
          },
        },
      };
      let xml = this.soapHelper.json2xml(traJson);
      const filePath = this.getFilePath('../resources', 'TRA.xml');
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
  private async callWSAA(cms: Object): Promise<Object> {
    try {
      let client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );

      let xml = {
        in0: cms,
      };
      let response = await this.soapHelper.callEndpoint(
        client,
        'loginCms',
        xml,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

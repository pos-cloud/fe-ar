import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as moment from 'moment-timezone';

import { SoapHelperService } from '../soap-helper/soap-helper.service';
import { TicketDeAcceso, LoginCmsReturn } from '../../models';

@Injectable()
export class WsaaService {
  private readonly logger = new Logger('WsaaService');
  private readonly endpoint: string;
  private readonly cert: string;
  private readonly privateKey: string;
  private TA: TicketDeAcceso = {};
  private readonly TAFilename: string = 'TA.xml';
  private readonly keysFolder: string = '../../../_keys';
  private readonly pathLogs: string = './logs';

  address: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.cert = 'poscloud.crt';
    this.privateKey = 'poscloud.key';
    if (['development', 'local'].includes(process.env.NODE_ENV)) {
      this.address = this.getFilePath('', 'wsaa.wsdl');
      this.endpoint = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
    } else if (process.env.NODE_ENV == 'production') {
      this.address = 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL';
      this.endpoint = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
    }
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
        this.privateKey,
      );

      await this.signWithOpenSSL(
        inputFilePath,
        outputFilePath,
        certPath,
        privateKeyPath,
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
    const lines = fileContent.split('\n');
    lines.pop();
    lines.pop();
    lines.shift();

    const CMS = lines.join('\n');
    return CMS;
  }

  async getTA(cuit: string): Promise<TicketDeAcceso | null> {
    try {
      const TAFilePath = path.join(
        __dirname,
        `../resources/${cuit}`,
        this.TAFilename,
      );
      const TAFile = await fs.readFile(TAFilePath, 'utf8');
      const TAObject = await this.soapHelper.xml2Array(TAFile);
      const TA = TAObject.loginTicketResponse;
      return TA;
    } catch (error) {
      this.logger.error(`Error reading TA file: ${error.message}`);
      return null;
    }
  }

  async getIfNotExpired(cuit: string): Promise<string | boolean> {
    try {
      let TA = await this.getTA(cuit);

      if (TA && TA.header && TA.header[0].expirationTime) {
        const expirationTime = TA.header[0].expirationTime[0];
        const formattedExpirationTime = moment.tz(
          expirationTime,
          'YYYY-MM-DDTHH:mm:ssZ',
          'America/Argentina/Buenos_Aires',
        );
        const now = moment.tz('America/Argentina/Buenos_Aires');

        return now.isBefore(formattedExpirationTime);
      }

      return false;
    } catch (error) {
      throw error;
    }
  }

  async generarTA(cuit: string): Promise<object> {
    try {
      const xml = await this.createTRA(cuit);
      const cms = await this.signTRA(cuit);
      try {
        const response = await this.callWSAA(cms, cuit);
        return response;
      } catch (error) {
        throw new Error(`${error} --------- ${xml}`);
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  private async createTRA(cuit: string): Promise<unknown> {
    try {
      const traJson = {
        version: '1.0',
        header: {
          uniqueId: Math.floor(Date.now() / 1000),
          generationTime: moment()
            .subtract(5, 'minutes')
            .tz('America/Argentina/Buenos_Aires')
            .format('YYYY-MM-DDTHH:mm:ssZ'),
          expirationTime: moment()
            .add(15, 'minutes')
            .tz('America/Argentina/Buenos_Aires')
            .format('YYYY-MM-DDTHH:mm:ssZ'),
        },
      };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
      const client = await this.soapHelper.createClient(
        this.address,
        this.endpoint,
      );

      const xml = {
        in0: cms,
      };
      const response: LoginCmsReturn = await this.soapHelper.callEndpoint(
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

import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { SoapHelperService } from '../soap-helper/soap-helper.service';

@Injectable()
export class WsaaService {
  address: string;
  database: string;
  constructor(private readonly soapHelper: SoapHelperService) {
    this.address = path.join(__dirname, 'wsaa.wsdl');
  }
  async getExpiration(): void {
    try {
      let client = await soapHelper;
      let response = await this.wsaaService.get();
      return response;
    } catch (error) {
      throw error;
    }
  }
  async generarTokenDeAcceso(): void {
    try {
    } catch (error) {
      throw error;
    }
  }
  private create_TRA(): void {
    try {
    } catch (error) {
      throw error;

    }
  }
  private sign_TRA(): void {
    try {
    } catch (error) {
      throw error;

    }
  }
  private call_WSAA(): void {
    try {
    } catch (error) {
      throw error;

    }
  }
}

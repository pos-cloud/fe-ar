import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { WsaaService } from './afip/wsaa/wsaa.service';

@Controller()
export class AppController {
  constructor(private readonly wsaaService: WsaaService) {}

  @Get()
  async test(): Promise<string> {
    try {
      let response = await this.wsaaService.generarTA();
      console.log(response);
      return '';
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  @Post('config')
  config(): string {
    return '';
  }
  @Post('transaction')
  transaction(): string {
    return '';
  }
}

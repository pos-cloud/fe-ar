import { Controller, Get, Post, Param } from '@nestjs/common';
import { WsaaService } from './afip/wsaa/wsaa.service';

@Controller()
export class AppController {
  constructor(private readonly wsaaService: WsaaService) {}

  @Get(':cuit')
  async test(@Param('cuit') cuit: string): Promise<string> {
    try {
      const response = await this.wsaaService.generarTA(cuit);
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

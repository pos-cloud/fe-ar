import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  test(): string {
    console.log('test');
  }
  @Post('config')
  config(): string {
    return this.appService.getHello();
  }
  @Post('transaction')
  transaction(): string {
    return this.appService.getHello();
  }
}

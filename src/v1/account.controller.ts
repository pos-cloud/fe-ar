import { Body, ConflictException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccountId } from '../auth/account-id.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateCuitDto } from './dto/cuit.dto';

@Controller('v1')
@UseGuards(FirebaseAuthGuard)
export class AccountController {
  constructor(private readonly firebase: FirebaseService) {}

  @Get('account')
  async account(@AccountId() uid: string) {
    const account = await this.firebase.getAccount(uid);
    return account || { uid };
  }

  @Get('cuits')
  async cuits(@AccountId() uid: string) {
    return this.firebase.listCuits(uid);
  }

  @Post('cuits')
  async createCuit(@AccountId() uid: string, @Body() dto: CreateCuitDto) {
    try {
      return await this.firebase.upsertCuit(dto.cuit, uid, dto.name || dto.cuit);
    } catch (error) {
      if (error.message === 'CUIT_TAKEN') {
        throw new ConflictException('Ese CUIT ya está asociado a otra cuenta');
      }
      throw error;
    }
  }

  @Get('usage')
  async usage(@AccountId() uid: string, @Query('period') period?: string) {
    return this.firebase.getUsage(uid, period);
  }

  @Get('usage/events')
  async events(@AccountId() uid: string, @Query('period') period?: string) {
    return this.firebase.listUsageEvents(uid, period);
  }

  @Get('api-keys')
  async listKeys(@AccountId() uid: string) {
    return this.firebase.listApiKeys(uid);
  }

  @Post('api-keys')
  async createKey(@AccountId() uid: string) {
    return this.firebase.createApiKey(uid);
  }
}

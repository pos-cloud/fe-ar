import { Test, TestingModule } from '@nestjs/testing';
import { WsaaService } from './wsaa.service';

describe('WsaaService', () => {
  let service: WsaaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WsaaService],
    }).compile();

    service = module.get<WsaaService>(WsaaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

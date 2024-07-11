import { Test, TestingModule } from '@nestjs/testing';
import { SoapHelperService } from './soap-helper.service';

describe('SoapHelperService', () => {
  let service: SoapHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoapHelperService],
    }).compile();

    service = module.get<SoapHelperService>(SoapHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

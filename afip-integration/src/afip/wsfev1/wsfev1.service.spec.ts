import { Test, TestingModule } from '@nestjs/testing';
import { Wsfev1Service } from './wsfev1.service';

describe('Wsfev1Service', () => {
  let service: Wsfev1Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Wsfev1Service],
    }).compile();

    service = module.get<Wsfev1Service>(Wsfev1Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

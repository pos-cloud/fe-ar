import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseService } from '../firebase/firebase.service';
import { AfipPadronService } from './afip-padron.service';
import { PadronService } from './padron/padron.service';
import { WSAA_SERVICE_PADRON, WsaaService } from './wsaa/wsaa.service';

describe('AfipPadronService', () => {
  let service: AfipPadronService;
  const firebase = {
    getCuit: jest.fn(),
  };
  const wsaaService = {
    getIfNotExpired: jest.fn(),
    generarTA: jest.fn(),
    getTA: jest.fn(),
  };
  const padronService = {
    getPersona: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AfipPadronService,
        { provide: FirebaseService, useValue: firebase },
        { provide: WsaaService, useValue: wsaaService },
        { provide: PadronService, useValue: padronService },
      ],
    }).compile();

    service = module.get(AfipPadronService);
    wsaaService.getIfNotExpired.mockResolvedValue(true);
    wsaaService.getTA.mockResolvedValue({
      credentials: [{ token: ['tok'], sign: ['sig'] }],
    });
  });

  it('usa el CUIT consultante para autenticar y consulta el otro en ARCA', async () => {
    firebase.getCuit.mockResolvedValue({
      cuit: '20111111112',
      accountId: 'acc',
      status: 'ready',
    });
    padronService.getPersona.mockResolvedValue({
      personaReturn: {
        datosGenerales: {
          razonSocial: 'EMPRESA SA',
          tipoPersona: 'JURIDICA',
          estadoClave: 'ACTIVO',
          domicilioFiscal: {
            direccion: 'CALLE 1',
            localidad: 'CABA',
            descripcionProvincia: 'CIUDAD AUTONOMA BUENOS AIRES',
            codPostal: '1000',
          },
        },
        datosRegimenGeneral: {
          impuesto: [{ idImpuesto: 30, descripcionImpuesto: 'IVA', estadoImpuesto: 'ACTIVO' }],
        },
      },
    });

    const result = await service.lookup('acc', '30-71234567-8', '20-11111111-2');

    expect(wsaaService.getIfNotExpired).toHaveBeenCalledWith('20111111112', WSAA_SERVICE_PADRON);
    expect(padronService.getPersona).toHaveBeenCalledWith(
      'tok',
      'sig',
      '20111111112',
      '30712345678',
    );
    expect(result.cuit).toBe('30712345678');
    expect(result.razonSocial).toBe('EMPRESA SA');
  });

  it('rechaza un consultante que no es de la cuenta', async () => {
    firebase.getCuit.mockResolvedValue({ cuit: '20111111112', accountId: 'otra', status: 'ready' });
    await expect(service.lookup('acc', '30712345678', '20111111112')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('exige certificado listo en el consultante', async () => {
    firebase.getCuit.mockResolvedValue({
      cuit: '20111111112',
      accountId: 'acc',
      status: 'pending_crt',
    });
    await expect(service.lookup('acc', '30712345678', '20111111112')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('devuelve 404 si ARCA no encuentra la persona', async () => {
    firebase.getCuit.mockResolvedValue({ cuit: '20111111112', accountId: 'acc', status: 'ready' });
    padronService.getPersona.mockResolvedValue({
      personaReturn: {
        errorConstancia: { error: 'No existe persona con ese Id' },
      },
    });
    await expect(service.lookup('acc', '30712345678', '20111111112')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

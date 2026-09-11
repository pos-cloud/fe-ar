import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IssueInvoiceDto } from '../v1/dto/issue-invoice.dto';
import { AfipInvoiceService } from './afip-invoice.service';
import { WsaaService } from './wsaa/wsaa.service';
import { Wsfev1Service } from './wsfev1/wsfev1.service';

describe('AfipInvoiceService', () => {
  let service: AfipInvoiceService;
  const wsaaService = {
    getIfNotExpired: jest.fn(),
    generarTA: jest.fn(),
    getTA: jest.fn(),
  };
  const wsfev1Service = {
    buscarUltimoComprobanteAutorizado: jest.fn(),
    solicitarCAE: jest.fn(),
  };

  const baseDto = (): IssueInvoiceDto => ({
    cuit: '20378228922',
    puntoVenta: 1,
    tipoComprobante: 6,
    receptor: { docTipo: 99, docNro: '0', condicionIva: 5 },
    importes: { neto: 1000, iva: 210, exento: 0, total: 1210 },
    ivas: [{ id: 5, baseImp: 1000, importe: 210 }],
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AfipInvoiceService,
        { provide: WsaaService, useValue: wsaaService },
        { provide: Wsfev1Service, useValue: wsfev1Service },
      ],
    }).compile();
    service = module.get(AfipInvoiceService);
    wsaaService.getIfNotExpired.mockResolvedValue(true);
    wsaaService.getTA.mockResolvedValue({
      credentials: [{ token: ['tok'], sign: ['sig'] }],
    });
    wsfev1Service.buscarUltimoComprobanteAutorizado.mockResolvedValue({ CbteNro: 10 });
    wsfev1Service.solicitarCAE.mockResolvedValue({
      FeDetResp: {
        FECAEDetResponse: [{ CAE: '1', CAEFchVto: '20260920', Observaciones: { Obs: [] } }],
      },
    });
  });

  it('sigue mandando PES, cotización 1 y concepto 1 si no vienen', async () => {
    await service.issue(baseDto());
    const det = wsfev1Service.solicitarCAE.mock.calls[0][4];
    expect(det.Concepto).toBe(1);
    expect(det.MonId).toBe('PES');
    expect(det.MonCotiz).toBe(1);
    expect(det.FchServDesde).toBeNull();
    expect(det.CanMisMonExt).toBeUndefined();
  });

  it('mapea servicios y fechas a ARCA', async () => {
    await service.issue({
      ...baseDto(),
      concepto: 2,
      fechaServicioDesde: '2026-09-01',
      fechaServicioHasta: '2026-09-30',
      fechaVtoPago: '2026-10-10',
    });
    const det = wsfev1Service.solicitarCAE.mock.calls[0][4];
    expect(det.Concepto).toBe(2);
    expect(det.FchServDesde).toBe('20260901');
    expect(det.FchServHasta).toBe('20260930');
    expect(det.FchVtoPago).toBe('20261010');
  });

  it('exige las tres fechas si concepto es servicios', async () => {
    await expect(service.issue({ ...baseDto(), concepto: 2 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('acepta USD como DOL y pide cotización', async () => {
    await service.issue({ ...baseDto(), moneda: 'USD', cotizacion: 1450.5 });
    const det = wsfev1Service.solicitarCAE.mock.calls[0][4];
    expect(det.MonId).toBe('DOL');
    expect(det.MonCotiz).toBe(1450.5);
    expect(det.CanMisMonExt).toBe('S');
  });

  it('rechaza moneda extranjera sin cotización', async () => {
    await expect(service.issue({ ...baseDto(), moneda: 'DOL' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

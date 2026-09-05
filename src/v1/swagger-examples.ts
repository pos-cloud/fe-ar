export const facturaBExample = {
  cuit: '20378228922',
  puntoVenta: 1,
  tipoComprobante: 6,
  fecha: '2026-08-29',
  receptor: { docTipo: 99, docNro: '0', condicionIva: 5 },
  importes: { neto: 1000, iva: 210, exento: 0, total: 1210 },
  ivas: [{ id: 5, baseImp: 1000, importe: 210 }],
};

export const facturaAExample = {
  cuit: '20378228922',
  puntoVenta: 1,
  tipoComprobante: 1,
  receptor: { docTipo: 80, docNro: '30712345678', condicionIva: 1 },
  importes: { neto: 10000, iva: 2100, exento: 0, total: 12100 },
  ivas: [{ id: 5, baseImp: 10000, importe: 2100 }],
};

export const facturaCExample = {
  cuit: '20378228922',
  puntoVenta: 1,
  tipoComprobante: 11,
  vatCondition: 6,
  receptor: { docTipo: 96, docNro: '30111222', condicionIva: 5 },
  importes: { neto: 1500, iva: 0, exento: 0, total: 1500 },
};

export const notaCreditoExample = {
  cuit: '20378228922',
  puntoVenta: 1,
  tipoComprobante: 8,
  receptor: { docTipo: 99, docNro: '0', condicionIva: 5 },
  importes: { neto: 1000, iva: 210, exento: 0, total: 1210 },
  ivas: [{ id: 5, baseImp: 1000, importe: 210 }],
  comprobantesAsociados: [{ tipo: 6, puntoVenta: 1, numero: 128 }],
};

export const invoiceOkExample = {
  data: {
    number: 129,
    CAE: '74123456789012',
    CAEExpirationDate: '20260911',
  },
  message: 'Successful',
};

export const invoiceErrorExample = {
  data: {
    number: 129,
    CAE: '',
    CAEExpirationDate: '',
  },
  message: '10016 - El campo CbteFch debe estar comprendido en el rango permitido',
};

export const padronOkExample = {
  cuit: '30712345678',
  razonSocial: 'EMPRESA SA',
  tipoPersona: 'JURIDICA',
  estadoClave: 'ACTIVO',
  tipoClave: 'CUIT',
  condicionIva: { id: 1, descripcion: 'IVA Responsable Inscripto' },
  domicilio: {
    direccion: 'CALLE 1',
    localidad: 'CABA',
    provincia: 'CIUDAD AUTONOMA BUENOS AIRES',
    codPostal: '1000',
  },
  impuestos: [{ id: 30, descripcion: 'IVA', estado: 'ACTIVO' }],
};

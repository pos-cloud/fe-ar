export interface PadronDomicilio {
  direccion?: string;
  localidad?: string;
  provincia?: string;
  codPostal?: string;
}

export interface PadronCondicionIva {
  id: number;
  descripcion: string;
}

export interface PadronImpuesto {
  id: number;
  descripcion?: string;
  estado?: string;
}

export interface PadronPersona {
  cuit: string;
  razonSocial?: string;
  tipoPersona?: string;
  estadoClave?: string;
  tipoClave?: string;
  condicionIva?: PadronCondicionIva;
  domicilio?: PadronDomicilio;
  impuestos?: PadronImpuesto[];
}

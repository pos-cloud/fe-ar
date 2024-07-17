interface TicketDeAcceso {
  header?: [
    {
      uniqueId: Array<string>;
      generationTime: Array<string>;
      expirationTime: Array<string>;
      source?: Array<string>;
      destination?: Array<string>;
    },
  ];
  credentials?: [
    {
      token: Array<string>;
      sign: Array<string>;
    },
  ];
}
interface LoginCmsReturn {
  loginCmsReturn?: string;
}
interface TransactionConfig {
  companyIdentificationValue: number;
  vatCondition: number;
}
interface Transaction {
  origin: number;
  letter: string;
  exempt: number;
  totalPrice: number;
  taxes: [
    {
      percentage: number;
      taxBase: number;
      taxAmount: number;
      _id: string;
      tax: {
        _id: string;
        operationType: string;
        creationDate: string;
        creationUser: string;
        name: string;
        __v: number;
        amount: number;
        classification: string;
        code: string;
        lastNumber: number;
        percentage: number;
        taxBase: string;
        type: string;
        updateDate: string;
        updateUser: string;
      };
    },
  ];
  type: {
    electronics: boolean;
    transactionMovement: string;
    codes: [
      {
        code: number;
        _id: string;
        letter: string;
      },
    ];
  };
  company: {
    identificationType: {
      code: string;
    };
    identificationValue: string;
  };
  optionalAFIP: any;
}
interface canceledTransactions {
  code: number;
  origin: number;
  letter: string;
  number: number;
}
interface FECompUltimoAutorizado {
  CbteNro: number;
  CbteTipo: number;
  PtoVta: number;
}
interface FECAESolicitar {
  FeCabResp?: {
    Cuit: string;
    PtoVta: number;
    CbteTipo: number;
    FchProceso: string;
    CantReg: number;
    Resultado: string;
    Reproceso: string;
  };
  FeDetResp?: {
    FECAEDetResponse: {
      Concepto: string;
      DocTipo: string;
      DocNro: string;
      CbteDesde: number;
      CbteHasta: number;
      CbteFch: string;
      Resultado: string;
      CAE: string;
      CAEFchVto: string;
    };
  };
  Events?: {
    Evt: {
      Code: number;
      Msg: string;
    };
  };
}

export type {
  TicketDeAcceso,
  LoginCmsReturn,
  Transaction,
  TransactionConfig,
  canceledTransactions,
  FECompUltimoAutorizado,
  FECAESolicitar,
};

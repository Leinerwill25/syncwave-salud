export interface BancaribeToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  obtained_at: number;
}

export interface BancaribeNotificacion {
  amount: number;
  bankName: string;
  clientPhone: string;
  commercePhone: string;
  creditorAccount: string;
  currencyCode: string;
  date: string; // "DD-MM-YYYY"
  debtorAccount: string;
  debtorID: string;
  destinyBankReference: string;
  originBankCode: string;
  originBankReference: string;
  paymentType: string; // P2P | TRF | DEP
  time: string; // "HH:MM:SS"
  Udf1?: string;
  Udf2?: string;
  Udf3?: string;
}

export interface BancaribeOperacionResponse {
  success: boolean;
  data: {
    success: string;
    ejecucion: string;
    descripcion: string;
    docCliente: string;
    telfCtaCliente: string;
    fecha: string;
    hora: string;
    signo: string; // C = Credito, D = Debito
    valor: string;
    secuencial: string;
    estadoEjecucion: string;
  };
}

export interface BancaribeHistoricoItem {
  cedulaCliente: string;
  fechaTransaccion: string;
  horaTransaccion: string;
  monto: string;
  tlfCliente: string;
  estadoEjecucion: string;
  descripcion: string;
  signo: string;
  codigoConfirmacion: string;
  estadoTransaccion: string;
  concepto: string;
}

export interface BancaribeMovimientoItem {
  fecha: string;
  hora: string;
  tipo: string;
  monto: number;
  referencia: string;
  descripcion: string;
  banco: string;
  telefono: string;
  signo: string; // C = Credito, D = Debito
}

export interface BancaribeExtractoItem {
  txnAmount: number;
  txnAuxCode: string;
  txnCode: string;
  txnConcept: string;
  txnDate: string;
  txnDestinationAccount: string;
  txnDestinationBankName: string;
  txnFlow: string; // Ingreso | Egreso
  txnId: string;
  txnOriginBankName: string;
  txnRefPrimary: string;
  txnType: string;
}

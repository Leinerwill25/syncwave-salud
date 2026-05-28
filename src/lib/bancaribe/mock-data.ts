// Datos ficticios realistas para demo en Vercel
// Simula un consultorio médico llamado "Consultorio Dr. González"

export const MOCK_MOVIMIENTOS = {
  movimientos: [
    {
      fecha: '2026-05-24',
      hora: '09:15:00',
      tipo: 'P2P',
      monto: 150.00,
      referencia: '254151380',
      descripcion: 'Pago móvil recibido',
      banco: 'BANCO MERCANTIL',
      telefono: '04141234567',
      signo: 'C',  // C = Crédito (ingreso)
    },
    {
      fecha: '2026-05-24',
      hora: '10:30:00',
      tipo: 'TRF',
      monto: 200.00,
      referencia: '254151381',
      descripcion: 'Transferencia recibida',
      banco: 'BANCO PROVINCIAL',
      telefono: '04241234568',
      signo: 'C',
    },
    {
      fecha: '2026-05-23',
      hora: '14:00:00',
      tipo: 'P2P',
      monto: 120.00,
      referencia: '254151379',
      descripcion: 'Pago móvil recibido',
      banco: 'BANESCO',
      telefono: '04161234569',
      signo: 'C',
    },
  ],
};

export const MOCK_EXTRACTO = {
  data: [
    {
      txnAmount: 150.00,
      txnAuxCode: '00',
      txnCode: '18568',
      txnConcept: 'Consulta general - Paciente: María García',
      txnDate: '2026-05-24 09:15:00',
      txnDestinationAccount: '01140000000000000001',
      txnDestinationBankName: 'Bancaribe',
      txnFlow: 'Ingreso',
      txnId: '11111111',
      txnOriginBankName: 'BANCO MERCANTIL',
      txnRefPrimary: '254151380',
      txnType: 'PM',
    },
    {
      txnAmount: 200.00,
      txnAuxCode: '00',
      txnCode: '18570',
      txnConcept: 'Consulta especialista - Paciente: Carlos Rodríguez',
      txnDate: '2026-05-24 10:30:00',
      txnDestinationAccount: '01140000000000000001',
      txnDestinationBankName: 'Bancaribe',
      txnFlow: 'Ingreso',
      txnId: '11111112',
      txnOriginBankName: 'BANCO PROVINCIAL',
      txnRefPrimary: '254151381',
      txnType: 'TRF',
    },
  ],
  pagination: { hasMore: false, limit: 50, page: 1 },
};

export const MOCK_HISTORICO = {
  cedulaCliente: 'V12345678',
  fechaTransaccion: '2026-05-24 00:00:00.0',
  horaTransaccion: '2026-05-24 09:15:00.000',
  monto: '150.00',
  tlfCliente: '04141234567',
  estadoEjecucion: '0',
  descripcion: 'EJECUTADO CORRECTAMENTE',
  signo: 'C',
  codigoConfirmacion: '000945672279',
  estadoTransaccion: 'EJ',
  concepto: 'Consulta médica',
};

export const MOCK_NOTIFICACION_PAGO = {
  amount: 150,
  bankName: 'BANCO MERCANTIL',
  clientPhone: '00584141234567',
  commercePhone: '00584168327199',
  creditorAccount: '01140152001520123861',
  currencyCode: 'VES',
  date: new Date().toLocaleDateString('es-VE'),
  debtorAccount: '01050152001520123746',
  debtorID: '12345678',
  destinyBankReference: '000254151380',
  originBankCode: '0105',
  originBankReference: '254151380',
  paymentType: 'P2P',
  time: new Date().toLocaleTimeString('es-VE'),
};

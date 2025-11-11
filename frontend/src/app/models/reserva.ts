/**
 * Modelo de Reserva
 */
export interface Reserva {
  id?: number;
  idreservacm: number;
  numeroreservacm: string;
  coduh: string;
  nome_hospede: string;
  contato: string;
  email: string;
  data_checkin: string;
  data_checkout: string;
  qtd_hospedes: number;
}

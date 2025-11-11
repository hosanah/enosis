/**
 * Modelo de Evento
 */
export interface Evento {
  id?: number;
  nome: string;
  descricao?: string;
  data: string; // ISO string
  hora: string;
  restauranteId: number;
  restaurante?: string;
}

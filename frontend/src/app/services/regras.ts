import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Regra {
  id: number;
  chave: string;
  descricao: string;
  ativo: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegraService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getRegras(): Observable<Regra[]> {
    return this.http.get<Regra[]>(`${this.API_URL}/regras`);
  }

  updateRegra(id: number, ativo: boolean): Observable<any> {
    return this.http.put(`${this.API_URL}/regras/${id}`, { ativo });
  }
}

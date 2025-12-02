/**
 * Componente principal da aplicação
 * Contém apenas o router outlet para navegação
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingComponent } from './components/loading/loading';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingComponent],
  template: `
    <app-loading></app-loading>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {
  title = 'Sistema de Agendamento de Temáticos';
}

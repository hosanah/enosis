/**
 * Componente principal da aplicação
 * Contém apenas o router outlet para navegação
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingComponent } from './components/loading/loading';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoadingComponent, ToastModule],
  template: `
    <app-loading></app-loading>
    <p-toast position="top-right" [preventOpenDuplicates]="true"></p-toast>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {
  title = 'Sistema de Agendamento de Temáticos';
}

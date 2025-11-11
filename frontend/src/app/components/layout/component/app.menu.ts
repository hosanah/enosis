import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
  model: MenuItem[] = [];

  ngOnInit() {
    this.model = [
      {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
      },
      {
        label: 'Operacional',
        items: [
            { label: 'Reserva Evento', icon: 'pi pi-fw pi-calendar-clock', routerLink: ['/reserva-evento'] },
        ]
      },
      {
        label: 'Cadastros',
        items: [
            { label: 'Usuários', icon: 'pi pi-fw pi pi-user', routerLink: ['/users'] },
            { label: 'Restaurantes', icon: 'pi pi-fw pi-briefcase', routerLink: ['/restaurantes'] },
            { label: 'Diretrizes', icon: 'pi pi-fw pi-file', routerLink: ['/diretrizes'] },
            { label: 'Eventos', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/eventos'] },
            { label: 'Reservas CM', icon: 'pi pi-fw pi-address-book', routerLink: ['/reservas'] },
        ]
      },
    ];
  }
}

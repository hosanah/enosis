import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { LayoutService } from '../service/layout.service';
import { AuthService, User } from '../../../services/auth';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, MenuModule],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
                <span>Enotemático</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                    <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                </button>
            </div>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <button type="button" class="layout-topbar-action" (click)="userMenu.toggle($event)">
                        <i class="pi pi-user"></i>
                    </button>
                    <p-menu #userMenu [model]="menuItems" [popup]="true" styleClass="user-menu">
                        <ng-template pTemplate="start">
                            <div class="p-2">
                                <div class="font-bold">{{ user?.fullName }}</div>
                                <div class="text-sm text-color-secondary">{{ user?.username }}</div>
                            </div>
                        </ng-template>
                    </p-menu>
                </div>
            </div>
        </div>
    </div>`
})
export class AppTopbar {
    menuItems!: MenuItem[];
    user: User | null;

    constructor(public layoutService: LayoutService, private authService: AuthService, private router: Router) {
        this.user = this.authService.getCurrentUser();
        this.menuItems = [
            { label: 'Trocar senha', command: () => this.onChangePassword() },
            { label: 'Logout', command: () => this.onLogout(), styleClass: 'p-menuitem-danger' }
        ];
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    onChangePassword() {
        this.router.navigate(['/change-password']);
    }

    onLogout() {
        this.authService.logout().subscribe();
    }
}

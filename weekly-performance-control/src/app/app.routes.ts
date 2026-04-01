import { Routes } from '@angular/router';

/**
 * Rutas de la aplicación Angular 17
 * Configured para lazy loading y preload de módulos críticos
 */
export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then((m) => m.LoginComponent),
    data: { title: 'Login' }
  },
  {
    path: 'performance-control',
    loadComponent: () =>
      import('./components/performance-control/performance-control.component').then(
        (m) => m.PerformanceControlComponent
      ),
    data: { title: 'Control de Rendimiento' }
  },
  {
    path: 'supervisor-mode',
    loadComponent: () =>
      import('./components/supervisor-mode/supervisor-mode.component').then(
        (m) => m.SupervisorModeComponent
      ),
    data: { title: 'Modo Supervisor' }
  },
  {
    path: 'admin-mode',
    loadComponent: () =>
      import('./components/admin-mode/admin-mode.component').then(
        (m) => m.AdminModeComponent
      ),
    data: { title: 'Modo Administrador' }
  },
  {
    path: 'firma-colaborador',
    loadComponent: () =>
      import('./components/firma-colaborador/firma-colaborador.component').then(
        (m) => m.FirmaColaboradorComponent
      ),
    data: { title: 'Firma Digital' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];

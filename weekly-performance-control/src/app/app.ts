import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceControlComponent } from './components/performance-control/performance-control.component';
import { LoginComponent } from './components/login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { UserRole } from './models';

/**
 * COMPONENTE RAÍZ DE LA APLICACIÓN
 * ==================================================
 * Gestiona:
 * - Flujo de autenticación (login → app)
 * - Alternancia entre vista login y app principal
 * - Navbar con usuario, semana, año y estado de sincronización
 * - Comunicación entre componentes (eventos y propiedades)
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PerformanceControlComponent, LoginComponent, NavbarComponent, FormsModule],
  styleUrl: './app.css',
  template: `
    <!-- VISTA DE LOGIN -->
    <div *ngIf="!isLoggedIn()">
      <app-login (loginSuccess)="onLoginSuccess($event)"></app-login>
    </div>

    <!-- VISTA PRINCIPAL (después de login exitoso) -->
    <div *ngIf="isLoggedIn()" class="app-wrapper">
      
      <!-- NAVEGACIÓN SUPERIOR -->
      <app-navbar
        [username]="currentUsername"
        [semana]="currentSemana"
        [anio]="currentAnio"
        [area]="areaId"
        [syncStatus]="syncStatus"
        (logout)="onLogout()">
      </app-navbar>

      <!-- CONTENIDO PRINCIPAL -->
      <main class="app-content">
        <app-performance-control
          [userRole]="UserRole.SUPERVISOR"
          [areaId]="areaId"
          [idSupervisor]="supervisorId"
          (areasDataChanged)="onAreasDataChanged($event)"
          (datosParaExcel)="onDatosParaExcel($event)">
        </app-performance-control>
      </main>
    </div>
  `
})
export class App {
  // ===== PROPIEDADES PÚBLICAS =====
  protected readonly title = signal('weekly-performance-control'); // Título de la app
  public readonly UserRole = UserRole; // Enum de roles para el template

  // ===== AUTENTICACIÓN (SIGNAL) =====
  // Signal: Propiedad reactiva que actualiza automáticamente la UI
  public isLoggedIn = signal(false); // Banderaprincipal: Usuario autenticado?

  // ===== DATOS DEL USUARIO AUTENTICADO =====
  public currentUsername = ''; // Nombre del usuario en sesión
  public supervisorId = ''; // ID único del supervisor
  public areaId = 'AREA_1'; // Área asignada (predefinida por ahora)

  // ===== DATOS DE CONTEXTO =====
  public currentSemana = new Date().getWeek(); // Semana ISO actual
  public currentAnio = new Date().getFullYear(); // Año actual
  public syncStatus: 'sincronizado' | 'local' | 'desincronizado' = 'local'; // Estado sync

  /**
   * Manejador de evento: Login exitoso
   * Se ejecuta cuando el usuario inicia sesión correctamente
   * @param event - Datos enviados por LoginComponent
   */
  onLoginSuccess(event: { username: string; idSupervisor: string }): void {
    this.currentUsername = event.username; // Guardar nombre del usuario
    this.supervisorId = event.idSupervisor; // Guardar ID único
    this.isLoggedIn.set(true); // Cambiar a vista principal
  }

  /**
   * Manejador de evento: Logout
   * Limpia sesión y vuelve a login
   */
  onLogout(): void {
    this.isLoggedIn.set(false); // Volver a vista de login
    this.currentUsername = ''; // Limpiar datos
    this.supervisorId = '';
  }

  /**
   * Manejador de evento: Areas actualizadas
   * Se ejecuta cuando se modifica un área en admin mode
   * @param event - Datos de las áreas actualizadas
   */
  onAreasDataChanged(event: any): void {
    console.log('Areas actualizadas', event);
    // TODO: Implementar lógica si es necesario
  }

  /**
   * Manejador de evento: Datos listos para Excel
   * Se ejecuta cuando se genera un registro de rendimiento
   * Actualiza estado de sincronización a "sincronizado"
   * @param event - Registro de rendimiento generado
  */
  onDatosParaExcel(event: any): void {
    console.log('Registro para Excel', event);
    // Cambiar estado a sincronizado después de guardar
    this.syncStatus = 'sincronizado';
    // TODO: Implementar sync real con Excel Online API
  }
}

/**
 * EXTENSIÓN GLOBAL: Método getWeek() en Date
 * Calcula el número de semana ISO para cualquier fecha
 * Requiere declaración global de la interfaz
 */
declare global {
  interface Date {
    getWeek(): number;
  }
}

/**
 * Implementación: Calcula semana ISO (1-53)
 * Fórmula estándar ISO 8601
 * Se usa: new Date().getWeek() → número de semana actual
 */
Date.prototype.getWeek = function (): number {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7; // Ajustar lunes como 1
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Encontrar jueves de esa semana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

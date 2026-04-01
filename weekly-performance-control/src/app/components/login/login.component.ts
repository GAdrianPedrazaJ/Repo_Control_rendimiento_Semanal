import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

/**
 * COMPONENTE LOGIN
 * ==================================================
 * Sistema de autenticación simple (Semi-Login) sin contraseña
 * El usuario solo necesita ingresar su nombre de usuario
 * Proporciona usuarios de prueba para acceso rápido
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // ===== OUTPUTS (Eventos emitidos) =====
  @Output() loginSuccess = new EventEmitter<{ username: string; idSupervisor: string }>();

  // ===== PROPIEDADES DEL COMPONENTE =====
  username = ''; // Nombre de usuario ingresado
  cargando = false; // Bandera para mostrar estado de carga
  error = ''; // Mensaje de error

  // ===== USUARIOS DE PRUEBA =====
  // Array de usuarios predefinidos para demo rápida
  demoUsers = [
    { username: 'Ana García', idSupervisor: 'SUP_AG_0001' },
    { username: 'Carlos López', idSupervisor: 'SUP_CL_0002' },
    { username: 'Miriam Hernández', idSupervisor: 'SUP_MH_0003' }
  ];

  /**
   * Maneja el login manual con nombre de usuario
   * Simula una verificación en backend antes de emitir el evento
   */
  onIngresar(): void {
    // Validar que el campo no esté vacío
    if (!this.username.trim()) {
      this.error = 'Por favor ingresa tu nombre de usuario';
      return;
    }

    this.cargando = true;
    this.error = '';

    // Simular verificación en backend (1 segundo)
    // En producción: hacer llamada HTTP a servicio de autenticación
    setTimeout(() => {
      // Generar ID único de supervisor basado en nombre y timestamp
      const idSupervisor = `SUP_${this.username.substring(0, 2).toUpperCase()}_${Date.now().toString().slice(-4)}`;
      
      // Emitir evento de login exitoso
      this.loginSuccess.emit({ username: this.username, idSupervisor });
      this.cargando = false;
    }, 1000);
  }

  /**
   * Maneja el login con usuario de prueba predefinido
   * Acceso rápido sin escribir nombre
   * @param demoUser - Usuario de prueba seleccionado
   */
  onDemoLogin(demoUser: { username: string; idSupervisor: string }): void {
    this.cargando = true;
    this.error = '';

    // Simular latencia (800 ms)
    setTimeout(() => {
      this.loginSuccess.emit(demoUser);
      this.cargando = false;
    }, 800);
  }

  /**
   * Detector de tecla Enter en el campo de username
   * Permite submit presionando Enter en lugar de hacer click
   * @param event - Evento de teclado
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onIngresar();
    }
  }
}

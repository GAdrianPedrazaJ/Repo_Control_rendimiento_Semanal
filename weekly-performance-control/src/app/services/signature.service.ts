import { Injectable } from '@angular/core';
import { TokenFirma } from '../models';

/**
 * SignatureService
 * Gestiona la generación y validación de tokens de firma digital
 * - Genera TokenFirma en Base64
 * - Proporciona timestamp ISO
 * - Maneja bloqueo de filas tras firma
 */
@Injectable({
  providedIn: 'root'
})
export class SignatureService {
  constructor() {}

  /**
   * Generar un Token de Firma Digital
   * Estructura: { firmado: true, timestamp_iso, id_colaborador, id_registro }
   * Codificado en Base64 para auditoría
   */
  generarTokenFirma(
    id_colaborador: string,
    id_registro: string
  ): TokenFirma {
    const timestamp_iso = new Date().toISOString();

    const tokenObj = {
      firmado: true,
      timestamp_iso,
      id_colaborador,
      id_registro
    };

    // Convertir a JSON y codificar en Base64
    const jsonString = JSON.stringify(tokenObj);
    const base64Token = this.encodeBase64(jsonString);

    return {
      firmado: true,
      timestamp_iso,
      id_colaborador,
      id_registro,
      valor_base64: base64Token
    };
  }

  /**
   * Decodificar un Token de Firma desde Base64
   * Retorna el objeto original para validación/auditoría
   */
  decodificarTokenFirma(base64Token: string): any {
    try {
      const jsonString = this.decodeBase64(base64Token);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('✗ Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Validar que un Token es válido y no fue tampoco
   * Comprueba:
   * - Estructura correcta
   * - Timestamp en formato ISO válido
   * - IDs no vacíos
   */
  validarTokenFirma(token: TokenFirma): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!token.firmado) {
      errores.push('Token debe tener firmado = true');
    }

    if (!token.timestamp_iso) {
      errores.push('Token falta timestamp_iso');
    } else if (!this.esTimestampISOValido(token.timestamp_iso)) {
      errores.push(`Timestamp inválido: ${token.timestamp_iso}`);
    }

    if (!token.id_colaborador || token.id_colaborador.trim() === '') {
      errores.push('Token falta id_colaborador');
    }

    if (!token.id_registro || token.id_registro.trim() === '') {
      errores.push('Token falta id_registro');
    }

    if (token.valor_base64) {
      try {
        const decoded = this.decodificarTokenFirma(token.valor_base64);
        if (!decoded) {
          errores.push('Token Base64 no puede decodificarse');
        }
      } catch (e) {
        errores.push('Token Base64 corrupto');
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Generar marca de tiempo ISO (UTC)
   */
  generarTimestampISO(): string {
    return new Date().toISOString();
  }

  /**
   * Validar que una cadena es un timestamp ISO válido
   */
  esTimestampISOValido(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return date instanceof Date && !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Obtener fecha legible desde timestamp ISO
   * Formato: "27 Mar 2026, 14:30:45"
   */
  formatearTimestamp(timestamp: string, formato: 'corto' | 'largo' = 'corto'): string {
    try {
      const date = new Date(timestamp);

      if (formato === 'corto') {
        return date.toLocaleString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else {
        return date.toLocaleString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch {
      return timestamp; // Retornar original si falla
    }
  }

  /**
   * =========================================================================
   * UTILIDADES PRIVADAS
   * =========================================================================
   */

  /**
   * Codificar cadena a Base64
   */
  private encodeBase64(str: string): string {
    try {
      // En navegador, usar btoa
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.error('✗ Error codificando Base64:', error);
      return '';
    }
  }

  /**
   * Decodificar cadena desde Base64
   */
  private decodeBase64(str: string): string {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (error) {
      console.error('✗ Error decodificando Base64:', error);
      return '';
    }
  }

  /**
   * =========================================================================
   * LÓGICA DE BLOQUEO DE FILAS
   * =========================================================================
   */

  /**
   * Marcar un colaborador como readonly tras firma
   * (Para uso en template: desabilitar inputs, cambiar opacidad, etc.)
   */
  marcarComoReadonly(id_colaborador: string): { esReadonly: boolean; motivo: string } {
    return {
      esReadonly: true,
      motivo: `Colaborador ${id_colaborador} firmó su rendimiento. Los datos son inmutables.`
    };
  }

  /**
   * Obtener HTML/CSS para indicador visual de fila firmada
   */
  obtenerEstiloFilaFirmada(): { className: string; tooltip: string } {
    return {
      className: 'fila-firmada', // CSS class
      tooltip: 'Fila firmada - Solo lectura'
    };
  }
}

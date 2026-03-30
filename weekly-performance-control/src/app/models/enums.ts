/**
 * Enumeraciones para tipos y estados en el sistema
 */

/**
 * Rol del usuario: Admin (gestión) o Supervisor (captura)
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR'
}

/**
 * Estado del colaborador en el sistema
 */
export enum EstadoColaborador {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO'
}

/**
 * Estado de sincronización con Excel
 */
export enum EstadoSync {
  PENDIENTE = 'PENDIENTE',
  SINCRONIZADO = 'SINCRONIZADO',
  ERROR = 'ERROR'
}

/**
 * Estados de firma del colaborador
 */
export enum EstadoFirma {
  NO_FIRMADO = 'NO_FIRMADO',
  FIRMADO = 'FIRMADO',
  REVOCADO = 'REVOCADO'
}

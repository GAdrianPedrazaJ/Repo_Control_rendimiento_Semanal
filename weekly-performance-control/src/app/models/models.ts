import { EstadoColaborador, EstadoSync, EstadoFirma } from './enums';

/**
 * ============================================================================
 * MODELOS DE ÁREAS
 * ============================================================================
 */

/**
 * Interfaz para un Área de trabajo (Bloque A, B, etc.)
 */
export interface Area {
  id_area: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoColaborador;
  timestamp_creacion: string; // ISO format
  timestamp_actualizacion?: string;
}

/**
 * ============================================================================
 * MODELOS DE COLABORADORES
 * ============================================================================
 */

/**
 * Estructura de un día laboral (lunes-domingo)
 * Almacena el valor en tallos/hora
 */
export interface DiaSemanal {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  valor: number | null; // null = no trabajó ese día
}

/**
 * Interfaz para un Colaborador (trabajador)
 */
export interface Colaborador {
  id_colaborador: string;
  nombre: string;
  cargo: string; // Ej: "Operario de Corte", "Postcosecha", etc.
  id_area: string; // Referencia al Área asignada
  estado: EstadoColaborador;
  timestamp_creacion: string;
  timestamp_actualizacion?: string;
  // Campos dinámicos (llenados durante captura)
  dias?: DiaSemanal[];
  promedio?: number; // Calculado automáticamente
  esReadonly?: boolean; // Si fue firmado, fila es readonly
}

/**
 * ============================================================================
 * MODELOS DE FIRMA DIGITAL
 * ============================================================================
 */

/**
 * Token de firma digital (Base64 encoded JSON)
 * Almacena evidencia de que el colaborador aceptó sus datos
 */
export interface TokenFirma {
  firmado: boolean;
  timestamp_iso: string; // Hora exacta en UTC
  id_colaborador: string;
  id_registro: string;
  valor_base64?: string; // JSON encoded en Base64 para auditoria
}

/**
 * ============================================================================
 * MODELOS DE REGISTROS DE RENDIMIENTO
 * ============================================================================
 */

/**
 * Registro completo de rendimiento semanal
 * Contiene todos los datos de colaboradores para una semana específica
 */
export interface RegistroRendimiento {
  id_registro: string;
  semana: number; // Ej: 12 (semana 12 del año)
  año: number;
  id_area: string;
  id_supervisor?: string; // Usuario que capturó los datos (si aplica)
  colaboradores: ColaboradorConRendimiento[];
  timestamp_creacion: string;
  timestamp_actualizacion?: string;
  estado_sync: EstadoSync;
  error_sync?: string;
  notas?: string;
}

/**
 * Colaborador con sus datos de rendimiento capturados
 */
export interface ColaboradorConRendimiento extends Colaborador {
  dias: DiaSemanal[];
  promedio: number;
  firma: TokenFirma | null;
  timestamp_firma?: string;
  es_readonly: boolean;
}

/**
 * ============================================================================
 * MODELOS DE CONFIGURACIÓN & SINCRONIZACIÓN
 * ============================================================================
 */

/**
 * Item en la cola de sincronización (offline-first)
 * Se guarda en IndexedDB si no hay conexión
 */
export interface ItemSyncQueue {
  id: string;
  tipo: 'AREA' | 'COLABORADOR' | 'REGISTRO_RENDIMIENTO';
  accion: 'CREATE' | 'UPDATE' | 'DELETE';
  datos: Area | Colaborador | RegistroRendimiento;
  timestamp_agregado: string;
  intentos: number;
  error_ultimo?: string;
}

/**
 * Estado de la aplicación para indicar conexión y sync
 */
export interface EstadoApp {
  online: boolean;
  sincronizando: boolean;
  pendiente_sync: number;
  ultimo_sync: string | null;
}

/**
 * Entrada en la tabla de Registro (para tablas Excel)
 * Formato exacto que se envía al Excel Online
 */
export interface FilaExcel {
  id_registro: string;
  semana: number;
  año: number;
  supervisor: string;
  id_area: string;
  id_colaborador: string;
  nombre_colaborador: string;
  cargo: string;
  lunes: number | null;
  martes: number | null;
  miercoles: number | null;
  jueves: number | null;
  viernes: number | null;
  sabado: number | null;
  domingo: number | null;
  promedio_semanal: number;
  firma_digital: boolean;
  timestamp_firma: string | null;
  estado: EstadoSync;
}

/**
 * ============================================================================
 * MODELOS DE VALIDACIÓN
 * ============================================================================
 */

/**
 * Resultado de validación de un campo
 */
export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
  advertencias?: string[];
}

/**
 * Reglas de validación para tallos/hora por día
 */
export interface ReglasValidacion {
  minimo: number; // Ej: 0
  maximo: number; // Ej: 500
  permitir_vacio: boolean;
  nombre_campo: string;
}

/**
 * ============================================================================
 * MODELOS DE SINCRONIZACIÓN - Para persistencia en Dexie y envío a Excel
 * ============================================================================
 */

/**
 * Registro plano para persistencia en Dexie
 * Estructura optimizada para Excel (sin nesting profundo)
 */
export interface RegistroSincronizable {
  // IDs únicos
  id: string; // UUID generado localmente
  id_registro: string; // Referencia a RegistroRendimiento
  id_colaborador: string;
  id_area: string;
  id_supervisor?: string;

  // Datos del registro
  semana: number;
  año: number;
  fecha_creacion: string; // ISO 8601
  fecha_actualizacion: string; // ISO 8601

  // Datos de rendimiento (plano)
  colaborador_nombre: string;
  colaborador_cargo: string;
  lunes: number | null;
  martes: number | null;
  miercoles: number | null;
  jueves: number | null;
  viernes: number | null;
  sabado: number | null;
  domingo: number | null;
  promedio: number;

  // Estado de sincronización
  sincronizado: boolean;
  fecha_sincronizacion?: string;
  intento_sync: number; // Contador de reintentos fallidos
  fecha_ultimo_intento?: string;
  error_sync?: string;

  // Metadatos
  firma_digital?: string; // Base64
  hash_documento?: string; // Para detectar cambios
  notas?: string;
}

/**
 * Elemento en la cola de sincronización
 */
export interface ItemColaSincronizacion {
  id_elemento: string;
  id_registro: string;
  id_colaborador: string;
  tipo: 'CREATE' | 'UPDATE' | 'DELETE';
  fecha_encolado: string;
  intentos: number;
  proximo_intento: string;
  error?: string;
}

/**
 * Respuesta del servidor Azure Functions
 */
export interface RespuestaSincronizacion {
  success: boolean;
  mensaje: string;
  idRegistroExcel?: string;
  timestamp: string;
  errores?: string[];
}

/**
 * Configuración de reintentos
 */
export interface ConfiguracionReintentos {
  maxIntentos: number;
  delayInicial: number; // milisegundos
  delayMaximo: number;
  factorExponencial: number;
  jitterEnabled: boolean;
}

/**
 * Estado de la base de datos local
 */
export interface EstadoBaseDatos {
  registrosTotales: number;
  registrosSincronizados: number;
  registrosPendientes: number;
  ultimaSincronizacion?: string;
  proximaSincronizacionProgramada?: string;
  tasaExito: number; // Porcentaje
}

/**
 * Estadísticas de sincronización
 */
export interface EstadisticasSincronizacion {
  totalRegistros: number;
  registrosSincronizados: number;
  registrosFallidos: number;
  tasaExito: number;
  tiempoPromedio: number; // milliseconds
  ultimoSync: string;
  proximoSync: string;
}

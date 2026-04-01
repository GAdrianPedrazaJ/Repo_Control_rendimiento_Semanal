import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import {
  RegistroSincronizable,
  ItemColaSincronizacion,
  RespuestaSincronizacion,
  ConfiguracionReintentos,
  EstadisticasSincronizacion
} from '../models/sync-models';
import { DatabaseService } from './database.service';

/**
 * ============================================================================
 * SYNC SERVICE - Sincronización Offline-First con Azure Functions
 * ============================================================================
 * Características:
 * - Detección automática de conexión (online/offline)
 * - Cola de sincronización con reintentos exponenciales
 * - Manejo robusto de errores
 * - Auto-sincronización cuando hay conexión
 * - Logging detallado
 */

@Injectable({
  providedIn: 'root'
})
export class SyncService implements OnDestroy {
  // ==================== CONFIGURACIÓN ====================
  private readonly ENDPOINT_AZURE = 'https://your-function-app.azurewebsites.net/api/sync-registros';
  private readonly SYNC_INTERVAL = 30000; // 30 segundos
  private readonly CONFIG_REINTENTOS: ConfiguracionReintentos = {
    maxIntentos: 5,
    delayInicial: 1000, // 1 segundo
    delayMaximo: 300000, // 5 minutos
    factorExponencial: 2,
    jitterEnabled: true
  };

  // ==================== ESTADO ====================
  private estadoOnlineSubject = new BehaviorSubject<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  public estadoOnline$ = this.estadoOnlineSubject.asObservable();

  private sincronizandoSubject = new BehaviorSubject<boolean>(false);
  public sincronizando$ = this.sincronizandoSubject.asObservable();

  private estadisticasSubject = new BehaviorSubject<EstadisticasSincronizacion | null>(null);
  public estadisticas$ = this.estadisticasSubject.asObservable();

  private errorSyncSubject = new BehaviorSubject<string | null>(null);
  public errorSync$ = this.errorSyncSubject.asObservable();

  private ultimaSincronizacion: Date | null = null;
  private proximaSincronizacion: Date | null = null;
  private tiempoPromedioProceso = 0;

  private subscripcionAutoSync?: Subscription;

  // ==================== CONSTRUCTOR ====================
  constructor(
    private http: HttpClient,
    private db: DatabaseService
  ) {
    this.inicializarMonitoreoConexion();
    this.inicializarAutoSync();
    this.actualizarEstadisticas();
  }

  /**
   * =========================================================================
   * INICIALIZACIÓN Y MONITOREO DE CONEXIÓN
   * =========================================================================
   */

  /**
   * Inicializar monitoreo de conexión con window.addEventListener
   */
  private inicializarMonitoreoConexion(): void {
    // Escuchar evento online
    window.addEventListener('online', () => {
      console.log('🟢 ONLINE - Conexión restablecida');
      this.estadoOnlineSubject.next(true);
      this.errorSyncSubject.next(null);
      // Intentar sincronización automática inmediatamente
      this.sincronizarAutomatico();
    });

    // Escuchar evento offline
    window.addEventListener('offline', () => {
      console.log('🔴 OFFLINE - Modo desconectado');
      this.estadoOnlineSubject.next(false);
    });

    console.log('✓ Monitoreo de conexión inicializado');
  }

  /**
   * Inicializar sincronización automática periódica
   */
  private inicializarAutoSync(): void {
    this.subscripcionAutoSync = this.estadoOnline$
      .pipe(
        filter((online) => online), // Solo cuando online
        switchMap(() =>
          interval(this.SYNC_INTERVAL) // Cada 30 segundos
        )
      )
      .subscribe(() => {
        this.sincronizarAutomatico();
      });
  }

  /**
   * =========================================================================
   * SINCRONIZACIÓN PRINCIPAL
   * =========================================================================
   */

  /**
   * Sincronizar automáticamente registros pendientes
   */
  async sincronizarAutomatico(): Promise<void> {
    if (this.sincronizandoSubject.value) {
      console.log('⏳ Sincronización ya en progreso...');
      return;
    }

    if (!this.estadoOnlineSubject.value) {
      console.log('⚠ No hay conexión. Remitiendo para después.');
      return;
    }

    const tiempoInicio = performance.now();
    this.sincronizandoSubject.next(true);
    this.proximaSincronizacion = new Date(
      Date.now() + this.SYNC_INTERVAL
    );

    try {
      const registrosPendientes = await this.db.obtenerPendientesSincronizacion();

      if (registrosPendientes.length === 0) {
        console.log('✓ No hay registros pendientes de sincronizar');
        this.ultimaSincronizacion = new Date();
        this.errorSyncSubject.next(null);
        return;
      }

      console.log(
        `📤 Sincronizando ${registrosPendientes.length} registros pendientes...`
      );

      // Sincronizar en lotes de 10 registros
      const tamanoLote = 10;
      let exitosos = 0;
      let fallidos = 0;

      for (let i = 0; i < registrosPendientes.length; i += tamanoLote) {
        const lote = registrosPendientes.slice(i, i + tamanoLote);
        const resultados = await Promise.allSettled(
          lote.map((registro) =>
            this.sincronizarRegistro(registro)
          )
        );

        resultados.forEach((resultado) => {
          if (resultado.status === 'fulfilled') {
            exitosos++;
          } else {
            fallidos++;
          }
        });
      }

      const tiempoFin = performance.now();
      this.tiempoPromedioProceso = tiempoFin - tiempoInicio;
      this.ultimaSincronizacion = new Date();

      console.log(
        `✅ Sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos (${this.tiempoPromedioProceso.toFixed(2)}ms)`
      );

      this.errorSyncSubject.next(null);
      await this.actualizarEstadisticas();
    } catch (error) {
      console.error('✗ Error durante sincronización automática:', error);
      this.errorSyncSubject.next(
        `Error de sincronización: ${this.extraerMensajeError(error)}`
      );
    } finally {
      this.sincronizandoSubject.next(false);
    }
  }

  /**
   * Sincronizar un registro individual
   */
  async sincronizarRegistro(
    registro: RegistroSincronizable,
    intento: number = 0
  ): Promise<RespuestaSincronizacion> {
    try {
      // Validar que el registro tenga datos necesarios
      this.validarRegistroParaSync(registro);

      // Crear payload plano para Excel
      const payload = this.crearPayloadExcel(registro);

      console.log(`📨 Enviando registro ${registro.id} al servidor...`);

      // Enviar con timeout de 10 segundos
      const respuesta = await this.http
        .post<RespuestaSincronizacion>(this.ENDPOINT_AZURE, payload, {
          timeout: 10000
        })
        .toPromise();

      if (!respuesta) {
        throw new Error('Respuesta vacía del servidor');
      }

      if (respuesta.success) {
        // Marcar como sincronizado
        await this.db.marcarComoSincronizado(registro.id, respuesta.idRegistroExcel);
        console.log(`✅ Registro ${registro.id} sincronizado exitosamente`);

        return respuesta;
      } else {
        throw new Error(respuesta.mensaje || 'Error desconocido del servidor');
      }
    } catch (error) {
      return this.manejarErrorSincronizacion(
        registro,
        error,
        intento
      );
    }
  }

  /**
   * Manejar errores durante sincronización con retry logic
   */
  private async manejarErrorSincronizacion(
    registro: RegistroSincronizable,
    error: unknown,
    intento: number
  ): Promise<RespuestaSincronizacion> {
    const mensajeError = this.extraerMensajeError(error);
    console.error(
      `❌ Error al sincronizar ${registro.id} (intento ${intento + 1}): ${mensajeError}`
    );

    if (intento < this.CONFIG_REINTENTOS.maxIntentos) {
      // Calcular próximo reintento
      const delayMs = this.calcularDelayReintentos(intento);
      const proximoIntento = new Date(Date.now() + delayMs).toISOString();

      // Actualizar registro con error
      await this.db.actualizarRegistro(registro.id, {
        intento_sync: intento + 1,
        fecha_ultimo_intento: new Date().toISOString(),
        error_sync: mensajeError
      });

      // Agregar a cola de reintentos
      const elemento: ItemColaSincronizacion = {
        id_elemento: `${registro.id}-${intento + 1}`,
        id_registro: registro.id_registro,
        id_colaborador: registro.id_colaborador,
        tipo: 'UPDATE',
        fecha_encolado: new Date().toISOString(),
        intentos: intento + 1,
        proximo_intento: proximoIntento,
        error: mensajeError
      };

      await this.db.agregarAColaSincronizacion(elemento);

      return {
        success: false,
        mensaje: `Reintentará en ${(delayMs / 1000).toFixed(0)}s`,
        timestamp: new Date().toISOString(),
        errores: [mensajeError]
      };
    } else {
      // Máximos intentos alcanzados
      await this.db.actualizarRegistro(registro.id, {
        intento_sync: intento + 1,
        fecha_ultimo_intento: new Date().toISOString(),
        error_sync: `Máximos intentos alcanzados: ${mensajeError}`,
        sincronizado: false
      });

      return {
        success: false,
        mensaje: `Falló después de ${this.CONFIG_REINTENTOS.maxIntentos} intentos`,
        timestamp: new Date().toISOString(),
        errores: [
          `Máximos intentos alcanzados: ${mensajeError}`
        ]
      };
    }
  }

  /**
   * Calcular delay para reintentos (backoff exponencial)
   */
  private calcularDelayReintentos(intento: number): number {
    let delay = this.CONFIG_REINTENTOS.delayInicial *
      Math.pow(this.CONFIG_REINTENTOS.factorExponencial, intento);

    // Limitar al máximo
    delay = Math.min(delay, this.CONFIG_REINTENTOS.delayMaximo);

    // Agregar jitter (±10%)
    if (this.CONFIG_REINTENTOS.jitterEnabled) {
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      delay += jitter;
    }

    return delay;
  }

  /**
   * =========================================================================
   * UTILIDADES Y VALIDACIÓN
   * =========================================================================
   */

  /**
   * Validar que el registro tenga datos necesarios
   */
  private validarRegistroParaSync(registro: RegistroSincronizable): void {
    const camposRequeridos = [
      'id',
      'id_registro',
      'id_colaborador',
      'id_area',
      'semana',
      'año',
      'colaborador_nombre'
    ];

    for (const campo of camposRequeridos) {
      if (!registro[campo as keyof RegistroSincronizable]) {
        throw new Error(`Campo requerido faltante: ${campo}`);
      }
    }
  }

  /**
   * Crear payload plano para enviar a Excel/Azure
   */
  private crearPayloadExcel(
    registro: RegistroSincronizable
  ): Record<string, unknown> {
    return {
      id: registro.id,
      id_registro: registro.id_registro,
      id_colaborador: registro.id_colaborador,
      id_area: registro.id_area,
      id_supervisor: registro.id_supervisor,
      semana: registro.semana,
      año: registro.año,
      fecha_creacion: registro.fecha_creacion,
      colaborador_nombre: registro.colaborador_nombre,
      colaborador_cargo: registro.colaborador_cargo,
      lunes: registro.lunes,
      martes: registro.martes,
      miercoles: registro.miercoles,
      jueves: registro.jueves,
      viernes: registro.viernes,
      sabado: registro.sabado,
      domingo: registro.domingo,
      promedio: registro.promedio,
      firma_digital: registro.firma_digital,
      notas: registro.notas,
      timestamp_sync: new Date().toISOString()
    };
  }

  /**
   * Extraer mensaje de error de cualquier tipo
   */
  private extraerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.mensaje || error.message || `Error HTTP ${error.status}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Actualizar estadísticas de sincronización
   */
  async actualizarEstadisticas(): Promise<void> {
    try {
      const stats = await this.db.obtenerEstadisticas();

      const estadisticas: EstadisticasSincronizacion = {
        totalRegistros: stats.total,
        registrosSincronizados: stats.sincronizados,
        registrosFallidos: stats.conErrores,
        tasaExito: stats.tasaExito,
        tiempoPromedio: this.tiempoPromedioProceso,
        ultimoSync: this.ultimaSincronizacion?.toISOString() || 'Nunca',
        proximoSync: this.proximaSincronizacion?.toISOString() || 'N/A'
      };

      this.estadisticasSubject.next(estadisticas);
    } catch (error) {
      console.error('Error al actualizar estadísticas:', error);
    }
  }

  /**
   * Obtener estado actual
   */
  obtenerEstadoActual(): {
    online: boolean;
    sincronizando: boolean;
    ultimaSincronizacion: Date | null;
    proximaSincronizacion: Date | null;
  } {
    return {
      online: this.estadoOnlineSubject.value,
      sincronizando: this.sincronizandoSubject.value,
      ultimaSincronizacion: this.ultimaSincronizacion,
      proximaSincronizacion: this.proximaSincronizacion
    };
  }

  /**
   * Limpiar recursos
   */
  ngOnDestroy(): void {
    this.subscripcionAutoSync?.unsubscribe();
  }
}

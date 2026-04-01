/**
 * SERVICIO DE SINCRONIZACIÓN ACTUALIZADO
 * Conecta tu App Angular → Azure Functions → SQL Database + Excel
 * 
 * INSTRUCCIONES:
 * 1. Reemplaza ENDPOINT_AZURE con tu URL de Azure Functions
 * 2. Reemplaza FUNCTION_KEY con tu clave de función
 * 3. El resto funciona automáticamente
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, interval, Subject, filter, switchMap, takeUntil } from 'rxjs';
import { DatabaseService } from './database.service';
import { RegistroSincronizable, EstadisticasSincronizacion, ConfiguracionReintentos } from '../models/sync-models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SyncService implements OnDestroy {
  // ============================================================================
  // CONFIGURACIÓN DE AZURE
  // ============================================================================

  /**
   * ⚡ ACTUALIZAR ESTO CON TU ENDPOINT DE AZURE
   * Formato: https://tu-function-app.azurewebsites.net/api/sync-registros?code=YOUR_FUNCTION_KEY
   * 
   * Para obtener:
   * 1. Az Azure Portal → Function App → Functions → sync-registros
   * 2. Haz click en "Get Function URL"
   * 3. Copia la URL completa incluyendo el code=...
   */
  private readonly ENDPOINT_AZURE =
    'https://performance-control-sync-func.azurewebsites.net/api/sync-registros?code=YOUR_FUNCTION_KEY_HERE';

  /**
   * Timeout para requests HTTP (en milisegundos)
   */
  private readonly HTTP_TIMEOUT = 10000; // 10 segundos

  /**
   * Intervalo de sincronización automática (en milisegundos)
   * Dev: 30 segundos para testing
   * Prod: 60 segundos (menos carga)
   */
  private readonly SYNC_INTERVAL = environment.production ? 60000 : 30000;

  /**
   * Configuración de reintentos con backoff exponencial
   */
  private readonly CONFIG_REINTENTOS: ConfiguracionReintentos = {
    maxIntentos: 5,
    delayInicial: 1000, // 1 segundo
    delayMaximo: 300000, // 5 minutos
    factorExponencial: 2,
    jitterEnabled: true
  };

  // ============================================================================
  // ESTADO Y OBSERVABLES
  // ============================================================================

  /**
   * Estado de conexión online/offline
   */
  private estadoOnline$ = new BehaviorSubject<boolean>(navigator.onLine);

  /**
   * Indica si hay sincronización en progreso
   */
  private sincronizando$ = new BehaviorSubject<boolean>(false);

  /**
   * Errores de sincronización
   */
  private errorSync$ = new BehaviorSubject<string | null>(null);

  /**
   * Estadísticas de sincronización
   */
  private estadisticas$ = new BehaviorSubject<EstadisticasSincronizacion | null>(null);

  /**
   * Suscriptor para limpieza
   */
  private destroy$ = new Subject<void>();

  /**
   * Control de cancelación de requests
   */
  private abortController: AbortController | null = null;

  constructor(
    private http: HttpClient,
    private db: DatabaseService
  ) {
    this.inicializarListeners();
    this.inicializarSincronizacionAutomatica();
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  /**
   * Obtener estado de conexión en tiempo real
   */
  obtenerEstadoOnline() {
    return this.estadoOnline$.asObservable();
  }

  /**
   * Obtener estado de sincronización
   */
  obtenerEstadoSincronizando() {
    return this.sincronizando$.asObservable();
  }

  /**
   * Obtener últimos errores
   */
  obtenerErrores() {
    return this.errorSync$.asObservable();
  }

  /**
   * Obtener estadísticas de sincronización
   */
  obtenerEstadisticas() {
    return this.estadisticas$.asObservable();
  }

  /**
   * Sincronizar un registro específico (útil para urgentes)
   */
  async sincronizarRegistroUrgente(id: string): Promise<boolean> {
    try {
      const registro = await this.db.obtenerRegistro(id);
      if (!registro) {
        console.warn(`Registro ${id} no encontrado`);
        return false;
      }

      console.log(`🚀 Sincronización urgente: ${registro.colaborador_nombre} - ${registro.semana}`);
      return await this.sincronizarRegistro(registro, 0);
    } catch (error) {
      console.error('Error en sincronización urgente:', error);
      return false;
    }
  }

  /**
   * Reintenta registros que fallaron
   */
  async reintentarFallidos(): Promise<void> {
    try {
      const registrosFallidos = await this.db.obtenerConErrores();
      console.log(`🔄 Reintentando ${registrosFallidos.length} registros...`);

      for (const registro of registrosFallidos) {
        await this.sincronizarRegistro(registro, 0);
      }

      await this.actualizarEstadisticas();
    } catch (error) {
      console.error('Error reintentando fallidos:', error);
    }
  }

  /**
   * Obtener estado de sincronización en este momento
   */
  async obtenerEstadisticasAhora(): Promise<EstadisticasSincronizacion> {
    const stats = await this.db.obtenerEstadisticas();
    return {
      totalRegistros: stats.total,
      registrosSincronizados: stats.sincronizados,
      registrosFallidos: stats.conErrores,
      tasaExito: stats.tasaExito,
      tiempoPromedio: 0,
      ultimoSync: new Date().toISOString(),
      proximoSync: new Date(Date.now() + this.SYNC_INTERVAL).toISOString()
    };
  }

  /**
   * Limpiar caché de sincronización (testing)
   */
  async limpiarCacheSync(): Promise<void> {
    const elementos = await this.db.obtenerElementosListosParaSync();
    for (const elemento of elementos) {
      await this.db.eliminarDeColaSincronizacion(elemento.id_elemento);
    }
    this.errorSync$.next(null);
    console.log('✓ Caché de sincronización limpiado');
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Inicializar listeners de conexión
   */
  private inicializarListeners(): void {
    window.addEventListener('online', () => {
      console.log('🟢 CONEXIÓN ESTABLECIDA');
      this.estadoOnline$.next(true);
      this.errorSync$.next(null);
      // Sincronizar inmediatamente cuando conecta
      this.sincronizarNow();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 CONEXIÓN PERDIDA');
      this.estadoOnline$.next(false);
      this.errorSync$.next('Sin conexión - Los cambios se guardarán localmente');
    });
  }

  /**
   * Inicializar sincronización automática
   */
  private inicializarSincronizacionAutomatica(): void {
    interval(this.SYNC_INTERVAL)
      .pipe(
        filter(() => this.estadoOnline$.value), // Solo si hay conexión
        filter(() => !this.sincronizando$.value), // No si ya está sincronizando
        switchMap(() => this.sincronizarNow()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => console.log('✓ Sincronización automática completada'),
        error: (error) => console.error('Error en sincronización automática:', error)
      });
  }

  /**
   * Disparar sincronización ahora mismo
   */
  private sincronizarNow() {
    return new Promise<void>(async (resolve) => {
      if (this.sincronizando$.value) {
        console.log('⏳ Sincronización ya en progreso...');
        resolve();
        return;
      }

      try {
        const registrosPendientes = await this.db.obtenerPendientesSincronizacion();

        if (registrosPendientes.length === 0) {
          console.log('✓ Sin registros pendientes');
          resolve();
          return;
        }

        console.log(`📤 Iniciando sincronización de ${registrosPendientes.length} registros...`);
        this.sincronizando$.next(true);

        // Sincronizar todos los registros
        const resultados = await Promise.all(
          registrosPendientes.map((reg) => this.sincronizarRegistro(reg, 0))
        );

        const exitosos = resultados.filter((r) => r).length;
        console.log(`✓ ${exitosos}/${registrosPendientes.length} sincronizados`);

        await this.actualizarEstadisticas();
      } catch (error) {
        console.error('Error en sincronización:', error);
      } finally {
        this.sincronizando$.next(false);
        resolve();
      }
    });
  }

  /**
   * Sincronizar un registro individual
   */
  private async sincronizarRegistro(
    registro: RegistroSincronizable,
    intento: number = 0
  ): Promise<boolean> {
    try {
      // Validar configuración de Azure
      if (this.ENDPOINT_AZURE.includes('YOUR_FUNCTION_KEY')) {
        console.error('❌ ERROR: Actualiza ENDPOINT_AZURE en sync.service.ts');
        this.errorSync$.next('Azure endpoint no configurado');
        return false;
      }

      console.log(
        `📤 Enviando: ${registro.colaborador_nombre} (intento ${intento + 1}/${this.CONFIG_REINTENTOS.maxIntentos})`
      );

      // Preparar payload plano
      const payload = {
        registros: [
          {
            id: registro.id,
            id_registro: registro.id_registro,
            id_colaborador: registro.id_colaborador,
            id_area: registro.id_area,
            id_supervisor: registro.id_supervisor,
            semana: registro.semana,
            año: registro.año,
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
            fecha_creacion: registro.fecha_creacion,
            notas: registro.notas
          }
        ]
      };

      // Cancelar request anterior si existe
      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();

      // Hacer POST a Azure Functions
      const response = await fetch(this.ENDPOINT_AZURE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: this.abortController.signal,
        // @ts-ignore
        timeout: this.HTTP_TIMEOUT
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resultado = await response.json();

      // Marcar como sincronizado
      await this.db.marcarComoSincronizado(registro.id, resultado.id_excel);
      console.log(`✓ Sincronizado: ${registro.id}`);

      this.errorSync$.next(null);
      return true;
    } catch (error) {
      console.error(`✗ Error sincronizando ${registro.id}:`, error);

      // Implementar reintentos con backoff exponencial
      if (intento < this.CONFIG_REINTENTOS.maxIntentos) {
        const delay = this.calcularDelayReintentos(intento);
        console.log(`⏳ Reintentando en ${delay / 1000}s...`);

        await this.delay(delay);
        return await this.sincronizarRegistro(registro, intento + 1);
      } else {
        // Registrar error permanente
        await this.db.actualizarRegistro(registro.id, {
          error_sync: (error as any).message,
          intento_sync: intento + 1
        });

        const mensajeError = `Sincronización fallida después de ${this.CONFIG_REINTENTOS.maxIntentos} intentos`;
        this.errorSync$.next(mensajeError);
        console.error(mensajeError);

        return false;
      }
    }
  }

  /**
   * Calcular delay con backoff exponencial + jitter
   */
  private calcularDelayReintentos(intento: number): number {
    const delayBase = this.CONFIG_REINTENTOS.delayInicial *
      Math.pow(this.CONFIG_REINTENTOS.factorExponencial, intento);

    const delayCapped = Math.min(delayBase, this.CONFIG_REINTENTOS.delayMaximo);

    // Añadir jitter (±10%)
    if (this.CONFIG_REINTENTOS.jitterEnabled) {
      const jitter = delayCapped * 0.1 * (Math.random() * 2 - 1);
      return delayCapped + jitter;
    }

    return delayCapped;
  }

  /**
   * Actualizar estadísticas
   */
  private async actualizarEstadisticas(): Promise<void> {
    const stats = await this.db.obtenerEstadisticas();
    
    // Mapear estadísticas al formato de EstadisticasSincronizacion
    const estadisticas: EstadisticasSincronizacion = {
      totalRegistros: stats.total,
      registrosSincronizados: stats.sincronizados,
      registrosFallidos: stats.conErrores,
      tasaExito: stats.tasaExito,
      tiempoPromedio: 0,
      ultimoSync: new Date().toISOString(),
      proximoSync: new Date(Date.now() + this.SYNC_INTERVAL).toISOString()
    };
    
    this.estadisticas$.next(estadisticas);

    console.log(`📊 Stats:`, {
      total: stats.total,
      sincronizados: stats.sincronizados,
      fallidos: stats.conErrores,
      tasaExito: `${stats.tasaExito.toFixed(1)}%`
    });
  }

  /**
   * Helper: delay promise-based
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Limpiar recursos al destruir
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

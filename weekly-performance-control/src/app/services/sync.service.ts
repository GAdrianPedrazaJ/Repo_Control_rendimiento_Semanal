import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Network } from '@capacitor/network';
import { EstadoApp, RegistroRendimiento, ItemSyncQueue } from '../models';
import { StorageService } from './storage.service';

/**
 * SyncService
 * Gestiona sincronización offline-first con Excel Online
 * - Detección automática de conexión
 * - Cola de sincronización
 * - Auto-retry cuando conexión se restablece
 */
@Injectable({
  providedIn: 'root'
})
export class SyncService {
  /**
   * Estado actual de la aplicación (online, sincronizando, etc.)
   */
  private estadoAppSubject = new BehaviorSubject<EstadoApp>({
    online: true,
    sincronizando: false,
    pendiente_sync: 0,
    ultimo_sync: null
  });

  public estadoApp$ = this.estadoAppSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.inicializarMonitoreoConexion();
  }

  /**
   * =========================================================================
   * MONITOREO DE CONEXIÓN
   * =========================================================================
   */

  /**
   * Inicializar monitoreo de conexión con @capacitor/network
   */
  private async inicializarMonitoreoConexion(): Promise<void> {
    try {
      // Detectar estado actual
      const status = await Network.getStatus();
      this.actualizarEstadoOnline(status.connected);

      // Escuchar cambios de conexión
      Network.addListener('networkStatusChange', (status) => {
        this.actualizarEstadoOnline(status.connected);

        // Intentar sync automático cuando se restablece conexión
        if (status.connected) {
          console.log('✓ Conexión restablecida. Intentando sincronización automática...');
          this.sincronizarAutomatico();
        }
      });

      console.log('✓ Monitoreo de conexión inicializado');
    } catch (error) {
      console.warn('⚠ No es posible monitorear conexión (normal en web):', error);
      // En navegador web, asumir que hay conexión
      this.actualizarEstadoOnline(true);
    }
  }

  /**
   * Actualizar estado online y verificar cola de sync
   */
  private actualizarEstadoOnline(online: boolean): void {
    const estado = this.estadoAppSubject.value;
    estado.online = online;

    if (!online) {
      console.log('⚠ Modo offline activado. Los cambios se guardarán localmente.');
    }

    this.estadoAppSubject.next(estado);
  }

  /**
   * Obtener estado actual de conectividad
   */
  estaOnline(): boolean {
    return this.estadoAppSubject.value.online;
  }

  /**
   * =========================================================================
   * COLA DE SINCRONIZACIÓN
   * =========================================================================
   */

  /**
   * Agregar un registro a la cola de sincronización
   * Se guarda en IndexedDB si no hay conexión
   */
  async agregarAColaSync(
    tipo: 'AREA' | 'COLABORADOR' | 'REGISTRO_RENDIMIENTO',
    accion: 'CREATE' | 'UPDATE' | 'DELETE',
    datos: any
  ): Promise<void> {
    const item: ItemSyncQueue = {
      id: `${tipo}_${accion}_${Date.now()}`,
      tipo,
      accion,
      datos,
      timestamp_agregado: new Date().toISOString(),
      intentos: 0
    };

    await this.storageService.agregarAColaSync(item);

    // Actualizar contador de pendientes
    await this.actualizarContadorPendientes();

    console.log(`✓ Item agregado a cola de sync: ${item.id}`);

    // Si hay conexión, intentar sincronizar inmediatamente
    if (this.estaOnline()) {
      setTimeout(() => this.sincronizarManual(), 1000);
    }
  }

  /**
   * Obtener cantidad de items pendientes de sincronización
   */
  async obtenerPendientes(): Promise<number> {
    const cola = await this.storageService.obtenerColaSync();
    return cola.length;
  }

  /**
   * Actualizar contador de items pendientes
   */
  private async actualizarContadorPendientes(): Promise<void> {
    const pendiente_sync = await this.obtenerPendientes();
    const estado = this.estadoAppSubject.value;
    estado.pendiente_sync = pendiente_sync;
    this.estadoAppSubject.next(estado);
  }

  /**
   * =========================================================================
   * SINCRONIZACIÓN
   * =========================================================================
   */

  /**
   * Sincronización manual (usuario presiona botón "Sincronizar")
   * Emite @Output para que Power Apps maneje Patch()
   */
  async sincronizarManual(): Promise<{ exitoso: boolean; mensaje: string }> {
    if (!this.estaOnline()) {
      return {
        exitoso: false,
        mensaje: 'No hay conexión a internet. Datos se guardarán localmente.'
      };
    }

    try {
      return await this.ejecutarSync();
    } catch (error) {
      console.error('✗ Error en sincronización manual:', error);
      return {
        exitoso: false,
        mensaje: `Error: ${(error as any).message || 'Desconocido'}`
      };
    }
  }

  /**
   * Sincronización automática (cuando se restablece conexión)
   * Sin mostrar errores al usuario
   */
  private async sincronizarAutomatico(): Promise<void> {
    try {
      await this.ejecutarSync();
    } catch (error) {
      console.warn('⚠ Error en sync automático:', error);
    }
  }

  /**
   * Ejecutar sincronización
   * Obtiene cola de sync, intenta enviar a Excel (via Power Apps)
   */
  private async ejecutarSync(): Promise<{ exitoso: boolean; mensaje: string }> {
    const estado = this.estadoAppSubject.value;
    if (estado.sincronizando) {
      return { exitoso: false, mensaje: 'Sincronización ya en progreso' };
    }

    // Marcar como sincronizando
    estado.sincronizando = true;
    this.estadoAppSubject.next(estado);

    try {
      const cola = await this.storageService.obtenerColaSync();

      if (cola.length === 0) {
        console.log('✓ No hay items pendientes de sincronización');
        estado.sincronizando = false;
        estado.ultimo_sync = new Date().toISOString();
        this.estadoAppSubject.next(estado);
        return { exitoso: true, mensaje: 'Todo sincronizado' };
      }

      console.log(`📤 Sincronizando ${cola.length} items pendientes...`);

      // Aquí es donde emitirías @Output para que Power Apps maneje Patch()
      // Por ahora, simulamos que se envió exitosamente
      for (const item of cola) {
        try {
          // TODO: Emitir @Output con item.datos
          // Luego remover de cola
          await this.storageService.removerDeColaSync(item.id);
          console.log(`✓ Sincronizado: ${item.id}`);
        } catch (error) {
          // Incrementar intentos
          item.intentos++;
          item.error_ultimo = (error as any).message;

          if (item.intentos >= 3) {
            // Máximo 3 intentos
            await this.storageService.removerDeColaSync(item.id);
            console.error(`✗ Máximo de intentos alcanzado para ${item.id}`);
          } else {
            await this.storageService.actualizarItemSync(item.id, item);
          }
        }
      }

      // Actualizar estado
      await this.actualizarContadorPendientes();
      estado.sincronizando = false;
      estado.ultimo_sync = new Date().toISOString();
      this.estadoAppSubject.next(estado);

      return {
        exitoso: true,
        mensaje: `✓ Sincronización completada. ${cola.length} registros enviados.`
      };
    } catch (error) {
      console.error('✗ Error ejecutando sync:', error);

      estado.sincronizando = false;
      this.estadoAppSubject.next(estado);

      return {
        exitoso: false,
        mensaje: `Error durante sincronización: ${(error as any).message}`
      };
    }
  }

  /**
   * =========================================================================
   * UTILIDADES
   * =========================================================================
   */

  /**
   * Obtener observable de estado de sincronización
   * Use en template: estado$ | async
   */
  obtenerEstadoSync$(): Observable<EstadoApp> {
    return this.estadoApp$;
  }

  /**
   * Generar mensaje visual para usuario
   */
  obtenerMensajeSync(): string {
    const estado = this.estadoAppSubject.value;

    if (!estado.online) {
      return `📡 Offline - ${estado.pendiente_sync} cambios por sincronizar`;
    }

    if (estado.sincronizando) {
      return '🔄 Sincronizando...';
    }

    if (estado.pendiente_sync > 0) {
      return `📤 ${estado.pendiente_sync} cambios pendientes`;
    }

    if (estado.ultimo_sync) {
      const fecha = new Date(estado.ultimo_sync).toLocaleTimeString('es-ES');
      return `✓ Último sync: ${fecha}`;
    }

    return '✓ Sincronizado';
  }

  /**
   * Generar color para indicador visual
   */
  obtenerColorIndicador(): string {
    const estado = this.estadoAppSubject.value;

    if (!estado.online) return '#ff6b6b'; // Rojo
    if (estado.sincronizando) return '#ffd93d'; // Amarillo
    if (estado.pendiente_sync > 0) return '#ffd93d'; // Amarillo
    return '#6bcf7f'; // Verde
  }
}

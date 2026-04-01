import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import {
  RegistroSincronizable,
  EstadoBaseDatos,
  EstadisticasSincronizacion
} from '../models/sync-models';
import { DatabaseService } from './database.service';
import { SyncService } from './sync.service';

/**
 * ============================================================================
 * OFFLINE-FIRST SERVICE
 * ============================================================================
 * Orquestador central que coordina:
 * - Persistencia local (DatabaseService)
 * - Sincronización (SyncService)
 * - Conversión de modelos
 * - Validaciones de integridad
 */

@Injectable({
  providedIn: 'root'
})
export class OfflineFirstService {
  private estadoBaseDatosSubject = new BehaviorSubject<EstadoBaseDatos | null>(null);
  public estadoBaseDatos$ = this.estadoBaseDatosSubject.asObservable();

  private indiceDescargaSubject = new BehaviorSubject<number>(0);
  public indiceDescarga$ = this.indiceDescargaSubject.asObservable();

  constructor(
    private db: DatabaseService,
    private sync: SyncService
  ) {
    this.inicializar();
  }

  /**
   * Inicializar el servicio
   */
  private async inicializar(): Promise<void> {
    try {
      console.log('🚀 Inicializando OfflineFirstService...');
      await this.actualizarEstadoBaseDatos();
      console.log('✓ OfflineFirstService inicializado');
    } catch (error) {
      console.error('✗ Error inicializando OfflineFirstService:', error);
    }
  }

  /**
   * =========================================================================
   * CREAR Y GUARDAR REGISTROS
   * =========================================================================
   */

  /**
   * Crear un nuevo registro de rendimiento
   * Se guarda localmente y se marca como pendiente de sincronización
   */
  async crearRegistroRendimiento(datos: {
    id_registro: string;
    id_colaborador: string;
    id_area: string;
    id_supervisor?: string;
    semana: number;
    año: number;
    colaborador_nombre: string;
    colaborador_cargo: string;
    lunes: number | null;
    martes: number | null;
    miercoles: number | null;
    jueves: number | null;
    viernes: number | null;
    sabado: number | null;
    domingo: number | null;
    notas?: string;
  }): Promise<RegistroSincronizable> {
    try {
      // Validar datos
      this.validarDatosRegistro(datos);

      // Calcular promedio
      const dias = [
        datos.lunes,
        datos.martes,
        datos.miercoles,
        datos.jueves,
        datos.viernes,
        datos.sabado,
        datos.domingo
      ];
      const diasTrabajados = dias.filter((d) => d !== null && d > 0) as number[];
      const promedio =
        diasTrabajados.length > 0
          ? Math.round(
              (diasTrabajados.reduce((a, b) => a + b, 0) / diasTrabajados.length) * 100
            ) / 100
          : 0;

      // Crear registro sincronizable
      const registro: RegistroSincronizable = {
        id: uuid(),
        ...datos,
        promedio,
        sincronizado: false,
        intento_sync: 0,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        hash_documento: this.generarHash(datos)
      };

      // Guardar en BD local
      const id = await this.db.crearRegistro(registro);
      console.log(`✓ Registro de rendimiento creado: ${id}`);

      // Actualizar estado
      await this.actualizarEstadoBaseDatos();

      // Intentar sincronización si está online
      const estado = this.sync.obtenerEstadoActual();
      if (estado.online) {
        // Sincronizar en background (sin await)
        this.sync.sincronizarAutomatico().catch(console.error);
      }

      return registro;
    } catch (error) {
      console.error('Error al crear registro:', error);
      throw error;
    }
  }

  /**
   * Actualizar un registro existente
   */
  async actualizarRegistroRendimiento(
    id: string,
    cambios: Partial<RegistroSincronizable>
  ): Promise<void> {
    try {
      await this.db.actualizarRegistro(id, {
        ...cambios,
        sincronizado: false, // Marcar para re-sincronizar
        intento_sync: 0,
        fecha_actualizacion: new Date().toISOString()
      });

      await this.actualizarEstadoBaseDatos();
      console.log(`✓ Registro actualizado: ${id}`);

      // Intentar sincronización si está online
      const estado = this.sync.obtenerEstadoActual();
      if (estado.online) {
        this.sync.sincronizarAutomatico().catch(console.error);
      }
    } catch (error) {
      console.error('Error al actualizar registro:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * CONSULTAS
   * =========================================================================
   */

  /**
   * Obtener un registro por ID
   */
  async obtenerRegistro(id: string): Promise<RegistroSincronizable | undefined> {
    return this.db.obtenerRegistro(id);
  }

  /**
   * Obtener todos los registros
   */
  async obtenerTodos(): Promise<RegistroSincronizable[]> {
    return this.db.obtenerTodos();
  }

  /**
   * Obtener registros pendientes de sincronización
   */
  async obtenerPendientes(): Promise<RegistroSincronizable[]> {
    return this.db.obtenerPendientesSincronizacion();
  }

  /**
   * Obtener registros por área y semana
   */
  async obtenerPorAreaYSemana(
    idArea: string,
    semana: number,
    año: number
  ): Promise<RegistroSincronizable[]> {
    return this.db.obtenerPorAreaYSemana(idArea, semana, año);
  }

  /**
   * Obtener registros de un colaborador
   */
  async obtenerPorColaborador(idColaborador: string): Promise<RegistroSincronizable[]> {
    return this.db.obtenerPorColaborador(idColaborador);
  }

  /**
   * =========================================================================
   * ESTADO Y ESTADÍSTICAS
   * =========================================================================
   */

  /**
   * Actualizar estado actual de la base de datos
   */
  async actualizarEstadoBaseDatos(): Promise<void> {
    try {
      const stats = await this.db.obtenerEstadisticas();
      const pendientes = await this.db.obtenerPendientesSincronizacion();
      const syncStats = await this.sync.estadisticas$.toPromise();

      const estado: EstadoBaseDatos = {
        registrosTotales: stats.total,
        registrosSincronizados: stats.sincronizados,
        registrosPendientes: pendientes.length,
        tasaExito: stats.tasaExito,
        ultimaSincronizacion: syncStats?.ultimoSync,
        proximaSincronizacionProgramada: syncStats?.proximoSync
      };

      this.estadoBaseDatosSubject.next(estado);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  }

  /**
   * Obtener estadísticas completas de sincronización
   */
  async obtenerEstadisticas(): Promise<EstadisticasSincronizacion | null> {
    return new Promise((resolve) => {
      this.sync.estadisticas$.subscribe((stats) => {
        resolve(stats);
      });
    });
  }

  /**
   * =========================================================================
   * OPERACIONES DE LIMPIEZA Y MANTENIMIENTO
   * =========================================================================
   */

  /**
   * Limpiar datos antiguos (retención de datos)
   */
  async limpiarDatosAntiguos(diasRetencion: number = 90): Promise<number> {
    try {
      const cantidad = await this.db.limpiarDatosAntiguos(diasRetencion);
      await this.actualizarEstadoBaseDatos();
      return cantidad;
    } catch (error) {
      console.error('Error al limpiar datos:', error);
      throw error;
    }
  }

  /**
   * Re-intentar sincronización de registros fallidos
   */
  async reintentarFallidos(): Promise<void> {
    try {
      const conErrores = await this.db.obtenerConErrores();

      if (conErrores.length === 0) {
        console.log('✓ No hay registros con errores');
        return;
      }

      console.log(`🔄 Reintentando ${conErrores.length} registros fallidos...`);

      for (const registro of conErrores) {
        await this.db.actualizarRegistro(registro.id, {
          sincronizado: false,
          intento_sync: 0,
          error_sync: undefined
        });
      }

      await this.actualizarEstadoBaseDatos();

      // Trigger sincronización
      if (this.sync.obtenerEstadoActual().online) {
        await this.sync.sincronizarAutomatico();
      }
    } catch (error) {
      console.error('Error al reintentar fallidos:', error);
      throw error;
    }
  }

  /**
   * Exportar datos para respaldo
   */
  async exportarParaRespaldo(): Promise<{
    registros: RegistroSincronizable[];
    timestamp: string;
  }> {
    try {
      const datos = await this.db.exportarDatos();
      return {
        registros: datos.registros,
        timestamp: datos.timestamp
      };
    } catch (error) {
      console.error('Error al exportar datos:', error);
      throw error;
    }
  }

  /**
   * Importar datos desde respaldo
   */
  async importarDesdeRespaldo(registros: RegistroSincronizable[]): Promise<void> {
    try {
      console.log(`📥 Importando ${registros.length} registros...`);

      await this.db.importarDatos({
        registros,
        cola: []
      });

      await this.actualizarEstadoBaseDatos();
      console.log('✓ Datos importados correctamente');
    } catch (error) {
      console.error('Error al importar datos:', error);
      throw error;
    }
  }

  /**
   * Limpiar toda la base de datos (operación destructiva)
   */
  async limpiarTodo(): Promise<void> {
    try {
      const confirmacion = confirm(
        '⚠️ Esta acción eliminará todos los datos locales. ¿Continuar?'
      );

      if (!confirmacion) {
        return;
      }

      await this.db.limpiarTodo();
      await this.actualizarEstadoBaseDatos();
      console.log('✓ Base de datos local limpiada');
    } catch (error) {
      console.error('Error al limpiar BD:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * UTILIDADES PRIVADAS
   * =========================================================================
   */

  /**
   * Validar datos del registro
   */
  private validarDatosRegistro(datos: any): void {
    const camposRequeridos = [
      'id_registro',
      'id_colaborador',
      'id_area',
      'semana',
      'año',
      'colaborador_nombre'
    ];

    for (const campo of camposRequeridos) {
      if (!datos[campo]) {
        throw new Error(`Campo requerido: ${campo}`);
      }
    }

    if (datos.semana < 1 || datos.semana > 53) {
      throw new Error('Semana debe estar entre 1 y 53');
    }

    if (datos.año < 2000 || datos.año > 2100) {
      throw new Error('Año debe ser válido');
    }
  }

  /**
   * Generar hash para detectar cambios en documentos
   */
  private generarHash(objeto: any): string {
    const json = JSON.stringify(objeto);
    let hash = 0;

    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }

    return Math.abs(hash).toString(16);
  }
}

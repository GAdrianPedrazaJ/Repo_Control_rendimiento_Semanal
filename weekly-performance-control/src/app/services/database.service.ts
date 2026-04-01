import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { RegistroSincronizable, ItemColaSincronizacion } from '../models/sync-models';

/**
 * ============================================================================
 * DATABASE SERVICE
 * ============================================================================
 * Servicio que gestiona la persistencia local usando Dexie.js
 * 
 * Base de datos IndexedDB con esquema relacional optimizado para:
 * - Almacenamiento offline de registros
 * - Seguimiento de estado de sincronización
 * - Manejo de cola de sincronización
 */

export class PerformanceControlDatabase extends Dexie {
  // Tablas de la base de datos
  registrosSincronizables!: Table<RegistroSincronizable>;
  colaSincronizacion!: Table<ItemColaSincronizacion>;

  constructor() {
    super('PerformanceControlDB');
    
    this.version(1).stores({
      // Tabla: Registros sincronizables
      // Índices: id (clave primaria), id_registro, id_colaborador, sincronizado, fecha
      registrosSincronizables: '++id, id_registro, id_colaborador, sincronizado, año, semana',
      
      // Tabla: Cola de sincronización (para reintentos y ordenamiento)
      // Índices: id, fecha, tipo, estado
      colaSincronizacion: '++id_elemento, id_registro, proximo_intento, tipo'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: PerformanceControlDatabase;

  constructor() {
    this.db = new PerformanceControlDatabase();
  }

  /**
   * =========================================================================
   * OPERACIONES CRUD - REGISTROS SINCRONIZABLES
   * =========================================================================
   */

  /**
   * Crear un nuevo registro sincronizable
   */
  async crearRegistro(registro: RegistroSincronizable): Promise<string> {
    try {
      const id = await this.db.registrosSincronizables.add(registro);
      console.log(`✓ Registro creado en BD local: ${id}`);
      return id as string;
    } catch (error) {
      console.error('✗ Error al crear registro:', error);
      throw new Error(`No se pudo crear el registro: ${error}`);
    }
  }

  /**
   * Obtener un registro por ID
   */
  async obtenerRegistro(id: string): Promise<RegistroSincronizable | undefined> {
    try {
      return await this.db.registrosSincronizables.get(id);
    } catch (error) {
      console.error('✗ Error al obtener registro:', error);
      throw error;
    }
  }

  /**
   * Actualizar un registro existente
   */
  async actualizarRegistro(
    id: string,
    cambios: Partial<RegistroSincronizable>
  ): Promise<void> {
    try {
      const registro = await this.obtenerRegistro(id);
      if (!registro) {
        throw new Error(`Registro no encontrado: ${id}`);
      }

      const registroActualizado: RegistroSincronizable = {
        ...registro,
        ...cambios,
        fecha_actualizacion: new Date().toISOString()
      };

      await this.db.registrosSincronizables.put(registroActualizado);
      console.log(`✓ Registro actualizado: ${id}`);
    } catch (error) {
      console.error('✗ Error al actualizar registro:', error);
      throw error;
    }
  }

  /**
   * Marcar registro como sincronizado
   */
  async marcarComoSincronizado(
    id: string,
    idExcel?: string
  ): Promise<void> {
    await this.actualizarRegistro(id, {
      sincronizado: true,
      fecha_sincronizacion: new Date().toISOString(),
      intento_sync: 0,
      error_sync: undefined
    });
  }

  /**
   * Eliminar un registro
   */
  async borrarRegistro(id: string): Promise<void> {
    try {
      await this.db.registrosSincronizables.delete(id);
      console.log(`✓ Registro eliminado: ${id}`);
    } catch (error) {
      console.error('✗ Error al eliminar registro:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * CONSULTAS - REGISTROS SINCRONIZABLES
   * =========================================================================
   */

  /**
   * Obtener todos los registros pendientes de sincronizar
   */
  async obtenerPendientesSincronizacion(): Promise<RegistroSincronizable[]> {
    try {
      return await this.db.registrosSincronizables
        .filter((r) => r.sincronizado === false)
        .toArray();
    } catch (error) {
      console.error('✗ Error al obtener pendientes:', error);
      throw error;
    }
  }

  /**
   * Obtener registros por área y semana
   */
  async obtenerPorAreaYSemana(
    idArea: string,
    semana: number,
    año: number
  ): Promise<RegistroSincronizable[]> {
    try {
      return await this.db.registrosSincronizables
        .where('id_area')
        .equals(idArea)
        .filter(
          (r) => r.semana === semana && r.año === año
        )
        .toArray();
    } catch (error) {
      console.error('✗ Error en consulta por área y semana:', error);
      throw error;
    }
  }

  /**
   * Obtener registros de un colaborador
   */
  async obtenerPorColaborador(
    idColaborador: string
  ): Promise<RegistroSincronizable[]> {
    try {
      return await this.db.registrosSincronizables
        .where('id_colaborador')
        .equals(idColaborador)
        .toArray();
    } catch (error) {
      console.error('✗ Error al obtener registros del colaborador:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los registros
   */
  async obtenerTodos(): Promise<RegistroSincronizable[]> {
    try {
      return await this.db.registrosSincronizables.toArray();
    } catch (error) {
      console.error('✗ Error al obtener todos los registros:', error);
      throw error;
    }
  }

  /**
   * Obtener registros con errores de sincronización
   */
  async obtenerConErrores(): Promise<RegistroSincronizable[]> {
    try {
      return await this.db.registrosSincronizables
        .filter((r) => r.error_sync !== undefined && r.error_sync !== null)
        .toArray();
    } catch (error) {
      console.error('✗ Error al obtener registros con errores:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * OPERACIONES CRUD - COLA DE SINCRONIZACIÓN
   * =========================================================================
   */

  /**
   * Agregar elemento a la cola de sincronización
   */
  async agregarAColaSincronizacion(
    elemento: ItemColaSincronizacion
  ): Promise<string> {
    try {
      const id = await this.db.colaSincronizacion.add(elemento);
      console.log(`✓ Elemento agregado a cola: ${id}`);
      return id as string;
    } catch (error) {
      console.error('✗ Error al agregar a cola:', error);
      throw error;
    }
  }

  /**
   * Obtener elementos listos para sincronizar (reintentos)
   */
  async obtenerElementosListosParaSync(): Promise<ItemColaSincronizacion[]> {
    try {
      const ahora = new Date().toISOString();
      return await this.db.colaSincronizacion
        .filter((e) => e.proximo_intento <= ahora)
        .toArray();
    } catch (error) {
      console.error('✗ Error al obtener elementos listos:', error);
      throw error;
    }
  }

  /**
   * Actualizar intento de sincronización
   */
  async actualizarIntento(
    idElemento: string,
    cambios: Partial<ItemColaSincronizacion>
  ): Promise<void> {
    try {
      await this.db.colaSincronizacion.update(idElemento, cambios);
      console.log(`✓ Intento actualizado: ${idElemento}`);
    } catch (error) {
      console.error('✗ Error al actualizar intento:', error);
      throw error;
    }
  }

  /**
   * Eliminar elemento de la cola
   */
  async eliminarDeColaSincronizacion(idElemento: string): Promise<void> {
    try {
      await this.db.colaSincronizacion.delete(idElemento);
      console.log(`✓ Elemento eliminado de cola: ${idElemento}`);
    } catch (error) {
      console.error('✗ Error al eliminar de cola:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * ESTADÍSTICAS Y ANÁLISIS
   * =========================================================================
   */

  /**
   * Obtener estadísticas de sincronización
   */
  async obtenerEstadisticas(): Promise<{
    total: number;
    sincronizados: number;
    pendientes: number;
    conErrores: number;
    tasaExito: number;
  }> {
    try {
      const registros = await this.obtenerTodos();
      const sincronizados = registros.filter((r) => r.sincronizado).length;
      const conErrores = registros.filter((r) => r.error_sync).length;

      return {
        total: registros.length,
        sincronizados,
        pendientes: registros.length - sincronizados,
        conErrores,
        tasaExito:
          registros.length > 0
            ? Math.round((sincronizados / registros.length) * 100)
            : 0
      };
    } catch (error) {
      console.error('✗ Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Limpiar datos antiguos (retención de datos)
   * Elimina registros más antiguos de N días que ya fueron sincronizados
   */
  async limpiarDatosAntiguos(diasRetencion: number = 90): Promise<number> {
    try {
      const ahora = new Date();
      const fechaLimite = new Date(
        ahora.getTime() - diasRetencion * 24 * 60 * 60 * 1000
      ).toISOString();

      const aEliminar = await this.db.registrosSincronizables
        .where('fecha_creacion')
        .below(fechaLimite)
        .filter((r) => r.sincronizado === true)
        .toArray();

      for (const registro of aEliminar) {
        await this.borrarRegistro(registro.id);
      }

      console.log(
        `✓ ${aEliminar.length} registros antiguos eliminados (>${diasRetencion} días)`
      );
      return aEliminar.length;
    } catch (error) {
      console.error('✗ Error al limpiar datos antiguos:', error);
      throw error;
    }
  }

  /**
   * Exportar datos para respaldo
   */
  async exportarDatos(): Promise<{
    registros: RegistroSincronizable[];
    cola: ItemColaSincronizacion[];
    timestamp: string;
  }> {
    try {
      const registros = await this.obtenerTodos();
      const cola = await this.db.colaSincronizacion.toArray();

      return {
        registros,
        cola,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('✗ Error al exportar datos:', error);
      throw error;
    }
  }

  /**
   * Importar datos desde un respaldo
   */
  async importarDatos(datos: {
    registros: RegistroSincronizable[];
    cola: ItemColaSincronizacion[];
  }): Promise<void> {
    try {
      await this.db.registrosSincronizables.bulkAdd(datos.registros);
      await this.db.colaSincronizacion.bulkAdd(datos.cola);
      console.log(
        `✓ Datos importados: ${datos.registros.length} registros, ${datos.cola.length} elementos en cola`
      );
    } catch (error) {
      console.error('✗ Error al importar datos:', error);
      throw error;
    }
  }

  /**
   * Limpiar toda la base de datos (operación destructiva)
   */
  async limpiarTodo(): Promise<void> {
    try {
      await this.db.registrosSincronizables.clear();
      await this.db.colaSincronizacion.clear();
      console.log('✓ Base de datos local completamente limpiada');
    } catch (error) {
      console.error('✗ Error al limpiar base de datos:', error);
      throw error;
    }
  }
}

import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import {
  Area,
  Colaborador,
  RegistroRendimiento,
  ItemSyncQueue,
  EstadoSync
} from '../models';

/**
 * PerformanceDB
 * Base de datos IndexedDB para almacenamiento offline-first
 * Tablas: areas, colaboradores, registros_rendimiento, sync_queue
 */
class PerformanceDB extends Dexie {
  areas!: Table<Area>;
  colaboradores!: Table<Colaborador>;
  registros_rendimiento!: Table<RegistroRendimiento>;
  sync_queue!: Table<ItemSyncQueue>;

  constructor() {
    super('performance-control-db');
    this.version(1).stores({
      areas: '&id_area, estado, timestamp_creacion',
      colaboradores: '&id_colaborador, id_area, estado, timestamp_creacion',
      registros_rendimiento: '&id_registro, semana, año, id_area, estado_sync, timestamp_creacion',
      sync_queue: '&id, tipo, timestamp_agregado'
    });
  }
}

/**
 * StorageService
 * Gestiona todas las operaciones CRUD con IndexedDB
 * Manejo de áreas, colaboradores y registros de rendimiento
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private db = new PerformanceDB();

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Inicializar la base de datos (crear tablas si no existen)
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.open();
      console.log('✓ IndexedDB inicializada correctamente');
    } catch (error) {
      console.error('✗ Error al inicializar IndexedDB:', error);
    }
  }

  /**
   * =========================================================================
   * OPERACIONES CRUD: ÁREAS
   * =========================================================================
   */

  async crearArea(area: Area): Promise<string> {
    try {
      const id = await this.db.areas.add(area);
      console.log(`✓ Área creada: ${id}`);
      return id;
    } catch (error) {
      console.error('✗ Error creando área:', error);
      throw error;
    }
  }

  async obtenerArea(id_area: string): Promise<Area | undefined> {
    try {
      return await this.db.areas.get(id_area);
    } catch (error) {
      console.error('✗ Error obteniendo área:', error);
      return undefined;
    }
  }

  async obtenerTodasLasAreas(): Promise<Area[]> {
    try {
      return await this.db.areas.toArray();
    } catch (error) {
      console.error('✗ Error obteniendo áreas:', error);
      return [];
    }
  }

  async obtenerAreasActivas(): Promise<Area[]> {
    try {
      return await this.db.areas
        .where('estado')
        .equals('ACTIVO')
        .toArray();
    } catch (error) {
      console.error('✗ Error obteniendo áreas activas:', error);
      return [];
    }
  }

  async actualizarArea(id_area: string, cambios: Partial<Area>): Promise<void> {
    try {
      await this.db.areas.update(id_area, {
        ...cambios,
        timestamp_actualizacion: new Date().toISOString()
      });
      console.log(`✓ Área actualizada: ${id_area}`);
    } catch (error) {
      console.error('✗ Error actualizando área:', error);
      throw error;
    }
  }

  async eliminarArea(id_area: string): Promise<void> {
    try {
      await this.db.areas.delete(id_area);
      console.log(`✓ Área eliminada: ${id_area}`);
    } catch (error) {
      console.error('✗ Error eliminando área:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * OPERACIONES CRUD: COLABORADORES
   * =========================================================================
   */

  async crearColaborador(colaborador: Colaborador): Promise<string> {
    try {
      const id = await this.db.colaboradores.add(colaborador);
      console.log(`✓ Colaborador creado: ${id}`);
      return id;
    } catch (error) {
      console.error('✗ Error creando colaborador:', error);
      throw error;
    }
  }

  async obtenerColaborador(id_colaborador: string): Promise<Colaborador | undefined> {
    try {
      return await this.db.colaboradores.get(id_colaborador);
    } catch (error) {
      console.error('✗ Error obteniendo colaborador:', error);
      return undefined;
    }
  }

  async obtenerColaboradoresPorArea(id_area: string): Promise<Colaborador[]> {
    try {
      return await this.db.colaboradores
        .where('id_area')
        .equals(id_area)
        .toArray();
    } catch (error) {
      console.error('✗ Error obteniendo colaboradores del área:', error);
      return [];
    }
  }

  async obtenerColaboradoresActivosPorArea(id_area: string): Promise<Colaborador[]> {
    try {
      return await this.db.colaboradores
        .where('id_area')
        .equals(id_area)
        .and((c) => c.estado === 'ACTIVO')
        .toArray();
    } catch (error) {
      console.error('✗ Error obteniendo colaboradores activos:', error);
      return [];
    }
  }

  async obtenerTodosLosColaboradores(): Promise<Colaborador[]> {
    try {
      return await this.db.colaboradores.toArray();
    } catch (error) {
      console.error('✗ Error obteniendo colaboradores:', error);
      return [];
    }
  }

  async actualizarColaborador(id_colaborador: string, cambios: Partial<Colaborador>): Promise<void> {
    try {
      await this.db.colaboradores.update(id_colaborador, {
        ...cambios,
        timestamp_actualizacion: new Date().toISOString()
      });
      console.log(`✓ Colaborador actualizado: ${id_colaborador}`);
    } catch (error) {
      console.error('✗ Error actualizando colaborador:', error);
      throw error;
    }
  }

  async eliminarColaborador(id_colaborador: string): Promise<void> {
    try {
      await this.db.colaboradores.delete(id_colaborador);
      console.log(`✓ Colaborador eliminado: ${id_colaborador}`);
    } catch (error) {
      console.error('✗ Error eliminando colaborador:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * OPERACIONES CRUD: REGISTROS DE RENDIMIENTO
   * =========================================================================
   */

  async crearRegistro(registro: RegistroRendimiento): Promise<string> {
    try {
      const id = await this.db.registros_rendimiento.add(registro);
      console.log(`✓ Registro de rendimiento creado: ${id}`);
      return id;
    } catch (error) {
      console.error('✗ Error creando registro:', error);
      throw error;
    }
  }

  async obtenerRegistro(id_registro: string): Promise<RegistroRendimiento | undefined> {
    try {
      return await this.db.registros_rendimiento.get(id_registro);
    } catch (error) {
      console.error('✗ Error obteniendo registro:', error);
      return undefined;
    }
  }

  async obtenerRegistrosPorArea(id_area: string): Promise<RegistroRendimiento[]> {
    try {
      return await this.db.registros_rendimiento
        .where('id_area')
        .equals(id_area)
        .toArray();
    } catch (error) {
      console.error('✗ Error obteniendo registros del área:', error);
      return [];
    }
  }

  async obtenerRegistrosPorSemana(
    semana: number,
    año: number,
    id_area?: string
  ): Promise<RegistroRendimiento[]> {
    try {
      let query = this.db.registros_rendimiento.where('semana').equals(semana);
      const registros = await query.toArray();

      // Filtrar por año e id_area si se proporcionan
      const filtrados = registros.filter(
        (r) => r.año === año && (!id_area || r.id_area === id_area)
      );

      return filtrados;
    } catch (error) {
      console.error('✗ Error obteniendo registros por semana:', error);
      return [];
    }
  }

  async obtenerRegistrosPendientesSync(): Promise<RegistroRendimiento[]> {
    try {
      return await this.db.registros_rendimiento
        .where('estado_sync')
        .equals(EstadoSync.PENDIENTE)
        .toArray();
    } catch (error) {
      console.error('✗ Error obteniendo registros pendientes:', error);
      return [];
    }
  }

  async actualizarRegistro(
    id_registro: string,
    cambios: Partial<RegistroRendimiento>
  ): Promise<void> {
    try {
      await this.db.registros_rendimiento.update(id_registro, {
        ...cambios,
        timestamp_actualizacion: new Date().toISOString()
      });
      console.log(`✓ Registro actualizado: ${id_registro}`);
    } catch (error) {
      console.error('✗ Error actualizando registro:', error);
      throw error;
    }
  }

  async eliminarRegistro(id_registro: string): Promise<void> {
    try {
      await this.db.registros_rendimiento.delete(id_registro);
      console.log(`✓ Registro eliminado: ${id_registro}`);
    } catch (error) {
      console.error('✗ Error eliminando registro:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * OPERACIONES: COLA DE SINCRONIZACIÓN
   * =========================================================================
   */

  async agregarAColaSync(item: ItemSyncQueue): Promise<void> {
    try {
      await this.db.sync_queue.add(item);
      console.log(`✓ Item agregado a cola de sync: ${item.id}`);
    } catch (error) {
      console.error('✗ Error agregando a cola de sync:', error);
      throw error;
    }
  }

  async obtenerColaSync(): Promise<ItemSyncQueue[]> {
    try {
      return await this.db.sync_queue.toArray();
    } catch (error) {
      console.error('✗ Error obteniendo cola de sync:', error);
      return [];
    }
  }

  async actualizarItemSync(id: string, cambios: Partial<ItemSyncQueue>): Promise<void> {
    try {
      await this.db.sync_queue.update(id, cambios);
      console.log(`✓ Item de sync actualizado: ${id}`);
    } catch (error) {
      console.error('✗ Error actualizando item de sync:', error);
      throw error;
    }
  }

  async removerDeColaSync(id: string): Promise<void> {
    try {
      await this.db.sync_queue.delete(id);
      console.log(`✓ Item removido de cola de sync: ${id}`);
    } catch (error) {
      console.error('✗ Error removiendo de cola de sync:', error);
      throw error;
    }
  }

  async limpiarColaSync(): Promise<void> {
    try {
      await this.db.sync_queue.clear();
      console.log('✓ Cola de sync limpiada');
    } catch (error) {
      console.error('✗ Error limpiando cola de sync:', error);
      throw error;
    }
  }

  /**
   * =========================================================================
   * OPERACIONES GLOBALES
   * =========================================================================
   */

  async limpiarTodosSinBackup(): Promise<void> {
    try {
      await this.db.delete();
      await this.db.open();
      console.log('✓ Base de datos limpiada completamente');
    } catch (error) {
      console.error('✗ Error limpiando base de datos:', error);
      throw error;
    }
  }

  async obtenerEstadisticas(): Promise<any> {
    try {
      const areas = await this.db.areas.count();
      const colaboradores = await this.db.colaboradores.count();
      const registros = await this.db.registros_rendimiento.count();
      const colaSync = await this.db.sync_queue.count();

      return {
        areas,
        colaboradores,
        registros,
        colaSync,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('✗ Error calculando estadísticas:', error);
      return null;
    }
  }
}

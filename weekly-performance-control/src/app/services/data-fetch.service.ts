import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Colaborador, Area, EstadoColaborador } from '../models';
import { StorageService } from './storage.service';

/**
 * DataFetchService
 * Gestiona la obtención dinámica de datos desde Excel Online
 * - Pull automático al inicializar
 * - Filtrado por areaId y estado Activo
 * - Watch de cambios de estado (desactivaciones)
 * - Cache local si offline
 */
@Injectable({
  providedIn: 'root'
})
export class DataFetchService {
  /**
   * Observable de colaboradores para la área actual
   */
  private colaboradoresSubject = new BehaviorSubject<Colaborador[]>([]);
  public colaboradores$ = this.colaboradoresSubject.asObservable();

  /**
   * Observable de áreas disponibles
   */
  private areasSubject = new BehaviorSubject<Area[]>([]);
  public areas$ = this.areasSubject.asObservable();

  /**
   * Flag indicando si datos están siendo cargados
   */
  private cargandoSubject = new BehaviorSubject<boolean>(false);
  public cargando$ = this.cargandoSubject.asObservable();

  constructor(private storageService: StorageService) {}

  /**
   * =========================================================================
   * PULL DE DATOS: ÁREAS
   * =========================================================================
   */

  /**
   * Pull automático de áreas desde Excel (simulado con IndexedDB)
   * En producción, aquí iría llamada a Power Apps para leer Excel Online
   */
  async pullAreas(): Promise<Area[]> {
    try {
      this.cargandoSubject.next(true);

      // Simulamos lectura desde IndexedDB
      // En producción: hacer llamada a Excel Online via Power Apps
      const areas = await this.storageService.obtenerAreasActivas();

      this.areasSubject.next(areas);
      this.cargandoSubject.next(false);

      console.log(`✓ Pull de ${areas.length} áreas completado`);
      return areas;
    } catch (error) {
      console.error('✗ Error en pull de áreas:', error);
      this.cargandoSubject.next(false);
      throw error;
    }
  }

  /**
   * Obtener área específica
   */
  async obtenerArea(id_area: string): Promise<Area | undefined> {
    return await this.storageService.obtenerArea(id_area);
  }

  /**
   * =========================================================================
   * PULL DE DATOS: COLABORADORES
   * =========================================================================
   */

  /**
   * Pull automático de colaboradores asignados a un área
   * - Solo ACTIVOS
   * - Filtrado por id_area
   * - Guarda en cache local
   */
  async pullColaboradoresPorArea(id_area: string): Promise<Colaborador[]> {
    try {
      this.cargandoSubject.next(true);

      // Simulamos lectura desde IndexedDB
      // En producción: hacer llamada a Excel Online via Power Apps
      // Filtro: WHERE id_area = id_area AND estado = 'ACTIVO'
      const colaboradores = await this.storageService.obtenerColaboradoresActivosPorArea(
        id_area
      );

      this.colaboradoresSubject.next(colaboradores);
      this.cargandoSubject.next(false);

      console.log(
        `✓ Pull de ${colaboradores.length} colaboradores para área ${id_area}`
      );
      return colaboradores;
    } catch (error) {
      console.error('✗ Error en pull de colaboradores:', error);
      this.cargandoSubject.next(false);

      // Retornar cache local si hay error
      const cache = this.colaboradoresSubject.value;
      console.log(`⚠ Usando ${cache.length} colaboradores del cache local`);
      return cache;
    }
  }

  /**
   * Obtener colaborador específico
   */
  async obtenerColaborador(id_colaborador: string): Promise<Colaborador | undefined> {
    return await this.storageService.obtenerColaborador(id_colaborador);
  }

  /**
   * =========================================================================
   * WATCH: DETECCIÓN DE CAMBIOS
   * =========================================================================
   */

  /**
   * Monitorear cambios de estado de colaboradores
   * Si un colaborador se desactiva, actualizar UI en tiempo real
   * Esta función debe ejecutarse periódicamente (cada 30 seg aprox)
   */
  async watchEstadoColaboradores(id_area: string): Promise<void> {
    try {
      const colaboradoresActuales = this.colaboradoresSubject.value;
      const colaboradoresActualizados = await this.pullColaboradoresPorArea(id_area);

      // Detectar desactivaciones
      const desactivados = colaboradoresActuales.filter(
        (c) =>
          !colaboradoresActualizados.some((cu) => cu.id_colaborador === c.id_colaborador)
      );

      if (desactivados.length > 0) {
        console.log(
          `⚠ ${desactivados.length} colaborador(es) desactivado(s) en Excel`
        );
        this.notificarDesactivaciones(desactivados);
      }

      // Detectar nuevos colaboradores
      const nuevos = colaboradoresActualizados.filter(
        (c) =>
          !colaboradoresActuales.some((ca) => ca.id_colaborador === c.id_colaborador)
      );

      if (nuevos.length > 0) {
        console.log(`✓ ${nuevos.length} nuevo(s) colaborador(es) agregado(s)`);
        this.notificarNuevosColaboradores(nuevos);
      }

      // Actualizar lista
      this.colaboradoresSubject.next(colaboradoresActualizados);
    } catch (error) {
      console.error('✗ Error en watch de estado:', error);
    }
  }

  /**
   * Notificar desactivaciones (para UI)
   */
  private notificarDesactivaciones(colaboradores: Colaborador[]): void {
    const nombres = colaboradores.map((c) => c.nombre).join(', ');
    const mensaje = `⚠️ Los siguientes colaboradores fueron desactivados: ${nombres}. 
    Sus filas están bloqueadas. Puedes guardar los datos capturados antes de su desactivación.`;

    // Emitir evento o mostrar toast/snackbar en UI
    console.warn(mensaje);
  }

  /**
   * Notificar nuevos colaboradores (para UI)
   */
  private notificarNuevosColaboradores(colaboradores: Colaborador[]): void {
    const nombres = colaboradores.map((c) => c.nombre).join(', ');
    const mensaje = `✓ Nuevos colaboradores disponibles: ${nombres}`;

    console.log(mensaje);
  }

  /**
   * =========================================================================
   * SUBSCRIPCIÓN A OBSERVABLES
   * =========================================================================
   */

  /**
   * Suscribirse a cambios de colaboradores
   */
  obtenerColaboradores$(): Observable<Colaborador[]> {
    return this.colaboradores$;
  }

  /**
   * Suscribirse a cambios de áreas
   */
  obtenerAreas$(): Observable<Area[]> {
    return this.areas$;
  }

  /**
   * Suscribirse al estado de carga
   */
  obtenerCargando$(): Observable<boolean> {
    return this.cargando$;
  }

  /**
   * =========================================================================
   * UTILIDADES
   * =========================================================================
   */

  /**
   * Generar nombre único para nuevo colaborador
   */
  generarNombreColaborador(base: string, existentes: Colaborador[]): string {
    const nombres = existentes.map((c) => c.nombre.toLowerCase());
    let contador = 1;

    let nombre = base;
    while (nombres.includes(nombre.toLowerCase())) {
      nombre = `${base} (${contador})`;
      contador++;
    }

    return nombre;
  }

  /**
   * Validar si un colaborador existe en el área
   */
  colaboradorExiste(id_colaborador: string): boolean {
    const colaboradores = this.colaboradoresSubject.value;
    return colaboradores.some((c) => c.id_colaborador === id_colaborador);
  }

  /**
   * Obtener cantidad de colaboradores activos
   */
  obtenerCantidadColaboradores(): number {
    return this.colaboradoresSubject.value.length;
  }
}

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Area, Colaborador, DiaSemanal, EstadoSync, RegistroRendimiento, TokenFirma } from '../../models';
import { DataFetchService, SignatureService, SyncService } from '../../services';
import { FirmaColaboradorComponent } from '../firma-colaborador/firma-colaborador.component';

/**
 * COMPONENTE SUPERVISOR MODE
 * ==================================================
 * Componente encargado de gestionar la captura de datos de rendimiento semanal
 * de los colaboradores. Permite al supervisor:
 * - Ingresa un valor diferente para cada día de la semana
 * - Visualiza el promedio de los rendimientos semanales
 * - Firmar digitalmente cada registro de colaborador
 * - Sincronizar datos offline con la base de datos
 */
@Component({
  selector: 'app-supervisor-mode',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FirmaColaboradorComponent],
  templateUrl: './supervisor-mode.component.html',
  styleUrls: ['./supervisor-mode.component.css']
})
export class SupervisorModeComponent implements OnChanges {
  // ===== INPUTS (Datos que recibe del componente padre) =====
  @Input() idArea = ''; // ID del área a capturar datos
  @Input() idSupervisor = ''; // ID del supervisor autenticado
  @Input() colaboradores: Colaborador[] | null = null; // Lista de colaboradores del área

  // ===== OUTPUTS (Eventos que emite este componente) =====
  @Output() registroSemanalGenerado = new EventEmitter<RegistroRendimiento>();

  // ===== PROPIEDADES DEL COMPONENTE =====
  form: FormGroup; // Formulario reactivo principal
  cargando = false; // Banderapara mostrar estado de carga
  mensaje = ''; // Mensaje de estado para el usuario
  selectedDay: string = 'lunes'; // Día actual seleccionado para entrada de datos
  selectedColaborador: number | null = null; // Índice del colaborador actual

  semanaActual = this.obtenerNumeroSemana(new Date()); // Número de semana ISO actual
  anioActual = new Date().getFullYear(); // Año actual

  constructor(
    private fb: FormBuilder,
    private dataFetch: DataFetchService,
    private signatureService: SignatureService,
    private syncService: SyncService,
    private cdr: ChangeDetectorRef
  ) {
    // Inicializar formulario reactivo con estructura base
    this.form = this.fb.group({
      colaboradores: this.fb.array([]), // Array dinámico de colaboradores
      semana: [this.semanaActual],
      anio: [this.anioActual],
      id_area: [this.idArea],
      id_supervisor: [this.idSupervisor],
      notas: [''] // Notas adicionales opcionales
    });
  }

  /**
   * Ciclo de vida: Ejecuta cuando cambian las propiedades @Input
   * Detecta cambios en idArea, colaboradores e idSupervisor
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idArea'] && this.idArea) {
      this.cargarDatos(); // Cargar datos reales de la API
    }

    if (changes['colaboradores'] && this.colaboradores) {
      this.crearForm(this.colaboradores); // Crear formulario con colaboradores del API
    }

    // Fallback: Si no hay datos del API, usar datos de prueba
    if (changes['idSupervisor'] && !this.colaboradores && this.idSupervisor) {
      this.cargarDatosDemo();
    }
  }

  /**
   * Carga colaboradores de prueba para desarrollo/demostración
   * Utiliza 4 colaboradores ficticios con cargos variados
   */
  private cargarDatosDemo(): void {
    const ahora = new Date().toISOString();
    const colaboradoresDemo: Colaborador[] = [
      {
        id_colaborador: 'COL_001',
        nombre: 'Juan Pérez',
        cargo: 'Desarrollador Senior',
        id_area: 'AREA_1',
        estado: 'activo' as any,
        timestamp_creacion: ahora,
        timestamp_actualizacion: ahora
      },
      {
        id_colaborador: 'COL_002',
        nombre: 'María García',
        cargo: 'Analista de Sistemas',
        id_area: 'AREA_1',
        estado: 'activo' as any,
        timestamp_creacion: ahora,
        timestamp_actualizacion: ahora
      },
      {
        id_colaborador: 'COL_003',
        nombre: 'Roberto López',
        cargo: 'QA Engineer',
        id_area: 'AREA_1',
        estado: 'activo' as any,
        timestamp_creacion: ahora,
        timestamp_actualizacion: ahora
      },
      {
        id_colaborador: 'COL_004',
        nombre: 'Sofía Martínez',
        cargo: 'Frontend Developer',
        id_area: 'AREA_1',
        estado: 'activo' as any,
        timestamp_creacion: ahora,
        timestamp_actualizacion: ahora
      }
    ];

    this.colaboradores = colaboradoresDemo;
    this.crearForm(colaboradoresDemo);
  }

  /**
   * Calcula el número de semana ISO del año para una fecha dada
   * @param fecha - Fecha a calcular
   * @returns Número de semana (1-53)
   */
  private obtenerNumeroSemana(fecha: Date): number {
    const unDia = 24 * 60 * 60 * 1000;
    const inicioAno = new Date(fecha.getFullYear(), 0, 1);
    const diasTranscurridos = Math.floor((fecha.getTime() - inicioAno.getTime()) / unDia);
    return Math.ceil((diasTranscurridos + inicioAno.getDay() + 1) / 7);
  }

  /**
   * Calcula el promedio de un array de días semanales
   * Solo incluye lunes a sábado (excluye domingo)
   * Solo incluye días con valores válidos (números no null/undefined)
   * @param dias - Array de días con sus valores
   * @returns Promedio redondeado a 2 decimales
   */
  private calcularPromedio(dias: DiaSemanal[]): number {
    const valores = dias
      .filter((d) => d.dia !== 'domingo') // Excluir domingo
      .map((d) => (d.valor === null || d.valor === undefined ? null : Number(d.valor)))
      .filter((v): v is number => v !== null && !isNaN(v));

    if (valores.length === 0) return 0;
    const total = valores.reduce((acc, v) => acc + v, 0);
    return Number((total / valores.length).toFixed(2));
  }

  /**
   * Recalcula todos los promedios del formulario
   * Se ejecuta después de cambiar valores en los días
   */
  private calcularPromedios(): void {
    this.colaboradoresFormArray.controls.forEach((control, index) => {
      const diasForm = (control as FormGroup).get('dias') as FormGroup;
      const diaValores: DiaSemanal[] = [
        { dia: 'lunes', valor: diasForm.get('lunes')?.value },
        { dia: 'martes', valor: diasForm.get('martes')?.value },
        { dia: 'miercoles', valor: diasForm.get('miercoles')?.value },
        { dia: 'jueves', valor: diasForm.get('jueves')?.value },
        { dia: 'viernes', valor: diasForm.get('viernes')?.value },
        { dia: 'sabado', valor: diasForm.get('sabado')?.value },
        { dia: 'domingo', valor: diasForm.get('domingo')?.value }
      ];
      const promedio = this.calcularPromedio(diaValores);
      (control as FormGroup).patchValue({ promedio });
    });
  }

  /**
   * Carga datos reales de los colaboradores desde la API/IndexedDB
   * Consulta la lista de colaboradores por área asignada
   */
  async cargarDatos(): Promise<void> {
    this.cargando = true;
    this.mensaje = '';

    try {
      const area = this.idArea ? await this.dataFetch.obtenerArea(this.idArea) : null;
      if (!area) {
        this.mensaje = 'Área no encontrada';
        this.cargando = false;
        return;
      }

      // Obtener lista de colaboradores del área
      const lista = await this.dataFetch.pullColaboradoresPorArea(this.idArea);
      this.crearForm(lista);

      // Iniciar monitoreo de cambios cada 30 segundos para archivos sincrónicos
      setTimeout(() => this.dataFetch.watchEstadoColaboradores(this.idArea), 30000);

      this.mensaje = `Área cargada: ${area.nombre}`;
    } catch (error) {
      this.mensaje = 'Error cargando datos de colaboradores';
      console.error(error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Crea el formulario reactivo con un grupo de colaboradores
   * Inicializa cada colaborador con sus datos y estructura de días
   * @param colaboradores - Lista de colaboradores a procesar
   */
  private crearForm(colaboradores: Colaborador[]): void {
    const grupo = colaboradores.map((colaborador) => this.crearGrupoColaborador(colaborador));
    this.form.setControl('colaboradores', this.fb.array(grupo));
    this.form.patchValue({ id_area: this.idArea, id_supervisor: this.idSupervisor });
    this.calcularPromedios();
  }

  /**
   * Crea un FormGroup para un colaborador individual
   * @param colaborador - Datos del colaborador
   * @returns FormGroup con estructura de días y firma
   */
  private crearGrupoColaborador(colaborador: Colaborador): FormGroup {
    const dias: Record<string, any> = {};
    // Inicializar cada día con valor null si no existe
    const diasBase: DiaSemanal[] = colaborador.dias || [
      { dia: 'lunes', valor: null },
      { dia: 'martes', valor: null },
      { dia: 'miercoles', valor: null },
      { dia: 'jueves', valor: null },
      { dia: 'viernes', valor: null },
      { dia: 'sabado', valor: null },
      { dia: 'domingo', valor: null }
    ];

    diasBase.forEach((d) => dias[d.dia] = d.valor);

    return this.fb.group({
      id_colaborador: [colaborador.id_colaborador],
      nombre: [colaborador.nombre],
      cargo: [colaborador.cargo],
      estado: [colaborador.estado],
      dias: this.fb.group(dias), // Grupo anidado para los 7 días
      promedio: [colaborador.promedio || 0],
      firma_colaborador: [colaborador.esReadonly || false], // Bandera de firma
      timestamp_firma: [(colaborador as any)?.timestamp_firma || null],
      token_firma: [colaborador.esReadonly ? (colaborador as any).dias : null]
    });
  }

  /**
   * Getter para acceder al FormArray de colaboradores
   * @returns FormArray del formulario
   */
  get colaboradoresFormArray(): FormArray {
    return this.form.get('colaboradores') as FormArray;
  }

  /**
   * Método para recargar datos (botón de refresh)
   */
  activarRw(): void {
    this.cargarDatos();
  }

  /**
   * Selecciona un día para capturar datos
   * Actualiza selectedDay y selectedColaborador para mostrar el input correspondiente
   * @param colaboradorIndex - Índice del colaborador en el formulario
   * @param dia - Nombre del día seleccionado (ej: 'lunes')
   */
  selectDay(colaboradorIndex: number, dia: string): void {
    this.selectedColaborador = colaboradorIndex;
    this.selectedDay = dia;
    // Forzar detección de cambios para actualizar el input con el valor del nuevo día
    this.cdr.detectChanges();
  }

  /**
   * Recalcula el promedio después de ingresar un nuevo valor
   * Se ejecuta con el evento (input) en el campo de texto del día
   * @param index - Índice del colaborador
   */
  actualizarPromedio(index: number): void {
    const colaboradorGroup = this.colaboradoresFormArray.at(index) as FormGroup;
    const diasForm = colaboradorGroup.get('dias') as FormGroup;

    const diasVal = {
      lunes: diasForm.get('lunes')?.value,
      martes: diasForm.get('martes')?.value,
      miercoles: diasForm.get('miercoles')?.value,
      jueves: diasForm.get('jueves')?.value,
      viernes: diasForm.get('viernes')?.value,
      sabado: diasForm.get('sabado')?.value,
      domingo: diasForm.get('domingo')?.value
    };

    // Convertir a array y calcular promedio
    const diasArray: DiaSemanal[] = Object.entries(diasVal).map(([dia, valor]) => ({
      dia: dia as DiaSemanal['dia'],
      valor: valor === '' ? null : Number(valor)
    }));

    const promedio = this.calcularPromedio(diasArray);
    colaboradorGroup.patchValue({ promedio });
  }

  /**
   * Manejador de firma digital del colaborador
   * Bloquea el formulario del colaborador y sincroniza offline
   * @param event - Evento con ID del colaborador y token de firma
   */
  onFirmaColaborador(event: { id_colaborador: string; tokenFirma: TokenFirma }): void {
    // Encontrar índice del colaborador en el formulario
    const idx = this.colaboradoresFormArray.controls.findIndex(
      (c) => c.get('id_colaborador')?.value === event.id_colaborador
    );
    if (idx < 0) return;

    const grupo = this.colaboradoresFormArray.at(idx) as FormGroup;

    // Actualizar estado de firma y timestamp
    grupo.patchValue({
      firma_colaborador: true,
      timestamp_firma: event.tokenFirma.timestamp_iso,
      token_firma: event.tokenFirma
    });

    // Bloquear los días después de firmar
    (grupo.get('dias') as FormGroup).disable({ emitEvent: false });

    // Sincronizar con cola offline
    const registro = this.generarRegistro(true);
    this.syncService
      .agregarAColaSync('REGISTRO_RENDIMIENTO', 'UPDATE', registro)
      .catch(console.error);
  }

  /**
   * Genera el objeto RegistroRendimiento completo para guardar
   * Estructura todos los datos del formulario en el formato esperado
   * @param forzarFirma - Indicador si se debe forzar la firma
   * @returns RegistroRendimiento con todos los colaboradores y sus días
   */
  generarRegistro(forzarFirma = false): RegistroRendimiento {
    const colaboradoresRendimiento = this.colaboradoresFormArray.controls.map((control) => {
      const c = control as FormGroup;
      const diasForm = c.get('dias') as FormGroup;

      // Construir array de días con valores normalizados
      const dias: DiaSemanal[] = [
        { dia: 'lunes' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('lunes')?.value) },
        { dia: 'martes' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('martes')?.value) },
        { dia: 'miercoles' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('miercoles')?.value) },
        { dia: 'jueves' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('jueves')?.value) },
        { dia: 'viernes' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('viernes')?.value) },
        { dia: 'sabado' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('sabado')?.value) },
        { dia: 'domingo' as DiaSemanal['dia'], valor: this.normalizeDia(diasForm.get('domingo')?.value) }
      ];

      const promedio = this.calcularPromedio(dias);
      const firma = c.get('token_firma')?.value;
      const firmado = !!(c.get('firma_colaborador')?.value);

      return {
        ...c.value,
        dias,
        promedio,
        firma: firmado ? (firma as TokenFirma) : null,
        timestamp_firma: c.get('timestamp_firma')?.value,
        es_readonly: c.get('firma_colaborador')?.value
      };
    });

    // Construir registro semanal completo
    const registro: RegistroRendimiento = {
      id_registro: `REG_${Date.now()}`,
      semana: this.form.get('semana')?.value || this.semanaActual,
      año: this.form.get('anio')?.value || this.anioActual,
      id_area: this.idArea,
      id_supervisor: this.idSupervisor,
      colaboradores: colaboradoresRendimiento,
      timestamp_creacion: new Date().toISOString(),
      estado_sync: EstadoSync.PENDIENTE
    };

    return registro;
  }

  /**
   * Normaliza valoresde dias: convierte strings a números, maneja valores vacíos
   * @param value - Valor sin procesar del input
   * @returns null si está vacío, número si es válido
   */
  normalizeDia(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    return num;
  }

  async guardarRegistro(): Promise<void> {
    const registro = this.generarRegistro();
    this.registroSemanalGenerado.emit(registro);
    await this.syncService.agregarAColaSync('REGISTRO_RENDIMIENTO', 'CREATE', registro);
    this.mensaje = 'Registro listo para sincronizar con Excel.';
  }
}

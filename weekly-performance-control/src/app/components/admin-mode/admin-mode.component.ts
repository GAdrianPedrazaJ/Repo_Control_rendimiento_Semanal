import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Area, Colaborador, EstadoColaborador } from '../../models';
import { StorageService } from '../../services';

@Component({
  selector: 'app-admin-mode',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-mode.component.html',
  styleUrls: ['./admin-mode.component.css']
})
export class AdminModeComponent implements OnInit {
  @Output() areasActualizadas = new EventEmitter<Area[]>();

  areaForm: FormGroup;
  colaboradorForm: FormGroup;

  areas: Area[] = [];
  colaboradores: Colaborador[] = [];

  areaSeleccionada?: Area;
  mensajeError = '';
  mensajeOk = '';

  constructor(private fb: FormBuilder, private storage: StorageService) {
    this.areaForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });

    this.colaboradorForm = this.fb.group({
      id_colaborador: ['', Validators.required],
      nombre: ['', Validators.required],
      cargo: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarAreas();
  }

  async cargarAreas(): Promise<void> {
    this.areas = await this.storage.obtenerTodasLasAreas();
    this.areasActualizadas.emit(this.areas);

    if (this.areas.length > 0 && !this.areaSeleccionada) {
      this.seleccionarArea(this.areas[0]);
    }
  }

  async seleccionarArea(area: Area): Promise<void> {
    this.areaSeleccionada = area;
    this.colaboradores = await this.storage.obtenerColaboradoresPorArea(area.id_area);
  }

  async agregarArea(): Promise<void> {
    this.limpiarMensajes();

    if (this.areaForm.invalid) {
      this.mensajeError = 'Complete el nombre del área.';
      return;
    }

    const nombre = this.areaForm.value.nombre.trim();
    const existe = this.areas.some((a) => a.nombre.toLowerCase() === nombre.toLowerCase());

    if (existe) {
      this.mensajeError = 'Ya existe un área con ese nombre.';
      return;
    }

    const nuevaArea: Area = {
      id_area: `AREA_${Date.now()}`,
      nombre,
      descripcion: this.areaForm.value.descripcion || '',
      estado: EstadoColaborador.ACTIVO,
      timestamp_creacion: new Date().toISOString()
    };

    await this.storage.crearArea(nuevaArea);
    this.mensajeOk = `Área creada: ${nombre}`;
    this.areaForm.reset();
    await this.cargarAreas();
  }

  async agregarColaborador(): Promise<void> {
    this.limpiarMensajes();

    if (!this.areaSeleccionada) {
      this.mensajeError = 'Seleccione un área primero.';
      return;
    }

    if (this.colaboradorForm.invalid) {
      this.mensajeError = 'Complete todos los campos de colaborador.';
      return;
    }

    const id = this.colaboradorForm.value.id_colaborador.trim();
    const nombre = this.colaboradorForm.value.nombre.trim();

    const existe = this.colaboradores.some((c) => c.id_colaborador === id || c.nombre.toLowerCase() === nombre.toLowerCase());

    if (existe) {
      this.mensajeError = 'Ya existe un colaborador con ese ID o nombre en esta área.';
      return;
    }

    const nuevoColaborador: Colaborador = {
      id_colaborador: id,
      nombre,
      cargo: this.colaboradorForm.value.cargo.trim(),
      id_area: this.areaSeleccionada.id_area,
      estado: EstadoColaborador.ACTIVO,
      timestamp_creacion: new Date().toISOString(),
      dias: [],
      promedio: 0,
      esReadonly: false
    };

    await this.storage.crearColaborador(nuevoColaborador);
    this.mensajeOk = `Colaborador ${nombre} agregado a ${this.areaSeleccionada.nombre}.`;
    this.colaboradorForm.reset();

    // Recargar la lista actual de colaboradores
    if (this.areaSeleccionada) {
      this.colaboradores = await this.storage.obtenerColaboradoresPorArea(this.areaSeleccionada.id_area);
    }

    this.areasActualizadas.emit(this.areas);
  }

  async marcarColaboradorInactivo(colaborador: Colaborador): Promise<void> {
    await this.storage.actualizarColaborador(colaborador.id_colaborador, { estado: EstadoColaborador.INACTIVO, timestamp_actualizacion: new Date().toISOString() });
    this.mensajeOk = `Colaborador ${colaborador.nombre} marcado como inactivo.`;
    if (this.areaSeleccionada) {
      this.colaboradores = await this.storage.obtenerColaboradoresPorArea(this.areaSeleccionada.id_area);
    }
  }

  async activarColaborador(colaborador: Colaborador): Promise<void> {
    await this.storage.actualizarColaborador(colaborador.id_colaborador, { estado: EstadoColaborador.ACTIVO, timestamp_actualizacion: new Date().toISOString() });
    this.mensajeOk = `Colaborador ${colaborador.nombre} activado.`;
    if (this.areaSeleccionada) {
      this.colaboradores = await this.storage.obtenerColaboradoresPorArea(this.areaSeleccionada.id_area);
    }
  }

  private limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeOk = '';
  }
}

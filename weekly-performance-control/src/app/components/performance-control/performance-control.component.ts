import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Area, Colaborador, RegistroRendimiento, UserRole, EstadoColaborador } from '../../models';
import { AdminModeComponent } from '../admin-mode/admin-mode.component';
import { SupervisorModeComponent } from '../supervisor-mode/supervisor-mode.component';

@Component({
  selector: 'app-performance-control',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AdminModeComponent, SupervisorModeComponent],
  templateUrl: './performance-control.component.html',
  styleUrls: ['./performance-control.component.css']
})
export class PerformanceControlComponent {
  @Input() userRole: UserRole = UserRole.SUPERVISOR;
  @Input() areaId = '';
  @Input() idSupervisor = '';
  @Input() colaboradores: Colaborador[] | null = null;

  @Output() datosParaExcel = new EventEmitter<RegistroRendimiento>();
  @Output() areasDataChanged = new EventEmitter<Area[]>();

  public readonly UserRole = UserRole;

  onRegistroSemanal(registro: RegistroRendimiento): void {
    registro.id_supervisor = this.idSupervisor;
    this.datosParaExcel.emit(registro);
  }

  onAreasActualizadas(areas: Area[]): void {
    this.areasDataChanged.emit(areas);
  }
}

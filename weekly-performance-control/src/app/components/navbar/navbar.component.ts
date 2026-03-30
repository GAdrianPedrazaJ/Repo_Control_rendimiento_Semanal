import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() username: string = '';
  @Input() semana: number = 0;
  @Input() anio: number = 0;
  @Input() area: string = '';
  @Input() syncStatus: 'sincronizado' | 'local' | 'desincronizado' = 'local';

  @Output() logout = new EventEmitter<void>();

  showDropdown = false;

  getStatusColor(): string {
    switch (this.syncStatus) {
      case 'sincronizado':
        return 'green';
      case 'local':
        return 'orange';
      case 'desincronizado':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusLabel(): string {
    switch (this.syncStatus) {
      case 'sincronizado':
        return 'Sincronizado';
      case 'local':
        return 'Local';
      case 'desincronizado':
        return 'Desincronizado';
      default:
        return 'Desconocido';
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  onLogout(): void {
    this.showDropdown = false;
    this.logout.emit();
  }
}

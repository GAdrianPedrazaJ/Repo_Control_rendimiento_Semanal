import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, IconComponent],
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

  constructor(private hostElement: ElementRef<HTMLElement>) {}
  
  get userInitial(): string {
    return this.username ? this.username.charAt(0).toUpperCase() : 'U';
  }

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showDropdown) return;
    const clickedInside = this.hostElement.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.showDropdown = false;
    }
  }

  onLogout(): void {
    this.showDropdown = false;
    this.logout.emit();
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de iconos SVG reutilizable
 * Reemplaza emojis con iconos profesionales
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [class]="'icon icon-' + name + ' ' + (color ? 'icon-' + color : '') + ' ' + customClass"
      [attr.viewBox]="resolvedViewBox"
      [attr.width]="resolvedSize"
      [attr.height]="resolvedSize"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <ng-container [ngSwitch]="name">
        <!-- Check Icon -->
        <ng-container *ngSwitchCase="'check'">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </ng-container>

        <!-- Loading/Spinner Icon -->
        <ng-container *ngSwitchCase="'loading'">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="80" stroke-dashoffset="0">
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </ng-container>

        <!-- Refresh Icon -->
        <ng-container *ngSwitchCase="'refresh'">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
        </ng-container>

        <!-- Save Icon -->
        <ng-container *ngSwitchCase="'save'">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </ng-container>

        <!-- Dashboard/Chart Icon -->
        <ng-container *ngSwitchCase="'dashboard'">
          <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-2h2v16h-2z"/>
        </ng-container>

        <!-- Signature/Pen Icon -->
        <ng-container *ngSwitchCase="'signature'">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
          <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </ng-container>

        <!-- Pending Icon -->
        <ng-container *ngSwitchCase="'pending'">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6v6l4 2.5"/>
        </ng-container>

        <!-- Download Icon -->
        <ng-container *ngSwitchCase="'download'">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </ng-container>

        <!-- Upload Icon -->
        <ng-container *ngSwitchCase="'upload'">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" transform="rotate(180 12 12)"/>
        </ng-container>

        <!-- Error Icon -->
        <ng-container *ngSwitchCase="'error'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </ng-container>

        <!-- Success Icon -->
        <ng-container *ngSwitchCase="'success'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </ng-container>

        <!-- Menu Icon -->
        <ng-container *ngSwitchCase="'menu'">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </ng-container>

        <!-- Close Icon -->
        <ng-container *ngSwitchCase="'close'">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </ng-container>

        <!-- Pen/Edit Icon -->
        <ng-container *ngSwitchCase="'pen'">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
          <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </ng-container>

        <!-- User Icon -->
        <ng-container *ngSwitchCase="'user'">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </ng-container>

        <!-- Chevron Up Icon -->
        <ng-container *ngSwitchCase="'chevron-up'">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/>
        </ng-container>

        <!-- Chevron Down Icon -->
        <ng-container *ngSwitchCase="'chevron-down'">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </ng-container>

        <!-- Logout Icon -->
        <ng-container *ngSwitchCase="'logout'">
          <path d="M17 7l-1.41-1.41L12 10.17 7.41 5.59 6 7l5.59 5.59L6 18l1.41 1.41L12 13.83l4.59 4.58L18 17l-5.59-5.59L17 7z"/>
          <path d="M3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2z"/>
        </ng-container>

        <!-- Loader/Spinner Icon (alias for loading) -->
        <ng-container *ngSwitchCase="'loader'">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="80" stroke-dashoffset="0">
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </ng-container>

        <!-- Check Circle Icon -->
        <ng-container *ngSwitchCase="'check-circle'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </ng-container>

        <!-- Clock Icon -->
        <ng-container *ngSwitchCase="'clock'">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </ng-container>

        <!-- Default fallback -->
        <ng-container *ngSwitchDefault>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
        </ng-container>
      </ng-container>
    </svg>
  `,
  styles: [`
    .icon {
      display: inline-block;
      vertical-align: middle;
      transition: transform 0.2s ease;
    }

    .icon-loading {
      animation: spin 1s linear infinite;
    }

    .icon-loader {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .icon-success {
      color: #4caf50;
    }

    .icon-error {
      color: #f44336;
    }

    .icon-pending {
      color: #ff9800;
    }

    .icon-check {
      color: #4caf50;
    }

    .icon-check-circle {
      color: #4caf50;
    }

    .icon-clock {
      color: #ff9800;
    }

    .icon-refresh {
      transition: transform 0.3s ease;
    }

    .icon-refresh:hover {
      transform: rotate(180deg);
    }
  `]
})
export class IconComponent {
  @Input() name: 'check' | 'loading' | 'refresh' | 'save' | 'dashboard' | 'signature' | 'pending' | 'download' | 'upload' | 'error' | 'success' | 'menu' | 'close' | 'pen' | 'user' | 'chevron-up' | 'chevron-down' | 'logout' | 'loader' | 'check-circle' | 'clock' = 'check';
  @Input() size: string | number = 24;
  @Input() customClass: string = '';
  @Input() color?: 'success' | 'error' | 'pending' | 'default';
  
  viewBox = '0 0 24 24';

  constructor() {}

  get resolvedSize(): number {
    if (typeof this.size === 'number') return this.size;
    const normalized = this.size.trim().toLowerCase();
    const presets: Record<string, number> = {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32
    };
    if (normalized in presets) return presets[normalized];
    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 24;
  }

  get resolvedViewBox(): string {
    if (this.name === 'loading' || this.name === 'loader') return '0 0 100 100';
    return this.viewBox;
  }
}

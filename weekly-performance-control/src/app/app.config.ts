import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

/**
 * ============================================================================
 * APPLICATION CONFIGURATION
 * ============================================================================
 * Configuración central de la aplicación Angular 17 con:
 * - Providers de HTTP con interceptores
 * - Service Worker para PWA Offline-First
 * - Routing
 * - Error handling global
 */

export const appConfig: ApplicationConfig = {
  providers: [
    // ===== ROUTING =====
    provideRouter(appRoutes),

    // ===== HTTP CLIENT =====
    provideHttpClient(
      // Los interceptores se aplican aquí si es necesario
      // withInterceptors([authInterceptor, errorInterceptor])
    ),

    // ===== SERVICE WORKER (PWA) =====
    // Solo registra el SW en producción
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWithDelay:5000' // Registrar después de 5s
    }),

    // ===== ERROR HANDLING =====
    provideBrowserGlobalErrorListeners(),
  ]
};


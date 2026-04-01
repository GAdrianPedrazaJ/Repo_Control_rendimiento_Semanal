/**
 * Configuración del ambiente para PRODUCCIÓN
 */
export const environment = {
  production: true,
  api: {
    // URL de la Azure Function para sincronización
    syncEndpoint: 'https://your-function-app.azurewebsites.net/api/sync-registros',
    // URLs base para APIs
    baseUrl: 'https://api.your-domain.com',
    dataverseUrl: 'https://your-tenant.crm.dynamics.com'
  },
  pwa: {
    // Estrategia de caché Service Worker
    cacheStrategy: 'freshness', // Priorizar contenido fresco
    // Enabled Service Worker
    serviceWorkerEnabled: true,
    // Registra auto-updates
    autoUpdate: true
  },
  // Configuración de sincronización offline-first
  sync: {
    // Intervalo de sincronización automática (ms)
    syncInterval: 60000, // 1 minuto
    // Máximo número de reintentos
    maxRetries: 5,
    // Delay inicial para exponential backoff (ms)
    delayInicial: 2000,
    // Máximo delay para reintentos (ms)
    delayMaximo: 300000, // 5 minutos
    // Factor exponencial para backoff
    factorExponencial: 2,
    // Habilitar jitter en reintentos
    jitterEnabled: true
  },
  // Configuración de almacenamiento local
  storage: {
    // Retención de registros sincronizados (días)
    retentionDays: 90,
    // Tamaño máximo de la BD local (MB)
    maxDatabaseSizeMB: 50,
    // Nombre de la BD IndexedDB
    databaseName: 'PerformanceControlDB'
  },
  logging: {
    // Nivel de logging
    level: 'warn', // Menos verbose en producción
    // Habilitar logs en consola
    consoleEnabled: false,
    // Almacenar logs en IndexedDB
    storageEnabled: true
  }
};

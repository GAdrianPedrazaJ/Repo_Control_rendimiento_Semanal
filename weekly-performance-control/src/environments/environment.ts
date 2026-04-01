/**
 * Configuración del ambiente para desarrollo
 */
export const environment = {
  production: false,
  api: {
    // URL de la Azure Function para sincronización
    syncEndpoint: 'http://localhost:7071/api/sync-registros',
    // URLs base para APIs
    baseUrl: 'http://localhost:3000/api',
    dataverseUrl: 'https://your-tenant.crm.dynamics.com'
  },
  pwa: {
    // Estrategia de caché Service Worker
    cacheStrategy: 'performance', // 'freshness' | 'performance'
    // Enabled Service Worker
    serviceWorkerEnabled: false,
    // Registra auto-updates
    autoUpdate: false
  },
  // Configuración de sincronización offline-first
  sync: {
    // Intervalo de sincronización automática (ms)
    syncInterval: 30000, // 30 segundos
    // Máximo número de reintentos
    maxRetries: 5,
    // Delay inicial para exponential backoff (ms)
    delayInicial: 1000,
    // Máximo delay para reintentos (ms)
    delayMaximo: 300000,
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
    level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
    // Habilitar logs en consola
    consoleEnabled: true,
    // Almacenar logs en IndexedDB
    storageEnabled: false
  }
};

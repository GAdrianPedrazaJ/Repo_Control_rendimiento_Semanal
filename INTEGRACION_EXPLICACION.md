# 🔧 INTEGRACIÓN ANGULAR + PCF - GUÍA COMPLETA

## 📊 ¿Cómo funciona la integración?

```
┌─────────────────────────────────────────────────────────────┐
│                        POWER APPS                           │
│  (Dataverse - Tu base de datos en la nube)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓ (Envía: idArea, idSupervisor, etc)
                         │
┌─────────────────────────────────────────────────────────────┐
│           PCF (Power Apps Component Framework)              │
│                                                              │
│  index.ts                                                    │
│  ├─ init()      → Crea div #app-root                       │
│  ├─ updateView() → Recibe datos de Power Apps              │
│  │              → Los guarda en window.__pcfInputs         │
│  │              → Emite evento 'pcf-data-changed'          │
│  └─ destroy()  → Limpia cuando se cierra                   │
│                                                              │
│  ↓ Llama a main.ts bootstrap                                │
│                                                              │
└─────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    ANGULAR 17 (Tu app)                      │
│                                                              │
│  main.ts                                                     │
│  └─ bootstrapAngular() → Inicia Angular                     │
│     └─ bootstrapApplication(AppComponent)                   │
│                                                              │
│  app.component.ts                                            │
│  ├─ Escucha window.__pcfInputs                             │
│  ├─ Escucha evento 'pcf-data-changed'                      │
│  ├─ Muestra LoginComponent o SupervisorComponent           │
│  └─ Pasa props a los demás componentes                     │
│                                                              │
│  app/components/                                             │
│  ├─ login/                                                   │
│  ├─ supervisor-mode/                                        │
│  ├─ navbar/                                                  │
│  └─ firma-colaborador/                                      │
│                                                              │
│  app/services/                                               │
│  ├─ DataFetchService                                        │
│  ├─ SyncService                                             │
│  ├─ StorageService (IndexedDB)                             │
│  └─ etc...                                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 FLUJO DETALLADO DE DATOS

### 1️⃣ **Inicialización (Primera carga)**

```
Power Apps carga el PCF
    ↓
PCF.init() crea <app-root>
    ↓
PCF.init() llama bootstrapAngular()
    ↓
main.ts busca #app-root en el DOM
    ↓
main.ts llama bootstrapApplication(AppComponent)
    ↓
Angular renderiza AppComponent en #app-root
    ↓
AppComponent muestra LoginComponent (no está logueado)
    ✅ El usuario ve la pantalla de login
```

### 2️⃣ **Cuando Power Apps envía datos**

```
Cambio en Dataverse (ej: cambió idArea)
    ↓
PCF.updateView() se dispara
    ↓
Extrae values: idArea, idSupervisor, nombreArea, numeroSemana
    ↓
El PCF las guarda en window.__pcfInputs = { idArea, ... }
    ↓
El PCF emite CustomEvent 'pcf-data-changed'
    ↓
AppComponent.effect() detecta window.__pcfInputs cambió
    ↓
AppComponent.ngOnInit() escucha el evento
    ↓
AppComponent actualiza su signal pcfInputs.set(nuevosDatos)
    ↓
Los InputProperties de SupervisorMode se actualizan
    ↓
[idArea]="pcfInputs().idArea" se re-renderiza con nuevo valor
    ✅ La UI refleja los cambios de Power Apps
```

### 3️⃣ **Cuando el usuario hace login**

```
Usuario escribe nombre en LoginComponent
    ↓
Click "Ingresar"
    ↓
LoginComponent emite: loginSuccess.emit({ username, idSupervisor })
    ↓
AppComponent escucha (loginSuccess)="onLoginSuccess($event)"
    ↓
onLoginSuccess() hace:
  - currentUsername.set(event.username)
  - currentSupervisorId.set(event.idSupervisor)
  - isLoggedIn.set(true)
    ↓
isLoggedIn signal cambia
    ↓
Template se re-renderiza:
  - La sección *ngIf="!isLoggedIn()" desaparece
  - La sección *ngIf="isLoggedIn()" aparece
    ↓
Ahora muestra SupervisorModeComponent
    ✅ Usuario logueado, ve la captura de datos
```

---

## 📁 ESTRUCTURA DE ARCHIVOS ACTUAL

```
pcf-control-rendimiento/ControlRendimiento/
├── ControlManifest.Input.xml        ← Define qué datos recibe de Power Apps
├── index.ts                         ← El contenedor PCF (COMPLETADO)
├── src/
│   ├── main.ts                      ← Bootstrap de Angular (COMPLETADO)
│   ├── environments/
│   │   └── environment.ts           ← Config de ambiente (COMPLETADO)
│   └── app/
│       ├── app.component.ts         ← Root component (COMPLETADO)
│       └── components/
│           ├── login/
│           │   └── login.component.ts                  (STUB - reemplazar)
│           ├── supervisor-mode/
│           │   └── supervisor-mode.component.ts       (STUB - reemplazar)
│           └── navbar/
│               └── navbar.component.ts                 (STUB - reemplazar)
└── package.json                     ← Con Angular deps (ACTUALIZADO)
```

---

## ✅ LO QUE HICIMOS HASTA AQUÍ

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| **ControlManifest.Input.xml** | ✅ Completado | Define inputs: idArea, idSupervisor, nombreArea, numeroSemana |
| **index.ts** | ✅ Completado | Contenedor PCF que crea #app-root y llama bootstrap |
| **main.ts** | ✅ Completado | Inicia Angular cuando PCF lo carga |
| **app.component.ts** | ✅ Completado | Root component que maneja login/supervisor view |
| **environment.ts** | ✅ Completado | Config de ambiente |
| **package.json** | ✅ Actualizado | Agregadas dependencias de Angular 17 |
| **Componentes stub** | ⚠️ Parcial | Existen pero son esqueletos básicos |

---

## 🚀 PRÓXIMAS ACCIONES - REEMPLAZAR STUBS

Ahora necesitas **reemplazar los componentes stub** con tus componentes REALES. Tienes dos opciones:

### Opción A: Copiar archivos uno a uno (Recomendado)

1. Ir a tu proyecto Angular: `weekly-performance-control/src/app/components/login/`
2. Copiar **TODO el contenido** de `login.component.ts`
3. Reemplazar el contenido del stub en `pcf-control-rendimiento/ControlRendimiento/src/app/components/login/login.component.ts`
4. Repetir para:
   - supervisor-mode/supervisor-mode.component.ts
   - supervisor-mode/supervisor-mode.component.html
   - supervisor-mode/supervisor-mode.component.css
   - firma-colaborador/
   - navbar/

### Opción B: Automatizado con script (Para después)

```powershell
# Script para copiar automáticamente
Copy-Item -Path "../../weekly-performance-control/src/app/components/*" `
          -Destination "./src/app/components/" -Recurse -Force
```

---

## 🔑 PUNTOS CLAVE DE LA INTEGRACIÓN

### 1. **Power Apps → PCF → Angular**

Power Apps NO habla directamente con Angular. El PCF es el intermediario:

```typescript
// En PCF (index.ts)
const idArea = context.parameters.idArea.raw; // Datos de Power Apps
(window as any).__pcfInputs = { idArea };    // Los guarda en window

// En Angular (app.component.ts)
const inputs = (window as any).__pcfInputs;  // Lee de window
this.pcfInputs.set(inputs);                  // Los usa en la app
```

### 2. **Signals = Reactividad automática**

Cuando cambias un signal, Angular re-renderiza automáticamente:

```typescript
// En app.component.ts
isLoggedIn = signal(false);  // Estado

// En el template
*ngIf="isLoggedIn()"  // Re-renderiza automáticamente cuando cambia
```

### 3. **Componentes Standalone (Angular 17)**

No usamos módulos, todo es standalone:

```typescript
@Component({
  selector: 'app-login',
  standalone: true,  // ← Esto es importante
  imports: [CommonModule, ReactiveFormsModule],
  template: `...`
})
```

---

## 🐛 DEBUGGING - Cómo saber si funciona

Abre la consola del navegador (F12) y busca estos logs:

```javascript
// Cuando el PCF se inicializa:
📱 PCF ControlRendimiento inicializando...
Contenedor preparado para Angular

// Cuando Angular bootstrapea:
🚀 Iniciando Angular...
✅ Angular inicializado en #app-root

// Cuando Power Apps envía datos:
📨 Datos de Power Apps → Angular:
{idArea: "AREA_001", idSupervisor: "SUP_123", ...}

// Cuando el usuario logea:
✅ Login exitoso: Adrian
```

---

## 📋 CHECKLIST PARA COMPLETAR

- [ ] Reemplazar login.component.ts con la versión real
- [ ] Reemplazar supervisor-mode.component.ts con la versión real
- [ ] Copiar supervisor-mode.component.html y .css
- [ ] Reemplazar navbar.component.ts con la versión real
- [ ] Copiar firma-colaborador/ completa
- [ ] Copiar app/services/ (DataFetchService, SyncService, etc)
- [ ] Copiar app/models/
- [ ] Copiar app/pipes/
- [ ] Ejecutar: `npm install` en pcf-control-rendimiento/
- [ ] Compilar: `pac pcf build`
- [ ] Empaquetar: `dotnet build`
- [ ] Subir .zip a Power Apps

---

## 💡 NOTAS IMPORTANTES

1. **No borres los stubs completamente** - úsalos como referencia de imports/exports
2. **Los servicios (DataFetch, Sync)** necesitan ajustes para leer de Power Apps en lugar de APIs locales
3. **IndexedDB sigue funcionando** normalmente dentro del PCF
4. **El Power Apps tiene su propia URL** cuando está publicado, verifica CORS si llamas APIs

---

¿Necesitas que te ayude a copiar los componentes reales?

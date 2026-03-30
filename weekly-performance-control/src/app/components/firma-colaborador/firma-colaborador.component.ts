import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignatureService } from '../../services';
import { TokenFirma } from '../../models';

/**
 * PAYLOAD DE FIRMA
 * Estructura de datos emitida cuando el colaborador firma
 */
interface FirmaPayload {
  id_colaborador: string; // ID único del colaborador
  tokenFirma: TokenFirma; // Token de firma generado
}

/**
 * COMPONENTE FIRMA COLABORADOR
 * ==================================================
 * Gestiona la firma digital de cada colaborador mediante:
 * - Modal interactivo con canvas para dibujar
 * - Soporte para mouse y touch (responsivo)
 * - Captura de firma como imagen base64
 * - Almacenamiento de timestamp y token
 */
@Component({
  selector: 'app-firma-colaborador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firma-colaborador.component.html',
  styleUrls: ['./firma-colaborador.component.css']
})
export class FirmaColaboradorComponent implements AfterViewInit {
  // ===== INPUTS (Datos del colaborador) =====
  @Input() idColaborador = ''; // ID único del colaborador
  @Input() nombre = ''; // Nombre del colaborador a mostrar
  @Input() yaFirmado = false; // Indica si ya fue firmado previamente

  // ===== OUTPUTS (Evento de firma completada) =====
  @Output() firma = new EventEmitter<FirmaPayload>();

  // ===== REFERENCIAS AL TEMPLATE =====
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;

  // ===== PROPIEDADES DEL COMPONENTE =====
  firmo = false; // Bandera: Firmó en esta sesión
  timestampFirma: string | null = null; // Timestamp ISO de la firma
  mostrarPanelFirma = false; // Controla visibilidad del modal

  // ===== REFERENCIAS CANVAS =====
  private canvas!: HTMLCanvasElement; // Elemento canvas para dibujar
  private ctx!: CanvasRenderingContext2D; // Contexto 2D del canvas
  private isDrawing = false; // Bandera: Está dibujando actualmente
  private lastX = 0; // Última posición X del trazo
  private lastY = 0; // Última posición Y del trazo

  constructor(private signatureService: SignatureService) {}

  /**
   * Ciclo de vida: Se ejecuta después de inicializar el componente y vistas
   * Obtiene referencias al canvas e inicializa config de dibujo
   */
  ngAfterViewInit(): void {
    if (this.signatureCanvas) {
      this.canvas = this.signatureCanvas.nativeElement;
      this.ctx = this.canvas.getContext('2d')!;
      this.inicializarCanvas();
    }
  }

  /**
   * Inicializa el canvas: color blanco y estilos de línea
   * Se llama cuando se abre el modal para "limpiar" el canvas
   */
  private inicializarCanvas(): void {
    // Fondo blanco
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Estilos de línea (trazo suave y redondeado)
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round'; // Puntas redondeadas
    this.ctx.lineJoin = 'round'; // Esquinas redondeadas
  }

  /**
   * Abre el modal para dibujar la firma
   * Desactiva si ya fue firmado o está firmando
   */
  abrirPanelFirma(): void {
    if (this.yaFirmado || this.firmo) return;
    this.mostrarPanelFirma = true;
    // Reinicializar canvas cuando se abre
    setTimeout(() => {
      if (this.canvas) {
        this.inicializarCanvas();
      }
    }, 0);
  }

  /**
   * Cierra el modal sin guardar
   */
  cerrarPanelFirma(): void {
    this.mostrarPanelFirma = false;
  }

  /**
   * Limpia el canvas para que el usuario reempiece a dibujar
   */
  limpiarFirma(): void {
    if (this.ctx) {
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Detector: Mouse presionado en el canvas
   * Inicia el trazo de firmadura
   * @param e - Evento del mouse
   */
  onMouseDown(e: MouseEvent): void {
    if (!this.canvas) return;
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  /**
   * Detector: Movimiento del mouse mientras se presiona en el canvas
   * Dibuja líneas manualmente conectando puntos
   * @param e - Evento del mouse
   */
  onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing || !this.canvas || !this.ctx) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Dibujar una línea del último punto al actual
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();

    // Actualizar la última posición
    this.lastX = currentX;
    this.lastY = currentY;
  }

  /**
   * Detector: Mouse soltado
   * Detiene el dibujo
   */
  onMouseUp(): void {
    this.isDrawing = false;
  }

  /**
   * Detector: Touch presionado en el canvas (móvil)
   * Inicia el trazo para dispositivos touch
   * @param e - Evento de touch
   */
  onTouchStart(e: TouchEvent): void {
    if (!this.canvas) return;
    e.preventDefault(); // Evitar scroll en móvil
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
    this.isDrawing = true;
  }

  /**
   * Detector: Movimiento de touch en el canvas
   * Dibuja mientras el dedo se mueve
   * @param e - Evento de touch
   */
  onTouchMove(e: TouchEvent): void {
    if (!this.isDrawing || !this.canvas || !this.ctx) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    // Dibujar línea
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(currentX, currentY);
    this.ctx.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
  }

  /**
   * Detector: Touch finalizado
   * Detiene el dibujo
   */
  onTouchEnd(): void {
    this.isDrawing = false;
  }

  /**
   * Confirma y guarda la firma
   * - Convierte canvas a imagen base64
   * - Genera token de firma con timestamp
   * - Emite evento al componente padre
   * - Cierra el modal
   */
  confirmarFirma(): void {
    // Convertir canvas dibujado a imagen PNG base64
    const firmaBase64 = this.canvas.toDataURL('image/png');

    // Generar token único de firma con timestamp
    const tokenFirma = this.signatureService.generarTokenFirma(
      this.idColaborador,
      `REG_${this.idColaborador}_${Date.now()}`
    );
    
    // Guardar timestamp para mostrar en UI
    this.timestampFirma = tokenFirma.timestamp_iso;
    
    // Marcar como firmado en esta sesión
    this.firmo = true;
    
    // Cerrar modal automáticamente
    this.mostrarPanelFirma = false;

    // Construir payload de evento
    const payload: FirmaPayload = {
      id_colaborador: this.idColaborador,
      tokenFirma
    };

    // Emitir evento al componente padre (supervisor-mode)
    this.firma.emit(payload);
  }
}

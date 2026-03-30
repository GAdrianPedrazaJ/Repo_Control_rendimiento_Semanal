import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ReglasValidacion, ResultadoValidacion, Colaborador, DiaSemanal } from '../models';

/**
 * ValidationService
 * Lógica centralizada de validación de negocio
 * - Rango numérico (0-500 tallos/hora)
 * - Nombre único en área
 * - Mínimo datos (nombre + 1 día)
 * - Promedios válidos
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  /**
   * Reglas de validación por defecto
   */
  private reglasDefault: ReglasValidacion = {
    minimo: 0,
    maximo: 500, // Tallos/hora
    permitir_vacio: true,
    nombre_campo: 'Tallos/Hora'
  };

  constructor() {}

  /**
   * =========================================================================
   * VALIDADORES REUTILIZABLES
   * =========================================================================
   */

  /**
   * Validador: Rango numérico (0-500)
   * @param reglas Configuración de rango mín/máx
   */
  rangoValidator(reglas: ReglasValidacion = this.reglasDefault): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return reglas.permitir_vacio ? null : { requerido: true };
      }

      const valor = Number(control.value);

      if (isNaN(valor)) {
        return { noNumerico: true };
      }

      if (valor < reglas.minimo || valor > reglas.maximo) {
        return {
          rango: {
            minimo: reglas.minimo,
            maximo: reglas.maximo,
            valor: valor
          }
        };
      }

      return null;
    };
  }

  /**
   * Validador: Nombre único en área (para colaboradores)
   * Este validador debe ejecutarse en el servidor (no asyncValidator aquí)
   */
  nombreUnicoValidator(nombreExistentes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return { requerido: true };
      }

      const nombre = control.value.trim().toLowerCase();
      const existe = nombreExistentes.some(
        (n) => n.toLowerCase() === nombre
      );

      if (existe) {
        return { nombreDuplicado: { valor: control.value } };
      }

      return null;
    };
  }

  /**
   * Validador: Mínimo datos en FormArray
   * Al menos nombre + 1 día con datos
   */
  minimoDataosValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormArray)) {
        return null;
      }

      const grupos = control.controls;
      const conErrores = grupos.filter((grupo) => {
        const nombre = grupo.get('nombre')?.value || '';
        const diasConDatos = (grupo.get('dias') as FormArray)?.controls.filter(
          (d) => d.get('valor')?.value !== null && d.get('valor')?.value !== undefined
        ).length || 0;

        return !nombre || diasConDatos === 0;
      });

      if (conErrores.length > 0) {
        return { minimoDataos: { filas: conErrores.length } };
      }

      return null;
    };
  }

  /**
   * =========================================================================
   * VALIDACIONES LÓGICAS
   * =========================================================================
   */

  /**
   * Validar que un valor esté en rango
   * @param valor Valor a validar
   * @param reglas Reglas de validación
   */
  validarRango(valor: number | null | undefined, reglas: ReglasValidacion = this.reglasDefault): ResultadoValidacion {
    const errores: string[] = [];

    if (valor === null || valor === undefined) {
      if (!reglas.permitir_vacio) {
        errores.push(`${reglas.nombre_campo} es requerido`);
      }
      return { valido: errores.length === 0, errores };
    }

    if (isNaN(valor as any)) {
      errores.push(`${reglas.nombre_campo} debe ser un número válido`);
      return { valido: false, errores };
    }

    if (valor < reglas.minimo) {
      errores.push(
        `${reglas.nombre_campo} debe ser mínimo ${reglas.minimo} (ingresado: ${valor})`
      );
    }

    if (valor > reglas.maximo) {
      errores.push(
        `${reglas.nombre_campo} debe ser máximo ${reglas.maximo} (ingresado: ${valor})`
      );
    }

    return { valido: errores.length === 0, errores };
  }

  /**
   * Validar que un nombre sea único en una lista
   */
  validarNombreUnico(nombre: string, nombresExistentes: string[]): ResultadoValidacion {
    const errores: string[] = [];

    if (!nombre || nombre.trim() === '') {
      errores.push('Nombre es requerido');
      return { valido: false, errores };
    }

    const nombreLower = nombre.trim().toLowerCase();
    const existe = nombresExistentes.some(
      (n) => n.toLowerCase() === nombreLower
    );

    if (existe) {
      errores.push(`El nombre "${nombre}" ya existe en esta área`);
    }

    return { valido: errores.length === 0, errores };
  }

  /**
   * Validar mínimos datos de un colaborador
   * Debe tener: nombre + al menos 1 día con datos
   */
  validarMinimosDatos(colaborador: Colaborador): ResultadoValidacion {
    const errores: string[] = [];

    if (!colaborador.nombre || colaborador.nombre.trim() === '') {
      errores.push('Nombre del colaborador es requerido');
    }

    const diasConDatos = (colaborador.dias || []).filter(
      (d) => d.valor !== null && d.valor !== undefined
    ).length;

    if (diasConDatos === 0) {
      errores.push('Debe llenar al menos 1 día de la semana');
    }

    return { valido: errores.length === 0, errores };
  }

  /**
   * =========================================================================
   * CÁLCULOS
   * =========================================================================
   */

  /**
   * Calcular promedio ignorando días vacíos
   * Suma / cantidad de días con datos (no / 7)
   * @param dias Array de días de la semana
   */
  calcularPromedio(dias: DiaSemanal[] | undefined): number {
    if (!dias || dias.length === 0) return 0;

    const diasConValor = dias.filter(
      (d) => d.valor !== null && d.valor !== undefined && d.valor > 0
    );

    if (diasConValor.length === 0) return 0;

    const suma = diasConValor.reduce((acc, d) => acc + (d.valor || 0), 0);
    const promedio = suma / diasConValor.length;

    // Redondear a 2 decimales
    return Math.round(promedio * 100) / 100;
  }

  /**
   * Validar que un promedio sea razonable
   * (entre 0 y 500)
   */
  validarPromedio(promedio: number): ResultadoValidacion {
    const errores: string[] = [];

    if (promedio < 0 || promedio > 500) {
      errores.push(
        `Promedio inválido: ${promedio}. Debe estar entre 0 y 500`
      );
    }

    return { valido: errores.length === 0, errores };
  }

  /**
   * =========================================================================
   * UTILIDADES
   * =========================================================================
   */

  /**
   * Generar mensaje de error legible para usuario
   */
  generarMensajeError(errores: string[]): string {
    if (errores.length === 0) return '';
    if (errores.length === 1) return errores[0];
    return `Errores: ${errores.join(', ')}`;
  }

  /**
   * Limpiar espacios y convertir a formato estándar
   */
  normalizarNombre(nombre: string): string {
    return nombre
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

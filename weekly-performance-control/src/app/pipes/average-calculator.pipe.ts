import { Pipe, PipeTransform } from '@angular/core';
import { DiaSemanal } from '../models';

/**
 * AverageCalculatorPipe
 * Calcula el promedio de días laborados ignorando días vacíos
 * Uso en template: {{ diasArray | averageCalculator | number: '1.2-2' }}
 */
@Pipe({
  name: 'averageCalculator',
  standalone: true
})
export class AverageCalculatorPipe implements PipeTransform {
  transform(dias: DiaSemanal[] | null | undefined): number {
    if (!dias || dias.length === 0) {
      return 0;
    }

    // Filtrar días con valor (no null, no undefined, no 0 si así se especifica)
    const diasConValor = dias.filter(
      (d) => d.valor !== null && d.valor !== undefined && d.valor > 0
    );

    // Si no hay días con valor, retornar 0
    if (diasConValor.length === 0) {
      return 0;
    }

    // Calcular suma
    const suma = diasConValor.reduce((acc, d) => acc + (d.valor || 0), 0);

    // Promedio = suma / cantidad de días con valor
    const promedio = suma / diasConValor.length;

    // Redondear a 2 decimales
    return Math.round(promedio * 100) / 100;
  }
}

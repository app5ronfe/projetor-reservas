import { diaAtual, diaVizinho, limitesDia } from './tempo';
import { partesLisboa } from './regras';

export type Vista = 'mes' | 'semana' | 'dia';

const p2 = (n: number) => String(n).padStart(2, '0');
export const DIAS_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** 0 = segunda … 6 = domingo. */
export function diaDaSemana(dia: string): number {
  const [y, m, d] = dia.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
}

export const inicioDaSemana = (dia: string) => diaVizinho(dia, -diaDaSemana(dia));

export function diasDaSemana(dia: string): string[] {
  const s = inicioDaSemana(dia);
  return Array.from({ length: 7 }, (_, i) => diaVizinho(s, i));
}

/** 6 semanas completas (42 dias), a começar na segunda da semana do dia 1. */
export function gradeDoMes(dia: string): string[] {
  const inicio = inicioDaSemana(`${dia.slice(0, 7)}-01`);
  return Array.from({ length: 42 }, (_, i) => diaVizinho(inicio, i));
}

export const mesmoMes = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);
export const passado = (dia: string) => dia < diaAtual();
export const ehHoje = (dia: string) => dia === diaAtual();

/** Dia (AAAA-MM-DD) de um instante, em hora de Lisboa. */
export function diaLisboa(iso: string): string {
  const p = partesLisboa(new Date(iso));
  return `${p.y}-${p2(p.m)}-${p2(p.d)}`;
}

export function tituloMes(dia: string): string {
  const [y, m] = dia.split('-').map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

export function curto(dia: string): string {
  const [, m, d] = dia.split('-').map(Number);
  return `${d} ${MESES_CURTOS[m - 1]}`;
}

export function intervaloVisivel(vista: Vista, dia: string) {
  const dias = vista === 'mes' ? gradeDoMes(dia) : vista === 'semana' ? diasDaSemana(dia) : [dia];
  return {
    dias,
    inicio: limitesDia(dias[0]).inicio,
    fim: limitesDia(dias[dias.length - 1]).fim,
  };
}

/** Anterior (-1) ou seguinte (+1) na vista atual. No mês, mantém o dia do mês quando existe. */
export function navegar(vista: Vista, dia: string, sentido: -1 | 1): string {
  if (vista === 'dia') return diaVizinho(dia, sentido);
  if (vista === 'semana') return diaVizinho(dia, 7 * sentido);
  const [y, m, d] = dia.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + sentido, 1));
  const ultimo = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(Math.min(d, ultimo))}`;
}

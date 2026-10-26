// Cores das reservas por secção, entidade ou departamento (legenda no calendário).

export type Cor = { rotulo: string; cor: string };

export const LEGENDA: Cor[] = [
  { rotulo: 'Lobitos', cor: '#E0B21A' },
  { rotulo: 'Exploradores', cor: '#2E8B3E' },
  { rotulo: 'Pioneiros', cor: '#2B6CB0' },
  { rotulo: 'Caminheiros', cor: '#C53030' },
  { rotulo: 'Agrupamento', cor: '#6B3FA0' },
  { rotulo: 'FNA', cor: '#7B4A22' },
  { rotulo: 'Departamentos e outros', cor: '#8A8F8C' },
];

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const POR_SECCAO: Record<string, Cor> = {
  lobitos: LEGENDA[0],
  exploradores: LEGENDA[1],
  pioneiros: LEGENDA[2],
  caminheiros: LEGENDA[3],
  agrupamento: LEGENDA[4],
};

/** Cor de uma reserva: entidade (FNA/Outro), secção ou, por defeito, departamento (cinzento). */
export function corDaReserva(r: { seccao: string | null; departamento?: string | null; entidade: string | null }): Cor {
  if (r.entidade === 'fna') return LEGENDA[5];
  if (r.entidade === 'outro') return LEGENDA[6];
  if (r.seccao && POR_SECCAO[sem(r.seccao)]) return POR_SECCAO[sem(r.seccao)];
  return LEGENDA[6];
}

// Regras de reserva do projetor. Fonte única de verdade na app; a base de dados
// (funções SQL) repete as mesmas regras e é a que prevalece em caso de conflito.

export const FUSO = "Europe/Lisbon";
export const BLOCO_MIN = 60;
export const HORA_LIMITE = 21; // 21:00 do dia anterior
export const MINUTO_BLOCO = [0];

export type Intervalo = { inicio: Date; fim: Date };

/** Partes de data/hora de um instante, vistas em Lisboa. */
export function partesLisboa(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    h: Number(p.hour), min: Number(p.minute), s: Number(p.second),
  };
}

/** Diferença (ms) entre a hora de Lisboa e UTC, num instante dado. */
function deslocamentoLisboa(instante: Date): number {
  const p = partesLisboa(instante);
  const comoUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return comoUtc - instante.getTime();
}

/** Instante UTC correspondente a uma data/hora civil em Lisboa. */
export function lisboaParaInstante(y: number, m: number, d: number, h: number, min: number): Date {
  const palpite = Date.UTC(y, m - 1, d, h, min, 0);
  const primeiro = new Date(palpite - deslocamentoLisboa(new Date(palpite)));
  // Segunda passagem para o caso de o palpite cair do outro lado de uma mudança de hora.
  return new Date(palpite - deslocamentoLisboa(primeiro));
}

/** Prazo para reservar um bloco que começa em `inicio`: 21:00 do dia anterior, em Lisboa. */
export function prazoReserva(inicio: Date): Date {
  const p = partesLisboa(inicio);
  const diaAnterior = new Date(Date.UTC(p.y, p.m - 1, p.d - 1));
  return lisboaParaInstante(
    diaAnterior.getUTCFullYear(), diaAnterior.getUTCMonth() + 1, diaAnterior.getUTCDate(),
    HORA_LIMITE, 0,
  );
}

export function prazoPassado(inicio: Date, agora: Date): boolean {
  return agora.getTime() > prazoReserva(inicio).getTime();
}

export function sobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio.getTime() < b.fim.getTime() && b.inicio.getTime() < a.fim.getTime();
}

export type Erro = { codigo: string; mensagem: string };

export function validarIntervalo(i: Intervalo): Erro | null {
  if (!(i.fim.getTime() > i.inicio.getTime())) return { codigo: "INTERVALO_INVALIDO", mensagem: "A hora de fim tem de ser depois da hora de início." };
  for (const d of [i.inicio, i.fim]) {
    const p = partesLisboa(d);
    if (!MINUTO_BLOCO.includes(p.min) || p.s !== 0) {
      return { codigo: "BLOCO_INVALIDO", mensagem: "As reservas são em blocos de 1 hora (ex.: 10:00, 11:00)." };
    }
  }
  const minutos = (i.fim.getTime() - i.inicio.getTime()) / 60000;
  if (minutos % BLOCO_MIN !== 0) return { codigo: "BLOCO_INVALIDO", mensagem: "A duração tem de ser múltipla de 1 hora." };
  return null;
}

export type DadosReserva = {
  responsavel?: string; motivo?: string; seccao?: string | null; departamento?: string | null;
  entidade?: string | null; descricao?: string | null;
};

export function validarCampos(d: DadosReserva): Erro | null {
  if (!d.responsavel?.trim()) return { codigo: "RESPONSAVEL_EM_FALTA", mensagem: "Indique o nome do responsável pela reserva." };
  if (!d.motivo?.trim()) return { codigo: "MOTIVO_EM_FALTA", mensagem: "Indique o motivo da reserva." };
  if (!d.seccao && !d.departamento && !d.entidade) return { codigo: "SECCAO_EM_FALTA", mensagem: "Indique a secção, o departamento ou a entidade." };
  if (d.entidade === "outro" && !d.descricao?.trim()) return { codigo: "DESCRICAO_EM_FALTA", mensagem: "Para «Outro», descreva brevemente o que é." };
  return null;
}

export const MENSAGEM_PRAZO =
  "Já não é possível fazer esta reserva pela app: as reservas para um dia fecham às 21:00 do dia anterior. Ligue à Chefe Daniela.";

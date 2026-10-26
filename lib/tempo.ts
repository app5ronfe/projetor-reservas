import { FUSO, lisboaParaInstante, partesLisboa } from "./regras";

const p2 = (n: number) => String(n).padStart(2, "0");

/** Dia de hoje em Lisboa, no formato AAAA-MM-DD. */
export function diaAtual(agora: Date = new Date()): string {
  const p = partesLisboa(agora);
  return `${p.y}-${p2(p.m)}-${p2(p.d)}`;
}

export function diaVizinho(dia: string, delta: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${p2(t.getUTCMonth() + 1)}-${p2(t.getUTCDate())}`;
}

/** Início (00:00 de Lisboa) e fim (00:00 do dia seguinte) de um dia. */
export function limitesDia(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  const seg = diaVizinho(dia, 1).split("-").map(Number);
  return {
    inicio: lisboaParaInstante(y, m, d, 0, 0),
    fim: lisboaParaInstante(seg[0], seg[1], seg[2], 0, 0),
  };
}

/** Instante de Lisboa a partir de AAAA-MM-DD e HH:MM. */
export function instante(dia: string, hora: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return lisboaParaInstante(y, m, d, h, min);
}

export function horaDe(data: Date): string {
  const p = partesLisboa(data);
  return `${p2(p.h)}:${p2(p.min)}`;
}

export function rotuloDia(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function formatarInstante(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: FUSO,
  }).format(data);
}

/** 24 blocos de 1 hora de um dia, em hora de Lisboa. */
export function blocosDoDia(dia: string) {
  const out: { inicio: Date; fim: Date; hora: string }[] = [];
  const { inicio } = limitesDia(dia);
  for (let i = 0; i < 24; i++) {
    const s = new Date(inicio.getTime() + i * 60 * 60000);
    out.push({ inicio: s, fim: new Date(s.getTime() + 60 * 60000), hora: horaDe(s) });
  }
  return out;
}

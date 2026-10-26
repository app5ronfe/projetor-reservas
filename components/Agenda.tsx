'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import type { Reserva, Bloqueio } from '../lib/projetor';
import { corDaReserva } from '../lib/cores';
import { horaDe, limitesDia } from '../lib/tempo';
import { prazoPassado, sobrepoe } from '../lib/regras';
import { DIAS_CURTOS, diaDaSemana, ehHoje } from '../lib/calendario';

/** Altura de uma hora, em píxeis. */
const HORA_PX = 52;
const MIN_PX = HORA_PX / 60;
const p2 = (n: number) => String(n).padStart(2, '0');
const minutos = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 60000;

type Props = {
  dias: string[];
  reservas: Reserva[];
  bloqueios: Bloqueio[];
  gestao: boolean;
  agoraIso: string;
  voltar?: { href: string; texto: string };
};

/** Agenda por horas (dia ou semana). Cada reserva é uma linha colorida; ao tocar, abre um balão. */
export default function Agenda({ dias, reservas, bloqueios, gestao, agoraIso, voltar }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const agora = new Date(agoraIso);
  const n = dias.length;

  return (
    <>
      {voltar && <Link href={voltar.href} className="voltar">‹ {voltar.texto}</Link>}
      <div className={`agenda ${n === 1 ? 'um-dia' : 'semana'}`} style={{ '--cols': n } as CSSProperties}>
        <div className="ag-cab">
          <span className="ag-canto" />
          {dias.map((d) => (
            <div key={d} className={`ag-dia ${ehHoje(d) ? 'hoje' : ''}`}>
              <span>{DIAS_CURTOS[diaDaSemana(d)]}</span>
              <strong>{Number(d.slice(8))}</strong>
            </div>
          ))}
        </div>

        <div className="ag-corpo" style={{ height: 24 * HORA_PX }}>
          <div className="ag-horas">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} style={{ top: h * HORA_PX }}>{p2(h)}:00</span>
            ))}
          </div>

          {dias.map((d, i) => {
            const { inicio: base, fim: fimDia } = limitesDia(d);
            const esquerda = i < n / 2;
            const janela = { inicio: base, fim: fimDia };
            const dasReservas = reservas.filter((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, janela));
            const dosBloqueios = bloqueios.filter((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, janela));

            return (
              <div key={d} className={`ag-col ${esquerda ? '' : 'direita'}`}>
                {/* Horas livres e reserváveis: tocar leva a «Reservar» nessa hora. */}
                {Array.from({ length: 24 }, (_, h) => {
                  const ini = new Date(base.getTime() + h * 3600000);
                  const fim = new Date(ini.getTime() + 3600000);
                  const ocupada = [...dasReservas, ...dosBloqueios].some((x) =>
                    sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, { inicio: ini, fim }));
                  const reservavel = !ocupada && ini >= agora && (gestao || !prazoPassado(ini, agora));
                  if (!reservavel) return null;
                  return (
                    <Link key={h} href={`/reservar?dia=${d}&inicio=${p2(h)}:00`} className="ag-slot"
                      style={{ top: h * HORA_PX, height: HORA_PX }} aria-label={`Reservar às ${p2(h)}:00`} />
                  );
                })}

                {dosBloqueios.map((b) => {
                  const bi = new Date(b.inicio), bf = new Date(b.fim);
                  const s = bi < base ? base : bi;
                  const e = bf > fimDia ? fimDia : bf;
                  return (
                    <div key={b.id} className="ag-bloq" title={b.motivo}
                      style={{ top: minutos(s, base) * MIN_PX, height: Math.max(minutos(e, s) * MIN_PX, 20) }}>
                      <span>Bloqueado · {b.motivo}</span>
                    </div>
                  );
                })}

                {dasReservas.map((r) => {
                  const ri = new Date(r.inicio), rf = new Date(r.fim);
                  const s = ri < base ? base : ri;
                  const e = rf > fimDia ? fimDia : rf;
                  const cor = corDaReserva(r);
                  const origem = r.seccao ?? (r.departamento ? 'Departamento' : 'Sem secção');
                  const ativo = aberto === r.id;
                  return (
                    <div key={r.id} className={`ag-ev ${ativo ? 'ativo' : ''}`}
                      style={{ top: minutos(s, base) * MIN_PX, height: Math.max(minutos(e, s) * MIN_PX, 20), background: `${cor.cor}22`, borderLeftColor: cor.cor }}
                      onClick={(ev) => { ev.stopPropagation(); setAberto(ativo ? null : r.id); }}>
                      <span className="ag-txt"><b>{horaDe(ri)}</b> {r.responsavel}</span>
                      {ativo && (
                        <div className={`balao ${esquerda ? '' : 'esq'}`} onClick={(ev) => ev.stopPropagation()}>
                          <strong>{r.responsavel}</strong>
                          <div>{r.motivo}</div>
                          <div className="pequeno">{origem}</div>
                          <div className="pequeno">{horaDe(ri)} – {horaDe(rf)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {aberto && <div className="ag-fundo" onClick={() => setAberto(null)} />}
    </>
  );
}

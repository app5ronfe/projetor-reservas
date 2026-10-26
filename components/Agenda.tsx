'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import type { Reserva, Bloqueio } from '../lib/projetor';
import { corDaReserva } from '../lib/cores';
import { formatarInstante, horaDe, limitesDia } from '../lib/tempo';
import { prazoPassado, prazoReserva, sobrepoe } from '../lib/regras';
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

type Aviso = { titulo: string; texto: string; urgencia: boolean };

/** Agenda por horas (dia ou semana). Cada reserva é uma linha colorida; ao tocar, abre um balão. */
export default function Agenda({ dias, reservas, bloqueios, gestao, agoraIso, voltar }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
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
                {/* Cada hora: livre e reservável = link; livre mas não reservável ou bloqueada = aviso explicativo. */}
                {Array.from({ length: 24 }, (_, h) => {
                  const ini = new Date(base.getTime() + h * 3600000);
                  const fim = new Date(ini.getTime() + 3600000);
                  const janelaHora = { inicio: ini, fim };
                  if (dasReservas.some((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, janelaHora))) return null;
                  const bloq = dosBloqueios.find((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, janelaHora));
                  const estilo = { top: h * HORA_PX, height: HORA_PX };
                  const rotulo = `${p2(h)}:00`;

                  if (bloq) {
                    return (
                      <button key={h} type="button" className="ag-slot bloq-slot" style={estilo} aria-label={`${rotulo} bloqueado`}
                        onClick={() => setAviso({ titulo: 'Bloqueado pela secretaria', texto: `Este horário está bloqueado: ${bloq.motivo}.`, urgencia: true })} />
                    );
                  }
                  if (ini < agora) {
                    return (
                      <button key={h} type="button" className="ag-slot passado" style={estilo} aria-label={`${rotulo} já passou`}
                        onClick={() => setAviso({ titulo: 'Horário já passado', texto: 'Este horário já começou ou passou. Os dias passados ficam só para consulta.', urgencia: false })} />
                    );
                  }
                  if (gestao || !prazoPassado(ini, agora)) {
                    return (
                      <Link key={h} href={`/reservar?dia=${d}&inicio=${rotulo}`} className="ag-slot" style={estilo} aria-label={`Reservar às ${rotulo}`} />
                    );
                  }
                  return (
                    <button key={h} type="button" className="ag-slot fechado" style={estilo} aria-label={`${rotulo} fora do prazo`}
                      onClick={() => setAviso({
                        titulo: 'Prazo terminado',
                        texto: `Já não é possível reservar este bloco pela app. As reservas fecham às ${formatarInstante(prazoReserva(ini))}, ou seja, às 21:00 do dia anterior.`,
                        urgencia: true,
                      })} />
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

      {(aberto || aviso) && (
        <div className="ag-fundo" onClick={() => { setAberto(null); setAviso(null); }} />
      )}
      {aviso && (
        <div className="aviso-pop" role="dialog" aria-modal="true">
          <strong>{aviso.titulo}</strong>
          <p>{aviso.texto}</p>
          {aviso.urgencia && <p className="pequeno">Se for urgente, contacte a Chefe Daniela.</p>}
          <button type="button" className="btn secundario" onClick={() => setAviso(null)}>Fechar</button>
        </div>
      )}
    </>
  );
}

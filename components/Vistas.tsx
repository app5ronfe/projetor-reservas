import Link from 'next/link';
import type { Reserva, Bloqueio } from '../lib/projetor';
import { sobrepoe } from '../lib/regras';
import { corDaReserva, LEGENDA } from '../lib/cores';
import {
  Vista, DIAS_CURTOS, tituloMes, curto, passado, ehHoje, mesmoMes, gradeDoMes,
  diasDaSemana, navegar,
} from '../lib/calendario';
import { diaAtual, limitesDia, rotuloDia } from '../lib/tempo';

export type Aba = Vista | 'minhas' | 'gestao' | 'estatisticas';
export type Origem = { vista: 'mes' | 'semana'; dia: string };
const ligacaoDia = (d: string, origem: Origem) => `/reservas?vista=dia&dia=${d}&vo=${origem.vista}&do=${origem.dia}`;

const TITULOS: Partial<Record<Aba, string>> = {
  minhas: 'As minhas reservas futuras', gestao: 'Controlo e Gestão', estatisticas: 'Estatísticas',
};

/** Barra de navegação: vistas, setas, «Hoje» e o título do período. Só a responsável vê Controlo e Estatísticas. */
export function Barra({ vista, dia, origem, aba, gestao }: { vista: Vista; dia: string; origem?: Origem; aba: Aba; gestao: boolean }) {
  const sufixo = vista === 'dia' && origem ? `&vo=${origem.vista}&do=${origem.dia}` : '';
  const nav = (v: Vista, d: string) => `/reservas?vista=${v}&dia=${d}${sufixo}`;
  const titulo =
    vista === 'mes' ? tituloMes(dia)
    : vista === 'semana' ? `${curto(diasDaSemana(dia)[0])} – ${curto(diasDaSemana(dia)[6])}`
    : rotuloDia(dia);
  const abas: { v: Vista; nome: string }[] = [
    { v: 'dia', nome: 'Dia' }, { v: 'semana', nome: 'Semana' }, { v: 'mes', nome: 'Mês' },
  ];
  const calendario = aba === 'dia' || aba === 'semana' || aba === 'mes';
  return (
    <div className="barra-cal">
      <div className="segmentos">
        {abas.map((a) => (
          <Link key={a.v} href={`/reservas?vista=${a.v}&dia=${dia}`} className={aba === a.v ? 'ativo' : ''}>{a.nome}</Link>
        ))}
        {gestao ? <>
          <Link href="/reservas?vista=gestao" className={`minhas ${aba === 'gestao' ? 'ativo' : ''}`}>Controlo e Gestão</Link>
          <Link href="/reservas?vista=estatisticas" className={`estat ${aba === 'estatisticas' ? 'ativo' : ''}`}>Estatísticas</Link>
        </> : (
          <Link href="/reservas?vista=minhas" className={`minhas ${aba === 'minhas' ? 'ativo' : ''}`}>Minhas reservas</Link>
        )}
      </div>
      {calendario ? <>
        <div className="setas">
          <Link href={nav(vista, navegar(vista, dia, -1))} aria-label="Anterior">‹</Link>
          <Link href={nav(vista, diaAtual())} className="hoje">Hoje</Link>
          <Link href={nav(vista, navegar(vista, dia, 1))} aria-label="Seguinte">›</Link>
        </div>
        <strong className="titulo">{titulo}</strong>
      </> : <strong className="titulo">{TITULOS[aba]}</strong>}
    </div>
  );
}

type Props = { dia: string; reservas: Reserva[]; bloqueios: Bloqueio[]; gestao: boolean };

const naDia = <T extends { inicio: string; fim: string }>(lista: T[], d: string) => {
  const { inicio, fim } = limitesDia(d);
  return lista.filter((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, { inicio, fim }));
};

/** Mês: grelha de 6 semanas. Cada dia leva ao seu detalhe; os passados ficam em consulta. */
export function VistaMes({ dia, reservas, bloqueios }: Props) {
  const grade = gradeDoMes(dia);
  return (
    <div className="cartao mes">
      <div className="mes-cab">{DIAS_CURTOS.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mes-grelha">
        {grade.map((d) => {
          const nos = naDia(reservas, d);
          const bloq = naDia(bloqueios, d).length > 0;
          const classes = ['celula', mesmoMes(d, dia) ? '' : 'fora', passado(d) ? 'passado' : '', ehHoje(d) ? 'hoje' : '']
            .filter(Boolean).join(' ');
          return (
            <Link key={d} href={ligacaoDia(d, { vista: 'mes', dia })} className={classes}>
              <span className="numero">{Number(d.slice(8))}</span>
              {nos.length > 0 && <span className="contagem">{nos.length}</span>}
              {nos.length > 0 && (
                <span className="pontos">
                  {nos.slice(0, 6).map((r) => <i key={r.id} style={{ background: corDaReserva(r).cor }} />)}
                </span>
              )}
              {bloq && <span className="marca-bloq" title="Há bloqueios" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Legenda das cores das secções, entidades e departamentos. */
export function Legenda() {
  return (
    <div className="legenda">
      {LEGENDA.map((l) => (
        <span key={l.rotulo}><i style={{ background: l.cor }} />{l.rotulo}</span>
      ))}
    </div>
  );
}

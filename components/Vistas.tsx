import Link from 'next/link';
import type { Reserva, Bloqueio } from '../lib/projetor';
import { blocosDoDia, horaDe, rotuloDia } from '../lib/tempo';
import { sobrepoe, prazoPassado } from '../lib/regras';
import {
  Vista, DIAS_CURTOS, tituloMes, curto, passado, ehHoje, mesmoMes, gradeDoMes,
  diasDaSemana, diaDaSemana, navegar,
} from '../lib/calendario';
import { diaAtual, limitesDia } from '../lib/tempo';
import { corDaReserva, LEGENDA } from '../lib/cores';

export type Aba = Vista | 'minhas';
const NOME_VISTA: Record<Vista, string> = { mes: 'Mês', semana: 'Semana', dia: 'Dia' };
const ligacao = (vista: Vista, dia: string) => `/reservas?vista=${vista}&dia=${dia}`;

export type Origem = { vista: 'mes' | 'semana'; dia: string };
const NOME_ORIGEM: Record<Origem['vista'], string> = { mes: 'mês', semana: 'semana' };

/** Ligação para o dia, guardando de onde se veio (para o botão de voltar). */
const ligacaoDia = (d: string, origem: Origem) => `/reservas?vista=dia&dia=${d}&vo=${origem.vista}&do=${origem.dia}`;

/** Barra de navegação: vistas, setas, «Hoje» e o título do período. */
export function Barra({ vista, dia, origem, aba }: { vista: Vista; dia: string; origem?: Origem; aba: Aba }) {
  const sufixo = vista === 'dia' && origem ? `&vo=${origem.vista}&do=${origem.dia}` : '';
  const nav = (v: Vista, d: string) => `/reservas?vista=${v}&dia=${d}${sufixo}`;
  const titulo =
    vista === 'mes' ? tituloMes(dia)
    : vista === 'semana' ? `${curto(diasDaSemana(dia)[0])} – ${curto(diasDaSemana(dia)[6])}`
    : rotuloDia(dia);
  return (
    <div className="barra-cal">
      <div className="segmentos">
        {(['mes', 'semana', 'dia'] as Vista[]).map((v) => (
          <Link key={v} href={ligacao(v, dia)} className={aba === v ? 'ativo' : ''}>{NOME_VISTA[v]}</Link>
        ))}
        <Link href="/reservas?vista=minhas" className={`minhas ${aba === 'minhas' ? 'ativo' : ''}`}>Minhas reservas</Link>
      </div>
      {aba === 'minhas' ? <strong className="titulo">As minhas reservas futuras</strong> : <>
      <div className="setas">
        <Link href={nav(vista, navegar(vista, dia, -1))} aria-label="Anterior">‹</Link>
        <Link href={nav(vista, diaAtual())} className="hoje">Hoje</Link>
        <Link href={nav(vista, navegar(vista, dia, 1))} aria-label="Seguinte">›</Link>
      </div>
      <strong className="titulo">{titulo}</strong>
      </>}
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
      <p className="pequeno" style={{ margin: '10px 4px 0' }}>Toque num dia para ver as horas. Os dias passados ficam só para consulta.</p>
    </div>
  );
}

/** Semana: sete cartões, um por dia. Cabe no telemóvel sem deslizar para o lado. */
export function VistaSemana({ dia, reservas, bloqueios }: Props) {
  return (
    <div className="semana">
      {diasDaSemana(dia).map((d) => {
        const nos = naDia(reservas, d);
        const bl = naDia(bloqueios, d);
        const pass = passado(d);
        return (
          <section key={d} className={`cartao dia-sem ${pass ? 'passado' : ''} ${ehHoje(d) ? 'hoje' : ''}`}>
            <Link href={ligacaoDia(d, { vista: 'semana', dia })} className="dia-cab">
              <strong>{DIAS_CURTOS[diaDaSemana(d)]} {Number(d.slice(8))}</strong>
              {ehHoje(d) && <span className="etiqueta">Hoje</span>}
            </Link>
            {bl.map((b) => (
              <div key={b.id} className="bloqueado">Bloqueado {horaDe(new Date(b.inicio))}–{horaDe(new Date(b.fim))} · {b.motivo}</div>
            ))}
            {nos.length === 0 && bl.length === 0 && <p className="pequeno" style={{ margin: '4px 0 0' }}>Sem reservas.</p>}
            <ul className="lista">
              {nos.map((r) => (
                <li key={r.id} style={{ borderLeft: `4px solid ${corDaReserva(r).cor}`, paddingLeft: 8 }}>
                  <strong>{horaDe(new Date(r.inicio))}–{horaDe(new Date(r.fim))}</strong> · {r.motivo}
                  <div className="pequeno">{r.responsavel} · {r.seccao ?? 'Departamento'}</div>
                </li>
              ))}
            </ul>
            {!pass && <Link href={`/reservar?dia=${d}`} className="btn-pequeno">+ Reservar</Link>}
          </section>
        );
      })}
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

/** Dia: os 24 blocos de 1 hora em grelha (4 colunas no telemóvel, 5 no ecrã largo). */
export function VistaDia({ dia, reservas, bloqueios, gestao, origem }: Props & { origem?: Origem }) {
  const agora = new Date();
  const diaPassou = passado(dia);
  return (
    <>
      {origem && (
        <Link href={`/reservas?vista=${origem.vista}&dia=${origem.dia}`} className="voltar">
          ‹ Voltar ao {NOME_ORIGEM[origem.vista]}
        </Link>
      )}
      {diaPassou && <div className="aviso info pequeno">Dia passado: só para consulta.</div>}
      {!diaPassou && !gestao && (
        <div className="aviso info pequeno">As reservas para um dia fecham às 21:00 do dia anterior. Depois disso, ligue à Chefe Daniela.</div>
      )}
      <div className="cartao">
        <div className="grelha-dia">
          {blocosDoDia(dia).map((b) => {
            const bloq = bloqueios.find((x) => sobrepoe({ inicio: new Date(x.inicio), fim: new Date(x.fim) }, b));
            const res = reservas.find((r) => sobrepoe({ inicio: new Date(r.inicio), fim: new Date(r.fim) }, b));
            const ja = diaPassou || b.inicio < agora;
            let estado: string;
            let corBloco: string | undefined;
            let conteudo: React.ReactNode;
            if (bloq) {
              estado = 'bloq';
              conteudo = <span title={bloq.motivo}>Bloqueado</span>;
            } else if (res) {
              estado = 'ocup';
              corBloco = corDaReserva(res).cor;
              conteudo = <span title={`${res.responsavel} · ${res.motivo}`}>{res.responsavel}</span>;
            } else if (ja) {
              estado = 'passado';
              conteudo = <span>Livre</span>;
            } else if (gestao || !prazoPassado(b.inicio, agora)) {
              estado = 'livre';
              conteudo = <Link href={`/reservar?dia=${dia}&inicio=${b.hora}`}>Reservar</Link>;
            } else {
              estado = 'fechado';
              conteudo = <span title="Prazo terminado: ligue à Chefe Daniela">Ligar</span>;
            }
            return (
              <div key={b.hora} className={`bloco-c ${estado}`} style={corBloco ? { borderLeft: `5px solid ${corBloco}` } : undefined}>
                <span className="hora-c">{b.hora}</span>
                <span className="estado-c">{conteudo}</span>
              </div>
            );
          })}
        </div>
        <div className="pequeno" style={{ marginTop: 8 }}>Blocos de 1 hora, hora de Lisboa. Toque num bloco livre para reservar.</div>
      </div>
    </>
  );
}

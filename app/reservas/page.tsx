import { redirect } from 'next/navigation';
import { sessaoAtual, reservasEntre, bloqueiosEntre, minhasReservas } from '../../lib/projetor';
import { diaAtual, horaDe, formatarInstante } from '../../lib/tempo';
import { prazoReserva } from '../../lib/regras';
import { intervaloVisivel, Vista } from '../../lib/calendario';
import { Barra, VistaMes, Legenda, type Origem, type Aba } from '../../components/Vistas';
import Agenda from '../../components/Agenda';
import MiniMes from '../../components/MiniMes';
import { cancelarAcao, sairAcao } from '../actions';
import { ControloGestao, Estatisticas } from '../../components/Gestao';
import { seccoes, departamentos } from '../../lib/projetor';
import { limitesDia } from '../../lib/tempo';

type Q = { vista?: string; dia?: string; vo?: string; do?: string; ok?: string; erro?: string; f?: string; de?: string; ate?: string };
const VISTAS: Vista[] = ['mes', 'semana', 'dia'];

export default async function Reservas({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await sessaoAtual();
  if (!eu?.dirigente && !eu?.gestao) redirect('/login');
  const q = await searchParams;
  const hoje = diaAtual();
  const aba: Aba =
    q.vista === 'gestao' && eu.gestao ? 'gestao'
    : q.vista === 'estatisticas' && eu.gestao ? 'estatisticas'
    : q.vista === 'minhas' && !eu.gestao ? 'minhas'
    : VISTAS.includes(q.vista as Vista) ? (q.vista as Vista) : 'semana';
  const vista: Vista = aba === 'minhas' || aba === 'gestao' || aba === 'estatisticas' ? 'semana' : aba;
  const dia = q.dia ?? hoje;
  const { dias, inicio, fim } = intervaloVisivel(vista, dia);

  // Controlo e Estatísticas: por defeito, o ano escutista (1 set. a 31 ago.).
  const anoBase = Number(hoje.slice(0, 4)) - (Number(hoje.slice(5, 7)) >= 9 ? 0 : 1);
  const de = q.de ?? `${anoBase}-09-01`;
  const ate = q.ate ?? (aba === 'estatisticas' ? hoje : `${anoBase + 1}-08-31`);
  const gerir = aba === 'gestao' || aba === 'estatisticas';

  const [reservas, bloqueios, minhas, lista, deptos] = await Promise.all([
    gerir ? reservasEntre(limitesDia(de).inicio, limitesDia(ate).fim) : reservasEntre(inicio, fim),
    bloqueiosEntre(inicio, fim),
    minhasReservas(eu.id),
    seccoes(),
    departamentos(),
  ]);
  const agora = new Date();
  const origem: Origem | undefined = (q.vo === 'mes' || q.vo === 'semana') && q.do ? { vista: q.vo, dia: q.do } : undefined;
  const voltar = origem
    ? { href: `/reservas?vista=${origem.vista}&dia=${origem.dia}`, texto: `Voltar ao ${origem.vista === 'mes' ? 'mês' : 'semana'}` }
    : undefined;

  return (
    <>
      <header>
        <div>
          <h1>Secretaria 5 Ronfe</h1>
          <span className="quem">{eu.nome}</span>
        </div>
        <form action={sairAcao}><button type="submit" className="link">Sair</button></form>
      </header>
      <main>
        {q.ok && <div className="aviso ok">{q.ok}</div>}
        {q.erro && <div className="aviso erro">{q.erro}</div>}

        {aba === 'gestao' && (
          <>
            <Barra vista={vista} dia={dia} aba={aba} gestao={eu.gestao} />
            <ControloGestao reservas={reservas} seccoes={lista} deptos={deptos} filtro={q.f ?? ''} de={de} ate={ate} hoje={hoje} />
          </>
        )}
        {aba === 'estatisticas' && (
          <>
            <Barra vista={vista} dia={dia} aba={aba} gestao={eu.gestao} />
            <Estatisticas reservas={reservas} deptos={deptos} de={de} ate={ate} />
          </>
        )}
        {aba === 'minhas' ? (
          <>
            <Barra vista={vista} dia={dia} aba={aba} gestao={eu.gestao} />
            <div className="cartao">
              {minhas.length === 0 && <p className="pequeno" style={{ margin: 0 }}>Não tem reservas futuras.</p>}
              <ul className="lista">
                {minhas.map((r) => {
                  const dentroDoPrazo = agora <= prazoReserva(new Date(r.inicio));
                  return (
                    <li key={r.id}>
                      <strong>{formatarInstante(new Date(r.inicio))} – {horaDe(new Date(r.fim))}</strong> · {r.motivo}
                      <div className="pequeno">{r.responsavel} · {r.seccao ?? 'Departamento'}</div>
                      {dentroDoPrazo ? (
                        <form action={cancelarAcao}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="dia" value={dia} />
                          <label className="checar"><input type="checkbox" name="avisei" value="sim" required /> Avisei a Chefe Daniela</label>
                          <button type="submit" className="btn secundario">Cancelar reserva</button>
                        </form>
                      ) : (
                        <div className="pequeno">Prazo de cancelamento terminado. Ligue à Chefe Daniela.</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : aba === 'dia' || aba === 'semana' || aba === 'mes' ? (
          <div className="cal-layout">
            <aside className="cal-lateral">
              <MiniMes dia={dia} vista={vista} />
              <Legenda />
            </aside>
            <div className="cal-principal">
              <Barra vista={vista} dia={dia} origem={origem} aba={aba} gestao={eu.gestao} />
              {vista === 'mes' && (
                <VistaMes dia={dia} reservas={reservas} bloqueios={bloqueios} gestao={eu.gestao} />
              )}
              {vista !== 'mes' && (
                <Agenda
                  dias={dias}
                  reservas={reservas}
                  bloqueios={bloqueios}
                  gestao={eu.gestao}
                  agoraIso={agora.toISOString()}
                  voltar={vista === 'dia' ? voltar : undefined}
                />
              )}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

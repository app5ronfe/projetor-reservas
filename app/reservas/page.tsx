import { redirect } from 'next/navigation';
import { sessaoAtual, reservasEntre, bloqueiosEntre, minhasReservas } from '../../lib/projetor';
import { diaAtual, horaDe, formatarInstante } from '../../lib/tempo';
import { prazoReserva } from '../../lib/regras';
import { intervaloVisivel, Vista } from '../../lib/calendario';
import { Barra, VistaMes, Legenda, type Origem, type Aba } from '../../components/Vistas';
import Agenda from '../../components/Agenda';
import MiniMes from '../../components/MiniMes';
import { cancelarAcao, sairAcao } from '../actions';

type Q = { vista?: string; dia?: string; vo?: string; do?: string; ok?: string; erro?: string };
const VISTAS: Vista[] = ['mes', 'semana', 'dia'];

export default async function Reservas({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await sessaoAtual();
  if (!eu?.dirigente && !eu?.gestao) redirect('/login');
  const q = await searchParams;
  const aba: Aba = q.vista === 'minhas' ? 'minhas' : VISTAS.includes(q.vista as Vista) ? (q.vista as Vista) : 'semana';
  const vista: Vista = aba === 'minhas' ? 'semana' : aba;
  const dia = q.dia ?? diaAtual();
  const { dias, inicio, fim } = intervaloVisivel(vista, dia);
  const [reservas, bloqueios, minhas] = await Promise.all([
    reservasEntre(inicio, fim), bloqueiosEntre(inicio, fim), minhasReservas(eu.id),
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

        {aba === 'minhas' ? (
          <>
            <Barra vista={vista} dia={dia} aba={aba} />
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
        ) : (
          <div className="cal-layout">
            <aside className="cal-lateral">
              <MiniMes dia={dia} vista={vista} />
              <Legenda />
            </aside>
            <div className="cal-principal">
              <Barra vista={vista} dia={dia} origem={origem} aba={aba} />
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
        )}
      </main>
    </>
  );
}

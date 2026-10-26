import { redirect } from 'next/navigation';
import { sessaoAtual, reservasEntre, bloqueiosEntre, minhasReservas } from '../../lib/projetor';
import { diaAtual, horaDe, formatarInstante } from '../../lib/tempo';
import { prazoReserva } from '../../lib/regras';
import { intervaloVisivel, Vista } from '../../lib/calendario';
import { Barra, VistaMes, VistaSemana, VistaDia, type Origem } from '../../components/Vistas';
import { cancelarAcao, sairAcao } from '../actions';

type Q = { vista?: string; dia?: string; vo?: string; do?: string; ok?: string; erro?: string };
const VISTAS: Vista[] = ['mes', 'semana', 'dia'];

export default async function Reservas({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await sessaoAtual();
  if (!eu?.dirigente && !eu?.gestao) redirect('/login');
  const q = await searchParams;
  const vista: Vista = VISTAS.includes(q.vista as Vista) ? (q.vista as Vista) : 'semana';
  const dia = q.dia ?? diaAtual();
  const { inicio, fim } = intervaloVisivel(vista, dia);
  const [reservas, bloqueios, minhas] = await Promise.all([
    reservasEntre(inicio, fim), bloqueiosEntre(inicio, fim), minhasReservas(eu.id),
  ]);
  const agora = new Date();
  const origem: Origem | undefined = (q.vo === 'mes' || q.vo === 'semana') && q.do ? { vista: q.vo, dia: q.do } : undefined;
  const vistaProps = { dia, reservas, bloqueios, gestao: eu.gestao };

  return (
    <>
      <header>
        <h1>Secretaria 5 Ronfe</h1>
        <form action={sairAcao}><button type="submit" className="link">Sair</button></form>
      </header>
      <main>
        {q.ok && <div className="aviso ok">{q.ok}</div>}
        {q.erro && <div className="aviso erro">{q.erro}</div>}

        <Barra vista={vista} dia={dia} origem={origem} />
        {vista === 'mes' && <VistaMes {...vistaProps} />}
        {vista === 'semana' && <VistaSemana {...vistaProps} />}
        {vista === 'dia' && <VistaDia {...vistaProps} origem={origem} />}

        <h2>Minhas reservas</h2>
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
      </main>
    </>
  );
}

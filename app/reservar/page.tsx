import { redirect } from 'next/navigation';
import { sessaoAtual, seccoes, departamentos, ENTIDADES } from '../../lib/projetor';
import { diaAtual, rotuloDia, instante, formatarInstante } from '../../lib/tempo';
import { passado } from '../../lib/calendario';
import { prazoReserva, prazoPassado, MENSAGEM_PRAZO } from '../../lib/regras';
import { reservarAcao } from '../actions';

type Q = { dia?: string; inicio?: string; erro?: string };

export default async function Reservar({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await sessaoAtual();
  if (!eu?.dirigente && !eu?.gestao) redirect('/login');
  const q = await searchParams;
  const dia = q.dia ?? diaAtual();
  const inicioHora = q.inicio ?? '09:00';
  const [lista, deptos] = await Promise.all([seccoes(), departamentos()]);
  const fimHora = (() => {
    const [h, m] = inicioHora.split(':').map(Number);
    const t = h * 60 + m + 60;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  })();
  // Aviso antecipado; a regra definitiva é a da base de dados.
  const bloqueado = !eu.gestao && prazoPassado(instante(dia, inicioHora), new Date());

  return (
    <>
      <header>
        <a href={`/reservas?dia=${dia}`} className="link">← Voltar</a>
        <h1>Nova reserva</h1>
        <span />
      </header>
      <main>
        <div className="cartao">
          {passado(dia) ? (
            <div className="aviso erro">Não é possível reservar num dia que já passou. Pode consultar o dia no calendário.</div>
          ) : null}
          <strong>{rotuloDia(dia)}</strong>
          <div className="pequeno">Prazo para este bloco: {formatarInstante(prazoReserva(instante(dia, inicioHora)))}.</div>
          {q.erro && <div className="aviso erro" style={{ marginTop: 10 }}>{q.erro}</div>}
          {passado(dia) ? null : bloqueado ? (
            <div className="aviso erro" style={{ marginTop: 10 }}>{MENSAGEM_PRAZO}</div>
          ) : (
            <form action={reservarAcao}>
              <input type="hidden" name="dia" value={dia} />
              <div className="linha">
                <div><label htmlFor="inicio">Início</label>
                  <input id="inicio" name="inicio" type="time" step={1800} defaultValue={inicioHora} required /></div>
                <div><label htmlFor="fim">Fim</label>
                  <input id="fim" name="fim" type="time" step={1800} defaultValue={fimHora} required /></div>
              </div>
              <label htmlFor="responsavel">Nome do responsável *</label>
              <input id="responsavel" name="responsavel" required />
              <label htmlFor="motivo">Motivo *</label>
              <input id="motivo" name="motivo" required />
              <label htmlFor="seccao">Secção</label>
              <select id="seccao" name="seccao" defaultValue="">
                <option value="">— escolher —</option>
                {lista.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <label htmlFor="departamento">Ou departamento</label>
              <select id="departamento" name="departamento" defaultValue="">
                <option value="">— nenhum —</option>
                {deptos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                {ENTIDADES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <label htmlFor="descricao">Se escolheu «Outro», descreva brevemente</label>
              <input id="descricao" name="descricao" placeholder="Ex.: visita da junta de freguesia" />
              <p className="pequeno">Preencha a secção, o departamento ou a entidade. Blocos de 30 minutos.</p>
              <button type="submit" className="btn">Reservar</button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

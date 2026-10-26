import { redirect } from 'next/navigation';
import { sessaoAtual, seccoes, departamentos, ENTIDADES, reservasEntre, bloqueiosEntre, caixaDaGestao, previsaoBloqueio } from '../../lib/projetor';
import { diaAtual, limitesDia, instante, formatarInstante, horaDe } from '../../lib/tempo';
import GradeDia, { NavDia } from '../../components/GradeDia';
import { cancelarAcao, editarAcao, prepararBloqueioAcao, confirmarBloqueioAcao, sairAcao } from '../actions';

type Q = { dia?: string; seccao?: string; ok?: string; erro?: string; confirmar?: string; bi?: string; bf?: string; bm?: string };

export default async function Secretaria({ searchParams }: { searchParams: Promise<Q> }) {
  const eu = await sessaoAtual();
  if (!eu?.gestao) redirect('/reservas');
  const q = await searchParams;
  const dia = q.dia ?? diaAtual();
  const { inicio, fim } = limitesDia(dia);
  const [reservas, bloqueios, lista, deptos, caixa] = await Promise.all([
    reservasEntre(inicio, fim), bloqueiosEntre(inicio, fim), seccoes(), departamentos(), caixaDaGestao(),
  ]);
  const seccao = q.seccao ?? '';
  const doDia = seccao ? reservas.filter((r) => r.seccao === seccao) : reservas;

  // Segundo passo do bloqueio: a base de dados diz quem seria afetado (sem gravar).
  let afetadas: { id: string; responsavel: string; motivo: string; inicio: string; fim: string }[] = [];
  if (q.confirmar === '1' && q.bi && q.bf) {
    afetadas = await previsaoBloqueio(instante(dia, q.bi), instante(dia, q.bf), q.bm ?? '');
  }

  return (
    <>
      <header>
        <h1>Secretaria 5 Ronfe</h1>
        <form action={sairAcao}><button type="submit" className="link">Sair</button></form>
      </header>
      <main>
        {q.ok && <div className="aviso ok">{q.ok}</div>}
        {q.erro && <div className="aviso erro">{q.erro}</div>}

        <NavDia dia={dia} base="/secretaria" extra={seccao ? `&seccao=${encodeURIComponent(seccao)}` : ''} />
        <form method="get" className="cartao" style={{ padding: 10 }}>
          <input type="hidden" name="dia" value={dia} />
          <label htmlFor="seccao">Filtrar por secção</label>
          <select id="seccao" name="seccao" defaultValue={seccao}>
            <option value="">Todas</option>
            {lista.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
          </select>
          <button type="submit" className="btn secundario">Aplicar filtro</button>
        </form>

        <GradeDia dia={dia} reservas={reservas} bloqueios={bloqueios} comReservar={false} seccaoFiltro={seccao || undefined} />

        <h2>Reservas do dia</h2>
        <div className="cartao">
          {doDia.length === 0 && <p className="pequeno" style={{ margin: 0 }}>Sem reservas neste dia.</p>}
          <ul className="lista">
            {doDia.map((r) => (
              <li key={r.id}>
                <strong>{horaDe(new Date(r.inicio))}–{horaDe(new Date(r.fim))}</strong> · {r.motivo}
                <div className="pequeno">{r.responsavel} · {r.seccao ?? 'Departamento'}</div>
                <details style={{ marginTop: 6 }}>
                  <summary className="pequeno">Editar</summary>
                  <form action={editarAcao}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dia" value={dia} />
                    <div className="linha">
                      <div><label>Início</label><input name="inicio" type="time" step={1800} defaultValue={horaDe(new Date(r.inicio))} required /></div>
                      <div><label>Fim</label><input name="fim" type="time" step={1800} defaultValue={horaDe(new Date(r.fim))} required /></div>
                    </div>
                    <label>Responsável</label><input name="responsavel" defaultValue={r.responsavel} required />
                    <label>Motivo</label><input name="motivo" defaultValue={r.motivo} required />
                    <label>Secção</label>
                    <select name="seccao" defaultValue={lista.find((s) => s.nome === r.seccao)?.id ?? ''}>
                      <option value="">—</option>
                      {lista.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                    <label>Departamento</label>
                    <select name="departamento" defaultValue={r.entidade ?? r.departamento ?? ''}>
                      <option value="">—</option>
                      {deptos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                      {ENTIDADES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <label>Descrição (se «Outro»)</label>
                    <input name="descricao" defaultValue={r.descricao ?? ''} />
                    <button type="submit" className="btn">Guardar alterações</button>
                  </form>
                </details>
                <form action={cancelarAcao}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="dia" value={dia} />
                  <input type="hidden" name="avisei" value="sim" />
                  <input type="hidden" name="destino" value="/secretaria" />
                  <button type="submit" className="btn perigo">Remover reserva</button>
                </form>
              </li>
            ))}
          </ul>
        </div>

        <h2>Bloquear horário</h2>
        <div className="cartao">
          {q.confirmar === '1' && q.bi && q.bf ? (
            <>
              <div className="aviso erro">
                Este bloqueio cai sobre {afetadas.length} reserva(s). As reservas mantêm-se. Avise os responsáveis.
              </div>
              <ul className="lista">
                {afetadas.map((r) => (
                  <li key={r.id}>{formatarInstante(new Date(r.inicio))} · <strong>{r.responsavel}</strong> · {r.motivo}</li>
                ))}
              </ul>
              <form action={confirmarBloqueioAcao}>
                <input type="hidden" name="dia" value={dia} />
                <input type="hidden" name="inicio" value={q.bi} />
                <input type="hidden" name="fim" value={q.bf} />
                <input type="hidden" name="motivo" value={q.bm ?? ''} />
                <button type="submit" className="btn perigo">Confirmar bloqueio</button>
              </form>
              <a className="btn secundario" href={`/secretaria?dia=${dia}`}>Cancelar</a>
            </>
          ) : (
            <form action={prepararBloqueioAcao}>
              <input type="hidden" name="dia" value={dia} />
              <div className="linha">
                <div><label>Início</label><input name="inicio" type="time" step={1800} required /></div>
                <div><label>Fim</label><input name="fim" type="time" step={1800} required /></div>
              </div>
              <label>Motivo</label>
              <input name="motivo" required />
              <button type="submit" className="btn secundario">Continuar</button>
            </form>
          )}
        </div>

        <h2>Notificações</h2>
        <div className="cartao">
          {caixa.length === 0 && <p className="pequeno" style={{ margin: 0 }}>Sem notificações.</p>}
          <ul className="lista">
            {caixa.map((n) => (
              <li key={n.id}>{n.texto}<div className="pequeno">{formatarInstante(new Date(n.criado_em))}</div></li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}

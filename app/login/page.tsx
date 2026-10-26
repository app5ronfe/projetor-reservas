import { redirect } from 'next/navigation';
import { sessaoAtual } from '../../lib/projetor';
import { entrarAcao } from '../actions';

/**
 * Mesmo login da app do agrupamento: só o código de acesso. A palavra-passe e o
 * email são derivados do código em lib/autenticar.ts (igual à app principal).
 */
export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await sessaoAtual()) redirect('/reservas');
  const { erro } = await searchParams;
  return (
    <main className="login-cena">
      <div className="login-cartao">
        <div className="login-topo">
          <img src="/marca/emblema.png" alt="" className="login-emblema" />
          <h1>Secretaria</h1>
          <h2>5 Ronfe</h2>
          <p>Corpo Nacional de Escutas</p>
        </div>
        <form action={entrarAcao}>
          <label htmlFor="codigo">O teu código</label>
          <input id="codigo" name="codigo" type="text" autoComplete="username" autoCapitalize="none"
                 autoCorrect="off" spellCheck={false} required autoFocus placeholder="por exemplo: daniela" />
          {erro && <p role="alert" className="aviso erro">Código não reconhecido. Confirma com o teu chefe.</p>}
          <button type="submit" className="btn">Entrar</button>
        </form>
      </div>
    </main>
  );
}

/**
 * O elemento escreve só o código de acesso. O Supabase Auth precisa de um
 * email e de uma password, e ambos são derivados do código.
 *
 * O código é normalizado ANTES de gerar qualquer um dos dois: sem acentos,
 * tudo em minúsculas. Assim `GonçaloAlves`, `goncaloalves` e `GONCALOALVES`
 * dão todos a mesma conta — ninguém tem de acertar em maiúsculas nem no
 * cê-cedilha para entrar.
 *
 * O scripts/migrar.mjs e o scripts/repor-passwords.mjs usam exatamente esta
 * mesma função. Se divergirem, ninguém entra.
 */

const PADRAO_EMAIL = process.env.AUTH_EMAIL_PATTERN || 'app.5ronfe+{code}@gmail.com';
const PEPPER = process.env.LOGIN_PEPPER || 'Ronfe!2026';

export const normalizarCodigo = (codigo: string) =>
  codigo
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')      // tira espaços e tudo o que um email recusa
    .trim();

export const emailDoCodigo = (codigo: string) =>
  PADRAO_EMAIL.replace('{code}', normalizarCodigo(codigo));

export const passwordDoCodigo = (codigo: string) =>
  normalizarCodigo(codigo) + PEPPER;

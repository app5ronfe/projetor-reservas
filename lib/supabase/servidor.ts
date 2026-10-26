import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Cliente para Server Components e Server Actions. Respeita a RLS. (Igual ao da app do agrupamento.) */
export async function clienteServidor() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (novos: Parameters<SetAllCookies>[0]) => {
          try {
            novos.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // Server Components não escrevem cookies; a renovação fica para o proxy.
          }
        },
      },
    },
  );
}

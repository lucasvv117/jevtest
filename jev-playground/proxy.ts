import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protection par mot de passe (HTTP Basic Auth).
 * Active uniquement si APP_PASSWORD est défini dans les variables d'env Vercel.
 * Identifiant : n'importe lequel. Mot de passe : APP_PASSWORD.
 * Sans ça, n'importe qui avec l'URL pourrait consommer vos crédits AI Gateway.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = atob(encoded);
    const supplied = decoded.slice(decoded.indexOf(':') + 1);
    if (supplied === password) return NextResponse.next();
  }

  return new NextResponse('Authentification requise.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Jev playground", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

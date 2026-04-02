import { NextRequest, NextResponse } from 'next/server';

/**
 * Protege rutas /api/server/* de monitoreo con un token en env.
 * Uso: Authorization: Bearer <SERVER_HEALTH_TOKEN>
 */
export function serverHealthAuthError(
  request: NextRequest
): NextResponse | null {
  const expected = process.env.SERVER_HEALTH_TOKEN;
  if (!expected?.length) {
    return NextResponse.json(
      {
        error:
          'SERVER_HEALTH_TOKEN no está configurado. Añádelo en .env del servidor.',
      },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization');
  const bearer =
    auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;

  if (!bearer || bearer !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return null;
}

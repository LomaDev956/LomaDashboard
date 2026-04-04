import { NextRequest, NextResponse } from 'next/server'

/** Misma forma que en login: path '/' + secure en HTTPS, para que el navegador borre la cookie de verdad. */
export async function POST(request: NextRequest) {
  try {
    const isHttps = request.nextUrl.protocol === 'https:'
    const res = NextResponse.json({ success: true })
    res.cookies.set('session', '', {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}

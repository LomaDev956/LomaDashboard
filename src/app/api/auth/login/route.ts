import { NextRequest, NextResponse } from 'next/server'
import { sessionCookieSecureFromRequest } from '@/lib/session-cookie'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { username, password: rawPassword } = await request.json()
    const password = typeof rawPassword === 'string' ? rawPassword.trim() : ''

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    })

    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      )
    }

    const secure = sessionCookieSecureFromRequest(request)
    const res = NextResponse.json({ success: true })
    res.cookies.set('session', 'authenticated', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud. ¿Ejecutaste las migraciones y el seed de la base de datos?' },
      { status: 500 }
    )
  }
}

'use server'

import { redirect } from 'next/navigation'

/** Redirige a la ruta que borra cookies y vuelve a la portada (ver sign-out-and-home). */
export async function signOut() {
  redirect('/api/auth/sign-out-and-home')
}

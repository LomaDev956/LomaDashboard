import { cookies } from 'next/headers';

export async function isLomaSessionAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('session')?.value === 'authenticated';
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Root page redirect gate.
 * 
 * - Redirects to /dashboard if a session exists.
 * - Redirects to /login otherwise.
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('auth_session');

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}

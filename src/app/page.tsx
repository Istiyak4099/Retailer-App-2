import { redirect } from 'next/navigation';

/**
 * Root page redirect gate.
 * 
 * - Defaulting to /dashboard for development/testing as requested.
 */
export default async function HomePage() {
  redirect('/dashboard');
}

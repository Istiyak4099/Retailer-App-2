import { redirect } from 'next/navigation';
import GlobalLoading from './loading';

/**
 * Root page - handles initial auth check and redirection.
 * The actual redirection logic is in `hooks/use-auth.tsx`,
 * this page just provides a loading state.
 */
export default function RootPage() {
  // The AuthProvider will redirect to /login or /dashboard.
  // We can show a loading spinner here.
  return <GlobalLoading />;
}

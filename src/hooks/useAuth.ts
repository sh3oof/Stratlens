import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signIn, signOut, signUp } from '../store/slices/authSlice';

// Auth state listener and session initialization live in app/_layout.tsx (RootLayoutNav).
// This hook only reads Redux state and dispatches actions.
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, session, access_token, status, error } = useAppSelector((s) => s.auth);

  return {
    user,
    session,
    access_token,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    error,
    signIn: (email: string, password: string) => dispatch(signIn({ email, password })),
    signOut: () => dispatch(signOut()),
  };
}

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../types';
import { supabase } from '../../services/supabase';

interface AuthState {
  user: UserProfile | null;
  session: string | null;       // access_token
  access_token: string | null;  // alias kept for explicit reference
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  access_token: null,
  status: 'idle',
  error: null,
};

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return data;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
});

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data as UserProfile;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<string | null>) {
      state.session = action.payload;
      state.access_token = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    clearAuth(state) {
      state.user = null;
      state.session = null;
      state.access_token = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── signIn ──────────────────────────────────────────────────────────
      .addCase(signIn.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.session = action.payload.session?.access_token ?? null;
        state.access_token = state.session;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Sign in failed. Check your credentials.';
      })
      // ── signUp ──────────────────────────────────────────────────────────
      .addCase(signUp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.session = action.payload.session?.access_token ?? null;
        state.access_token = state.session;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Sign up failed. Please try again.';
      })
      // ── signOut ─────────────────────────────────────────────────────────
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.access_token = null;
        state.status = 'idle';
        state.error = null;
      })
      .addCase(signOut.rejected, (state) => {
        // Force clear even if Supabase call fails
        state.user = null;
        state.session = null;
        state.access_token = null;
        state.status = 'idle';
      })
      // ── fetchProfile ────────────────────────────────────────────────────
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.user = action.payload;
      });
  },
});

export const { setSession, clearError, clearAuth } = authSlice.actions;
export default authSlice.reducer;

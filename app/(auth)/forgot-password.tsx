import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { BG, CARD, TEAL, TEXT, DIM, BORDER } from '../../src/constants/theme';

function StratLensLogo() {
  return (
    <View style={logo.wrap}>
      <View style={logo.circle}>
        <View style={logo.hLine} />
        <View style={logo.vLine} />
        <View style={logo.innerCircle} />
        <View style={logo.northDot} />
      </View>
      <Text style={logo.wordmark}>StratLens</Text>
      <Text style={logo.tagline}>Intelligence. Perspective. Advantage.</Text>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap:        { alignItems: 'center', marginBottom: 36 },
  circle:      {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: TEAL,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: TEAL, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  hLine:       { position: 'absolute', width: '100%', height: 1, backgroundColor: TEAL + '55' },
  vLine:       { position: 'absolute', height: '100%', width: 1, backgroundColor: TEAL + '55' },
  innerCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: TEAL, backgroundColor: TEAL + '18' },
  northDot:    { position: 'absolute', top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: TEAL },
  wordmark:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: 2 },
  tagline:     { fontSize: 11, color: DIM, letterSpacing: 0.6, marginTop: 5, fontStyle: 'italic' },
});

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'stratlens://reset-password' }
      );
      if (sbError) throw sbError;
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <StratLensLogo />

        <Text style={s.heading}>Reset Password</Text>
        <Text style={s.subheading}>
          Enter your account email and we'll send a reset link.
        </Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {sent ? (
          <View style={s.successBox}>
            <Text style={s.successIcon}>✓</Text>
            <Text style={s.successTitle}>Reset Link Sent</Text>
            <Text style={s.successBody}>
              Check your inbox at {email.trim().toLowerCase()} for a password reset link.
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={DIM}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!loading}
            />

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={s.backWrap} onPress={() => router.replace('/(auth)/sign-in')}>
          <Text style={s.backText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  heading:      { fontSize: 24, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 4 },
  subheading:   { fontSize: 13, color: DIM, textAlign: 'center', marginBottom: 28, lineHeight: 19 },
  errorBox:     { backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:    { color: '#ef4444', fontSize: 13, lineHeight: 18 },
  label:        { fontSize: 11, fontWeight: '600', color: DIM, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input:        {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: TEXT, fontSize: 15, marginBottom: 16,
  },
  btn:          { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 28 },
  btnDisabled:  { opacity: 0.55 },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  successBox:   {
    backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e',
    borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 28,
  },
  successIcon:  { fontSize: 32, color: '#22c55e', marginBottom: 8 },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#22c55e', marginBottom: 8 },
  successBody:  { fontSize: 13, color: DIM, textAlign: 'center', lineHeight: 19 },
  backWrap:     { alignSelf: 'center', marginTop: 8 },
  backText:     { color: TEAL, fontSize: 14, fontWeight: '500' },
});

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
import { Link, router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { signIn, clearError } from '../../src/store/slices/authSlice';
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

export default function SignInScreen() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(s => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const isLoading = status === 'loading';

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    dispatch(clearError());
    const result = await dispatch(signIn({ email: email.trim().toLowerCase(), password }));
    if (signIn.fulfilled.match(result)) {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <StratLensLogo />

        <Text style={s.heading}>Sign In</Text>
        <Text style={s.subheading}>Access your intelligence feed</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

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
          returnKeyType="next"
          editable={!isLoading}
        />

        <Text style={s.label}>Password</Text>
        <View style={s.passwordRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Enter password"
            placeholderTextColor={DIM}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            editable={!isLoading}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
            <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={s.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, isLoading && s.btnDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account?  </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={s.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   { flexGrow: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40 },
  heading:     { fontSize: 24, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 4 },
  subheading:  { fontSize: 13, color: DIM, textAlign: 'center', marginBottom: 28 },
  errorBox:    { backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:   { color: '#ef4444', fontSize: 13, lineHeight: 18 },
  label:       { fontSize: 11, fontWeight: '600', color: DIM, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input:       {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    color: TEXT, fontSize: 15, marginBottom: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn:      { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  eyeIcon:     { fontSize: 16 },
  forgotWrap:  { alignSelf: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText:  { color: TEAL, fontSize: 13, fontWeight: '500' },
  btn:         { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 28 },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText:  { color: DIM, fontSize: 14 },
  footerLink:  { color: TEAL, fontSize: 14, fontWeight: '600' },
});

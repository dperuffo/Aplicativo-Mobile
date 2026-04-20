import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config';
import { formatCPF, rawCPF, validateCPF } from '../utils/formatters';
import { api } from '../api';

export default function LoginScreen({ navigation }) {
  const [cpf, setCpf]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleNext() {
    const digits = rawCPF(cpf);
    if (digits.length < 11) {
      setError('Digite um CPF completo (11 dígitos).');
      shake(); return;
    }
    if (!validateCPF(digits)) {
      setError('CPF inválido. Verifique e tente novamente.');
      shake(); return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.checkCPF(digits);
      navigation.navigate('Password', {
        cpf: digits,
        nome: res.nome,
        primeiro_acesso: res.primeiro_acesso,
      });
    } catch (e) {
      setError(e.message || 'CPF não encontrado.');
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0F2D6B', '#1E4DB7', '#2563EB']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>⛽</Text>
            </View>
            <Text style={styles.appName}>App Motorista FX</Text>
            <Text style={styles.appSub}>Gestão Inteligente de Frota</Text>
          </View>

          {/* Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.cardTitle}>Bem-vindo!</Text>
            <Text style={styles.cardSub}>Informe seu CPF para continuar</Text>

            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              value={cpf}
              onChangeText={(v) => { setCpf(formatCPF(v)); setError(''); }}
              placeholder="000.000.000-00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={14}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Continuar →</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>ProFrotas © 2025 · App Motorista FX v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:  { flex: 1 },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap:  { alignItems: 'center', marginBottom: 36 },
  logoCircle:{
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: { fontSize: 44 },
  appName:   { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  appSub:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSub:   { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },

  label:  { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input:  {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, color: COLORS.textPrimary, letterSpacing: 1,
    backgroundColor: COLORS.bg,
  },
  inputError: { borderColor: COLORS.danger },

  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10,
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },

  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 32 },
});

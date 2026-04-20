import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config';
import { primeiroNome, maskCPF } from '../utils/formatters';
import { api, saveToken } from '../api';

export default function PasswordScreen({ route, navigation }) {
  const { cpf, nome, primeiro_acesso } = route.params;

  const [senha, setSenha]       = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showS, setShowS]       = useState(false);
  const [showC, setShowC]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    if (!senha) {
      setError('Digite sua senha.'); shake(); return;
    }
    if (primeiro_acesso) {
      if (senha.length < 4) {
        setError('A senha deve ter pelo menos 4 dígitos.'); shake(); return;
      }
      if (senha !== confirm) {
        setError('As senhas não coincidem.'); shake(); return;
      }
    }
    setError('');
    setLoading(true);
    try {
      let res;
      if (primeiro_acesso) {
        res = await api.setPassword(cpf, senha);
      } else {
        res = await api.authenticate(cpf, senha);
      }
      await saveToken(res.token);
      navigation.replace('Home');
    } catch (e) {
      setError(e.message || 'Erro ao autenticar.');
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
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {primeiroNome(nome).charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.nomeText}>Olá, {primeiroNome(nome)}!</Text>
            <Text style={styles.cpfText}>{maskCPF(cpf)}</Text>
          </View>

          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            {primeiro_acesso ? (
              <>
                <View style={styles.badgeFirst}>
                  <Text style={styles.badgeText}>✨ Primeiro acesso</Text>
                </View>
                <Text style={styles.cardTitle}>Crie sua senha</Text>
                <Text style={styles.cardSub}>
                  Escolha uma senha para acessar o App Motorista FX.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Sua senha</Text>
                <Text style={styles.cardSub}>
                  Digite sua senha para entrar.
                </Text>
              </>
            )}

            <Text style={styles.label}>
              {primeiro_acesso ? 'Nova senha' : 'Senha'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex, error && !confirm ? styles.inputError : null]}
                value={senha}
                onChangeText={(v) => { setSenha(v); setError(''); }}
                placeholder={primeiro_acesso ? 'Mínimo 4 caracteres' : '••••••'}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showS}
                keyboardType={primeiro_acesso ? 'default' : 'default'}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowS(v => !v)}>
                <Text style={styles.eyeText}>{showS ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {primeiro_acesso && (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>Confirmar senha</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex, error && senha !== confirm ? styles.inputError : null]}
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); setError(''); }}
                    placeholder="Repita a senha"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showC}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowC(v => !v)}>
                    <Text style={styles.eyeText}>{showC ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>
                    {primeiro_acesso ? 'Criar senha e Entrar ✓' : 'Entrar →'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Voltar</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:   { flex: 1 },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: 24 },

  avatarWrap: { alignItems: 'center', marginBottom: 28 },
  avatar:     {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  nomeText:   { fontSize: 20, fontWeight: '700', color: '#fff' },
  cpfText:    { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
  },
  badgeFirst: {
    backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 12,
  },
  badgeText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  cardTitle:  { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSub:    { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },

  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'center' },
  inputFlex: { flex: 1 },
  input:     {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: COLORS.textPrimary,
    backgroundColor: COLORS.bg,
  },
  inputError: { borderColor: COLORS.danger },
  eyeBtn:    { paddingLeft: 10 },
  eyeText:   { fontSize: 20 },

  errorBox:  { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10 },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '500' },

  btn:        {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  backBtn:  { alignItems: 'center', marginTop: 14 },
  backText: { color: COLORS.textMuted, fontSize: 14 },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config';
import { formatCodigo, formatMoeda, formatNumero } from '../utils/formatters';
import { api } from '../api';

export default function AuthCodeScreen({ route, navigation }) {
  const { codigo, token: initialToken, restante: initialRestante, placa, combustivel, volume, valorTotal } = route.params;

  const [token, setToken]         = useState(initialToken || '------');
  const [restante, setRestante]   = useState(initialRestante || 30);
  const progressAnim = useRef(new Animated.Value(initialRestante || 30)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const intervalRef  = useRef(null);
  const tokenPollRef = useRef(null);

  useEffect(() => {
    // Atualiza contador regressivo local
    intervalRef.current = setInterval(() => {
      setRestante(r => {
        const next = r <= 1 ? 30 : r - 1;
        Animated.timing(progressAnim, {
          toValue: next,
          duration: 900,
          useNativeDriver: false,
          easing: Easing.linear,
        }).start();
        return next;
      });
    }, 1000);

    // Busca token do servidor a cada 5s
    tokenPollRef.current = setInterval(async () => {
      try {
        const res = await api.getToken(codigo);
        setToken(res.token);
        setRestante(res.restante);
      } catch (e) { /* silencioso */ }
    }, 5000);

    // Pulsa o token quando muda
    const pulseSub = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    };
    const pulseInt = setInterval(pulseSub, 30000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tokenPollRef.current);
      clearInterval(pulseInt);
    };
  }, [codigo]);

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 30],
    outputRange: ['0%', '100%'],
  });

  const progressColor = restante > 15
    ? '#22C55E'
    : restante > 8
    ? '#F59E0B'
    : '#EF4444';

  const tokenFormatted = token
    ? `${String(token).padStart(6,'0').slice(0,3)} ${String(token).padStart(6,'0').slice(3)}`
    : '--- ---';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#0F2D6B', '#1565C0']} style={styles.headerGrad}>
        <Text style={styles.headerTitle}>Código de Autorização</Text>
        <Text style={styles.headerSub}>Apresente ao frentista</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Placa + dados */}
        <View style={styles.infoRow}>
          <View style={styles.infoChip}><Text style={styles.infoChipText}>🚗 {placa}</Text></View>
          <View style={styles.infoChip}><Text style={styles.infoChipText}>⛽ {combustivel}</Text></View>
          <View style={styles.infoChip}><Text style={styles.infoChipText}>🧪 {formatNumero(volume, 2)} L</Text></View>
        </View>

        {/* Código de abastecimento */}
        <View style={styles.codigoCard}>
          <Text style={styles.codigoLabel}>CÓDIGO DE ABASTECIMENTO</Text>
          <Text style={styles.codigoValue}>{formatCodigo(codigo)}</Text>
          <Text style={styles.codigoNote}>Código de 6 dígitos · Use junto com o token</Text>
        </View>

        {/* Token TOTP */}
        <View style={styles.tokenCard}>
          <View style={styles.tokenHeader}>
            <Text style={styles.tokenLabel}>TOKEN DE VERIFICAÇÃO</Text>
            <View style={[styles.tokenBadge, { backgroundColor: progressColor }]}>
              <Text style={styles.tokenBadgeText}>{restante}s</Text>
            </View>
          </View>

          <Animated.Text style={[styles.tokenValue, { transform: [{ scale: pulseAnim }] }]}>
            {tokenFormatted}
          </Animated.Text>

          {/* Barra de progresso */}
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, {
              width: progressWidth,
              backgroundColor: progressColor,
            }]} />
          </View>
          <Text style={styles.tokenNote}>
            Token se renova automaticamente a cada 30 segundos
          </Text>
        </View>

        {/* Valor total */}
        <LinearGradient
          colors={['#1E40AF', '#1D4ED8']}
          style={styles.valorCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.valorLabel}>Valor total autorizado</Text>
          <Text style={styles.valorValue}>{formatMoeda(valorTotal)}</Text>
        </LinearGradient>

        {/* Instruções */}
        <View style={styles.instrCard}>
          <Text style={styles.instrTitle}>📋 Como usar</Text>
          {[
            'Informe o código de 6 dígitos ao frentista.',
            'Mostre o token que está renovando automaticamente.',
            'Aguarde o frentista validar a autorização.',
            'Após abastecer, clique em "Concluir Abastecimento".',
          ].map((txt, i) => (
            <View key={i} style={styles.instrRow}>
              <View style={styles.instrNum}><Text style={styles.instrNumText}>{i + 1}</Text></View>
              <Text style={styles.instrText}>{txt}</Text>
            </View>
          ))}
        </View>

        {/* Botão concluir */}
        <TouchableOpacity
          style={styles.concludeBtn}
          onPress={() => navigation.replace('Rating', { codigo, placa, valorTotal })}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8C5A']}
            style={styles.concludeGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.concludeText}>Concluir Abastecimento →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  headerGrad: { paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scroll:   { flex: 1 },
  content:  { padding: 16 },

  infoRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  infoChip: {
    backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

  codigoCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  codigoLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 1.5, marginBottom: 10,
  },
  codigoValue: {
    fontSize: 52, fontWeight: '900', color: COLORS.primary,
    letterSpacing: 8, fontVariant: ['tabular-nums'],
  },
  codigoNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  tokenCard: {
    backgroundColor: '#1A1A2E', borderRadius: 20, padding: 22,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 14, elevation: 8,
  },
  tokenHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tokenLabel:     { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  tokenBadge:     { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tokenBadgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tokenValue:     {
    fontSize: 56, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: 10, marginBottom: 14,
    fontVariant: ['tabular-nums'],
  },
  progressBg:   { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  tokenNote:    { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  valorCard: {
    borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center',
  },
  valorLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 },
  valorValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },

  instrCard:    {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  instrTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  instrRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  instrNum:     {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  instrNumText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  instrText:    { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  concludeBtn:      {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  concludeGradient: { paddingVertical: 18, alignItems: 'center' },
  concludeText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
});

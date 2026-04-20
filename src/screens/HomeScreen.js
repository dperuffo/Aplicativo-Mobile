import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../config';
import { formatMoeda, formatNumero, primeiroNome } from '../utils/formatters';
import { api, clearToken } from '../api';

export default function HomeScreen({ navigation }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await api.getHome();
      setData(res);
    } catch (e) {
      if (e.status === 401) {
        await clearToken();
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await api.logout().catch(() => {});
          await clearToken();
          navigation.replace('Login');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const motorista = data?.motorista || {};
  const cliente   = data?.cliente   || {};
  const saldo     = data?.saldo     || {};
  const ultimos   = data?.ultimos_abastecimentos || [];

  const saldoDisp = saldo.sem_limite
    ? null
    : (parseFloat(saldo.disponivel) || 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarChar}>
                {primeiroNome(motorista.nome || '').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.headerGreeting}>Olá,</Text>
              <Text style={styles.headerName}>{primeiroNome(motorista.nome || '')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Cliente Card */}
        <View style={styles.clienteCard}>
          <View style={styles.clienteIcon}><Text style={styles.clienteIconText}>🏢</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clienteLabel}>Empresa / Frota</Text>
            <Text style={styles.clienteNome}>{cliente.nome || '—'}</Text>
          </View>
        </View>

        {/* Saldo Card */}
        <LinearGradient
          colors={saldoDisp === null || saldoDisp > 0
            ? ['#16A34A', '#22C55E']
            : ['#DC2626', '#EF4444']}
          style={styles.saldoCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.saldoLabel}>
            {saldo.sem_limite ? '⬤ Limite de crédito' : '⬤ Saldo disponível'}
          </Text>
          {saldo.sem_limite ? (
            <Text style={styles.saldoValue}>Sem limite definido</Text>
          ) : (
            <>
              <Text style={styles.saldoValue}>{formatMoeda(saldoDisp)}</Text>
              <View style={styles.saldoDetails}>
                <Text style={styles.saldoDetailText}>
                  Limite: {formatMoeda(saldo.limite)}
                </Text>
                <Text style={styles.saldoDetailText}>
                  Utilizado: {formatMoeda(saldo.utilizado)}
                </Text>
              </View>
              {/* Barra de progresso */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(100, (parseFloat(saldo.utilizado || 0) / parseFloat(saldo.limite || 1)) * 100)}%`,
                }]} />
              </View>
            </>
          )}
        </LinearGradient>

        {/* Botão Abastecer */}
        <TouchableOpacity
          style={styles.abastecerBtn}
          onPress={() => navigation.navigate('Fueling')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF8C5A']}
            style={styles.abastecerGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={styles.abastecerIcon}>⛽</Text>
            <View>
              <Text style={styles.abastecerTitle}>Abastecer Veículo</Text>
              <Text style={styles.abastecerSub}>Solicite uma autorização</Text>
            </View>
            <Text style={styles.abastecerArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Histórico */}
        {ultimos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos abastecimentos</Text>
            {ultimos.map((ab, i) => (
              <View key={ab.id || i} style={styles.histItem}>
                <View style={styles.histIcon}>
                  <Text style={styles.histIconText}>🔋</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.histRow}>
                    <Text style={styles.histPlaca}>{ab.placa}</Text>
                    <Text style={styles.histValor}>{formatMoeda(ab.valor_total)}</Text>
                  </View>
                  <View style={styles.histRow}>
                    <Text style={styles.histInfo}>
                      {ab.combustivel} · {formatNumero(ab.volume, 2)} L
                    </Text>
                    <Text style={styles.histData}>{ab.data}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.bg },
  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loadingText:  { marginTop: 12, color: COLORS.textSecondary, fontSize: 15 },

  header:       { paddingHorizontal: 20, paddingVertical: 16 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarSmall:  {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarChar:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerName:   { fontSize: 18, fontWeight: '700', color: '#fff' },
  logoutBtn:    {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
  },
  logoutText:   { color: '#fff', fontSize: 13, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },

  clienteCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  clienteIcon:     {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  clienteIconText: { fontSize: 22 },
  clienteLabel:    { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  clienteNome:     { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 1 },

  saldoCard: {
    borderRadius: 20, padding: 22, marginBottom: 16,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
  saldoLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  saldoValue:      { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 8 },
  saldoDetails:    { flexDirection: 'row', gap: 16, marginBottom: 10 },
  saldoDetailText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  progressBar:     { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  progressFill:    { height: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 3 },

  abastecerBtn:     { marginBottom: 20, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  abastecerGradient: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 20, gap: 14,
  },
  abastecerIcon:    { fontSize: 32 },
  abastecerTitle:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  abastecerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  abastecerArrow:   { marginLeft: 'auto', fontSize: 22, color: '#fff', fontWeight: '700' },

  section:      { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },

  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  histIcon:     {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  histIconText: { fontSize: 18 },
  histRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  histPlaca:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  histValor:    { fontSize: 14, fontWeight: '700', color: COLORS.success },
  histInfo:     { fontSize: 12, color: COLORS.textSecondary },
  histData:     { fontSize: 12, color: COLORS.textMuted },
});

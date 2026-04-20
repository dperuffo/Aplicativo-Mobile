import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config';
import { formatMoeda, formatNumero } from '../utils/formatters';
import { api } from '../api';

export default function SummaryScreen({ route, navigation }) {
  const { placa, combustivel, hodometro, volume, precoUnitario, valorTotal } = route.params;
  const [loading, setLoading] = useState(false);

  async function handleProceed() {
    setLoading(true);
    try {
      const res = await api.solicitarAbastecimento({
        placa,
        combustivel,
        hodometro,
        volume,
        precoUnitario,
        valorTotal,
      });
      navigation.replace('AuthCode', {
        codigo:      res.codigo,
        token:       res.token,
        restante:    res.restante,
        abastId:     res.abastecimento_id,
        placa,
        combustivel,
        volume,
        valorTotal,
      });
    } catch (e) {
      if (e.bloqueado) {
        Alert.alert('Abastecimento bloqueado', e.message, [{ text: 'OK' }]);
      } else {
        Alert.alert('Erro', e.message || 'Tente novamente.', [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  const rows = [
    { label: 'Veículo (Placa)',    value: placa,                      icon: '🚗' },
    { label: 'Combustível',        value: combustivel,                 icon: '⛽' },
    { label: 'Hodômetro',          value: `${formatNumero(hodometro, 0)} km`, icon: '🔢' },
    { label: 'Volume',             value: `${formatNumero(volume, 2)} L`,   icon: '🧪' },
    { label: 'Preço por litro',    value: formatMoeda(precoUnitario),  icon: '💲' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>← Editar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumo</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.titleText}>Confirme o abastecimento</Text>
          <Text style={styles.titleSub}>Verifique os dados antes de prosseguir.</Text>
        </View>

        {/* Details card */}
        <View style={styles.detailCard}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
              <View style={styles.rowIconWrap}>
                <Text style={styles.rowIcon}>{r.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.totalCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.totalLabel}>VALOR TOTAL ESTIMADO</Text>
          <Text style={styles.totalValue}>{formatMoeda(valorTotal)}</Text>
          <Text style={styles.totalNote}>
            {formatNumero(volume, 2)} L × {formatMoeda(precoUnitario)}/L
          </Text>
        </LinearGradient>

        {/* Aviso */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ Ao prosseguir, o sistema validará todas as regras de uso, saldo disponível,
            parâmetros de abastecimento e gerará o código de autorização.
          </Text>
        </View>

        {/* Botão Prosseguir */}
        <TouchableOpacity
          style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
          onPress={handleProceed}
          disabled={loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#16A34A', '#22C55E']}
            style={styles.proceedGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.proceedIcon}>✓</Text>
                  <Text style={styles.proceedText}>Prosseguir e Gerar Código</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.cancelText}>Cancelar abastecimento</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBack:  { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  scroll:   { flex: 1 },
  content:  { padding: 16 },

  titleWrap:  { marginBottom: 16 },
  titleText:  { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  titleSub:   { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  detailCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 4,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
  },
  rowIcon:  { fontSize: 20 },
  rowLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  rowValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '700', marginTop: 1 },

  totalCard: {
    borderRadius: 20, padding: 24, marginBottom: 14, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  totalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  totalValue: { fontSize: 40, fontWeight: '800', color: '#fff', marginBottom: 4 },
  totalNote:  { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  warningBox: {
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 20,
  },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 19 },

  proceedBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  proceedBtnDisabled: { opacity: 0.6 },
  proceedGradient: {
    flexDirection: 'row', paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  proceedIcon: { fontSize: 18, color: '#fff' },
  proceedText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  cancelBtn:  { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
  cancelText: { color: COLORS.danger, fontSize: 14, fontWeight: '500' },
});

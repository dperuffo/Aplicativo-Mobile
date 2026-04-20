import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../config';
import { formatMoeda } from '../utils/formatters';
import { api } from '../api';

const EMOJIS = [
  { val: 1, emoji: '😠', label: 'Péssimo' },
  { val: 2, emoji: '😕', label: 'Ruim' },
  { val: 3, emoji: '😐', label: 'Regular' },
  { val: 4, emoji: '😊', label: 'Bom' },
  { val: 5, emoji: '🤩', label: 'Ótimo' },
];

export default function RatingScreen({ route, navigation }) {
  const { codigo, placa, valorTotal } = route.params;

  const [rating, setRating]       = useState(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  async function handleConcluir() {
    setLoading(true);
    try {
      await api.concluirAbastecimento(codigo, rating, comentario);
      setDone(true);
    } catch (e) {
      // Conclui de qualquer forma localmente
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.successScreen}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Abastecimento concluído!</Text>
          <Text style={styles.successSub}>
            Seu abastecimento foi registrado com sucesso.
          </Text>
          {valorTotal > 0 && (
            <View style={styles.successValorBox}>
              <Text style={styles.successValorLabel}>Valor registrado</Text>
              <Text style={styles.successValorValue}>{formatMoeda(valorTotal)}</Text>
            </View>
          )}
          <View style={styles.successInfoBox}>
            <Text style={styles.successInfoText}>🚗 Veículo: {placa}</Text>
            <Text style={styles.successInfoText}>🔑 Código: {codigo}</Text>
          </View>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.88}
          >
            <Text style={styles.homeBtnText}>Ir para o início ⬤</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.header}>
        <Text style={styles.headerTitle}>Avalie o atendimento</Text>
        <Text style={styles.headerSub}>Sua opinião é muito importante</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Emoji Rating */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingQuestion}>Como foi o atendimento no posto?</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e.val}
                style={[styles.emojiItem, rating === e.val && styles.emojiItemSel]}
                onPress={() => setRating(e.val)}
                activeOpacity={0.85}
              >
                <Text style={[styles.emojiChar, rating === e.val && styles.emojiCharSel]}>
                  {e.emoji}
                </Text>
                <Text style={[styles.emojiLabel, rating === e.val && styles.emojiLabelSel]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {rating && (
            <View style={styles.ratingFeedback}>
              <Text style={styles.ratingFeedbackText}>
                {EMOJIS.find(e => e.val === rating)?.emoji} {EMOJIS.find(e => e.val === rating)?.label}
              </Text>
            </View>
          )}
        </View>

        {/* Comentário */}
        <View style={styles.comentCard}>
          <Text style={styles.comentLabel}>Comentário (opcional)</Text>
          <TextInput
            style={styles.comentInput}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Deixe um comentário sobre o atendimento..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botão Concluir */}
        <TouchableOpacity
          style={[styles.concludeBtn, loading && styles.concludeBtnDisabled]}
          onPress={handleConcluir}
          disabled={loading}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#16A34A', '#22C55E']}
            style={styles.concludeGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.concludeIcon}>✓</Text>
                  <Text style={styles.concludeText}>Concluir Abastecimento</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleConcluir}
          disabled={loading}
        >
          <Text style={styles.skipText}>Pular avaliação</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scroll:   { flex: 1 },
  content:  { padding: 16 },

  ratingCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 22, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  ratingQuestion: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  emojiRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  emojiItem:      { alignItems: 'center', flex: 1, paddingVertical: 10, borderRadius: 12 },
  emojiItemSel:   { backgroundColor: '#EEF2FF' },
  emojiChar:      { fontSize: 32, marginBottom: 4 },
  emojiCharSel:   { transform: [{ scale: 1.2 }] },
  emojiLabel:     { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  emojiLabelSel:  { color: COLORS.primary, fontWeight: '700' },
  ratingFeedback: {
    backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  ratingFeedbackText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  comentCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  comentLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  comentInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.textPrimary, backgroundColor: COLORS.bg, minHeight: 100,
  },

  concludeBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 10,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  concludeBtnDisabled: { opacity: 0.6 },
  concludeGradient: {
    flexDirection: 'row', paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  concludeIcon: { fontSize: 18, color: '#fff' },
  concludeText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  skipBtn:  { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 14 },

  // Tela de sucesso
  successScreen: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  successEmoji:  { fontSize: 72, marginBottom: 16 },
  successTitle:  { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  successSub:    { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  successValorBox: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 14, marginBottom: 14, alignItems: 'center',
  },
  successValorLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  successValorValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  successInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginBottom: 32, gap: 4,
  },
  successInfoText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  homeBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 16,
  },
  homeBtnText: { fontSize: 16, fontWeight: '700', color: '#16A34A' },
});

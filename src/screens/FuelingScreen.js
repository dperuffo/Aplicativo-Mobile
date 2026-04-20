import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, COMBUSTIVEIS } from '../config';
import { formatPlaca, formatNumero } from '../utils/formatters';
import { api } from '../api';

const STEPS = ['Veículo', 'Posto', 'Combustível', 'Hodômetro', 'Volume'];

export default function FuelingScreen({ navigation }) {
  const [step, setStep]                 = useState(0);
  const [veiculos, setVeiculos]         = useState([]);
  const [postos, setPostos]             = useState([]);
  const [loadingVeics, setLoadingVeics] = useState(true);
  const [loadingPostos, setLoadingPostos] = useState(false);

  // Form fields
  const [placa, setPlaca]           = useState('');
  const [posto, setPosto]           = useState(null);   // objeto selecionado
  const [combustivel, setCombustivel] = useState('');
  const [hodometro, setHodometro]   = useState('');
  const [volume, setVolume]         = useState('');
  const [precoUnit, setPrecoUnit]   = useState('');

  // Pesquisa de postos
  const [busca, setBusca]         = useState('');
  const [buscaCnpj, setBuscaCnpj] = useState('');
  const [buscaCidade, setBuscaCidade] = useState('');
  const [buscaUF, setBuscaUF]     = useState('');

  const [showVeicModal, setShowVeicModal] = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    api.getVeiculos()
      .then(v => setVeiculos(v || []))
      .catch(() => setVeiculos([]))
      .finally(() => setLoadingVeics(false));
  }, []);

  // Carrega postos quando entra no step 1
  useEffect(() => {
    if (step === 1 && postos.length === 0) {
      setLoadingPostos(true);
      api.getPostos()
        .then(p => setPostos(p || []))
        .catch(() => setPostos([]))
        .finally(() => setLoadingPostos(false));
    }
  }, [step]);

  // Filtra postos conforme pesquisa
  const postosFiltrados = useMemo(() => {
    let lista = postos;
    if (busca.trim())
      lista = lista.filter(p => (p.razao || '').toLowerCase().includes(busca.toLowerCase().trim()));
    if (buscaCnpj.trim())
      lista = lista.filter(p => (p.cnpj || '').replace(/\D/g,'').includes(buscaCnpj.replace(/\D/g,'')));
    if (buscaCidade.trim())
      lista = lista.filter(p => (p.cidade || '').toLowerCase().includes(buscaCidade.toLowerCase().trim()));
    if (buscaUF.trim())
      lista = lista.filter(p => (p.uf || '').toLowerCase() === buscaUF.toLowerCase().trim());
    return lista.slice(0, 80);
  }, [postos, busca, buscaCnpj, buscaCidade, buscaUF]);

  function limparBusca() {
    setBusca(''); setBuscaCnpj(''); setBuscaCidade(''); setBuscaUF('');
  }

  function handleNext() {
    setError('');
    if (step === 0) {
      if (!placa.trim()) { setError('Selecione ou digite a placa do veículo.'); return; }
    } else if (step === 1) {
      if (!posto) { setError('Selecione um posto para continuar.'); return; }
    } else if (step === 2) {
      if (!combustivel) { setError('Selecione o tipo de combustível.'); return; }
    } else if (step === 3) {
      const h = parseFloat(hodometro.replace(',', '.'));
      if (!hodometro || isNaN(h) || h <= 0) { setError('Informe o hodômetro atual em km.'); return; }
    } else if (step === 4) {
      const v = parseFloat(volume.replace(',', '.'));
      const p = parseFloat(precoUnit.replace(',', '.'));
      if (!volume || isNaN(v) || v <= 0) { setError('Informe a quantidade em litros.'); return; }
      if (!precoUnit || isNaN(p) || p <= 0) { setError('Informe o preço por litro.'); return; }
      navigation.navigate('Summary', {
        placa:         placa.trim().toUpperCase(),
        posto:         posto.razao,
        cnpjPosto:     posto.cnpj  || '',
        cidadePosto:   posto.cidade || '',
        ufPosto:       posto.uf     || '',
        bandeiraPosto: posto.bandeira || '',
        combustivel,
        hodometro:     parseFloat(hodometro.replace(',', '.')),
        volume:        v,
        precoUnitario: p,
        valorTotal:    parseFloat((v * p).toFixed(2)),
      });
      return;
    }
    setStep(s => s + 1);
  }

  const veiculoSel = veiculos.find(v => v.placa === placa);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.header}>
        <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)}>
          <Text style={styles.headerBack}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abastecer Veículo</Text>
        <View style={{ width: 60 }} />
      </LinearGradient>

      {/* Progress */}
      <View style={styles.progressWrap}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot,
              i < step  && styles.stepDone,
              i === step && styles.stepActive,
            ]}>
              {i < step
                ? <Text style={styles.stepCheck}>✓</Text>
                : <Text style={[styles.stepNum, i === step && styles.stepNumActive]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ── Step 0: Veículo ── */}
          {step === 0 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🚗 Qual é o veículo?</Text>
              <Text style={styles.stepDesc}>Selecione da lista ou digite a placa manualmente.</Text>

              {loadingVeics
                ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                : veiculos.length > 0
                  ? (
                    <TouchableOpacity style={styles.selectBox} onPress={() => setShowVeicModal(true)}>
                      <Text style={placa ? styles.selectVal : styles.selectPlaceholder}>
                        {placa ? `${placa}${veiculoSel ? ` – ${veiculoSel.modelo || ''}` : ''}` : 'Selecionar veículo da frota...'}
                      </Text>
                      <Text style={styles.selectArrow}>▼</Text>
                    </TouchableOpacity>
                  ) : null
              }

              <Text style={[styles.label, { marginTop: veiculos.length > 0 ? 14 : 0 }]}>
                {veiculos.length > 0 ? 'Ou digite a placa:' : 'Placa do veículo:'}
              </Text>
              <TextInput
                style={styles.input}
                value={placa}
                onChangeText={v => { setPlaca(formatPlaca(v)); setError(''); }}
                placeholder="Ex: ABC1D23"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                maxLength={7}
              />
              {veiculoSel && (
                <View style={styles.veicInfo}>
                  <Text style={styles.veicInfoText}>🔧 {veiculoSel.marca} {veiculoSel.modelo} · {veiculoSel.combustivel_especificado}</Text>
                  {veiculoSel.hodometro > 0 && (
                    <Text style={styles.veicInfoText}>📍 Último hodômetro: {formatNumero(veiculoSel.hodometro, 0)} km</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── Step 1: Posto ── */}
          {step === 1 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🏪 Selecione o posto</Text>
              <Text style={styles.stepDesc}>Pesquise pelo nome, CNPJ, cidade ou UF.</Text>

              {/* Posto selecionado */}
              {posto && (
                <View style={styles.postoSelecionado}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postoSelNome}>{posto.razao}</Text>
                    <Text style={styles.postoSelInfo}>
                      {[posto.bandeira, posto.cidade, posto.uf].filter(Boolean).join(' · ')}
                    </Text>
                    {posto.cnpj ? <Text style={styles.postoSelCnpj}>CNPJ: {posto.cnpj}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { setPosto(null); limparBusca(); }}>
                    <Text style={styles.postoSelTrocar}>Trocar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Campos de pesquisa */}
              {!posto && (
                <>
                  <View style={styles.searchGrid}>
                    <View style={[styles.searchField, { flex: 2 }]}>
                      <Text style={styles.searchLabel}>Nome / Razão Social</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={busca}
                        onChangeText={v => { setBusca(v); setError(''); }}
                        placeholder="Ex: Posto Ipiranga"
                        placeholderTextColor={COLORS.textMuted}
                        returnKeyType="search"
                      />
                    </View>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>UF</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={buscaUF}
                        onChangeText={v => setBuscaUF(v.toUpperCase().slice(0, 2))}
                        placeholder="SC"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>
                  </View>

                  <View style={styles.searchGrid}>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>Cidade</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={buscaCidade}
                        onChangeText={v => setBuscaCidade(v)}
                        placeholder="Ex: Florianópolis"
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>CNPJ</Text>
                      <TextInput
                        style={styles.searchInput}
                        value={buscaCnpj}
                        onChangeText={v => setBuscaCnpj(v.replace(/\D/g, ''))}
                        placeholder="Somente números"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {(busca || buscaCnpj || buscaCidade || buscaUF) && (
                    <TouchableOpacity style={styles.limparBtn} onPress={limparBusca}>
                      <Text style={styles.limparText}>✕ Limpar filtros</Text>
                    </TouchableOpacity>
                  )}

                  {/* Lista de postos */}
                  {loadingPostos
                    ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                    : postos.length === 0
                      ? (
                        <View style={styles.emptyBox}>
                          <Text style={styles.emptyText}>Nenhum posto cadastrado no sistema.</Text>
                        </View>
                      )
                      : postosFiltrados.length === 0
                        ? (
                          <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>Nenhum posto encontrado com esses filtros.</Text>
                          </View>
                        )
                        : (
                          <View style={styles.postoLista}>
                            <Text style={styles.postoListaHeader}>
                              {postosFiltrados.length} posto{postosFiltrados.length !== 1 ? 's' : ''} encontrado{postosFiltrados.length !== 1 ? 's' : ''}
                            </Text>
                            {postosFiltrados.map((p, i) => (
                              <TouchableOpacity
                                key={p.id || i}
                                style={styles.postoItem}
                                onPress={() => { setPosto(p); setError(''); }}
                                activeOpacity={0.75}
                              >
                                <View style={styles.postoItemIcon}>
                                  <Text style={styles.postoItemIconText}>⛽</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.postoItemNome}>{p.razao}</Text>
                                  <Text style={styles.postoItemInfo}>
                                    {[p.bandeira, p.cidade, p.uf].filter(Boolean).join(' · ')}
                                  </Text>
                                  {p.cnpj ? <Text style={styles.postoItemCnpj}>{p.cnpj}</Text> : null}
                                </View>
                                <Text style={styles.postoItemArrow}>›</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )
                  }
                </>
              )}
            </View>
          )}

          {/* ── Step 2: Combustível ── */}
          {step === 2 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>⛽ Tipo de combustível</Text>
              <Text style={styles.stepDesc}>Selecione o combustível que será abastecido.</Text>
              <View style={styles.combGrid}>
                {COMBUSTIVEIS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.combItem, combustivel === c && styles.combItemSel]}
                    onPress={() => { setCombustivel(c); setError(''); }}
                  >
                    <Text style={styles.combEmoji}>{getCombEmoji(c)}</Text>
                    <Text style={[styles.combLabel, combustivel === c && styles.combLabelSel]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 3: Hodômetro ── */}
          {step === 3 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🔢 Hodômetro atual</Text>
              <Text style={styles.stepDesc}>
                Informe a leitura atual do hodômetro (km). Deve ser maior que o último abastecimento.
              </Text>
              <Text style={styles.label}>Hodômetro (km)</Text>
              <TextInput
                style={styles.inputLarge}
                value={hodometro}
                onChangeText={v => { setHodometro(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder="Ex: 45000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                autoFocus
              />
              {veiculoSel?.hodometro > 0 && (
                <Text style={styles.hodoHint}>ℹ Último registrado: {formatNumero(veiculoSel.hodometro, 0)} km</Text>
              )}
            </View>
          )}

          {/* ── Step 4: Volume ── */}
          {step === 4 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🧪 Volume e valor</Text>
              <Text style={styles.stepDesc}>Informe a quantidade em litros e o preço por litro.</Text>

              <Text style={styles.label}>Litros a abastecer</Text>
              <TextInput
                style={styles.inputLarge}
                value={volume}
                onChangeText={v => { setVolume(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder="Ex: 50"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                autoFocus
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Preço por litro (R$)</Text>
              <TextInput
                style={styles.inputLarge}
                value={precoUnit}
                onChangeText={v => { setPrecoUnit(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder="Ex: 5,79"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              {volume && precoUnit &&
               parseFloat(volume.replace(',','.')) > 0 &&
               parseFloat(precoUnit.replace(',','.')) > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Valor estimado</Text>
                  <Text style={styles.previewValue}>
                    R$ {(parseFloat(volume.replace(',','.')) * parseFloat(precoUnit.replace(',','.'))).toFixed(2).replace('.',',')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.88}>
            <LinearGradient
              colors={['#0F2D6B', '#1E4DB7']}
              style={styles.nextGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextText}>
                {step === STEPS.length - 1 ? 'Ver resumo →' : 'Próximo →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal seleção de veículo */}
      <Modal visible={showVeicModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecionar veículo</Text>
            <FlatList
              data={veiculos}
              keyExtractor={v => v.placa}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, placa === item.placa && styles.modalItemSel]}
                  onPress={() => {
                    setPlaca(item.placa);
                    setCombustivel(item.combustivel_especificado || '');
                    setShowVeicModal(false);
                  }}
                >
                  <Text style={styles.modalPlaca}>{item.placa}</Text>
                  <Text style={styles.modalModelo}>{item.marca} {item.modelo}</Text>
                  {item.combustivel_especificado
                    ? <Text style={styles.modalComb}>{item.combustivel_especificado}</Text>
                    : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowVeicModal(false)}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getCombEmoji(c) {
  if (c.includes('Gasolina')) return '🟡';
  if (c.includes('Etanol'))   return '🟢';
  if (c.includes('Diesel'))   return '🟤';
  if (c.includes('GNV'))      return '🔵';
  return '⚫';
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBack:  { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  progressWrap: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    backgroundColor: COLORS.card, gap: 0,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stepItem:       { alignItems: 'center', flex: 1 },
  stepDot:        {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 3,
  },
  stepDone:       { backgroundColor: COLORS.success },
  stepActive:     { backgroundColor: COLORS.primary, transform: [{ scale: 1.1 }] },
  stepCheck:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepNum:        { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  stepNumActive:  { color: '#fff' },
  stepLabel:      { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  stepLabelActive:{ color: COLORS.primary, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  stepCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  stepDesc:  { fontSize: 14, color: COLORS.textSecondary, marginBottom: 18, lineHeight: 20 },

  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input:     {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 16,
    color: COLORS.textPrimary, backgroundColor: COLORS.bg,
  },
  inputLarge: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 16, fontSize: 28,
    color: COLORS.textPrimary, backgroundColor: COLORS.bg,
    textAlign: 'center', fontWeight: '700',
  },
  hodoHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },

  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#EEF2FF',
  },
  selectVal:         { fontSize: 15, fontWeight: '600', color: COLORS.primary, flex: 1 },
  selectPlaceholder: { fontSize: 15, color: COLORS.textMuted, flex: 1 },
  selectArrow:       { fontSize: 12, color: COLORS.primary },
  veicInfo: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  veicInfoText: { fontSize: 13, color: '#166534', marginBottom: 3 },

  // Posto selecionado
  postoSelecionado: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#16A34A', gap: 10,
  },
  postoSelNome:   { fontSize: 15, fontWeight: '700', color: '#166534' },
  postoSelInfo:   { fontSize: 13, color: '#166534', opacity: 0.8, marginTop: 2 },
  postoSelCnpj:   { fontSize: 11, color: '#166534', opacity: 0.6, marginTop: 2 },
  postoSelTrocar: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Campos de pesquisa
  searchGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchField: {},
  searchLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  searchInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.textPrimary, backgroundColor: COLORS.bg,
  },
  limparBtn:  { alignSelf: 'flex-end', marginBottom: 10 },
  limparText: { fontSize: 13, color: COLORS.danger, fontWeight: '500' },

  emptyBox:  { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  // Lista de postos
  postoLista:       { marginTop: 4 },
  postoListaHeader: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, fontWeight: '500' },
  postoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  postoItemIcon:     {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center',
  },
  postoItemIconText: { fontSize: 18 },
  postoItemNome:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  postoItemInfo:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  postoItemCnpj:     { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  postoItemArrow:    { fontSize: 20, color: COLORS.primary, fontWeight: '700' },

  // Combustível
  combGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  combItem:    {
    width: '47%', paddingVertical: 16, paddingHorizontal: 8,
    backgroundColor: COLORS.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 6,
  },
  combItemSel: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  combEmoji:   { fontSize: 24 },
  combLabel:   { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  combLabelSel:{ color: COLORS.primary },

  previewBox:   {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
    marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0',
  },
  previewLabel: { fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 4 },
  previewValue: { fontSize: 28, fontWeight: '800', color: '#16A34A' },

  errorBox:  { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.danger, fontSize: 14, fontWeight: '500' },

  nextBtn: {
    borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  nextGradient: { paddingVertical: 18, alignItems: 'center' },
  nextText:     { color: '#fff', fontSize: 17, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '75%',
  },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  modalItem:      { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemSel:   { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 8 },
  modalPlaca:     { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  modalModelo:    { fontSize: 14, color: COLORS.textSecondary },
  modalComb:      { fontSize: 12, color: COLORS.textMuted },
  modalClose:     {
    marginTop: 16, backgroundColor: COLORS.bg, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});

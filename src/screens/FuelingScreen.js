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

const STEPS  = ['Veículo', 'Posto', 'Combustível', 'Hodômetro', 'Volume', 'Serviços'];

const ETAPAS = ['veiculo', 'posto', 'combustivel', 'hodometro', 'volume', 'servicos'];

function AvisoItem({ aviso }) {
  const map = {
    error:   { bg: '#FEF2F2', border: '#FECACA', icon: '🚫', titleColor: '#991B1B', detailColor: '#7F1D1D' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️',  titleColor: '#92400E', detailColor: '#78350F' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: 'ℹ️',  titleColor: '#1E40AF', detailColor: '#1E3A8A' },
  };
  const s = map[aviso.tipo] || map.info;
  return (
    <View style={[avisoStyles.box, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={avisoStyles.icon}>{s.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[avisoStyles.titulo, { color: s.titleColor }]}>{aviso.titulo}</Text>
        {aviso.detalhe ? <Text style={[avisoStyles.detalhe, { color: s.detailColor }]}>{aviso.detalhe}</Text> : null}
      </View>
    </View>
  );
}

const avisoStyles = StyleSheet.create({
  box:     { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  icon:    { fontSize: 18, marginTop: 1 },
  titulo:  { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  detalhe: { fontSize: 13, lineHeight: 18, marginTop: 3 },
});

export default function FuelingScreen({ navigation }) {
  const [step, setStep]                   = useState(0);
  const [veiculos, setVeiculos]           = useState([]);
  const [postos, setPostos]               = useState([]);
  const [loadingVeics, setLoadingVeics]   = useState(true);
  const [loadingPostos, setLoadingPostos] = useState(false);

  // Form fields
  const [placa, setPlaca]             = useState('');
  const [posto, setPosto]             = useState(null);
  const [combustivel, setCombustivel] = useState('');
  const [hodometro, setHodometro]     = useState('');
  const [volume, setVolume]           = useState('');
  const [precoUnit, setPrecoUnit]     = useState('');

  // Preço sugerido pelo backend (posto + combustível)
  const [precoSugerido, setPrecoSugerido]         = useState(null);
  const [loadingPreco, setLoadingPreco]           = useState(false);

  // Arla 32 (somente Diesel — abre automaticamente)
  const [arlaAtivo, setArlaAtivo]         = useState(false);
  const [arlaVolume, setArlaVolume]       = useState('');
  const [arlaPreco, setArlaPreco]         = useState('');
  const [arlaPrecoSugerido, setArlaPrecoSugerido] = useState(null);

  const isDiesel = combustivel === 'Diesel Comum' || combustivel === 'Diesel S10';

  // Abre/fecha Arla 32 automaticamente conforme combustível
  useEffect(() => {
    if (isDiesel) {
      setArlaAtivo(true);
    } else {
      setArlaAtivo(false);
      setArlaVolume('');
      setArlaPreco('');
      setArlaPrecoSugerido(null);
    }
  }, [isDiesel]);

  // Serviços
  const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
  const [servicosSel, setServicosSel]                 = useState([]); // [{nome, valor:''}]
  const [loadingServicos, setLoadingServicos]          = useState(false);

  useEffect(() => {
    if (step !== 5 || !posto?.cnpj) return;
    setLoadingServicos(true);
    api.getServicos(posto.cnpj, placa)
      .then(s => setServicosDisponiveis(s || []))
      .catch(() => setServicosDisponiveis([]))
      .finally(() => setLoadingServicos(false));
  }, [step]);

  function toggleServico(nome) {
    setServicosSel(prev => {
      if (prev.find(s => s.nome === nome)) return prev.filter(s => s.nome !== nome);
      return [...prev, { nome, valor: '' }];
    });
  }

  function setServicoValor(nome, v) {
    setServicosSel(prev => prev.map(s => s.nome === nome ? { ...s, valor: v } : s));
  }

  // Busca preços sugeridos assim que posto + combustível estão definidos
  useEffect(() => {
    if (!posto || !combustivel) return;

    setPrecoUnit('');
    setPrecoSugerido(null);
    setArlaPreco('');
    setArlaPrecoSugerido(null);

    // 1. Tenta extrair preço diretamente do objeto posto (ex.: posto.precos[])
    function aplicarDoObjeto() {
      if (Array.isArray(posto.precos)) {
        const found = posto.precos.find(p => p.combustivel === combustivel);
        if (found?.preco) {
          const f = String(found.preco).replace('.', ',');
          setPrecoSugerido(f);
          setPrecoUnit(f);
        }
        const arla = posto.precos.find(p => /arla/i.test(p.combustivel));
        if (arla?.preco) {
          const f = String(arla.preco).replace('.', ',');
          setArlaPrecoSugerido(f);
          setArlaPreco(f);
        }
        return !!(found?.preco);
      }
      return false;
    }

    const encontrouLocal = aplicarDoObjeto();

    // 2. Chama endpoint dedicado (substitui dados locais se retornar algo)
    setLoadingPreco(true);
    api.getPreco(posto.cnpj || posto.id, combustivel)
      .then(r => {
        if (r.preco) {
          const f = String(r.preco).replace('.', ',');
          setPrecoSugerido(f);
          setPrecoUnit(f);
        }
        if (r.arla_preco) {
          const f = String(r.arla_preco).replace('.', ',');
          setArlaPrecoSugerido(f);
          setArlaPreco(f);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPreco(false));
  }, [posto?.cnpj, posto?.id, combustivel]);

  // Pesquisa postos
  const [busca, setBusca]           = useState('');
  const [buscaCnpj, setBuscaCnpj]   = useState('');
  const [buscaCidade, setBuscaCidade] = useState('');
  const [buscaUF, setBuscaUF]       = useState('');

  // Validação
  const [validando, setValidando]           = useState(false);
  const [modalAvisos, setModalAvisos]       = useState(false);
  const [avisos, setAvisos]                 = useState([]);
  const [avisosBloqueado, setAvisosBloqueado] = useState(false);
  const [pendingStep, setPendingStep]       = useState(null);

  const [showVeicModal, setShowVeicModal] = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    api.getVeiculos()
      .then(v => setVeiculos(v || []))
      .catch(() => setVeiculos([]))
      .finally(() => setLoadingVeics(false));
  }, []);

  useEffect(() => {
    if (step === 1 && postos.length === 0) {
      setLoadingPostos(true);
      api.getPostos()
        .then(p => setPostos(p || []))
        .catch(() => setPostos([]))
        .finally(() => setLoadingPostos(false));
    }
  }, [step]);

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

  function limparBusca() { setBusca(''); setBuscaCnpj(''); setBuscaCidade(''); setBuscaUF(''); }

  function buildPayload(targetStep) {
    const v  = parseFloat(volume.replace(',', '.')) || 0;
    const p  = parseFloat(precoUnit.replace(',', '.')) || 0;
    const av = arlaAtivo ? (parseFloat(arlaVolume.replace(',', '.')) || 0) : 0;
    const ap = arlaAtivo ? (parseFloat(arlaPreco.replace(',', '.'))  || 0) : 0;
    const arlaTotal = parseFloat((av * ap).toFixed(2));
    const svcsTotal = servicosSel.reduce(
      (sum, s) => sum + (parseFloat((s.valor || '0').replace(',', '.')) || 0), 0);
    return {
      etapa:         ETAPAS[targetStep] || '',
      placa:         placa.trim().toUpperCase(),
      posto:         posto?.razao || '',
      cnpjPosto:     posto?.cnpj  || '',
      combustivel,
      hodometro:     parseFloat(hodometro.replace(',', '.')) || 0,
      volume:        v,
      precoUnitario: p,
      arla32Volume:  av,
      arla32Preco:   ap,
      arla32Total:   arlaTotal,
      valorTotal:    parseFloat((v * p + arlaTotal + svcsTotal).toFixed(2)),
      servicosAbast: servicosSel.map(s => ({
        nome:  s.nome,
        valor: parseFloat((s.valor || '0').replace(',', '.')) || 0,
      })),
    };
  }

  function validateLocal() {
    if (step === 0 && !placa.trim()) return 'Selecione ou digite a placa do veículo.';
    if (step === 1 && !posto)        return 'Selecione um posto para continuar.';
    if (step === 2 && !combustivel)  return 'Selecione o tipo de combustível.';
    if (step === 3) {
      const h = parseFloat(hodometro.replace(',', '.'));
      if (!hodometro || isNaN(h) || h <= 0) return 'Informe o hodômetro atual em km.';
      if (veiculoSel?.hodometro > 0 && h <= veiculoSel.hodometro)
        return `O hodômetro deve ser maior que o último registrado (${formatNumero(veiculoSel.hodometro, 0)} km).`;
    }
    if (step === 4) {
      const v = parseFloat(volume.replace(',', '.'));
      const p = parseFloat(precoUnit.replace(',', '.'));
      if (!volume || isNaN(v) || v <= 0)    return 'Informe a quantidade em litros.';
      if (!precoUnit || isNaN(p) || p <= 0) return 'Informe o preço por litro.';
      if (arlaAtivo) {
        const av = parseFloat(arlaVolume.replace(',', '.'));
        const ap = parseFloat(arlaPreco.replace(',', '.'));
        if (!arlaVolume || isNaN(av) || av <= 0) return 'Informe a quantidade de Arla 32 em litros.';
        if (!arlaPreco  || isNaN(ap) || ap <= 0) return 'Informe o preço por litro do Arla 32.';
      }
    }
    return null;
  }

  async function handleNext() {
    setError('');
    const localErr = validateLocal();
    if (localErr) { setError(localErr); return; }

    if (step === STEPS.length - 1) {
      // Último passo → ir para resumo
      const v  = parseFloat(volume.replace(',', '.'));
      const p  = parseFloat(precoUnit.replace(',', '.'));
      const av = arlaAtivo ? (parseFloat(arlaVolume.replace(',', '.')) || 0) : 0;
      const ap = arlaAtivo ? (parseFloat(arlaPreco.replace(',', '.'))  || 0) : 0;
      const arlaTotal  = parseFloat((av * ap).toFixed(2));
      const svcsTotal  = servicosSel.reduce(
        (sum, s) => sum + (parseFloat((s.valor || '0').replace(',', '.')) || 0), 0);
      const servicosAbast = servicosSel.map(s => ({
        nome:  s.nome,
        valor: parseFloat((s.valor || '0').replace(',', '.')) || 0,
      }));
      navigation.navigate('Summary', {
        placa:         placa.trim().toUpperCase(),
        posto:         posto?.razao    || '',
        cnpjPosto:     posto?.cnpj     || '',
        cidadePosto:   posto?.cidade   || '',
        ufPosto:       posto?.uf       || '',
        bandeiraPosto: posto?.bandeira || '',
        combustivel,
        hodometro:     parseFloat(hodometro.replace(',', '.')),
        volume:        v,
        precoUnitario: p,
        arla32Volume:  av,
        arla32Preco:   ap,
        arla32Total:   arlaTotal,
        servicosAbast,
        valorTotal:    parseFloat((v * p + arlaTotal + svcsTotal).toFixed(2)),
      });
      return;
    }

    // Chama validação da etapa atual
    setValidando(true);
    try {
      const res = await api.validarPasso(buildPayload(step));
      const lista = res.avisos || [];
      const temAvisoReal = lista.some(a => a.tipo === 'error' || a.tipo === 'warning');

      if (lista.length > 0 && temAvisoReal) {
        setAvisos(lista);
        setAvisosBloqueado(res.bloqueado);
        setPendingStep(step + 1);
        setModalAvisos(true);
      } else {
        setStep(s => s + 1);
      }
    } catch (e) {
      // Se validação falhar, deixa prosseguir (não bloqueia por erro de rede)
      setStep(s => s + 1);
    } finally {
      setValidando(false);
    }
  }

  function handleProsseguirComAvisos() {
    setModalAvisos(false);
    if (!avisosBloqueado && pendingStep !== null) {
      setStep(pendingStep);
    }
    setPendingStep(null);
    setAvisos([]);
  }

  const veiculoSel = veiculos.find(v => v.placa === placa);
  const erros    = avisos.filter(a => a.tipo === 'error');
  const warnings = avisos.filter(a => a.tipo === 'warning');
  const infos    = avisos.filter(a => a.tipo === 'info');

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
            <View style={[styles.stepDot, i < step && styles.stepDone, i === step && styles.stepActive]}>
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
                : veiculos.length > 0 && (
                  <TouchableOpacity style={styles.selectBox} onPress={() => setShowVeicModal(true)}>
                    <Text style={placa ? styles.selectVal : styles.selectPlaceholder}>
                      {placa ? `${placa}${veiculoSel ? ` – ${veiculoSel.modelo || ''}` : ''}` : 'Selecionar veículo da frota...'}
                    </Text>
                    <Text style={styles.selectArrow}>▼</Text>
                  </TouchableOpacity>
                )
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
              {posto ? (
                <View style={styles.postoSelecionado}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postoSelNome}>{posto.razao}</Text>
                    <Text style={styles.postoSelInfo}>{[posto.bandeira, posto.cidade, posto.uf].filter(Boolean).join(' · ')}</Text>
                    {posto.cnpj ? <Text style={styles.postoSelCnpj}>CNPJ: {posto.cnpj}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { setPosto(null); limparBusca(); }}>
                    <Text style={styles.postoSelTrocar}>Trocar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.searchGrid}>
                    <View style={[styles.searchField, { flex: 2 }]}>
                      <Text style={styles.searchLabel}>Nome / Razão Social</Text>
                      <TextInput style={styles.searchInput} value={busca} onChangeText={v => { setBusca(v); setError(''); }}
                        placeholder="Ex: Posto Ipiranga" placeholderTextColor={COLORS.textMuted} />
                    </View>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>UF</Text>
                      <TextInput style={styles.searchInput} value={buscaUF} onChangeText={v => setBuscaUF(v.toUpperCase().slice(0, 2))}
                        placeholder="SC" placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" maxLength={2} />
                    </View>
                  </View>
                  <View style={styles.searchGrid}>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>Cidade</Text>
                      <TextInput style={styles.searchInput} value={buscaCidade} onChangeText={setBuscaCidade}
                        placeholder="Ex: Florianópolis" placeholderTextColor={COLORS.textMuted} />
                    </View>
                    <View style={[styles.searchField, { flex: 1 }]}>
                      <Text style={styles.searchLabel}>CNPJ</Text>
                      <TextInput style={styles.searchInput} value={buscaCnpj} onChangeText={v => setBuscaCnpj(v.replace(/\D/g, ''))}
                        placeholder="Somente números" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                    </View>
                  </View>
                  {(busca || buscaCnpj || buscaCidade || buscaUF) && (
                    <TouchableOpacity style={styles.limparBtn} onPress={limparBusca}>
                      <Text style={styles.limparText}>✕ Limpar filtros</Text>
                    </TouchableOpacity>
                  )}
                  {loadingPostos
                    ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                    : postos.length === 0
                      ? <View style={styles.emptyBox}><Text style={styles.emptyText}>Nenhum posto cadastrado.</Text></View>
                      : postosFiltrados.length === 0
                        ? <View style={styles.emptyBox}><Text style={styles.emptyText}>Nenhum posto encontrado com esses filtros.</Text></View>
                        : (
                          <View style={styles.postoLista}>
                            <Text style={styles.postoListaHeader}>{postosFiltrados.length} posto{postosFiltrados.length !== 1 ? 's' : ''} encontrado{postosFiltrados.length !== 1 ? 's' : ''}</Text>
                            {postosFiltrados.map((p, i) => (
                              <TouchableOpacity key={p.id || i} style={styles.postoItem} onPress={() => { setPosto(p); setError(''); }} activeOpacity={0.75}>
                                <View style={styles.postoItemIcon}><Text style={styles.postoItemIconText}>⛽</Text></View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.postoItemNome}>{p.razao}</Text>
                                  <Text style={styles.postoItemInfo}>{[p.bandeira, p.cidade, p.uf].filter(Boolean).join(' · ')}</Text>
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
                  <TouchableOpacity key={c} style={[styles.combItem, combustivel === c && styles.combItemSel]}
                    onPress={() => { setCombustivel(c); setError(''); }}>
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
              <Text style={styles.stepDesc}>Informe a leitura atual do hodômetro do veículo.</Text>

              {veiculoSel?.hodometro > 0 ? (
                <View style={styles.hodoInfoCard}>
                  <View style={styles.hodoInfoRow}>
                    <Text style={styles.hodoInfoIcon}>📍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hodoInfoLabel}>Último abastecimento registrado</Text>
                      <Text style={styles.hodoInfoValue}>{formatNumero(veiculoSel.hodometro, 0)} km</Text>
                      <Text style={styles.hodoInfoSub}>O novo hodômetro deve ser maior que este valor.</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <Text style={styles.label}>Hodômetro atual (km)</Text>
              <TextInput
                style={styles.inputLarge}
                value={hodometro}
                onChangeText={v => { setHodometro(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder={veiculoSel?.hodometro > 0 ? `Acima de ${formatNumero(veiculoSel.hodometro, 0)}` : 'Ex: 45000'}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          )}

          {/* ── Step 4: Volume ── */}
          {step === 4 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🧪 Volume e valor</Text>
              <Text style={styles.stepDesc}>Informe a quantidade em litros e o preço por litro.</Text>
              <Text style={styles.label}>Litros a abastecer</Text>
              <TextInput style={styles.inputLarge} value={volume}
                onChangeText={v => { setVolume(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder="Ex: 50" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" autoFocus />
              <View style={styles.precoLabelRow}>
                <Text style={[styles.label, { marginTop: 16, marginBottom: 0 }]}>Preço por litro (R$)</Text>
                {loadingPreco && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 14 }} />}
                {!loadingPreco && precoSugerido && precoUnit === precoSugerido && (
                  <View style={styles.precoSugeridoBadge}>
                    <Text style={styles.precoSugeridoText}>⚡ Sugerido pelo posto</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.inputLarge, precoSugerido && precoUnit === precoSugerido && styles.inputSugerido]}
                value={precoUnit}
                onChangeText={v => { setPrecoUnit(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                placeholder={loadingPreco ? 'Buscando preço...' : 'Ex: 5,79'}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              {/* ── Arla 32 (somente Diesel — abre automaticamente) ── */}
              {isDiesel && (
                <View style={styles.arlaWrap}>
                  <View style={styles.arlaHeader}>
                    <Text style={styles.arlaHeaderIcon}>🔵</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.arlaToggleLabel}>Arla 32</Text>
                      <Text style={styles.arlaToggleSub}>Aditivo para motores SCR — preencha volume e preço</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.arlaCheckbox, arlaAtivo && styles.arlaCheckboxOn]}
                      onPress={() => { setArlaAtivo(a => !a); if (arlaAtivo) { setArlaVolume(''); setArlaPreco(''); setArlaPrecoSugerido(null); } }}
                      activeOpacity={0.8}
                    >
                      {arlaAtivo && <Text style={styles.arlaCheckMark}>✓</Text>}
                    </TouchableOpacity>
                  </View>

                  {arlaAtivo && (
                    <View style={styles.arlaFields}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Litros de Arla 32</Text>
                        <TextInput style={styles.inputLarge} value={arlaVolume}
                          onChangeText={v => { setArlaVolume(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                          placeholder="Ex: 5" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.arlaPrecoLabelRow}>
                          <Text style={styles.label}>Preço / litro (R$)</Text>
                          {loadingPreco && <ActivityIndicator size="small" color={COLORS.primary} />}
                          {!loadingPreco && arlaPrecoSugerido && arlaPreco === arlaPrecoSugerido && (
                            <View style={styles.precoSugeridoBadge}>
                              <Text style={styles.precoSugeridoText}>⚡ Sugerido</Text>
                            </View>
                          )}
                        </View>
                        <TextInput
                          style={[styles.inputLarge, arlaPrecoSugerido && arlaPreco === arlaPrecoSugerido && styles.inputSugerido]}
                          value={arlaPreco}
                          onChangeText={v => { setArlaPreco(v.replace(/[^0-9,.]/g, '')); setError(''); }}
                          placeholder={loadingPreco ? 'Buscando...' : 'Ex: 4,50'}
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Preview total */}
              {(() => {
                const v  = parseFloat(volume.replace(',','.'))   || 0;
                const p  = parseFloat(precoUnit.replace(',','.')) || 0;
                const av = arlaAtivo ? (parseFloat(arlaVolume.replace(',','.')) || 0) : 0;
                const ap = arlaAtivo ? (parseFloat(arlaPreco.replace(',','.'))  || 0) : 0;
                const combTotal = v * p;
                const arlaTotal = av * ap;
                const total = combTotal + arlaTotal;
                if (total <= 0) return null;
                return (
                  <View style={styles.previewBox}>
                    {combTotal > 0 && (
                      <Text style={styles.previewLine}>
                        {combustivel}: {v.toFixed(2)} L × R$ {p.toFixed(2)} = R$ {combTotal.toFixed(2).replace('.',',')}
                      </Text>
                    )}
                    {arlaTotal > 0 && (
                      <Text style={styles.previewLine}>
                        Arla 32: {av.toFixed(2)} L × R$ {ap.toFixed(2)} = R$ {arlaTotal.toFixed(2).replace('.',',')}
                      </Text>
                    )}
                    <Text style={styles.previewLabel}>VALOR TOTAL ESTIMADO</Text>
                    <Text style={styles.previewValue}>
                      R$ {total.toFixed(2).replace('.',',')}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ── Step 5: Serviços ── */}
          {step === 5 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>🛠️ Serviços</Text>
              <Text style={styles.stepDesc}>Selecione os serviços utilizados neste posto (opcional).</Text>

              {loadingServicos ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
              ) : servicosDisponiveis.length === 0 ? (
                <View style={styles.svcEmpty}>
                  <Text style={styles.svcEmptyIcon}>🏪</Text>
                  <Text style={styles.svcEmptyText}>Nenhum serviço cadastrado para este posto.</Text>
                </View>
              ) : (
                servicosDisponiveis.map(svc => {
                  const sel     = servicosSel.find(s => s.nome === svc.nome);
                  const isSel   = !!sel;
                  const bloq    = !svc.permitido;
                  return (
                    <View key={svc.nome} style={[styles.svcItem, bloq && styles.svcItemBloq, isSel && styles.svcItemSel]}>
                      <TouchableOpacity
                        style={styles.svcRow}
                        onPress={() => !bloq && toggleServico(svc.nome)}
                        activeOpacity={bloq ? 1 : 0.7}
                        disabled={bloq}
                      >
                        <View style={[styles.svcCheckbox, isSel && styles.svcCheckboxOn, bloq && styles.svcCheckboxBloq]}>
                          {isSel && <Text style={styles.svcCheck}>✓</Text>}
                          {bloq  && <Text style={styles.svcBloqMark}>✕</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.svcNome, bloq && styles.svcNomeBloq]}>
                            {getSvcEmoji(svc.nome)}  {svc.nome}
                          </Text>
                          {bloq && (
                            <Text style={styles.svcBloqMotivo}>{svc.motivo_bloqueio || 'Não autorizado'}</Text>
                          )}
                          {!bloq && svc.valor_max != null && (
                            <Text style={styles.svcCap}>Limite: R$ {svc.valor_max.toFixed(2).replace('.', ',')}</Text>
                          )}
                        </View>
                        {bloq && <Text style={{ fontSize: 16 }}>🚫</Text>}
                      </TouchableOpacity>

                      {isSel && (
                        <View style={styles.svcValorRow}>
                          <Text style={styles.svcValorLabel}>Valor cobrado (R$)</Text>
                          <TextInput
                            style={[styles.inputLarge, styles.svcValorInput]}
                            value={sel.valor}
                            onChangeText={v => setServicoValor(svc.nome, v.replace(/[^0-9,.]/g, ''))}
                            placeholder="0,00"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                          />
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {servicosSel.length > 0 && (
                <View style={styles.svcTotalBox}>
                  <Text style={styles.svcTotalLabel}>Total serviços</Text>
                  <Text style={styles.svcTotalValue}>
                    R$ {servicosSel.reduce((s, x) => s + (parseFloat((x.valor||'0').replace(',','.')) || 0), 0).toFixed(2).replace('.',',')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {error ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>⚠ {error}</Text></View>
          ) : null}

          <TouchableOpacity
            style={[styles.nextBtn, validando && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={validando}
            activeOpacity={0.88}
          >
            <LinearGradient colors={['#0F2D6B', '#1E4DB7']} style={styles.nextGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {validando
                ? <><ActivityIndicator color="#fff" size="small" /><Text style={[styles.nextText, { marginLeft: 10 }]}>Verificando...</Text></>
                : <Text style={styles.nextText}>{step === STEPS.length - 1 ? 'Ver resumo →' : 'Próximo →'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal de Validação ── */}
      <Modal visible={modalAvisos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.validModal}>
            <View style={[styles.validHeader, { backgroundColor: avisosBloqueado ? '#FEF2F2' : '#FFFBEB' }]}>
              <Text style={styles.validHeaderIcon}>{avisosBloqueado ? '🚫' : '⚠️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.validHeaderTitle, { color: avisosBloqueado ? '#991B1B' : '#92400E' }]}>
                  {avisosBloqueado ? 'Abastecimento bloqueado' : 'Atenção — verifique antes de prosseguir'}
                </Text>
                <Text style={[styles.validHeaderSub, { color: avisosBloqueado ? '#7F1D1D' : '#78350F' }]}>
                  {avisosBloqueado
                    ? 'Corrija os problemas abaixo para continuar.'
                    : 'Você pode prosseguir, mas fique atento aos avisos.'}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.validScroll} contentContainerStyle={{ padding: 16 }}>
              {erros.length > 0 && (
                <>
                  <Text style={styles.validSectionTitle}>Bloqueios</Text>
                  {erros.map((a, i) => <AvisoItem key={i} aviso={a} />)}
                </>
              )}
              {warnings.length > 0 && (
                <>
                  <Text style={styles.validSectionTitle}>Avisos</Text>
                  {warnings.map((a, i) => <AvisoItem key={i} aviso={a} />)}
                </>
              )}
              {infos.length > 0 && (
                <>
                  <Text style={styles.validSectionTitle}>Informações</Text>
                  {infos.map((a, i) => <AvisoItem key={i} aviso={a} />)}
                </>
              )}
            </ScrollView>

            <View style={styles.validFooter}>
              {avisosBloqueado ? (
                <TouchableOpacity style={styles.validBtnBlock} onPress={() => { setModalAvisos(false); setAvisos([]); }}>
                  <Text style={styles.validBtnBlockText}>← Voltar e corrigir</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.validBtnRow}>
                  <TouchableOpacity style={styles.validBtnBack} onPress={() => { setModalAvisos(false); setAvisos([]); }}>
                    <Text style={styles.validBtnBackText}>← Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.validBtnOk} onPress={handleProsseguirComAvisos}>
                    <Text style={styles.validBtnOkText}>Entendido, prosseguir →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
                  onPress={() => { setPlaca(item.placa); setCombustivel(item.combustivel_especificado || ''); setShowVeicModal(false); }}
                >
                  <Text style={styles.modalPlaca}>{item.placa}</Text>
                  <Text style={styles.modalModelo}>{item.marca} {item.modelo}</Text>
                  {item.combustivel_especificado ? <Text style={styles.modalComb}>{item.combustivel_especificado}</Text> : null}
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

function getSvcEmoji(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('lavagem'))       return '🚿';
  if (n.includes('lubrifica'))     return '🔧';
  if (n.includes('restaurante'))   return '🍽️';
  if (n.includes('banheiro'))      return '🚻';
  if (n.includes('hotel') || n.includes('pousada')) return '🛏️';
  if (n.includes('estaciona'))     return '🅿️';
  if (n.includes('seguran'))       return '🛡️';
  if (n.includes('internet') || n.includes('wi-fi') || n.includes('wifi')) return '📶';
  return '🛠️';
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerBack:  { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  progressWrap: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, backgroundColor: COLORS.card, gap: 0,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stepItem:        { alignItems: 'center', flex: 1 },
  stepDot:         { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  stepDone:        { backgroundColor: COLORS.success },
  stepActive:      { backgroundColor: COLORS.primary, transform: [{ scale: 1.1 }] },
  stepCheck:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepNum:         { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  stepNumActive:   { color: '#fff' },
  stepLabel:       { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  stepLabelActive: { color: COLORS.primary, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  stepCard:  { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  stepDesc:  { fontSize: 14, color: COLORS.textSecondary, marginBottom: 18, lineHeight: 20 },

  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input:     { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, color: COLORS.textPrimary, backgroundColor: COLORS.bg },
  inputLarge:{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 16, fontSize: 28, color: COLORS.textPrimary, backgroundColor: COLORS.bg, textAlign: 'center', fontWeight: '700' },
  precoLabelRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6, gap: 8 },
  precoSugeridoBadge:  { backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#6EE7B7', marginTop: 14 },
  precoSugeridoText:   { fontSize: 11, fontWeight: '700', color: '#065F46' },
  inputSugerido:       { borderColor: '#34D399', backgroundColor: '#F0FDF4' },

  hodoInfoCard:  { backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1.5, borderColor: '#BFDBFE', padding: 14, marginBottom: 18 },
  hodoInfoRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  hodoInfoIcon:  { fontSize: 20, marginTop: 2 },
  hodoInfoLabel: { fontSize: 12, fontWeight: '600', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  hodoInfoValue: { fontSize: 26, fontWeight: '800', color: '#1E3A8A', lineHeight: 32 },
  hodoInfoSub:   { fontSize: 12, color: '#3B82F6', marginTop: 3, lineHeight: 16 },

  selectBox:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#EEF2FF' },
  selectVal:         { fontSize: 15, fontWeight: '600', color: COLORS.primary, flex: 1 },
  selectPlaceholder: { fontSize: 15, color: COLORS.textMuted, flex: 1 },
  selectArrow:       { fontSize: 12, color: COLORS.primary },
  veicInfo:          { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  veicInfoText:      { fontSize: 13, color: '#166534', marginBottom: 3 },

  postoSelecionado: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#16A34A', gap: 10 },
  postoSelNome:     { fontSize: 15, fontWeight: '700', color: '#166534' },
  postoSelInfo:     { fontSize: 13, color: '#166534', opacity: 0.8, marginTop: 2 },
  postoSelCnpj:     { fontSize: 11, color: '#166534', opacity: 0.6, marginTop: 2 },
  postoSelTrocar:   { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  searchGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchField: {},
  searchLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  searchInput: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.bg },
  limparBtn:   { alignSelf: 'flex-end', marginBottom: 10 },
  limparText:  { fontSize: 13, color: COLORS.danger, fontWeight: '500' },
  emptyBox:    { alignItems: 'center', paddingVertical: 24 },
  emptyText:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  postoLista:       { marginTop: 4 },
  postoListaHeader: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, fontWeight: '500' },
  postoItem:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  postoItemIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  postoItemIconText:{ fontSize: 18 },
  postoItemNome:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  postoItemInfo:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  postoItemCnpj:    { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  postoItemArrow:   { fontSize: 20, color: COLORS.primary, fontWeight: '700' },

  combGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  combItem:    { width: '47%', paddingVertical: 16, paddingHorizontal: 8, backgroundColor: COLORS.bg, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 6 },
  combItemSel: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  combEmoji:   { fontSize: 24 },
  combLabel:   { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  combLabelSel:{ color: COLORS.primary },

  previewBox:   { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  previewLine:  { fontSize: 12, color: '#166534', marginBottom: 4 },
  previewLabel: { fontSize: 12, color: '#166534', fontWeight: '700', marginBottom: 4, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewValue: { fontSize: 28, fontWeight: '800', color: '#16A34A' },

  arlaWrap:          { marginTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  arlaHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  arlaToggle:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  arlaCheckbox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  arlaCheckboxOn:    { borderColor: '#0F2D6B', backgroundColor: '#0F2D6B' },
  arlaCheckMark:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  arlaHeaderIcon:    { fontSize: 22 },
  arlaToggleLabel:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  arlaToggleSub:     { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  arlaFields:        { flexDirection: 'row', gap: 12, marginTop: 14 },
  arlaPrecoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },

  // Serviços
  svcEmpty:        { alignItems: 'center', paddingVertical: 28 },
  svcEmptyIcon:    { fontSize: 32, marginBottom: 8 },
  svcEmptyText:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  svcItem:         { borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden', backgroundColor: COLORS.card },
  svcItemSel:      { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  svcItemBloq:     { borderColor: '#FECACA', backgroundColor: '#FEF2F2', opacity: 0.75 },

  svcRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },

  svcCheckbox:     { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  svcCheckboxOn:   { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  svcCheckboxBloq: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  svcCheck:        { color: '#fff', fontSize: 13, fontWeight: '700' },
  svcBloqMark:     { color: '#DC2626', fontSize: 11, fontWeight: '700' },

  svcNome:         { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  svcNomeBloq:     { color: '#DC2626' },
  svcBloqMotivo:   { fontSize: 12, color: '#DC2626', marginTop: 2 },
  svcCap:          { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },

  svcValorRow:     { paddingHorizontal: 14, paddingBottom: 14 },
  svcValorLabel:   { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  svcValorInput:   { fontSize: 22, paddingVertical: 12 },

  svcTotalBox:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14 },
  svcTotalLabel:   { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  svcTotalValue:   { fontSize: 20, fontWeight: '800', color: COLORS.primary },

  errorBox:  { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.danger, fontSize: 14, fontWeight: '500' },

  nextBtn:         { borderRadius: 14, overflow: 'hidden', marginBottom: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  nextBtnDisabled: { opacity: 0.75 },
  nextGradient:    { paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  nextText:        { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Modal de validação
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  validModal:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden' },
  validHeader:  { flexDirection: 'row', alignItems: 'flex-start', padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  validHeaderIcon:  { fontSize: 28, marginTop: 2 },
  validHeaderTitle: { fontSize: 17, fontWeight: '800', lineHeight: 22 },
  validHeaderSub:   { fontSize: 13, marginTop: 3, lineHeight: 18 },
  validScroll:  { maxHeight: 380 },
  validSectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  validFooter:  { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  validBtnBlock:    { backgroundColor: COLORS.danger, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  validBtnBlockText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  validBtnRow:      { flexDirection: 'row', gap: 10 },
  validBtnBack:     { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  validBtnBackText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  validBtnOk:       { flex: 2, backgroundColor: COLORS.warning, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  validBtnOkText:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal veículo
  modalCard:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  modalItem:      { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemSel:   { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 8 },
  modalPlaca:     { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  modalModelo:    { fontSize: 14, color: COLORS.textSecondary },
  modalComb:      { fontSize: 12, color: COLORS.textMuted },
  modalClose:     { marginTop: 16, backgroundColor: COLORS.bg, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});

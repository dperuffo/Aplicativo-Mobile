import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from './config';

const TOKEN_KEY = 'mobile_token';

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body = null) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer mobile:${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status  = res.status;
    err.data    = data;
    err.bloqueado = data.bloqueado || false;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  checkCPF: (cpf) =>
    request('POST', '/api/mobile/auth/login', { cpf }),

  setPassword: (cpf, senha) =>
    request('POST', '/api/mobile/auth/set-password', { cpf, senha }),

  authenticate: (cpf, senha) =>
    request('POST', '/api/mobile/auth/authenticate', { cpf, senha }),

  logout: () =>
    request('POST', '/api/mobile/auth/logout'),

  // Home
  getHome: () =>
    request('GET', '/api/mobile/home'),

  // Dados
  getVeiculos: () =>
    request('GET', '/api/mobile/veiculos'),

  getPostos: () =>
    request('GET', '/api/mobile/postos'),

  // Token TOTP
  getToken: (codigo) =>
    request('GET', `/api/mobile/token/${codigo}`),

  // Validação por etapa
  validarPasso: (dados) =>
    request('POST', '/api/mobile/validar-passo', dados),

  // Preço sugerido por posto + combustível
  getPreco: (cnpjPosto, combustivel) =>
    request('GET', `/api/mobile/preco-combustivel?cnpj=${encodeURIComponent(cnpjPosto)}&combustivel=${encodeURIComponent(combustivel)}`),

  // Abastecimento
  solicitarAbastecimento: (dados) =>
    request('POST', '/api/mobile/abastecimento/solicitar', dados),

  concluirAbastecimento: (codigo, avaliacao, comentario) =>
    request('POST', '/api/mobile/abastecimento/concluir', { codigo, avaliacao, comentario }),
};

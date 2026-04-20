export function formatCPF(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

export function rawCPF(value) {
  return value.replace(/\D/g, '');
}

export function validateCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

export function formatMoeda(value) {
  const n = parseFloat(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumero(value, decimais = 0) {
  const n = parseFloat(value) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

export function formatPlaca(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export function formatCodigo(codigo) {
  const s = String(codigo).padStart(6, '0');
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

export function maskCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length < 11) return cpf;
  return `***.***.${d.slice(6,9)}-${d.slice(9)}`;
}

export function primeiroNome(nome) {
  return (nome || '').split(' ')[0];
}

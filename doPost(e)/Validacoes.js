/** Normalização e regras de dados recebidos. */
function normalizarColaboradores_(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') throw new Error('Payload inválido.');
  if (Array.isArray(payload.colaboradores)) return payload.colaboradores;
  if (payload.colaboradores && typeof payload.colaboradores === 'object') return [payload.colaboradores];
  if (payload.cpf || payload.CPF) return [payload];
  throw new Error('Informe "colaboradores" ou um colaborador com CPF.');
}

function mesclarDados_(base, incoming) {
  const result = Object.assign({}, base || {});
  Object.keys(incoming || {}).forEach(key => {
    const value = incoming[key];
    if (value === '' && typeof result[key] === 'string' && result[key] !== '') return;
    if (value && typeof value === 'object' && !Array.isArray(value)) result[key] = mesclarDados_(result[key], value);
    else result[key] = value;
  });
  return result;
}

function normalizarCpf_(value) {
  if (value === undefined || value === null) return null;
  let cpf = String(value).replace(/\D/g, '');
  if (cpf.length > 0 && cpf.length < 11) cpf = ('00000000000' + cpf).slice(-11);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return null;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return null;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(cpf[10]) ? cpf : null;
}

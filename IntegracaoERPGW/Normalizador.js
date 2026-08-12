/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

function normalizarRegistrosERP(records, source) {
  if (!Array.isArray(records)) throw new Error('A carga deve conter uma lista de registros.');
  const mapping = _lerJsonConfig(ERP_CONFIG.fieldMappingJson, {});
  return records.map(function(record, index) {
    return normalizarColaboradorERP(record, mapping, source, index);
  });
}

function normalizarColaboradorERP(record, mapping, source, index) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Registro inválido na posição ' + index + '.');
  const result = {};
  COLABORADOR_FIELDS.forEach(function(field) {
    const mappedPath = mapping[field] || field;
    result[field] = _normalizarValorCampo(field, _obterCaminho(record, mappedPath));
  });

  result.cpf = String(result.cpf || '').replace(/\D/g, '');
  if (result.cpf.length !== 11) throw new Error('CPF inválido no registro ' + index + '.');
  result.nomeCompleto = String(result.nomeCompleto || '').trim();
  if (!result.nomeCompleto) throw new Error('nomeCompleto é obrigatório no registro ' + index + '.');
  _preencherNome(result);
  result.emailProfissional = String(result.emailProfissional || '').trim().toLowerCase();
  result.emailPessoal = String(result.emailPessoal || '').trim().toLowerCase();
  result.superiorImediato = String(result.superiorImediato || '').trim().toLowerCase();
  result.integracao = { source: String(source || 'erp').trim(), receivedAt: new Date().toISOString() };
  return result;
}

function _normalizarValorCampo(field, value) {
  if (value === null || typeof value === 'undefined') return '';
  if (field.indexOf('data') === 0) return _normalizarData(value);
  return typeof value === 'string' ? value.trim() : String(value);
}

function _normalizarData(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  return match[3] + '/' + match[2] + '/' + match[1];
}

function _preencherNome(record) {
  if (record.firstName && record.lastName) return;
  const parts = record.nomeCompleto.split(/\s+/);
  record.firstName = record.firstName || parts[0] || '';
  record.lastName = record.lastName || parts.slice(1).join(' ');
}

function _obterCaminho(object, path) {
  return String(path || '').split('.').reduce(function(value, key) {
    return value && typeof value === 'object' ? value[key] : undefined;
  }, object);
}

function _lerJsonConfig(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch (error) { throw new Error('Configuração JSON inválida.'); }
}

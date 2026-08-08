const GOOGLE_WORKSPACE_CONSTANTS = {
  DOMAIN: PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO') || 'example.com'
};

function _getCsvProperty(propName) {
  const raw = PropertiesService.getScriptProperties().getProperty(propName) || '';
  return Array.from(new Set(raw.split(',').map(function(value) {
    return String(value || '').trim();
  }).filter(function(value) {
    return value.length > 0;
  })));
}

const SUSPENDED_OU_PATH = PropertiesService.getScriptProperties().getProperty('SUSPENDED_OU_PATH');
const SITUACAO_DESLIGAMENTO = PropertiesService.getScriptProperties().getProperty('SITUACAO_DESLIGAMENTO');
const SITUACAO_OU_DEFAULT = PropertiesService.getScriptProperties().getProperty('SITUACAO_OU_DEFAULT');
const REQUIRED_SUSPENSION_OUS = _getCsvProperty('REQUIRED_SUSPENSION_OUS');

function _getJsonProperty(propName, fallback) {
  const raw = PropertiesService.getScriptProperties().getProperty(propName);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Propriedade ${propName} deve conter JSON válido.`);
  }
}

const SITUACAO_OU_MAP = _getJsonProperty('SITUACAO_OU_MAP', {});

// ==================== SITUAÇÕES DE COLABORADORES (HCM) ====================
function _parseSituacoesProperty(propName) {
  const raw = PropertiesService.getScriptProperties().getProperty(propName);
  const csv = (typeof raw === 'string') ? raw : '';
  return new Set(csv.split(',').map(function(s) { return String(s || '').trim(); }).filter(function(s) { return s.length > 0; }));
}

const SITUACOES = {
  AFASTAMENTO: _parseSituacoesProperty('SITUACOES_AFASTAMENTO'),
  SUSPENSAO: _parseSituacoesProperty('SITUACOES_SUSPENSAO'),
  REMOVER_LICENCAS: _parseSituacoesProperty('SITUACOES_REMOVER_LICENCAS')
};

const LICENCAS_GOOGLE_WORKSPACE = {
  CUSTOMER_ID: null,
  PRODUCT_IDS: ['Google-Apps']
};

const UOS_GENERICAS = _getCsvProperty('UOS_GENERICAS');

// Colaboradores em UOS_GENERICAS devem ser sempre mantidos ativos
const COMPORTAMENTO_UOS_GENERICAS = {
  MANTER_ATIVO: true,
  IGNORA_SUSPENSAO: true
};

const NOME_DOMINIO = GOOGLE_WORKSPACE_CONSTANTS.DOMAIN;

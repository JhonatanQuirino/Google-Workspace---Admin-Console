/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */



// Constantes globais para e-mails buscados nas propriedades do script
const EMAIL_ADMIN = PropertiesService.getScriptProperties().getProperty('EMAIL_ADMIN');
const CEP_EMAIL = PropertiesService.getScriptProperties().getProperty('CEP_EMAIL');
const ORGANIZATION_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ORGANIZACAO') || 'sua organização';

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

const FIREBASE_CONSTANTS = {
  DATABASE_URL: PropertiesService.getScriptProperties().getProperty('FIREBASE_DATABASE_URL'),
  TEST_NODE: '/_testesIntegracao/ultimoTeste',

  PATHS: {
    COLABORADORES: 'Colaboradores',
    MAPEAMENTO_UO: 'Mapeamento_UO',
  }
};


const GOOGLE_WORKSPACE_CONSTANTS = {
  DOMAIN: PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO') || 'example.com',

  IGNORED_OUS: _getCsvProperty('IGNORED_OUS'),

  RECOVERY_IGNORED_DOMAINS: _getCsvProperty('RECOVERY_IGNORED_DOMAINS')
};


const EMAIL_CONSTANTS = {
  SENDER: {
    NAME: PropertiesService.getScriptProperties().getProperty('NOME_REMETENTE'),
    EMAIL: EMAIL_ADMIN
  },

  RECIPIENTS: {
    INTEGRATION: PropertiesService.getScriptProperties().getProperty('INTEGRATION'),
    CRITICAL_ERROR: EMAIL_ADMIN,
    DIVERGENCE: PropertiesService.getScriptProperties().getProperty('EMAIL_DIVERGENCE'),
    WELCOME_CC: CEP_EMAIL,

    SECURITY: EMAIL_ADMIN,

    AUDIT_COPY: EMAIL_ADMIN,

    TEST_REPORTS: EMAIL_ADMIN
  },

  TEMPLATES: {
    SECURITY_REPORT: 'Email_RelatorioSeguranca.html',
    ONBOARDING_REPORT: 'Email_RelatorioOnboarding.html',
    WELCOME: 'Email_BoasVindas.html',
    WELCOME_REPORT: 'Email_RelatorioBoasVindas.html',
    BIRTHDAY: 'Email_Aniversario.html',
    COMPANY_TIME: 'Email_TempoEmpresa.html',
    AUDIT_EMAIL_MISMATCH: 'Email_Auditoria_DivergenciaEmails.html',
    AUDIT_RECOVERY_DATA: 'Email_Auditoria_DadosRecuperacao.html',
    AUDIT_2FA: 'Email_Auditoria_2FA.html',
    AUDIT_2FA_REPORT: 'Email_Relatorio_2FA_Líderes.html',
    AUDIT_2FA_REPORT_PDF: 'Relatorio_2FA_Líderes_PDF.html'
  }
};




const GITHUB_CONSTANTS = {


  TOKEN: PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN'),
  OWNER: PropertiesService.getScriptProperties().getProperty('GITHUB_OWNER'),
  REPO: PropertiesService.getScriptProperties().getProperty('GITHUB_REPO'),
  PATH: PropertiesService.getScriptProperties().getProperty('GITHUB_BACKUP_PATH'),
  COMMIT_MESSAGE: 'Backup Automático Firebase HCM - '
};

const SECURITY_CONSTANTS = {
  SOC_EMAIL: EMAIL_ADMIN,

  KPIS: {
    INACTIVITY_DAYS: 60,
    NO_LOGIN_DAYS: 7,
    LOG_WINDOW_HOURS: 24,
    VISUAL_LIMIT: 80,
    MAX_LOGIN_FAILURES: 5
  }
};


// ==================== SITUAÇÕES DE COLABORADORES (HCM) ====================

// Situações carregadas via propriedades do script (CSV). Mantém compatibilidade com o
// formato antigo em memória, convertendo para `Set` para uso pelo restante do código.
function _parseSituacoesProperty(propName) {
  const raw = PropertiesService.getScriptProperties().getProperty(propName);
  const csv = (typeof raw === 'string') ? raw : '';
  return new Set(csv.split(',').map(function(s) { return String(s || '').trim(); }).filter(function(s) { return s.length > 0; }));
}

const SITUACOES = {
  ATIVAS: _parseSituacoesProperty('SITUACOES_ATIVAS'),
  AFASTAMENTO: _parseSituacoesProperty('SITUACOES_AFASTAMENTO'),
  SUSPENSAO: _parseSituacoesProperty('SITUACOES_SUSPENSAO')
};

const UOS_GENERICAS = _getCsvProperty('UOS_GENERICAS');

// Colaboradores em UOS_GENERICAS devem ser sempre mantidos ativos
const COMPORTAMENTO_UOS_GENERICAS = {
  MANTER_ATIVO: true,  // Se true, colaboradores em UOS_GENERICAS são sempre ativados
  IGNORA_SUSPENSAO: true  // Se true, mesmo colaboradores suspensos serão ativados
};


const BUSINESS_CONSTANTS = {

  DEFAULT_INVALID_PHONE: '+5534999999999',


  BATCH_SIZE: 500,


  TEMP_BATCH_FILE: 'temp_hcm_batch_data.json'
};


const SYSTEM_CONSTANTS = {

  AGENT_VERSION: '2.0.0',


  WELCOME_VIDEO_ID: PropertiesService.getScriptProperties().getProperty('WELCOME_VIDEO_ID'),


  TIMEZONE: 'America/Sao_Paulo',


  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2
  },


  CACHE: {
    JWT_TTL: 3300,
    DEFAULT_TTL: 3600
  }
};


const API_KEYS = {


  SENIOR: '',
  MONITOR_IAGENTE: ''
};


const NOME_DOMINIO = GOOGLE_WORKSPACE_CONSTANTS.DOMAIN;
const EMAIL_DESTINATARIO = EMAIL_CONSTANTS.RECIPIENTS.INTEGRATION;
const EMAIL_ERRO_NOTIFICACAO = EMAIL_CONSTANTS.RECIPIENTS.CRITICAL_ERROR;
const DOMINIO_CORPORATIVO_RECUPERACAO = GOOGLE_WORKSPACE_CONSTANTS.RECOVERY_IGNORED_DOMAINS;
const TELEFONE_PADRAO_INVALIDO = BUSINESS_CONSTANTS.DEFAULT_INVALID_PHONE;
const LOTE_DE_PROCESSAMENTO = BUSINESS_CONSTANTS.BATCH_SIZE;
const NOME_ARQUIVO_LOTE = BUSINESS_CONSTANTS.TEMP_BATCH_FILE;
const EMAIL_RELATORIO_TESTES = EMAIL_CONSTANTS.RECIPIENTS.TEST_REPORTS;
const NOME_TESTE_FIREBASE_NODE = FIREBASE_CONSTANTS.TEST_NODE;
const ID_VIDEO_BOAS_VINDAS = SYSTEM_CONSTANTS.WELCOME_VIDEO_ID;
const NOME_REMETENTE = EMAIL_CONSTANTS.SENDER.NAME;
const EMAIL_REMETENTE = EMAIL_CONSTANTS.SENDER.EMAIL;
const UOS_IGNORADAS = GOOGLE_WORKSPACE_CONSTANTS.IGNORED_OUS;



const CONFIG = {
  dominioPadrao: GOOGLE_WORKSPACE_CONSTANTS.DOMAIN,
  emailNotificacao: EMAIL_CONSTANTS.RECIPIENTS.INTEGRATION,
  emailCopiaAuditoria: EMAIL_CONSTANTS.RECIPIENTS.AUDIT_COPY,
  emailErroCritico: EMAIL_CONSTANTS.RECIPIENTS.CRITICAL_ERROR,
  emailSeguranca: EMAIL_CONSTANTS.RECIPIENTS.SECURITY,
  dominioRecuperacaoIgnorado: GOOGLE_WORKSPACE_CONSTANTS.RECOVERY_IGNORED_DOMAINS,
  telefonePadraoInvalido: BUSINESS_CONSTANTS.DEFAULT_INVALID_PHONE
};



const CONFIG_GITHUB = {
  token: GITHUB_CONSTANTS.TOKEN,
  owner: GITHUB_CONSTANTS.OWNER,
  repo: GITHUB_CONSTANTS.REPO,
  path: GITHUB_CONSTANTS.PATH,
  commitMessage: GITHUB_CONSTANTS.COMMIT_MESSAGE
};

const CONFIG_SOC = {
  emailDestino: SECURITY_CONSTANTS.SOC_EMAIL,
  dominio: GOOGLE_WORKSPACE_CONSTANTS.DOMAIN,
  kpis: {
    diasInatividade: SECURITY_CONSTANTS.KPIS.INACTIVITY_DAYS,
    diasSemLogin: SECURITY_CONSTANTS.KPIS.NO_LOGIN_DAYS,
    janelaLogs: SECURITY_CONSTANTS.KPIS.LOG_WINDOW_HOURS,
    limiteVisual: SECURITY_CONSTANTS.KPIS.VISUAL_LIMIT,
    maxLoginFailures: SECURITY_CONSTANTS.KPIS.MAX_LOGIN_FAILURES
  }
};

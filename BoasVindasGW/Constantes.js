// Constantes globais para e-mails buscados nas propriedades do script
const EMAIL_ADMIN = PropertiesService.getScriptProperties().getProperty('EMAIL_ADMIN');
const CEP_EMAIL = PropertiesService.getScriptProperties().getProperty('CEP_EMAIL');
const EMAIL_GP = PropertiesService.getScriptProperties().getProperty('EMAIL_GP');

const ORGANIZATION_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ORGANIZACAO') || 'sua organização';
const ORGANIZATION_SENDER_NAME = PropertiesService.getScriptProperties().getProperty('NOME_REMETENTE') || 'Equipe de Boas-Vindas';
const ORGANIZATION_SIGNATURE_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ASSINATURA') || 'Equipe de Integração';
const ORGANIZATION_SIGNATURE_TITLE = PropertiesService.getScriptProperties().getProperty('TITULO_ASSINATURA') || 'Equipe de Acolhimento';
const ORGANIZATION_SUPPORT_EMAIL = PropertiesService.getScriptProperties().getProperty('EMAIL_SUPORTE') || CEP_EMAIL;
const ORGANIZATION_PORTAL_URL = PropertiesService.getScriptProperties().getProperty('URL_PORTAL_ONBOARDING') || 'https://example.com';
const ORGANIZATION_LOGO_URL = PropertiesService.getScriptProperties().getProperty('ORGANIZATION_LOGO_URL') || '';

function _getCsvProperty(propName) {
  const raw = PropertiesService.getScriptProperties().getProperty(propName) || '';
  return Array.from(new Set(raw.split(',').map(function(value) {
    return String(value || '').trim();
  }).filter(function(value) {
    return value.length > 0;
  })));
}

const GOOGLE_WORKSPACE_CONSTANTS = {
  DOMAIN: PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO') || 'example.com'
};

const EMAIL_CONSTANTS = {
  RECIPIENTS: {
    CRITICAL_ERROR: CEP_EMAIL,
    WELCOME_CC: CEP_EMAIL
  },
  TEMPLATES: {
    WELCOME: 'Email_BoasVindas.html',
    WELCOME_REPORT: 'Email_RelatorioBoasVindas.html'
  }
};

const UOS_GENERICAS = _getCsvProperty('UOS_GENERICAS');

const WELCOME_VIDEO_ID = PropertiesService.getScriptProperties().getProperty('WELCOME_VIDEO_ID');

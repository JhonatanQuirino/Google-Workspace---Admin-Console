// Minimal project constants — keep only what is used by the scripts
var EMAIL_ADMIN = PropertiesService.getScriptProperties().getProperty('EMAIL_ADMIN');
var CEP_EMAIL = PropertiesService.getScriptProperties().getProperty('CEP_EMAIL');
var GP_EMAIL = PropertiesService.getScriptProperties().getProperty('GP_EMAIL');
var INTEGRATION = PropertiesService.getScriptProperties().getProperty('INTEGRATION');
var NOME_DOMINIO = PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO');
var ORGANIZATION_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ORGANIZACAO') || 'sua organização';
var SITUACAO_ATIVA = PropertiesService.getScriptProperties().getProperty('SITUACAO_ATIVA');

var EMAIL_CONSTANTS = {
  SENDER: {
    NAME: 'Departamento de Tecnologia',
    EMAIL: EMAIL_ADMIN
  },

  RECIPIENTS: {
    INTEGRATION: INTEGRATION,
    CRITICAL_ERROR: EMAIL_ADMIN,
    TEST_REPORTS: EMAIL_ADMIN,
    WELCOME_CC: INTEGRATION
  },

  TEMPLATES: {
    USER_CREATION: 'Email_CriacaoUsuario.html'
  }
};

// Exported shorthands used across the codebase
var EMAIL_DESTINATARIO = EMAIL_CONSTANTS.RECIPIENTS.INTEGRATION;
var EMAIL_ERRO_NOTIFICACAO = EMAIL_CONSTANTS.RECIPIENTS.CRITICAL_ERROR;
var EMAIL_RELATORIO_TESTES = EMAIL_CONSTANTS.RECIPIENTS.TEST_REPORTS;
var NOME_REMETENTE = EMAIL_CONSTANTS.SENDER.NAME;
var EMAIL_REMETENTE = EMAIL_CONSTANTS.SENDER.EMAIL;
var EMAILS_EM_COPIA = EMAIL_CONSTANTS.RECIPIENTS.WELCOME_CC;

var CONFIG = {
  dominioPadrao: NOME_DOMINIO,
  emailNotificacao: EMAIL_DESTINATARIO,
  emailErroCritico: EMAIL_ERRO_NOTIFICACAO
};

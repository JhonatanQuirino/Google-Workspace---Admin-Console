// Constantes mínimas para este projeto
const EMAIL_ADMIN = PropertiesService.getScriptProperties().getProperty('EMAIL_ADMIN');
const EMAIL_COMUNICACAO = PropertiesService.getScriptProperties().getProperty('EMAIL_COMUNICACAO');
const ORGANIZATION_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ORGANIZACAO') || 'sua organização';
const ORGANIZATION_SENDER_NAME = PropertiesService.getScriptProperties().getProperty('NOME_REMETENTE') || 'Equipe de Comunicação';
const ORGANIZATION_SIGNATURE_NAME = PropertiesService.getScriptProperties().getProperty('NOME_ASSINATURA') || 'Equipe de Comunicação';
const ORGANIZATION_SIGNATURE_TITLE = PropertiesService.getScriptProperties().getProperty('TITULO_ASSINATURA') || 'Equipe de Recursos Humanos';
const ORGANIZATION_SUPPORT_EMAIL = PropertiesService.getScriptProperties().getProperty('EMAIL_SUPORTE') || EMAIL_COMUNICACAO;
const ORGANIZATION_PORTAL_URL = PropertiesService.getScriptProperties().getProperty('URL_PORTAL_ONBOARDING') || 'https://example.com';
const NOME_DOMINIO = PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO') || 'example.com';
const BIRTHDAY_IMAGE_URL = PropertiesService.getScriptProperties().getProperty('BIRTHDAY_IMAGE_URL') || '';
const COMPANY_ANNIVERSARY_IMAGE_URL = PropertiesService.getScriptProperties().getProperty('COMPANY_ANNIVERSARY_IMAGE_URL') || '';

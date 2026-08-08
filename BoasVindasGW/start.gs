/** Instalador idempotente do módulo BoasVindasGW. */
const BOAS_VINDAS_START = {
  defaults: {},
  required: [
    'NOME_DOMINIO', 'EMAIL_ADMIN', 'CEP_EMAIL', 'EMAIL_GP', 'NOME_ORGANIZACAO',
    'NOME_REMETENTE', 'NOME_ASSINATURA', 'TITULO_ASSINATURA', 'URL_PORTAL_ONBOARDING'
  ],
  optional: ['EMAIL_SUPORTE', 'ORGANIZATION_LOGO_URL', 'WELCOME_VIDEO_ID', 'UOS_GENERICAS'],
  services: ['AdminDirectory e Gmail (serviços avançados)', 'DriveApp e GmailApp (autorizações)']
};

function start() { return _boasVindasStart(); }
function _boasVindasStart() { return _boasVindasRunInstaller('BoasVindasGW', BOAS_VINDAS_START); }
function _boasVindasRunInstaller(moduleName, definition) {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperties();
  const allKeys = Array.from(new Set(definition.required.concat(definition.optional).concat(Object.keys(definition.defaults))));
  let created = 0, preserved = 0;
  Logger.log('========================================'); Logger.log('INICIANDO IMPLANTAÇÃO: ' + moduleName); Logger.log('========================================');
  allKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(current, key)) { preserved++; Logger.log('[OK] Propriedade existente preservada: ' + key); return; }
    properties.setProperty(key, Object.prototype.hasOwnProperty.call(definition.defaults, key) ? definition.defaults[key] : '');
    created++; Logger.log('[OK] Propriedade criada: ' + key);
  });
  const pending = definition.required.filter(function(key) { return !String(properties.getProperty(key) || '').trim(); });
  pending.forEach(function(key) { Logger.log('[PENDENTE] ' + key + ' precisa ser configurada.'); });
  Logger.log('[AÇÃO MANUAL NECESSÁRIA] Habilite/autorize: ' + definition.services.join('; ') + '.'); Logger.log('[INFO] Nenhum gatilho foi criado automaticamente por este módulo.');
  Logger.log('RESULTADO — criadas: ' + created + '; preservadas: ' + preserved + '; pendentes: ' + pending.length);
  Logger.log(pending.length ? 'Status: CONFIGURAÇÃO INCOMPLETA' : 'Status: OK — IMPLANTAÇÃO CONCLUÍDA');
  return { created: created, preserved: preserved, pending: pending };
}

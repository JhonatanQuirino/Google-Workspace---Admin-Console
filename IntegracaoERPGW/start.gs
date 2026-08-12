/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

const ERP_START = {
  defaults: { FIREBASE_COLABORADORES_PATH: 'colaboradores', ERP_SOURCE_METHOD: 'get' },
  required: ['INBOUND_JWT_SECRET', 'FIREBASE_DATABASE_URL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PROJECT_ID'],
  optional: ['INBOUND_JWT_ISSUER', 'INBOUND_JWT_AUDIENCE', 'ERP_FIELD_MAPPING', 'ERP_SOURCE_URL', 'ERP_SOURCE_HEADERS', 'ERP_RESPONSE_RECORDS_PATH']
};

function start() {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperties();
  const keys = Array.from(new Set(ERP_START.required.concat(ERP_START.optional).concat(Object.keys(ERP_START.defaults))));
  let created = 0;
  let preserved = 0;
  Logger.log('========================================');
  Logger.log('INICIANDO IMPLANTAÇÃO: IntegracaoERPGW');
  Logger.log('========================================');
  keys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(current, key)) { preserved++; Logger.log('[OK] Propriedade existente preservada: ' + key); return; }
    properties.setProperty(key, Object.prototype.hasOwnProperty.call(ERP_START.defaults, key) ? ERP_START.defaults[key] : '');
    created++; Logger.log('[OK] Propriedade criada: ' + key);
  });
  const pending = ERP_START.required.filter(function(key) { return !String(properties.getProperty(key) || '').trim(); });
  pending.forEach(function(key) { Logger.log('[PENDENTE] ' + key + ' precisa ser configurada.'); });
  Logger.log('[AÇÃO MANUAL NECESSÁRIA] Implante o projeto como Web App e conceda acesso a UrlFetchApp e PropertiesService.');
  Logger.log('[INFO] Nenhum gatilho é criado automaticamente. Crie um gatilho para sincronizarERP somente se usar coleta agendada.');
  Logger.log('RESULTADO — criadas: ' + created + '; preservadas: ' + preserved + '; pendentes: ' + pending.length);
  Logger.log(pending.length ? 'Status: CONFIGURAÇÃO INCOMPLETA' : 'Status: OK — IMPLANTAÇÃO CONCLUÍDA');
  return { created: created, preserved: preserved, pending: pending };
}

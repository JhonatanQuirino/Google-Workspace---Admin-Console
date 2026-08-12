/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/** Instalador idempotente do módulo DadosRecuperacaoGW. */
const DADOS_RECUPERACAO_START = {
  defaults: {
    SITUACOES_ATIVAS: '1,100',
    SITUACOES_AFASTAMENTO: '2,3,4,6,8,11,24,29,33,35,107',
    SITUACOES_SUSPENSAO: '7,201',
    SITUACAO_DESLIGAMENTO: '7'
  },
  required: [
    'NOME_DOMINIO', 'EMAIL_ADMIN', 'CEP_EMAIL', 'NOME_ORGANIZACAO', 'NOME_REMETENTE',
    'SUSPENDED_OU_PATH', 'SITUACAO_DESLIGAMENTO', 'SITUACAO_OU_DEFAULT', 'SITUACAO_OU_MAP',
    'SITUACOES_ATIVAS', 'SITUACOES_AFASTAMENTO', 'SITUACOES_SUSPENSAO',
    'FIREBASE_DATABASE_URL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PROJECT_ID'
  ],
  optional: [
    'UOS_GENERICAS', 'IGNORED_OUS', 'RECOVERY_IGNORED_DOMAINS', 'WELCOME_VIDEO_ID',
    'INTEGRATION', 'EMAIL_DIVERGENCE', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BACKUP_PATH'
  ],
  services: ['AdminDirectory (serviço avançado)', 'Firebase Realtime Database e UrlFetchApp (autorizações)', 'integração GitHub somente se configurada']
};

function start() { return _dadosRecuperacaoRunInstaller('DadosRecuperacaoGW', DADOS_RECUPERACAO_START); }
function _dadosRecuperacaoRunInstaller(moduleName, definition) {
  const properties = PropertiesService.getScriptProperties(), current = properties.getProperties();
  const allKeys = Array.from(new Set(definition.required.concat(definition.optional).concat(Object.keys(definition.defaults)))); let created = 0, preserved = 0;
  Logger.log('========================================'); Logger.log('INICIANDO IMPLANTAÇÃO: ' + moduleName); Logger.log('========================================');
  allKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(current, key)) { preserved++; Logger.log('[OK] Propriedade existente preservada: ' + key); return; }
    properties.setProperty(key, Object.prototype.hasOwnProperty.call(definition.defaults, key) ? definition.defaults[key] : ''); created++; Logger.log('[OK] Propriedade criada: ' + key);
  });
  const pending = definition.required.filter(function(key) { return !String(properties.getProperty(key) || '').trim(); });
  pending.forEach(function(key) { Logger.log('[PENDENTE] ' + key + ' precisa ser configurada.'); });
  Logger.log('[AÇÃO MANUAL NECESSÁRIA] Habilite/autorize: ' + definition.services.join('; ') + '.'); Logger.log('[INFO] Nenhum gatilho foi criado automaticamente por este módulo.');
  Logger.log('RESULTADO — criadas: ' + created + '; preservadas: ' + preserved + '; pendentes: ' + pending.length); Logger.log(pending.length ? 'Status: CONFIGURAÇÃO INCOMPLETA' : 'Status: OK — IMPLANTAÇÃO CONCLUÍDA');
  return { created: created, preserved: preserved, pending: pending };
}

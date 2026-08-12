/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/** Instalador idempotente do módulo UsuariosSuspensosGW. */
const USUARIOS_SUSPENSOS_START = {
  defaults: {
    SITUACOES_AFASTAMENTO: '2,3,4,6,8,11,24,29,33,35,107',
    SITUACOES_SUSPENSAO: '7,201',
    SITUACOES_REMOVER_LICENCAS: '7,201',
    SITUACAO_DESLIGAMENTO: '7'
  },
  required: [
    'NOME_DOMINIO', 'SUSPENDED_OU_PATH', 'SITUACOES_AFASTAMENTO', 'SITUACOES_SUSPENSAO',
    'SITUACOES_REMOVER_LICENCAS', 'SITUACAO_DESLIGAMENTO', 'SITUACAO_OU_DEFAULT', 'SITUACAO_OU_MAP',
    'REQUIRED_SUSPENSION_OUS', 'FIREBASE_DATABASE_URL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PROJECT_ID'
  ],
  optional: ['UOS_GENERICAS'],
  services: ['AdminDirectory e AdminLicenseManager (serviços avançados)', 'Firebase Realtime Database e UrlFetchApp (autorizações)']
};

function start() { return _usuariosSuspensosRunInstaller('UsuariosSuspensosGW', USUARIOS_SUSPENSOS_START); }
function _usuariosSuspensosRunInstaller(moduleName, definition) {
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

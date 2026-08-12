/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/** Instalador idempotente do módulo AniversariantesGW. */
const ANIVERSARIANTES_START = {
  defaults: {},
  required: [
    'NOME_DOMINIO', 'EMAIL_ADMIN', 'EMAIL_COMUNICACAO', 'NOME_ORGANIZACAO',
    'NOME_REMETENTE', 'NOME_ASSINATURA', 'TITULO_ASSINATURA'
  ],
  optional: ['EMAIL_SUPORTE', 'URL_PORTAL_ONBOARDING', 'BIRTHDAY_IMAGE_URL', 'COMPANY_ANNIVERSARY_IMAGE_URL'],
  services: ['AdminDirectory (serviço avançado)', 'GmailApp (autorização para envio de e-mail)']
};

function start() {
  return _aniversariantesStart();
}

function _aniversariantesStart() {
  return _runModuleStart('AniversariantesGW', ANIVERSARIANTES_START);
}

function _runModuleStart(moduleName, definition) {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperties();
  const allKeys = Array.from(new Set(definition.required.concat(definition.optional).concat(Object.keys(definition.defaults))));
  let created = 0;
  let preserved = 0;
  Logger.log('========================================');
  Logger.log('INICIANDO IMPLANTAÇÃO: ' + moduleName);
  Logger.log('========================================');
  allKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      preserved++;
      Logger.log('[OK] Propriedade existente preservada: ' + key);
      return;
    }
    const value = Object.prototype.hasOwnProperty.call(definition.defaults, key) ? definition.defaults[key] : '';
    properties.setProperty(key, value);
    created++;
    Logger.log('[OK] Propriedade criada: ' + key);
  });
  const pending = _validateModuleStart(properties, definition.required);
  Logger.log('[AÇÃO MANUAL NECESSÁRIA] Habilite/autorize: ' + definition.services.join('; ') + '.');
  Logger.log('[INFO] Nenhum gatilho foi criado automaticamente por este módulo.');
  Logger.log('========================================');
  Logger.log('RESULTADO — criadas: ' + created + '; preservadas: ' + preserved + '; pendentes: ' + pending.length);
  Logger.log(pending.length ? 'Status: CONFIGURAÇÃO INCOMPLETA' : 'Status: OK — IMPLANTAÇÃO CONCLUÍDA');
  return { created: created, preserved: preserved, pending: pending };
}

function _validateModuleStart(properties, required) {
  const pending = required.filter(function(key) {
    return !String(properties.getProperty(key) || '').trim();
  });
  pending.forEach(function(key) { Logger.log('[PENDENTE] ' + key + ' precisa ser configurada.'); });
  return pending;
}

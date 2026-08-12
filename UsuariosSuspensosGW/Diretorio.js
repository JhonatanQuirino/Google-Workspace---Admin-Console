/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

function listarTodosOsUsuarios(dominio, options) {
  // Verificar se AdminDirectory está disponível
  if (typeof AdminDirectory === 'undefined') {
    const erro = 'AdminDirectory API não está disponível. ' +
      'Verifique se a API foi habilitada no projeto do Apps Script. ' +
      'Em appsscript.json, deve haver: "oauthScopes": ["https://www.googleapis.com/auth/admin.directory.user.readonly"]';
    console.error({
      event: 'ADMIN_DIRECTORY_NAO_DISPONIVEL',
      message: erro,
      hint: 'Edite appsscript.json e adicione a OAuth scope do Admin Directory'
    });
    throw new Error(erro);
  }

  const MAX_TENTATIVAS = 3; // Valor padrão para tentativas
  // Definições de parâmetros
  options = options || {};
  const maxResults = options.maxResults || 500;
  const projection = options.projection || 'full';
  const customFieldMask = options.customFieldMask || undefined;
  const fields = options.fields || undefined;
  const query = options.query || undefined;

  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    try {
      const usuariosMap = {};
      let pageToken;
      do {
        const listParams = {
          domain: dominio,
          maxResults: maxResults,
          pageToken: pageToken,
          projection: projection
        };
        if (customFieldMask) listParams.customFieldMask = customFieldMask;
        if (fields) listParams.fields = fields;
        if (query) listParams.query = query;

        const response = AdminDirectory.Users.list(listParams);

        if (response.users) {
          response.users.forEach(user => {
            usuariosMap[user.primaryEmail.toLowerCase()] = user;
          });
        }
        pageToken = response.nextPageToken;
        console.info(`Página lida: ${response.users ? response.users.length : 0} usuários. Total até agora: ${Object.keys(usuariosMap).length}.`);
      } while (pageToken);

      console.info(`Leitura concluída: ${Object.keys(usuariosMap).length} usuários lidos.`);
      return usuariosMap;

    } catch (e) {
      const message = String((e && e.message) || e || '').toLowerCase();
      const isRetryableError = (
        message.includes('unknown error') ||
        message.includes('server error') ||
        message.includes('service invoked too many times') ||
        message.includes('empty response') ||
        message.includes('service is currently unavailable') ||
        message.includes('backend error') ||
        message.includes('internal error') ||
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')
      );

      if (isRetryableError && i < MAX_TENTATIVAS - 1) {
        const baseDelay = 2000;
        const maxDelay = 30000;
        const jitter = Math.floor(Math.random() * 1000);
        const delay = Math.min(baseDelay * Math.pow(2, i) + jitter, maxDelay);
        console.warn(`Tentativa ${i + 1}/${MAX_TENTATIVAS} falhou, erro recuperável: ${e.message}. Aguardando ${delay}ms para nova tentativa.`);
        Utilities.sleep(delay);
      } else {
        console.error(`Erro fatal ao listar usuários (tentativa ${i + 1}/${MAX_TENTATIVAS}, domínio: ${dominio}): ${e && e.message}`);
        if (e && e.stack) {
          console.error(`Stack do erro: ${e.stack}`);
        }
        console.error(`Objeto de erro completo: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
        return null;
      }
    }
  }
  return null;
}
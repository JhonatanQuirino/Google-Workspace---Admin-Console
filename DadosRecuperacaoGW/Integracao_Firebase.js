/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Testa se todas as propriedades do Firebase estão corretamente configuradas.
 * Retorna um objeto com o status e mensagens de erro, se houver.
 */
function testarCredenciaisFirebase() {
  const scriptProps = PropertiesService.getScriptProperties();
  const privateKey = scriptProps.getProperty('FIREBASE_PRIVATE_KEY');
  const clientEmail = scriptProps.getProperty('FIREBASE_CLIENT_EMAIL');
  const databaseUrl = scriptProps.getProperty('FIREBASE_DATABASE_URL');
  const projectId = scriptProps.getProperty('FIREBASE_PROJECT_ID');

  let erros = [];
  if (!privateKey) erros.push('FIREBASE_PRIVATE_KEY ausente');
  else if (privateKey.indexOf('BEGIN PRIVATE KEY') === -1 || privateKey.indexOf('END PRIVATE KEY') === -1) erros.push('FIREBASE_PRIVATE_KEY formato inválido');
  if (!clientEmail) erros.push('FIREBASE_CLIENT_EMAIL ausente');
  if (!databaseUrl) erros.push('FIREBASE_DATABASE_URL ausente');
  if (!projectId) erros.push('FIREBASE_PROJECT_ID ausente');

  let resultado;
  if (erros.length === 0) {
    resultado = { sucesso: true, mensagem: 'Todas as credenciais do Firebase estão corretas.' };
  } else {
    resultado = { sucesso: false, mensagem: 'Erros encontrados nas credenciais:', erros };
  }
  Logger.json('info', { event: 'FIREBASE_CREDENTIALS_TEST', result: resultado });
  return resultado;
}


var _db_hcm = null;



function getFirebaseRealtimeDatabase(databaseUrl) {
  try {
    const scriptProps = PropertiesService.getScriptProperties();

    let privateKey = scriptProps.getProperty('FIREBASE_PRIVATE_KEY');
    const clientEmail = scriptProps.getProperty('FIREBASE_CLIENT_EMAIL');
    const projectId = scriptProps.getProperty('FIREBASE_PROJECT_ID');

    if (!privateKey || !clientEmail || !databaseUrl || !projectId) {
      throw new Error('Credenciais não encontradas. Execute salvarCredenciaisFirebaseRTDB() novamente.');
    }


    if (privateKey.indexOf("BEGIN PRIVATE KEY") === -1 || privateKey.indexOf("END PRIVATE KEY") === -1) {
       throw new Error("A chave privada parece inválida ou corrompida. Deve conter 'BEGIN PRIVATE KEY' e 'END PRIVATE KEY'.");
    }

    const firebase = {
      baseUrl: `${databaseUrl}/`,
      authEmail: clientEmail,
      privateKey: privateKey,
      projectId: projectId,

      request: function(path, method, data, retryCount) {
        retryCount = retryCount || 0;
        
        // Usa access_token diretamente do cache ou gera novo
        const access_token = getFirebaseJWT(this.authEmail, this.privateKey, this.projectId, retryCount > 0);
        const url = this.baseUrl + path + '.json?access_token=' + access_token;
        Logger.json('info', { event: '[DEBUG][FIREBASE] URL final', path: path });
        const options = {
          method: method,
          contentType: 'application/json',
          muteHttpExceptions: true
        };
        if (data) options.payload = JSON.stringify(data);

        const MAX_RETRIES = 3;
        for (let t = 0; t < MAX_RETRIES; t++) {
          try {
            const response = UrlFetchApp.fetch(url, options);
            const responseCode = response.getResponseCode();
            const responseText = response.getContentText();
            Logger.json('info', { event: '[DEBUG][FIREBASE] Response', path: path, code: responseCode, length: responseText ? responseText.length : 0 });

            if (responseCode >= 200 && responseCode < 300) {
               try { return JSON.parse(responseText); } catch (e) { return responseText === 'null' ? null : responseText; }
            }

            // Tratamento especial para 401: limpa cache e tenta novamente COM NOVO TOKEN
            if (responseCode === 401 && retryCount === 0) {
                Logger.json('warn', { event: 'AUTH_ERROR_TOKEN_INVALID', path: path });
              limparCacheTokenFirebase();
              return this.request(path, method, data, retryCount + 1);
            }

              if (responseCode === 429 || responseCode >= 500) {
                Logger.json('warn', { event: 'DB_RETRY', path: path, code: responseCode, attempt: t+1 });
               Utilities.sleep(1500 * (t + 1));
               continue;
            }

            throw new Error(`Firebase API Error (${responseCode}): ${responseText}`);

          } catch (e) {
            if (t === MAX_RETRIES - 1) throw e;
            Utilities.sleep(1000);
          }
        }
      },
      setData: function(path, data) { return this.request(path, 'PUT', data); },
      pushData: function(path, data) { return this.request(path, 'POST', data); },
      getData: function(path) { return this.request(path, 'GET'); },
      deleteData: function(path) { return this.request(path, 'DELETE'); }
    };
    return firebase;
  } catch (e) {
    Logger.json('error', { event: 'getFirebaseRealtimeDatabase_FATAL', error: e.message });
    throw e;
  }
}

function getDb_HCM() {
  const props = PropertiesService.getScriptProperties();
  const databaseUrl = props.getProperty('FIREBASE_DATABASE_URL');
  if (!databaseUrl) {
    throw new Error('FIREBASE_DATABASE_URL não configurado. Verifique as propriedades do script.');
  }
  return getFirebaseRealtimeDatabase(databaseUrl);
}


function getFirebaseJWT(clientEmail, privateKey, projectId, forceRefresh) {
  try {
    // Validação de credenciais antes de qualquer operação
    if (!clientEmail || typeof clientEmail !== 'string' || !clientEmail.includes('@')) {
      throw new Error(`Credencial inválida: clientEmail ausente ou inválido (${clientEmail})`);
    }
    if (!privateKey || typeof privateKey !== 'string' || privateKey.length < 100) {
      throw new Error("Credencial inválida: privateKey ausente, vazia ou muito curta");
    }
    if (!projectId || typeof projectId !== 'string') {
      throw new Error(`Credencial inválida: projectId ausente ou inválido (${projectId})`);
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = "firebase_token_" + projectId;
    
    // Se não for forçar refresh, verifica o cache
    if (!forceRefresh) {
      const cachedToken = cache.get(cacheKey);
      if (cachedToken) {
        return cachedToken;
      }
    } else {
      Logger.json('info', { event: 'AUTH_FORCE_REFRESH' });
    }

    Logger.json('info', { event: 'AUTH_GENERATING_NEW_TOKEN' });

    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    };

    // Normaliza a chave privada para PEM correto
    if (privateKey && privateKey.indexOf('\\n') !== -1) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    let body = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    let formattedKey = '-----BEGIN PRIVATE KEY-----\n';
    for (let i = 0; i < body.length; i += 64) {
      formattedKey += body.substring(i, i + 64) + '\n';
    }
    formattedKey += '-----END PRIVATE KEY-----';

    // Gera JWT padrão robusto
    var toBase64 = function(obj) {
      return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
    };
    var unsignedJWT = toBase64(header) + '.' + toBase64(claimSet);
    var signature = Utilities.computeRsaSha256Signature(unsignedJWT, formattedKey);
    var signedJWT = unsignedJWT + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');

    // Troca JWT por access_token
    const MAX_AUTH_RETRIES = 3;
    let lastError = null;
    for (let i = 0; i < MAX_AUTH_RETRIES; i++) {
      try {
        const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
          method: "post",
          contentType: "application/x-www-form-urlencoded",
          payload: {
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: signedJWT
          },
          muteHttpExceptions: true
        });
        const code = response.getResponseCode();
        const text = response.getContentText();
          if (code === 200) {
          const token = JSON.parse(text).access_token;
          if (token) {
            cache.put(cacheKey, token, 3300);
            return token;
          }
        }
        if (code >= 500 || code === 429) {
          Logger.json('warn', { event: 'AUTH_RETRY', code: code, attempt: i+1 });
          Utilities.sleep(1000 * (i + 1));
          lastError = new Error(`OAuth Error ${code}: ${text}`);
          continue;
        }
        throw new Error(`Falha OAuth Fatal (${code}): ${text}`);
      } catch (e) {
        lastError = e;
          if (e.message && e.message.includes("Unexpected error")) {
          Logger.json('warn', { event: 'AUTH_GLITCH' });
          Utilities.sleep(2000);
        }
        if (i === MAX_AUTH_RETRIES - 1) throw e;
      }
    }
    throw lastError || new Error("Falha desconhecida na autenticação após retentativas.");
  } catch (e) {
    Logger.json('error', { event: 'getFirebaseJWT_FATAL', error: e.message });
    throw e;
  }
}


function firebaseRead(db, path) {
  try {
    if (!db || typeof db.getData !== 'function') throw new Error("Instância de DB inválida.");
    return db.getData(path);
  } catch (e) {
    Logger.json('error', { event: 'firebaseRead_ERROR', path: path, error: e.message });

    throw e;
  }
}

function firebaseWrite(db, path, data) {
  try {
    if (!db || typeof db.setData !== 'function') throw new Error("Instância de DB inválida.");
    return db.setData(path, data);
  } catch (e) {
    Logger.json('error', { event: 'firebaseWrite_ERROR', path: path, error: e.message });
    return null;
  }
}

function firebaseDelete(db, path) {
  try {
    if (!db || typeof db.deleteData !== 'function') throw new Error("Instância de DB inválida.");
    return db.deleteData(path);
  } catch (e) {
    Logger.json('error', { event: 'firebaseDelete_ERROR', path: path, error: e.message });
    return { error: e.message };
  }
}

/**
 * Limpa o cache de token do Firebase.
 * Útil para forçar uma nova autenticação quando há problemas com 401 Unauthorized.
 * Pode ser chamada manualmente ou através do painel de administração.
 */
function limparCacheTokenFirebase() {
  try {
    const scriptProps = PropertiesService.getScriptProperties();
    const projectId = scriptProps.getProperty('FIREBASE_PROJECT_ID');
    
    if (projectId) {
      const cache = CacheService.getScriptCache();
      const cacheKey = "firebase_token_" + projectId;
      cache.remove(cacheKey);
      Logger.json('info', { event: 'CLEAN_FIREBASE_CACHE', projectId: projectId });
      return { sucesso: true, mensagem: 'Cache de token Firebase limpo com sucesso' };
    } else {
      Logger.json('warn', { event: 'CLEAN_FIREBASE_CACHE_MISSING_PROJECT' });
      return { sucesso: false, mensagem: 'FIREBASE_PROJECT_ID não encontrado' };
    }
  } catch (e) {
    Logger.json('error', { event: 'CLEAN_FIREBASE_CACHE_ERROR', error: e.message });
    return { sucesso: false, mensagem: 'Erro ao limpar cache: ' + e.message };
  }
}

/**
 * Renova manualmente o token do Firebase forçando uma nova autenticação.
 * Primeiro limpa o cache e depois gera um novo token.
 * @returns {Object} Resultado da operação com status de sucesso
 */
function renovarTokenFirebase() {
  try {
    const scriptProps = PropertiesService.getScriptProperties();
    const privateKey = scriptProps.getProperty('FIREBASE_PRIVATE_KEY');
    const clientEmail = scriptProps.getProperty('FIREBASE_CLIENT_EMAIL');
    const projectId = scriptProps.getProperty('FIREBASE_PROJECT_ID');
    
    if (!privateKey || !clientEmail || !projectId) {
      return { 
        sucesso: false, 
        mensagem: 'Credenciais do Firebase não estão configuradas corretamente' 
      };
    }
    
    // Limpa o cache
    limparCacheTokenFirebase();
    
    // Força geração de novo token
    const novoToken = getFirebaseJWT(clientEmail, privateKey, projectId, true);
    
    if (novoToken) {
      Logger.json('info', { event: 'RENEW_FIREBASE_TOKEN_SUCCESS' });
      return { 
        sucesso: true, 
        mensagem: 'Token do Firebase renovado com sucesso',
        tokenGerado: true
      };
    } else {
      return { 
        sucesso: false, 
        mensagem: 'Falha ao gerar novo token' 
      };
    }
  } catch (e) {
    Logger.json('error', { event: 'RENEW_FIREBASE_TOKEN_ERROR', error: e.message });
    return { 
      sucesso: false, 
      mensagem: 'Erro ao renovar token: ' + e.message 
    };
  }
}


function lerTodosColaboradores() {
  try {
    var db = getDb_HCM();
    var dados = firebaseRead(db, 'colaboradores');
    if (!dados) return [];
    var colaboradores = Object.values(dados).map(function(item) {
      var colaborador = new ColaboradorService(item);
      return colaborador.tratarDados();
    });
    return colaboradores;
  } catch (e) {
    Logger.json('error', { event: 'LER_TODOS_COLABORADORES_ERROR', error: e.message });
    return [];
  }
}





function capitalizeFirstLetter(str) {
  return UtilsGlobal.capitalizeFirstLetter(str);
}

function limparCamposVaziosDoPayload(payload, dados) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return dados;

  for (var chave in payload) {
    if (!Object.prototype.hasOwnProperty.call(payload, chave)) continue;
    var valorPayload = payload[chave];

    if (valorPayload && typeof valorPayload === 'object' && !Array.isArray(valorPayload)) {
      if (!dados[chave] || typeof dados[chave] !== 'object' || Array.isArray(dados[chave])) {
        dados[chave] = {};
      }
      limparCamposVaziosDoPayload(valorPayload, dados[chave]);
      continue;
    }

    // Se o payload contém string vazia, NÃO sobrescreve um valor existente não-vazio (proteção segura).
    if (valorPayload === '' && typeof dados[chave] === 'string' && dados[chave] !== '') {
      // mantém o valor existente
      continue;
    }

    // Atribui valor do payload (inclui null, números, booleanos, strings quando não aplicável a regra acima)
    dados[chave] = valorPayload;
  }
  return dados;
}

function registrarDadosNoFirebase(dadosTratados) {
  try {
    if (!dadosTratados) throw new Error("Nenhum dado fornecido para salvar.");

    // Normaliza e valida CPF para garantir chave Firebase válida (somente dígitos)
    if (dadosTratados.CPF && !dadosTratados.cpf) dadosTratados.cpf = dadosTratados.CPF;
    var cpfNormalizado = UtilsCPF.normalizar(dadosTratados.cpf);

    // Se CPF inválido/ausente: salva o payload integral em caminho fallback e retorna (não lança)
    if (!cpfNormalizado) {
      try {
        var dbFallback = getDb_HCM();
        var execIdFallback = Utilities.getUuid();
        var fallbackPath = 'colaboradores_fallback/' + execIdFallback;
        var fallbackData = {
          originalPayload: dadosTratados,
          receivedAt: new Date().toISOString(),
          note: 'CPF ausente ou inválido - salvo em fallback',
          temp_id: execIdFallback
        };
        var fallbackWrite = firebaseWrite(dbFallback, fallbackPath, fallbackData);
        if (fallbackWrite === null || (fallbackWrite && fallbackWrite.error)) {
          console.error('❌ Firebase: Falha ao gravar payload fallback em ' + fallbackPath, fallbackWrite);
        } else {
          console.warn('⚠️ Firebase: Payload sem CPF gravado em ' + fallbackPath);
        }
      } catch (eFallback) {
        console.error('[FALLBACK_SAVE] Erro ao salvar payload sem CPF:', eFallback && eFallback.message ? eFallback.message : eFallback);
      }
      return { sucesso: true, mensagem: 'Payload salvo em fallback por CPF inválido/ausente' };
    }

    // Garante que o objeto de dados use o CPF normalizado
    dadosTratados.cpf = cpfNormalizado;

    // LOG DIAGNÓSTICO: payload recebido
    try { console.info('[DIAG] registrarDadosNoFirebase - payload keys:', Object.keys(dadosTratados)); } catch (e) {}

    // TRATA OS DADOS ANTES DE SALVAR
    var colaborador = new ColaboradorService(dadosTratados);
    var dados = colaborador.tratarDados();
    dados = limparCamposVaziosDoPayload(dadosTratados, dados);
    var db = getDb_HCM();
    // LOG DIAGNÓSTICO: CPF normalizado
    try { console.info('[DIAG] registrarDadosNoFirebase - cpfNormalizado:', cpfNormalizado); } catch (e) {}
    var existente = firebaseRead(db, 'colaboradores/' + cpfNormalizado);
    try { console.info('[DIAG] registrarDadosNoFirebase - existente?', !!existente); } catch (e) {}

    if (existente && Array.isArray(existente.auditoria)) {
      dados.auditoria = existente.auditoria;
    }
    colaborador.adicionarAuditoria(existente ? 'atualizacao' : 'criacao', dados.usuarioAtualizacao);

    var writeResult = firebaseWrite(db, 'colaboradores/' + dados.cpf, dados);

    // Confirmação/validação do resultado da escrita
    if (writeResult === null || (writeResult && writeResult.error)) {
      console.error('❌ Firebase: Falha ao gravar colaborador ' + dados.cpf + '. Resultado:', writeResult);
      // Registra detalhe diagnóstico adicional
      try { console.error('[DIAG] registrarDadosNoFirebase - writeResult detail:', JSON.stringify(writeResult)); } catch (e) {}
    } else {
      if (existente) {
        console.log('🟢 Firebase: Colaborador ' + dados.cpf + ' atualizado com sucesso.', { path: 'colaboradores/' + dados.cpf, sizeEstimate: JSON.stringify(dados).length });
      } else {
        console.log('🟩 Firebase: Colaborador ' + dados.cpf + ' criado com sucesso.', { path: 'colaboradores/' + dados.cpf, sizeEstimate: JSON.stringify(dados).length });
      }
    }
  } catch (e) {
    console.error('registrarDadosNoFirebase - ERRO: ' + e.message);
    throw e;
  }
}


function logarFirebase(db, logNode, nivel, funcao, mensagem, contexto = {}) {

  UtilsGlobal.logarFirebase(db, logNode, nivel, funcao, mensagem, contexto);
}


function carregarMapeamentoUO() {
  return UtilsGlobal.carregarMapeamentoUO();
}

/**
 * Função de diagnóstico: busca e registra no log o colaborador salvo no Firebase pelo CPF bruto.
 * Use no Editor do Apps Script: diagnosticoLogColaborador('09472464602')
 */
function diagnosticoLogColaborador(cpfRaw) {
  try {
    const cpfNormalizado = UtilsCPF.normalizar(cpfRaw);
    if (!cpfNormalizado) {
      console.warn('[DIAG] diagnosticoLogColaborador - CPF inválido:', cpfRaw);
      return null;
    }
    const db = getDb_HCM();
    const registro = firebaseRead(db, 'colaboradores/' + cpfNormalizado);
    if (!registro) {
      console.info('[DIAG] diagnosticoLogColaborador - nenhum registro encontrado para:', cpfNormalizado);
      return null;
    }
    console.info('[DIAG] diagnosticoLogColaborador - registro:', registro);
    return registro;
  } catch (e) {
    console.error('[DIAG] diagnosticoLogColaborador - erro:', e && e.message ? e.message : e);
    throw e;
  }
}

function salvarPayloadBrutoEmFallback(rawPayload, contexto) {
  try {
    var db = getDb_HCM();
    var fallbackId = Utilities.getUuid();
    var fallbackPath = 'colaboradores_fallback/' + fallbackId;
    var fallbackType = (contexto && contexto.event === 'parse_fallback') ? 'parse_fallback' : 'server_error_fallback';
    var fallbackEntry = {
      type: fallbackType,
      originalPayload: rawPayload,
      originalPayloadRaw: typeof rawPayload === 'string' ? rawPayload : null,
      contexto: contexto || {},
      savedAt: new Date().toISOString(),
      temp_id: fallbackId
    };
    var writeResult = firebaseWrite(db, fallbackPath, fallbackEntry);
    if (writeResult === null || (writeResult && writeResult.error)) {
      console.error('[FALLBACK_SAVE] Falha ao escrever fallback de erro de servidor:', writeResult);
      return { sucesso: false, mensagem: 'Falha ao salvar fallback de servidor' };
    }
    console.warn('[FALLBACK_SAVE] Payload bruto salvo em fallback:', fallbackPath);
    return { sucesso: true, fallbackPath: fallbackPath };
  } catch (e) {
    console.error('[FALLBACK_SAVE] Erro ao salvar fallback de erro de servidor:', e && e.message ? e.message : e);
    return { sucesso: false, mensagem: e && e.message ? e.message : String(e) };
  }
}

/**
 * Tenta reconciliar automaticamente entradas em `colaboradores_fallback`.
 * Para cada item, tenta extrair um CPF e mover/mesclar para `colaboradores/<cpf>`.
 * Pode ser executado manualmente no Editor do Apps Script ou agendado por trigger.
 */
function reconciliarColaboradoresFallback() {
  var resumo = { total: 0, movidos: 0, semCpf: 0, erros: 0, detalhes: [] };
  try {
    var db = getDb_HCM();
    var nodes = ['colaboradores_fallback'];
    nodes.forEach(function(node) {
      var dados = firebaseRead(db, node);
      if (!dados || typeof dados !== 'object') return;
      Object.keys(dados).forEach(function(key) {
        resumo.total++;
        var item = dados[key];
        try {
          var rawPayload = item && item.originalPayloadRaw ? item.originalPayloadRaw : null;
          var payload = item && item.originalPayload ? item.originalPayload : item;
          var cpfEncontrado = null;

          if (typeof payload === 'string') {
            rawPayload = payload;
            var parsedPayload = RequestParser.parse(payload);
            if (parsedPayload && parsedPayload._parseStatus !== 'unparsed') {
              payload = parsedPayload;
            } else {
              cpfEncontrado = extrairCpfDeTextoBruto(payload);
              if (cpfEncontrado) {
                payload = {
                  cpf: cpfEncontrado,
                  nome: extrairNomeDeTextoBruto(payload),
                  emailProfissional: extrairEmailDeTextoBruto(payload)
                };
              }
            }
          }

          if (payload && typeof payload === 'object') {
            if (!cpfEncontrado && payload.cpf) cpfEncontrado = payload.cpf;
            if (!cpfEncontrado && payload.CPF) cpfEncontrado = payload.CPF;
            if (!cpfEncontrado && payload.customSchemas && payload.customSchemas.Informacoes_HCM && payload.customSchemas.Informacoes_HCM.CPF) cpfEncontrado = payload.customSchemas.Informacoes_HCM.CPF;
            if (!cpfEncontrado && payload.Informacoes_HCM && payload.Informacoes_HCM.CPF) cpfEncontrado = payload.Informacoes_HCM.CPF;
          }

          if (!cpfEncontrado && rawPayload) {
            cpfEncontrado = extrairCpfDeTextoBruto(rawPayload);
          }

          var cpfNormalizado = UtilsCPF.normalizar(cpfEncontrado);
          if (!cpfNormalizado) {
            resumo.semCpf++;
            resumo.detalhes.push({ key: node + '/' + key, status: 'sem_cpf' });
            return;
          }

          var existente = firebaseRead(db, 'colaboradores/' + cpfNormalizado) || {};
          var combined = existingOrEmpty(existente);
          combined = limparCamposVaziosDoPayload(payload, combined);
          combined.cpf = cpfNormalizado;

          if (!combined.nome && rawPayload) {
            combined.nome = extrairNomeDeTextoBruto(rawPayload) || combined.nome;
          }
          if (!combined.emailProfissional && rawPayload) {
            combined.emailProfissional = extrairEmailDeTextoBruto(rawPayload) || combined.emailProfissional;
          }

          var colaborador = new ColaboradorService(combined);
          var dePara = null;
          if (Object.keys(existente).length > 0) {
            dePara = {};
            for (var k in combined) {
              if (k === 'auditoria') continue;
              if (JSON.stringify(combined[k]) !== JSON.stringify(existente[k])) {
                dePara[k] = { de: existente[k], para: combined[k] };
              }
            }
          }
          colaborador.adicionarAuditoria('reconciliacao', 'system_reconciler', dePara);

          var writeRes = firebaseWrite(db, 'colaboradores/' + cpfNormalizado, combined);
          if (writeRes === null || (writeRes && writeRes.error)) {
            resumo.erros++;
            resumo.detalhes.push({ key: node + '/' + key, status: 'erro_escrita', error: writeRes });
            return;
          }

          try { firebaseDelete(db, node + '/' + key); } catch (eDel) { /* ignorar falha de remoção */ }

          resumo.movidos++;
          resumo.detalhes.push({ key: node + '/' + key, status: 'movido', cpf: cpfNormalizado });
        } catch (eItem) {
          resumo.erros++;
          resumo.detalhes.push({ key: node + '/' + key, status: 'erro', error: eItem && eItem.message ? eItem.message : eItem });
        }
      });
    });
  } catch (e) {
    console.error('[RECONCILIAR] Erro geral:', e && e.message ? e.message : e);
    throw e;
  }
  console.info('[RECONCILIAR] Resumo:', resumo);
  return resumo;
}

function extrairCpfDeTextoBruto(texto) {
  if (!texto || typeof texto !== 'string') return null;

  var candidatePatterns = [
    /cpf\s*[:=]\s*["']?([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})["']?/gi,
    /([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})/g,
    /(?:^|\D)([0-9]{11})(?:\D|$)/g
  ];

  for (var i = 0; i < candidatePatterns.length; i++) {
    var regex = candidatePatterns[i];
    var match;
    while ((match = regex.exec(texto)) !== null) {
      var candidate = match[1] || match[0];
      var cpfNormalizado = UtilsCPF.normalizar(candidate);
      if (cpfNormalizado) return cpfNormalizado;
    }
  }

  return null;
}

function extrairNomeDeTextoBruto(texto) {
  if (!texto || typeof texto !== 'string') return null;

  var nomePattern = /(?:nomeCompleto|nome|fullName|full_name|displayName)\s*[:=]\s*["']?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\.\-']{2,120})["']?(?=[\s,\}\]]|$)/i;
  var match = nomePattern.exec(texto);
  if (match && match[1]) {
    return UtilsGlobal.formatarTitleCase(match[1].trim());
  }

  return null;
}

function extrairEmailDeTextoBruto(texto) {
  if (!texto || typeof texto !== 'string') return null;

  var emailPattern = /(?:email|emailProfissional|mail)\s*[:=]\s*["']?([\w\.\-+]+@[\w\-]+(?:\.[\w\-]+)+)["']?/i;
  var match = emailPattern.exec(texto);
  return match && match[1] ? match[1].trim() : null;
}

function existingOrEmpty(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Função de teste que cria entradas de fallback simuladas e executa o reconciliador.
 * Use para validar fluxo de reconciliação sem precisar de payloads externos.
 */
function testReconciliadorSimulado() {
  var db = getDb_HCM();
  var id1 = Utilities.getUuid();
  var id2 = Utilities.getUuid();
  var payload1 = { originalPayload: { CPF: UtilsCPF.gerar(), nomeCompleto: 'Simulado Um', emailProfissional: 'sim1@ex.com' }, receivedAt: new Date().toISOString(), temp_id: id1 };
  var payload2 = { originalPayload: { cpf: '00000000000', nomeCompleto: 'Sem CPF Valido', emailProfissional: 'sim2@ex.com' }, receivedAt: new Date().toISOString(), temp_id: id2 };

  try {
    firebaseWrite(db, 'colaboradores_fallback/' + id1, payload1);
    firebaseWrite(db, 'colaboradores_fallback/' + id2, payload2);
  } catch (e) {
    console.error('[TEST_RECONCILIADOR] Erro ao criar entradas de teste:', e && e.message ? e.message : e);
    return { erro: e && e.message ? e.message : e };
  }

  // Executa reconciliador
  try {
    var resumo = reconciliarColaboradoresFallback();
    return resumo;
  } catch (e) {
    console.error('[TEST_RECONCILIADOR] Erro ao executar reconciliador:', e && e.message ? e.message : e);
    return { erro: e && e.message ? e.message : e };
  }
}
class UtilsGlobal {
    static formatarDataBR(date) {
      if (!(date instanceof Date)) date = new Date(date);
      const pad = n => n < 10 ? '0' + n : n;
      return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear() + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    }
  static capitalizeFirstLetter(str) {
    if (typeof str !== 'string' || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static formatarTitleCase(str) {
    if (typeof str !== 'string' || str.length === 0) return str;
    return str
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
      .join(' ');
  }

  static logarFirebase(db, logNode, nivel, funcao, mensagem, contexto = {}) {
    console.log({
      event: "LEGACY_LOG",
      level: nivel,
      function: funcao,
      message: mensagem,
      context: contexto
    });
  }

  static carregarMapeamentoUO() {
    try {
      const db = getDb_HCM();
      const dados = firebaseRead(db, "Mapeamento_UO");
      const normalizarChaveMapeamento = (valor) => String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toUpperCase();

      if (!dados) {
        console.warn({ event: "MAP_UO_WARN", message: "Nenhum dado encontrado em Mapeamento_UO" });
        return {};
      }

      const mapeamentoFinal = {};
      Object.keys(dados).forEach(centroCusto => {
        const uo = dados[centroCusto];
        if (uo) {
          const chave = normalizarChaveMapeamento(centroCusto);
          if (chave) {
            mapeamentoFinal[chave] = uo.toString().trim();
          }
        }
      });

      console.info({ event: "MAP_UO_LOADED", count: Object.keys(mapeamentoFinal).length });
      return mapeamentoFinal;

    } catch (e) {
      console.error({ event: "MAP_UO_ERROR", error: e.message });
      return null;
    }
  }
}

/**
 * Testa comunicação básica com o Firebase: POST, GET, PUT, DEL
 */
function testarFirebase() {
  const db = getDb_HCM();
  const testPath = 'testes/comunicacao';
  const testData = {
    mensagem: 'Teste de comunicação',
    timestamp: new Date().toISOString(),
    valor: Math.floor(Math.random() * 10000)
  };

  // PUT (cria/sobrescreve)
  try {
    const putResult = db.setData(testPath, testData);
    console.log('PUT OK:', putResult);
  } catch (e) {
    console.error('Erro no PUT:', e.message);
  }
  // GET
  try {
    const getResult = db.getData(testPath);
    console.log('GET OK:', getResult);
  } catch (e) {
    console.error('Erro no GET:', e.message);

  }

  // POST (adiciona novo filho)
  try {
    const postResult = db.pushData(testPath, { mensagem: 'Novo POST', timestamp: new Date().toISOString() });
    console.log('POST OK:', postResult);
  } catch (e) {
    console.error('Erro no POST:', e.message);
  }

  // DEL (remove)
  try {
    const delResult = db.deleteData(testPath);
    console.log('DEL OK:', delResult);
  } catch (e) {
    console.error('Erro no DEL:', e.message);
  }
}
// Fim do arquivo

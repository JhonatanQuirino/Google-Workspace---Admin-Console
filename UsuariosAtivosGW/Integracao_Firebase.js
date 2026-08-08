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
        const access_token = getFirebaseJWT(this.authEmail, this.privateKey, this.projectId, retryCount > 0);
        const url = this.baseUrl + path + (path.indexOf('?') !== -1 ? '&' : '.json?') + 'access_token=' + access_token;
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

            if (responseCode >= 200 && responseCode < 300) {
               try { return JSON.parse(responseText); } catch (e) { return responseText === 'null' ? null : responseText; }
            }

            if (responseCode === 401 && retryCount === 0) {
              limparCacheTokenFirebase();
              return this.request(path, method, data, retryCount + 1);
            }

            if (responseCode === 429 || responseCode >= 500) {
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
    console.error(`getFirebaseRealtimeDatabase - ERRO FATAL: ${e.message}`);
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
    if (!forceRefresh) {
      const cachedToken = cache.get(cacheKey);
      if (cachedToken) {
        return cachedToken;
      }
    }

    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    };

    if (privateKey && privateKey.indexOf('\n') !== -1) {
      privateKey = privateKey.replace(/\n/g, '\n');
    }
    let body = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    let formattedKey = '-----BEGIN PRIVATE KEY-----\n';
    for (let i = 0; i < body.length; i += 64) {
      formattedKey += body.substring(i, i + 64) + '\n';
    }
    formattedKey += '-----END PRIVATE KEY-----';

    var toBase64 = function(obj) {
      return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
    };
    var unsignedJWT = toBase64(header) + '.' + toBase64(claimSet);
    var signature = Utilities.computeRsaSha256Signature(unsignedJWT, formattedKey);
    var signedJWT = unsignedJWT + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');

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
          Utilities.sleep(1000 * (i + 1));
          lastError = new Error(`OAuth Error ${code}: ${text}`);
          continue;
        }
        throw new Error(`Falha OAuth Fatal (${code}): ${text}`);
      } catch (e) {
        lastError = e;
        if (e.message && e.message.includes("Unexpected error")) {
          Utilities.sleep(2000);
        }
        if (i === MAX_AUTH_RETRIES - 1) throw e;
      }
    }
    throw lastError || new Error("Falha desconhecida na autenticação após retentativas.");
  } catch (e) {
    console.error(`getFirebaseJWT - ERRO FATAL: ${e.message}`);
    throw e;
  }
}

function limparCacheTokenFirebase() {
  try {
    const cache = CacheService.getScriptCache();
    const props = PropertiesService.getScriptProperties();
    const projectId = props.getProperty('FIREBASE_PROJECT_ID');
    if (projectId) {
      cache.remove("firebase_token_" + projectId);
    }
  } catch (e) {
    console.warn('limparCacheTokenFirebase - falha ao limpar cache de token: ' + (e && e.message ? e.message : e));
  }
}

function firebaseRead(db, path) {
  try {
    if (!db || typeof db.getData !== 'function') throw new Error("Instância de DB inválida.");
    return db.getData(path);
  } catch (e) {
    console.error(`firebaseRead - ERRO na leitura (Path: ${path}): ${e.message}`);
    throw e;
  }
}

function lerTodosColaboradores() {
  try {
    const db = getDb_HCM();
    const dados = firebaseRead(db, 'colaboradores');
    if (!dados || typeof dados !== 'object') {
      console.warn('[Firebase] lerTodosColaboradores: dados vazios ou tipo inesperado', { tipo: typeof dados, valor: dados });
      return [];
    }
    const total = Object.keys(dados).length;
    console.warn('[Firebase] lerTodosColaboradores: registros encontrados', total);
    return Object.values(dados);
  } catch (e) {
    console.error('lerTodosColaboradores - ERRO: ' + e.message);
    return [];
  }
}

function lerColaboradorPorCPF(cpfNormalizado) {
  try {
    if (!cpfNormalizado) {
      console.warn('[Firebase] lerColaboradorPorCPF: cpfNormalizado inválido ou ausente');
      return null;
    }
    const db = getDb_HCM();

    const attempts = [
      {
        descricao: 'caminho direto',
        path: 'colaboradores/' + encodeURIComponent(cpfNormalizado)
      },
      {
        descricao: 'query por cpf',
        path: 'colaboradores.json?orderBy=%22cpf%22&equalTo=%22' + encodeURIComponent(cpfNormalizado) + '%22'
      },
      {
        descricao: 'query por chave',
        path: 'colaboradores.json?orderBy=%22$key%22&equalTo=%22' + encodeURIComponent(cpfNormalizado) + '%22'
      }
    ];

    for (let attempt of attempts) {
      const resultado = firebaseRead(db, attempt.path);
      if (!resultado || resultado === null) {
        console.warn('[Firebase] não encontrado em ' + attempt.descricao + ': ' + cpfNormalizado + ' (path=' + attempt.path + ')');
        continue;
      }

      if (attempt.descricao === 'caminho direto' && typeof resultado === 'object') {
        if (!resultado.cpf) resultado.cpf = cpfNormalizado;
        console.warn('[Firebase] colaborador encontrado por caminho direto:', cpfNormalizado, 'path=' + attempt.path);
        return resultado;
      }

      if (typeof resultado === 'object') {
        const keys = Object.keys(resultado);
        console.warn('[Firebase] resultado de ' + attempt.descricao + ' retornou objetos', { path: attempt.path, keys: keys.slice(0, 5) });
        for (let key of keys) {
          const colaborador = resultado[key];
          if (colaborador && typeof colaborador === 'object') {
            if (!colaborador.cpf) colaborador.cpf = cpfNormalizado;
            console.warn('[Firebase] colaborador encontrado por ' + attempt.descricao + ':', cpfNormalizado, 'chave=', key);
            return colaborador;
          }
        }
      }
    }

    console.warn('[Firebase] fallback para busca completa de colaboradores por CPF:', cpfNormalizado);
    const todos = lerTodosColaboradores();
    console.warn('[Firebase] fallback total de colaboradores: registros lidos=', todos.length);
    for (let colaborador of todos) {
      if (!colaborador || typeof colaborador !== 'object') continue;
      const candidato = validarCPFDeRegistro(colaborador);
      if (candidato === cpfNormalizado) {
        console.warn('[Firebase] colaborador encontrado em fallback completo:', cpfNormalizado);
        if (!colaborador.cpf) colaborador.cpf = cpfNormalizado;
        return colaborador;
      }
    }

    console.warn('[Firebase] nenhum colaborador encontrado depois do fallback completo:', cpfNormalizado);
    return null;
  } catch (e) {
    console.error('lerColaboradorPorCPF - ERRO: ' + e.message);
    return null;
  }
}

function validarCPFDeRegistro(colaborador) {
  if (!colaborador || typeof colaborador !== 'object') return null;
  return buscarCpfEmObjeto(colaborador);
}

function buscarCpfEmObjeto(obj, visitados = new Set()) {
  if (!obj || typeof obj !== 'object') return null;
  if (visitados.has(obj)) return null;
  visitados.add(obj);

  const possiveisCampos = ['cpf', 'CPF', 'documento', 'Documento'];
  for (let campo of possiveisCampos) {
    if (Object.prototype.hasOwnProperty.call(obj, campo) && obj[campo]) {
      const normalizado = UtilsCPF.normalizar(String(obj[campo]));
      if (normalizado) return normalizado;
    }
  }

  for (let key of Object.keys(obj)) {
    const valor = obj[key];
    if (valor && typeof valor === 'object') {
      const encontrado = buscarCpfEmObjeto(valor, visitados);
      if (encontrado) return encontrado;
    }
  }

  return null;
}

function carregarMapeamentoUO() {
  return UtilsGlobal.carregarMapeamentoUO();
}

class UtilsGlobal {
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

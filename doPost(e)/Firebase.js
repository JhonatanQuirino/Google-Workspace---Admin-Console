/** Persistência de colaboradores no Firebase Realtime Database. */
function gravarColaboradorFirebase_(payload) {
  const cpf = normalizarCpf_(payload && (payload.cpf || payload.CPF));
  if (!cpf) {
    firebaseRequest_('put', 'colaboradores_fallback/' + Utilities.getUuid(), { originalPayload: payload, receivedAt: new Date().toISOString(), note: 'CPF ausente ou inválido' });
    return;
  }
  const existing = firebaseRequest_('get', 'colaboradores/' + cpf) || {};
  const dados = mesclarDados_(existing, payload);
  dados.cpf = cpf;
  dados.auditoria = { tipo: existing && Object.keys(existing).length ? 'atualizacao' : 'criacao', data: new Date().toISOString() };
  firebaseRequest_('put', 'colaboradores/' + cpf, dados);
}

function firebaseRequest_(method, path, data) {
  const props = PropertiesService.getScriptProperties();
  const databaseUrl = props.getProperty('FIREBASE_DATABASE_URL');
  const clientEmail = props.getProperty('FIREBASE_CLIENT_EMAIL');
  const privateKey = props.getProperty('FIREBASE_PRIVATE_KEY');
  const projectId = props.getProperty('FIREBASE_PROJECT_ID');
  if (!databaseUrl || !clientEmail || !privateKey || !projectId) throw new Error('Credenciais do Firebase incompletas.');
  const url = databaseUrl.replace(/\/$/, '') + '/' + path + '.json?access_token=' + encodeURIComponent(firebaseToken_(clientEmail, privateKey, projectId));
  const options = { method: method, muteHttpExceptions: true };
  if (data !== undefined) { options.contentType = 'application/json'; options.payload = JSON.stringify(data); }
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Firebase respondeu HTTP ' + code + ': ' + response.getContentText().substring(0, 300));
  const text = response.getContentText();
  return text && text !== 'null' ? JSON.parse(text) : null;
}

function firebaseToken_(clientEmail, privateKey, projectId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'firebase_token_' + projectId;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const base64 = value => Utilities.base64EncodeWebSafe(JSON.stringify(value)).replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = base64({ alg: 'RS256', typ: 'JWT' }) + '.' + base64({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const pem = privateKey.replace(/\\n/g, '\n');
  const assertion = unsigned + '.' + Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, pem)).replace(/=+$/, '');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion }, muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Falha ao autenticar no Firebase: ' + response.getContentText().substring(0, 300));
  const token = JSON.parse(response.getContentText()).access_token;
  if (!token) throw new Error('Firebase não retornou access token.');
  cache.put(cacheKey, token, 3300);
  return token;
}

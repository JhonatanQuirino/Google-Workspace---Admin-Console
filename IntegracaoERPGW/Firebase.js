/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

function salvarColaboradoresNoFirebase(colaboradores) {
  const token = _obterTokenFirebase();
  const baseUrl = String(ERP_CONFIG.firebase.databaseUrl || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('FIREBASE_DATABASE_URL não configurada.');
  const resultado = { saved: 0, failed: 0, errors: [] };

  colaboradores.forEach(function(colaborador) {
    try {
      const path = ERP_CONFIG.firebase.colaboradoresPath + '/' + encodeURIComponent(colaborador.cpf) + '.json?access_token=' + encodeURIComponent(token);
      const response = UrlFetchApp.fetch(baseUrl + '/' + path, {
        method: 'put', contentType: 'application/json', payload: JSON.stringify(colaborador), muteHttpExceptions: true
      });
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('Firebase respondeu ' + response.getResponseCode() + '.');
      resultado.saved++;
    } catch (error) {
      resultado.failed++;
      resultado.errors.push({ cpf: colaborador.cpf, message: error.message });
    }
  });
  return resultado;
}

function _obterTokenFirebase() {
  const firebase = ERP_CONFIG.firebase;
  if (!firebase.clientEmail || !firebase.privateKey || !firebase.projectId) throw new Error('Credenciais Firebase incompletas.');
  const cache = CacheService.getScriptCache();
  const key = 'erp_firebase_token_' + firebase.projectId;
  const cached = cache.get(key);
  if (cached) return cached;
  const now = Math.floor(Date.now() / 1000);
  const encode = function(value) { return Utilities.base64EncodeWebSafe(JSON.stringify(value)).replace(/=+$/, ''); };
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const claim = encode({ iss: firebase.clientEmail, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const unsigned = header + '.' + claim;
  const privateKey = firebase.privateKey.replace(/\\n/g, '\n');
  const signature = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, privateKey)).replace(/=+$/, '');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', contentType: 'application/x-www-form-urlencoded', payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + signature }, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Não foi possível autenticar no Firebase.');
  const token = JSON.parse(response.getContentText()).access_token;
  if (!token) throw new Error('Firebase não retornou access token.');
  cache.put(key, token, 3300);
  return token;
}

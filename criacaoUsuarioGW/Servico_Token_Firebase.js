/**
 * Classe para gerenciamento de token de autenticação do Firebase com cache.
 * Utiliza CacheService para armazenar o token por 1 hora, evitando requisições desnecessárias.
 */
var TokenFirebase = (function () {
  var CACHE_KEY = 'FIREBASE_TOKEN';
  var CACHE_EXPIRATION_SECONDS = 60 * 60; // 1 hora

  /**
   * Obtém o token do cache ou gera um novo se necessário.
   * @param {boolean} forceRefresh - Força a geração de um novo token ignorando o cache
   * @returns {string} Token de autenticação do Firebase
   */
  function getToken(forceRefresh) {
    var cache = CacheService.getScriptCache();
    
    if (!forceRefresh) {
      var token = cache.get(CACHE_KEY);
      if (token) {
        return token;
      }
    }
    
    token = gerarNovoToken();
    if (token) {
      cache.put(CACHE_KEY, token, CACHE_EXPIRATION_SECONDS);
    }
    return token;
  }

  /**
   * Limpa o token armazenado no cache.
   * Útil quando o token expira ou quando há problemas de autenticação.
   */
  function clearToken() {
    var cache = CacheService.getScriptCache();
    cache.remove(CACHE_KEY);
    console.log('[TokenFirebase] Cache de token limpo');
  }

  /**
   * Gera um novo token de autenticação do Firebase.
   * Substitua este método pela lógica real de geração do token JWT.
   * @returns {string} Novo token JWT
   */
  function gerarNovoToken() {
    var scriptProps = PropertiesService.getScriptProperties();
    var privateKey = scriptProps.getProperty('FIREBASE_PRIVATE_KEY');
    var clientEmail = scriptProps.getProperty('FIREBASE_CLIENT_EMAIL');
    var projectId = scriptProps.getProperty('FIREBASE_PROJECT_ID');

    if (!privateKey || !clientEmail || !projectId) {
      console.error({
        event: 'FIREBASE_CREDENTIALS_MISSING',
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail,
        hasProjectId: !!projectId
      });
      throw new Error('Credenciais do Firebase ausentes nas Script Properties. Verifique: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
    }

    if (privateKey.indexOf('\\n') !== -1) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    return getFirebaseJWT(clientEmail, privateKey, projectId);
  }

  return {
    getToken: getToken,
    clearToken: clearToken
  };
})();

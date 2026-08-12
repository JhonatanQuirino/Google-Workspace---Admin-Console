/** Autenticação do chamador Senior. */
function validarApiKey_(e) {
  const props = PropertiesService.getScriptProperties();
  const esperada = props.getProperty('SENIOR_API_KEY') || props.getProperty('SENIOR');
  if (!esperada) throw new Error('SENIOR_API_KEY não configurada nas propriedades do script.');

  const headers = (e && e.headers) || {};
  const authorization = headers.authorization || headers.Authorization || '';
  const recebida = (e && e.parameter && (e.parameter.apiKey || e.parameter.api_key)) ||
    headers['x-api-key'] || headers['X-Api-Key'] ||
    (String(authorization).match(/^Bearer\s+(.+)$/i) || [])[1];
  if (!recebida || !compararSegredos_(recebida, esperada)) throw new Error('API key inválida ou ausente.');
}

/** Compara segredos sem encerrar antecipadamente por diferença de conteúdo. */
function compararSegredos_(recebida, esperada) {
  const left = String(recebida || '');
  const right = String(esperada || '');
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

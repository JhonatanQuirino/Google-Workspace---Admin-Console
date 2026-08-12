/** Ponto de entrada HTTP do Web App. */
function doGet() {
  return resposta_({ status: 'ok', service: 'senior-post-receiver', timestamp: new Date().toISOString() });
}

function doPost(e) {
  const executionId = Utilities.getUuid();
  try {
    validarApiKey_(e);
    const colaboradores = normalizarColaboradores_(lerPayload_(e));
    const queueId = criarFilaSenior_(colaboradores, executionId);
    console.info({ event: 'SENIOR_POST_QUEUED', execution_id: executionId, queue_id: queueId, total: colaboradores.length });
    return resposta_({ status: 'queued', execution_id: executionId, queue_id: queueId, total_colaboradores: colaboradores.length });
  } catch (error) {
    console.error({ event: 'SENIOR_POST_ERROR', execution_id: executionId, error: error.message });
    return resposta_({ status: 'error', execution_id: executionId, message: 'Não foi possível processar a solicitação.' });
  }
}

function resposta_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function lerPayload_(e) {
  const raw = e && e.postData && e.postData.contents ? String(e.postData.contents).trim() : '';
  if (!raw) throw new Error('Corpo do POST vazio.');
  if (raw.length > 1024 * 1024) throw new Error('Corpo do POST excede o limite permitido.');
  try { return JSON.parse(raw); } catch (_error) {}
  const parametro = e && e.parameter && (e.parameter.payload || e.parameter.data || e.parameter.json);
  if (parametro) return JSON.parse(parametro);
  throw new Error('O corpo do POST deve conter JSON válido.');
}

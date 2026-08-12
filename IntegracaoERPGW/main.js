/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Endpoint do Web App. O JWT deve ser enviado no corpo JSON porque o Apps Script
 * não expõe cabeçalhos HTTP ao objeto de evento de doPost.
 *
 * { "token": "<jwt-hs256>", "source": "senior", "records": [{ ... }] }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Corpo JSON obrigatório.');
    const request = JSON.parse(e.postData.contents);
    const claims = validarJwtEntrada(request.token);
    const records = _extrairRegistrosEntrada(request);
    const colaboradores = normalizarRegistrosERP(records, request.source || claims.iss || 'erp');
    const result = salvarColaboradoresNoFirebase(colaboradores);
    return _respostaJson(200, { ok: result.failed === 0, received: colaboradores.length, saved: result.saved, failed: result.failed, errors: result.errors });
  } catch (error) {
    console.error({ event: 'ERP_POST_REJECTED', error: error.message });
    return _respostaJson(400, { ok: false, error: error.message });
  }
}

/** Coleta REST genérica para ERPs que não conseguem enviar webhooks. */
function sincronizarERP() {
  if (!ERP_CONFIG.source.url) throw new Error('ERP_SOURCE_URL não configurada.');
  const headers = _lerJsonConfig(ERP_CONFIG.source.headersJson, {});
  const response = UrlFetchApp.fetch(ERP_CONFIG.source.url, {
    method: String(ERP_CONFIG.source.method || 'get').toLowerCase(), headers: headers, contentType: 'application/json', muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('ERP respondeu ' + response.getResponseCode() + '.');
  const payload = JSON.parse(response.getContentText());
  const records = ERP_CONFIG.source.recordsPath ? _obterCaminho(payload, ERP_CONFIG.source.recordsPath) : _extrairRegistrosEntrada(payload);
  const colaboradores = normalizarRegistrosERP(records, 'erp-pull');
  return salvarColaboradoresNoFirebase(colaboradores);
}

function _extrairRegistrosEntrada(request) {
  if (Array.isArray(request)) return request;
  if (Array.isArray(request.records)) return request.records;
  if (Array.isArray(request.data)) return request.data;
  throw new Error('Informe os registros em records ou data.');
}

function _respostaJson(status, body) {
  return ContentService.createTextOutput(JSON.stringify({ status: status, body: body })).setMimeType(ContentService.MimeType.JSON);
}

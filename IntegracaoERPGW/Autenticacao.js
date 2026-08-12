/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

function validarJwtEntrada(token) {
  if (!token || !ERP_CONFIG.inbound.jwtSecret) {
    throw new Error('JWT ausente ou INBOUND_JWT_SECRET não configurada.');
  }

  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('JWT inválido.');

  const header = _parseJwtPart(parts[0]);
  const payload = _parseJwtPart(parts[1]);
  if (header.alg !== 'HS256') throw new Error('JWT deve usar HS256.');

  const signature = Utilities.computeHmacSha256Signature(parts[0] + '.' + parts[1], ERP_CONFIG.inbound.jwtSecret);
  const expected = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  if (!_compararStringsSeguro(expected, parts[2])) throw new Error('Assinatura JWT inválida.');

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) <= now) throw new Error('JWT expirado ou sem expiração.');
  if (payload.nbf && Number(payload.nbf) > now) throw new Error('JWT ainda não está válido.');
  if (ERP_CONFIG.inbound.issuer && payload.iss !== ERP_CONFIG.inbound.issuer) throw new Error('Emissor JWT inválido.');
  if (ERP_CONFIG.inbound.audience && !_jwtAudienceContem(payload.aud, ERP_CONFIG.inbound.audience)) throw new Error('Audiência JWT inválida.');
  return payload;
}

function _parseJwtPart(part) {
  try {
    return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(part)).getDataAsString());
  } catch (error) {
    throw new Error('JWT com conteúdo inválido.');
  }
}

function _compararStringsSeguro(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}

function _jwtAudienceContem(audience, expected) {
  return Array.isArray(audience) ? audience.indexOf(expected) !== -1 : audience === expected;
}

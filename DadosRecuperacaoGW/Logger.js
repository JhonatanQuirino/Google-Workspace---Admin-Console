/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

// Simple Logger wrapper to avoid runtime errors when a global Logger is expected.
// Maps to console methods and stringifies objects for clearer logs.
var Logger = (function () {
  function fmt(msg) {
    try {
      if (typeof msg === 'object') return JSON.stringify(msg);
    } catch (e) {
      return String(msg);
    }
    return msg;
  }

  return {
    info: function (m) { console.info(fmt(m)); },
    warn: function (m) { console.warn(fmt(m)); },
    error: function (m) { console.error(fmt(m)); },
    debug: function (m) { if (console.debug) console.debug(fmt(m)); else console.log(fmt(m)); },

    // Sanitize object by removing/masking sensitive fields and exposing only full name when available.
    _maskValue: function (key, value) {
      if (!value && value !== 0) return null;
      const k = String(key || '').toLowerCase();
      if (k.includes('email')) return null; // remove emails
      if (k.includes('cpf')) return null; // remove CPFs
      if (k.includes('phone') || k.includes('telefone') || k.includes('celular')) return null; // remove phones
      if (k.includes('token') || k.includes('access') || k.includes('jwt')) return '[REDACTED]';
      return value;
    },

    _extractName: function (obj) {
      if (!obj || typeof obj !== 'object') return null;
      if (obj.name && typeof obj.name === 'string') return obj.name;
      if (obj.nomeCompleto) return obj.nomeCompleto;
      if (obj.name && (obj.name.fullName || (obj.name.givenName && obj.name.familyName))) {
        return obj.name.fullName || (obj.name.givenName + ' ' + obj.name.familyName).trim();
      }
      return null;
    },

    _sanitize: function (input) {
      try {
        if (!input || typeof input !== 'object') return input;
        const out = {};
        const name = this._extractName(input) || this._extractName(input.usuario) || this._extractName(input.dadosHCM) || null;
        if (name) out.name = name;
        for (const k in input) {
          if (!Object.prototype.hasOwnProperty.call(input, k)) continue;
          const v = input[k];
          const masked = this._maskValue(k, v);
          if (masked !== null) out[k] = masked;
        }
        return out;
      } catch (e) {
        return { error: 'sanitize_error' };
      }
    },

    // JSON log with sanitization; level = 'info'|'warn'|'error'|'log'
    json: function (level, obj) {
      try {
        const sanitized = this._sanitize(obj);
        const payload = typeof sanitized === 'object' ? sanitized : { message: sanitized };
        if (console[level]) console[level](JSON.stringify(payload)); else console.log(JSON.stringify(payload));
      } catch (e) {
        console.log(JSON.stringify({ event: 'logger_json_error' }));
      }
    }
  };
})();

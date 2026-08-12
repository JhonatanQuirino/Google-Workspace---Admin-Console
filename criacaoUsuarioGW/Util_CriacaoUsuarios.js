/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

class UtilsCriacaoUsuarios {
  static normalizeName(name) {
    if (!name) return '';
    return String(name).toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');
  }

  static padronizarCPF(cpfValor) {
    if (!cpfValor) return '';
    const cpfLimpo = String(cpfValor).replace(/\D/g, '');
    return cpfLimpo.padStart(11, '0');
  }

  static gerarSenhaPrimeiroNomeCPF(firstName, cpfValor) {
    const primeiroNomeBase = String(firstName || '').trim().split(/\s+/)[0] || '';
    const primeiroNome = UtilsCriacaoUsuarios.normalizeName(primeiroNomeBase) || 'usuario';
    const cpfPadronizado = UtilsCriacaoUsuarios.padronizarCPF(cpfValor);
    return `${primeiroNome}@${cpfPadronizado}`;
  }
}

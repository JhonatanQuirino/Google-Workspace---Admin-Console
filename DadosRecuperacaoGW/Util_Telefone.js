/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */



// Utilitários de telefone
class UtilsTelefone {

  static validar(telefone) {
    if (!telefone || typeof telefone !== 'string') return false;

    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Deve ter 10 ou 11 dígitos (sem código do país) ou 12-13 com código do país
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 13) return false;

    let ddd, numero;
    
    // Com código do país
    if (telefoneLimpo.length > 11) {
      if (!telefoneLimpo.startsWith('55')) return false;
      const semCodPais = telefoneLimpo.substring(2);
      ddd = parseInt(semCodPais.substring(0, 2));
      numero = semCodPais.substring(2);
    } else {
      // Sem código do país
      ddd = parseInt(telefoneLimpo.substring(0, 2));
      numero = telefoneLimpo.substring(2);
    }

    // DDD deve ser válido (11-99)
    if (ddd < 11 || ddd > 99) return false;

    // Validar formato do número
    if (numero.length === 9) {
      // Celular: 9 dígitos começando com 9
      return numero[0] === '9';
    } else if (numero.length === 8) {
      // Fixo: 8 dígitos NÃO começando com 9
      return numero[0] !== '9';
    }

    return false;
  }


  static normalizar(telefone) {
    if (!telefone || typeof telefone !== 'string') return null;

    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Se já está no formato +55XXXXXXXXXXX (13 dígitos: código país + DDD + 9 dígitos celular)
    if (telefoneLimpo.length === 13 && telefoneLimpo.startsWith('55')) {
      const semCodPais = telefoneLimpo.substring(2); // Remove "55"
      const ddd = parseInt(semCodPais.substring(0, 2));
      const numero = semCodPais.substring(2);
      
      // Validar: DDD válido (11-99) e número com 9 dígitos começando com 9 (celular)
      if (semCodPais.length === 11 && ddd >= 11 && ddd <= 99 && numero.length === 9 && numero[0] === '9') {
        return '+' + telefoneLimpo;
      }
      return null; // Formato de 13 dígitos, mas inválido
    }

    // Se tem 12 dígitos: código país + DDD + 8 dígitos (telefone fixo)
    if (telefoneLimpo.length === 12 && telefoneLimpo.startsWith('55')) {
      const semCodPais = telefoneLimpo.substring(2);
      const ddd = parseInt(semCodPais.substring(0, 2));
      const numero = semCodPais.substring(2);
      
      // Validar: DDD válido, número com 8 dígitos (fixo) e NÃO começa com 9
      if (semCodPais.length === 10 && ddd >= 11 && ddd <= 99 && numero.length === 8 && numero[0] !== '9') {
        return '+' + telefoneLimpo;
      }
      return null;
    }

    // Telefones sem código do país: 11 dígitos (celular) ou 10 dígitos (fixo)
    if (telefoneLimpo.length === 11) {
      const ddd = parseInt(telefoneLimpo.substring(0, 2));
      const numero = telefoneLimpo.substring(2);
      
      // Celular: DDD + 9XXXXXXXX
      if (ddd >= 11 && ddd <= 99 && numero.length === 9 && numero[0] === '9') {
        return '+55' + telefoneLimpo;
      }
      return null;
    }

    if (telefoneLimpo.length === 10) {
      const ddd = parseInt(telefoneLimpo.substring(0, 2));
      const numero = telefoneLimpo.substring(2);
      
      // Fixo: DDD + 8 dígitos que NÃO começam com 9
      if (ddd >= 11 && ddd <= 99 && numero.length === 8 && numero[0] !== '9') {
        return '+55' + telefoneLimpo;
      }
      return null;
    }

    // Formato inválido
    return null;
  }
}

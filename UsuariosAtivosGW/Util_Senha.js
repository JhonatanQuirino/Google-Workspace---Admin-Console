/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Corrige e regrava a chave privada do Firebase nas propriedades do Apps Script.
 * Garante que as quebras de linha estejam no formato correto (\n).
 * Execute esta função uma vez para corrigir a chave.
 */
function corrigirChavePrivadaFirebase() {
  var prop = PropertiesService.getScriptProperties();
  var chaveAtual = prop.getProperty('FIREBASE_PRIVATE_KEY');
  if (!chaveAtual) {
    Logger.log('Chave privada não encontrada nas propriedades.');
    return;
  }
  // Corrige quebras de linha reais para \n
  var chaveCorrigida = chaveAtual
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/\\n+/g, '\\n'); // Remove quebras duplicadas
  prop.setProperty('FIREBASE_PRIVATE_KEY', chaveCorrigida);
  Logger.log('Chave privada corrigida e salva com sucesso.');
}


// Utilitários de senha
class UtilsSenha {

  static get MINIMO_CARACTERES() { return 8; }
  static get MAXIMO_CARACTERES() { return 128; }


  static gerar(comprimento = 12, opcoes = {}) {
    if (comprimento < this.MINIMO_CARACTERES) {
      comprimento = this.MINIMO_CARACTERES;
    }
    if (comprimento > this.MAXIMO_CARACTERES) {
      comprimento = this.MAXIMO_CARACTERES;
    }

    const {
      usarMaiusculas = true,
      usarMinusculas = true,
      usarNumeros = true,
      usarEspeciais = true,
      excluirAmbiguos = true
    } = opcoes;

    let chars = '';

    if (usarMaiusculas) {
      chars += excluirAmbiguos ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    if (usarMinusculas) {
      chars += excluirAmbiguos ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }
    if (usarNumeros) {
      chars += excluirAmbiguos ? '23456789' : '0123456789';
    }
    if (usarEspeciais) {
      chars += '!@#$%^&*-_=+';
    }

    let senha = '';
    for (let i = 0; i < comprimento; i++) {
      const indice = Math.floor(Math.random() * chars.length);
      senha += chars.charAt(indice);
    }

    return senha;
  }


  static gerarPronunciavel(numPalavras = 3) {
    const palavras = [
      'gato', 'cachorro', 'árvore', 'montanha', 'rio', 'praia', 'nuvem', 'sol',
      'lua', 'estrela', 'vento', 'chuva', 'flor', 'pássaro', 'peixe', 'leão',
      'tigre', 'elefante', 'borboleta', 'abelha', 'cobra', 'coelho', 'raposa', 'urso',
      'lobo', 'coruja', 'falcão', 'águia', 'cisne', 'pavão', 'pinguim', 'golfinho'
    ];

    let senha = '';
    for (let i = 0; i < numPalavras; i++) {
      const palavra = palavras[Math.floor(Math.random() * palavras.length)];
      const numero = Math.floor(Math.random() * 100);
      senha += palavra + numero;
      if (i < numPalavras - 1) senha += '-';
    }

    return senha;
  }


  static validarForca(senha) {
    const problemas = [];
    let score = 0;

    if (!senha || typeof senha !== 'string') {
      return {
        forca: 'FRACA',
        score: 0,
        problemas: ['Senha vazia']
      };
    }


    if (senha.length < 8) {
      problemas.push('Menos de 8 caracteres');
    } else if (senha.length < 12) {
      score += 15;
    } else if (senha.length < 16) {
      score += 20;
    } else {
      score += 25;
    }


    if (/[A-Z]/.test(senha)) {
      score += 15;
    } else {
      problemas.push('Sem letras maiúsculas');
    }


    if (/[a-z]/.test(senha)) {
      score += 15;
    } else {
      problemas.push('Sem letras minúsculas');
    }


    if (/\d/.test(senha)) {
      score += 15;
    } else {
      problemas.push('Sem números');
    }


    if (/[!@#$%^&*\-_=+]/.test(senha)) {
      score += 20;
    } else {
      problemas.push('Sem caracteres especiais');
    }


    if (/(.)\1{2,}/.test(senha)) {
      problemas.push('Caracteres repetidos consecutivos');
      score -= 10;
    }

    if (/^(123|abc|senha|password|12345)/i.test(senha)) {
      problemas.push('Padrão comum detectado');
      score -= 20;
    }


    let forca = 'FRACA';
    if (score >= 75) {
      forca = 'MUI_FORTE';
    } else if (score >= 55) {
      forca = 'FORTE';
    } else if (score >= 35) {
      forca = 'MODERADA';
    }

    return {
      forca,
      score: Math.max(0, Math.min(100, score)),
      problemas
    };
  }


  static atendeCriteriosMinimos(senha) {
    if (!senha || typeof senha !== 'string') return false;

    const validacao = this.validarForca(senha);
    return validacao.score >= 35;
  }


  static hash(senha) {
    if (!senha || typeof senha !== 'string') return '';


    const signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      senha,
      Utilities.Charset.UTF_8
    );


    return signature
      .map((byte) => {
        const hex = (byte & 0xff).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
  }


  static verificarHash(senha, hashArmazenado) {
    if (!senha || !hashArmazenado) return false;

    const hashCalculado = this.hash(senha);
    return hashCalculado === hashArmazenado;
  }


  static mascarar(senha) {
    if (!senha || typeof senha !== 'string') return '';

    return '*'.repeat(Math.min(senha.length, 20));
  }


  static gerarDica() {
    const dicas = [
      'Use uma combinação de maiúsculas, minúsculas, números e símbolos',
      'Evite palavras comuns ou datas de nascimento',
      'Mínimo 12 caracteres para máxima segurança',
      'Não reutilize senhas em múltiplos sites',
      'Mude sua senha regularmente (a cada 90 dias)',
      'Use uma frase memorável e adicione números/símbolos',
      'Evite padrões sequenciais (abc123, 12345)',
      'Considere usar um gerenciador de senhas'
    ];

    return dicas[Math.floor(Math.random() * dicas.length)];
  }


  static gerarLote(quantidade = 1, comprimento = 12, opcoes = {}) {
    const senhas = [];

    for (let i = 0; i < quantidade; i++) {
      senhas.push(this.gerar(comprimento, opcoes));
    }

    return senhas;
  }


  static verificarExpiracao(dataCriacao, diasValidade = 90) {
    const criacao = new Date(dataCriacao);
    const expiracao = new Date(criacao.getTime() + diasValidade * 24 * 60 * 60 * 1000);
    const agora = new Date();

    const diasRestantes = Math.floor((expiracao - agora) / (24 * 60 * 60 * 1000));

    return {
      expirou: diasRestantes < 0,
      diasRestantes: Math.max(0, diasRestantes),
      dataExpiracao: expiracao.toISOString()
    };
  }
}

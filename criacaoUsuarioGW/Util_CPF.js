

class UtilsCPF {

  static validar(cpf) {
    if (!cpf || typeof cpf !== 'string') return false;

    const cpfLimpo = cpf.replace(/\D/g, '');


    if (cpfLimpo.length !== 11) return false;


    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;


    let soma = 0;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false;


    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.substring(10, 11))) return false;

    return true;
  }


  static normalizar(cpf) {
    if (!cpf || typeof cpf !== 'string') return null;

    const cpfLimpo = cpf.replace(/\D/g, '');

    if (this.validar(cpfLimpo)) {
      return cpfLimpo;
    }

    return null;
  }


  static formatar(cpf) {
    const cpfNormalizado = this.normalizar(cpf);
    if (!cpfNormalizado) return '';

    return cpfNormalizado.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4'
    );
  }


  static gerar() {

    let digitos = '';
    for (let i = 0; i < 9; i++) {
      digitos += Math.floor(Math.random() * 10);
    }


    let soma = 0;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(digitos.substring(i - 1, i)) * (11 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    digitos += resto;


    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(digitos.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    digitos += resto;

    return digitos;
  }


  static extrairDigitosVerificadores(cpf) {
    const cpfNormalizado = this.normalizar(cpf);
    if (!cpfNormalizado) return null;

    return {
      verificador1: parseInt(cpfNormalizado.substring(9, 10)),
      verificador2: parseInt(cpfNormalizado.substring(10, 11))
    };
  }


  static mascarar(cpf) {
    const cpfNormalizado = this.normalizar(cpf);
    if (!cpfNormalizado) return '';

    const primeiros = cpfNormalizado.substring(0, 6);
    return primeiros.replace(/(\d{3})(\d{3})/, '$1.$2.***-**');
  }


  static saoIguais(cpf1, cpf2) {
    const norm1 = this.normalizar(cpf1);
    const norm2 = this.normalizar(cpf2);

    return norm1 !== null && norm1 === norm2;
  }
}

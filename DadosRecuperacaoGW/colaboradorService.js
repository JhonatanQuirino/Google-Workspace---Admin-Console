/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Serviço para manipulação de colaboradores no Firebase.
 * Adapte as funções conforme sua necessidade.
 */


/**
 * Serviço de domínio para Colaborador, com alta coesão e baixo acoplamento.
 * Recebe um repositório de persistência (ex: FirebaseRepository) via injeção de dependência.
 */
class ColaboradorService {
  constructor(colaborador, repository) {
    this.dados = colaborador || {};
    this.repository = repository;
  }

  tratarDados() {
    // Se tiver nomeCompleto, formata e divide em firstName e lastName
    if (this.dados.nomeCompleto && typeof this.dados.nomeCompleto === 'string') {
      // Formata nomeCompleto em title case (primeira letra de cada palavra maiúscula)
      this.dados.nomeCompleto = UtilsGlobal.formatarTitleCase(this.dados.nomeCompleto);
      
      // Divide nomeCompleto em firstName e lastName se não foram informados
      const partes = this.dados.nomeCompleto.trim().split(/\s+/);
      if (partes.length > 0) {
        if (!this.dados.firstName || this.dados.firstName === '') {
          this.dados.firstName = partes[0];
        }
        if (!this.dados.lastName || this.dados.lastName === '') {
          this.dados.lastName = partes.length > 1 ? partes.slice(1).join(' ') : '';
        }
      }
    }
    
    // Formata cargo em title case (primeira letra de cada palavra maiúscula)
    if (this.dados.cargo && typeof this.dados.cargo === 'string') {
      this.dados.cargo = UtilsGlobal.formatarTitleCase(this.dados.cargo);
    }
    
    // Formata departamento em title case (primeira letra de cada palavra maiúscula)
    if (this.dados.departamento && typeof this.dados.departamento === 'string') {
      this.dados.departamento = UtilsGlobal.formatarTitleCase(this.dados.departamento);
    }
    
    // Garante que os campos firstName, lastName e horaAgendamento existam, mesmo que vazios
    this.dados.firstName = (typeof this.dados.firstName !== 'undefined') ? this.dados.firstName : '';
    this.dados.lastName = (typeof this.dados.lastName !== 'undefined') ? this.dados.lastName : '';
    this.dados.horaAgendamento = (typeof this.dados.horaAgendamento !== 'undefined') ? this.dados.horaAgendamento : '';
    return this.dados;
  }

  adicionarAuditoria(tipo, usuario) {
    let registro = {
      tipo: tipo,
      usuario: usuario,
      data: new Date().toISOString(),
      ultimaModificacao: UtilsGlobal.formatarDataBR(new Date())
    };
    // Se receber um dePara, adiciona
    if (arguments.length > 2 && arguments[2]) {
      registro.dePara = arguments[2];
    }
    // Auditoria agora é um objeto, não array
    this.dados.auditoria = registro;
  }

  salvar() {
    // Garante tratamento dos campos antes de salvar
    this.tratarDados();
    if (!this.dados.cpf) throw new Error('CPF não informado.');
    return this.repository.write('colaboradores/' + this.dados.cpf, this.dados);
  }

  static buscarPorCPF(cpf, repository) {
    return repository.read('colaboradores/' + cpf);
  }
}

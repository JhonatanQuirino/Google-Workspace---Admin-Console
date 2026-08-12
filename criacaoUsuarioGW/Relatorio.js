/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Classe para gerenciar relatórios de Onboarding
 * Responsável pela geração e envio de relatórios de novos colaboradores
 */

class RelatorioOnboarding {
  /**
   * Gera relatório manual da semana anterior
   * @public
   * @static
   */
  static gerarManualSemanaAnterior() {
    const execId = Utilities.getUuid();
    console.log(`[${execId}] RelatorioOnboarding.gerarManualSemanaAnterior - INÍCIO MANUAL`);

    try {
      if (typeof verificarServicoAdminDirectory === 'function' && !verificarServicoAdminDirectory()) {
        console.warn(`[${execId}] RelatorioOnboarding.gerarManualSemanaAnterior - Serviço Admin Directory indisponível`);
        return;
      }

      const periodo = RelatorioOnboarding._calcularPeriodoSemanaAnterior();
      const novosColaboradores = RelatorioOnboarding._buscarColaboradoresPeriodo(periodo.inicio, periodo.fim);

      if (novosColaboradores.length === 0) {
        console.log(`[${execId}] RelatorioOnboarding.gerarManualSemanaAnterior - Nenhum colaborador encontrado entre ${periodo.formatado}`);
        return;
      }

      console.log(`[${execId}] RelatorioOnboarding.gerarManualSemanaAnterior - ${novosColaboradores.length} colaboradores encontrados`);

      const htmlBody = RelatorioOnboarding._criarHTMLInline({
        titulo: 'Relatório (Manual) de Novos Colaboradores',
        descricao: `Este é o relatório gerado <b>manualmente</b> referente aos <b>${novosColaboradores.length}</b> novos colaboradores da semana passada (Período: <b>${periodo.formatado}</b>).`,
        linhasColaboradores: novosColaboradores.map(colaborador => {
          const dataCriacaoFormatada = new Date(colaborador.creationTime).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
          const nome = colaborador.name?.fullName || 'N/A';
          const email = colaborador.primaryEmail || 'N/A';
          const cpf = colaborador.customSchemas?.Informacoes_HCM?.CPF || 'Não informado';
          return RelatorioOnboarding._criarLinhaTabela({ nome, email, cpf, data: dataCriacaoFormatada });
        }).join(''),
        isManual: true
      });

      const assunto = `[MANUAL] Relatório de Novos Colaboradores - ${periodo.formatado}`;

      try {
        GmailApp.sendEmail(CEP_EMAIL, assunto, '', {
          cc: `${GP_EMAIL},${INTEGRATION}`,
          htmlBody: htmlBody,
          name: NOME_REMETENTE,
          from: EMAIL_REMETENTE
        });
        console.log(`[${execId}] RelatorioOnboarding.gerarManualSemanaAnterior - Email enviado com sucesso`);
      } catch (emailError) {
        RelatorioOnboarding._salvarRelatorioDrive(htmlBody, periodo.inicio, execId);
      }

    } catch (e) {
      RelatorioOnboarding._tratarErro('gerarManualSemanaAnterior', e, execId);
    }
  }

  /**
   * Calcula o período da semana atual (domingo a sábado)
   * @private
   * @static
   * @returns {Object} Objeto com datas de início, fim e string formatada
   */
  static _calcularPeriodoSemanaAtual() {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(fimSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    return {
      inicio: inicioSemana,
      fim: fimSemana,
      formatado: RelatorioOnboarding._formatarPeriodo(inicioSemana, fimSemana)
    };
  }

  /**
   * Calcula o período da semana anterior
   * @private
   * @static
   * @returns {Object} Objeto com datas de início, fim e string formatada
   */
  static _calcularPeriodoSemanaAnterior() {
    const hoje = new Date();
    const domingoAtual = new Date(hoje);
    domingoAtual.setDate(hoje.getDate() - hoje.getDay());

    const inicioSemana = new Date(domingoAtual);
    inicioSemana.setDate(domingoAtual.getDate() - 7);
    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    return {
      inicio: inicioSemana,
      fim: fimSemana,
      formatado: RelatorioOnboarding._formatarPeriodo(inicioSemana, fimSemana)
    };
  }

  /**
   * Formata período de datas para exibição
   * @private
   * @static
   * @param {Date} dataInicio - Data inicial
   * @param {Date} dataFim - Data final
   * @returns {string} String formatada do período
   */
  static _formatarPeriodo(dataInicio, dataFim) {
    const formatoData = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return `${dataInicio.toLocaleDateString('pt-BR', formatoData)} a ${dataFim.toLocaleDateString('pt-BR', formatoData)}`;
  }

  /**
   * Busca colaboradores criados dentro de um período específico
   * @private
   * @static
   * @param {Date} dataInicio - Data inicial do período
   * @param {Date} dataFim - Data final do período
   * @returns {Array} Lista de colaboradores encontrados
   */
  static _buscarColaboradoresPeriodo(dataInicio, dataFim) {
    const todosUsuariosObj = _criacao_listarUsuariosGW(NOME_DOMINIO);
    
    if (!todosUsuariosObj) {
      console.error("RelatorioOnboarding._buscarColaboradoresPeriodo - Falha ao listar usuários");
      throw new Error("Falha ao listar usuários do Google Workspace");
    }

    const todosUsuarios = Object.values(todosUsuariosObj);
    
    return todosUsuarios.filter(usuario => {
      if (!usuario.creationTime) return false;
      const dataCriacao = new Date(usuario.creationTime);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });
  }

  /**
   * Monta HTML do relatório a partir dos dados
   * @private
   * @static
   * @param {Object} params - Parâmetros do relatório
   * @returns {string} HTML completo do relatório
   */
  // ...existing code...

  /**
   * Cria linha de tabela HTML para um colaborador
   * @private
   * @static
   * @param {Object} dados - Dados do colaborador
   * @returns {string} HTML da linha da tabela
   */
  static _criarLinhaTabela(dados) {
    const tdStyle = "border: 1px solid #dddddd; text-align: left; padding: 12px; font-size: 14px;";
    return `<tr><td style="${tdStyle}">${dados.nome}</td><td style="${tdStyle}">${dados.email}</td><td style="${tdStyle}">${dados.cpf}</td><td style="${tdStyle}">${dados.data}</td></tr>`;
  }

  /**
   * Cria HTML inline completo quando template não está disponível
   * @private
   * @static
   * @param {Object} params - Parâmetros do HTML
   * @returns {string} HTML completo
   */
  static _criarHTMLInline(params) {
    const { titulo, descricao, linhasColaboradores, isManual } = params;
    
    const tableStyle = "border-collapse: collapse; width: 100%; max-width: 800px; font-family: Arial, sans-serif; border: 1px solid #dddddd; margin-top: 20px;";
    const thStyle = "border: 1px solid #dddddd; text-align: left; padding: 12px; background-color: #f8f8f8; font-weight: bold; color: #333333;";
    const h2Style = "font-family: Arial, sans-serif; color: #1f4e79;";
    const pStyle = "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;";
    const alertStyle = "background: #e7f5ff; border-left: 5px solid #667eea; padding: 15px 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; color: #374151; font-weight: 600; font-family: Arial, sans-serif;";

    let html = `<h2 style="${h2Style}">${titulo}</h2>`;
    html += `<p style="${pStyle}">Olá,</p>`;
    html += `<p style="${pStyle}">${descricao}</p>`;
    html += `<div style="${alertStyle}">✓ <strong style="color: #667eea;">Lista de Novos Colaboradores</strong> — Confira abaixo todos os novos usuários criados neste período</div>`;
    html += `<table style="${tableStyle}">`;
    html += `<thead><tr><th style="${thStyle}">Nome Completo</th><th style="${thStyle}">E-mail</th><th style="${thStyle}">CPF</th><th style="${thStyle}">Data Criação</th></tr></thead>`;
    html += `<tbody>${linhasColaboradores}</tbody></table>`;
    html += `<p style="${pStyle}"><br>Atenciosamente,<br><strong>Integração HCM</strong>${isManual ? ' (Execução Manual)' : ''}</p>`;

    return html;
  }

  /**
   * Salva relatório no Drive quando falha o envio por email
   * @private
   * @static
   * @param {string} htmlBody - HTML do relatório
   * @param {Date} dataReferencia - Data de referência para nome do arquivo
   * @param {string} execId - ID de execução
   */
  static _salvarRelatorioDrive(htmlBody, dataReferencia, execId) {
    try {
      const nomeArquivo = `Relatorio_Manual_${dataReferencia.toISOString().split('T')[0]}.html`;
      const blob = Utilities.newBlob(htmlBody, MimeType.HTML, nomeArquivo);
      const arquivo = DriveApp.createFile(blob);
      console.log(`[${execId}] RelatorioOnboarding - Cota excedida. Relatório salvo no Drive: ${arquivo.getUrl()}`);
    } catch (driveError) {
      console.error(`[${execId}] RelatorioOnboarding - Falha total (Email e Drive): ${driveError.message}`);
    }
  }

  /**
   * Trata erros e envia notificações
   * @private
   * @static
   * @param {string} metodo - Nome do método que gerou o erro
   * @param {Error} erro - Objeto de erro
   * @param {string} execId - ID de execução
   */
  static _tratarErro(metodo, erro, execId) {
    console.error(`[${execId}] RelatorioOnboarding.${metodo} - ERRO FATAL: ${erro.message}. Stack: ${erro.stack}`);
    
    try {
      GmailApp.sendEmail(
        EMAIL_ERRO_NOTIFICACAO,
        `🚨 Erro Crítico ao Gerar Relatório de Onboarding (${metodo})`,
        `Ocorreu um erro na automação 'RelatorioOnboarding.${metodo}':\n\n${erro.message}\n\nStack Trace:\n${erro.stack}\n\nExecution ID: ${execId}`,
        {
          name: NOME_REMETENTE,
          from: EMAIL_REMETENTE
        }
      );
      console.log(`[${execId}] RelatorioOnboarding - Email de alerta enviado`);
    } catch (mailError) {
      console.error(`[${execId}] RelatorioOnboarding - Falha ao enviar email de erro: ${mailError.message}`);
    }
  }
}

// ============================================
// FUNÇÕES DE COMPATIBILIDADE (Deprecated)
// Manter por compatibilidade com triggers existentes
// ============================================
/**
 * @deprecated Use RelatorioOnboarding.gerarManualSemanaAnterior()
 */
function gerarRelatorioManualSemanaAnterior() {
  RelatorioOnboarding.gerarManualSemanaAnterior();
}

/*
 * Processamento exclusivo de colaboradores desligados em situação de suspensão.
 * Neste projeto, só lidamos com usuários que devem ir para a unidade organizacional de desligados.
 * 
 * NOTA IMPORTANTE: Esta função é invocada automaticamente pelo fluxo de sincronização em Main.js.
 * Não deve ser chamada isoladamente no Apps Script Editor sem parâmetros válidos.
 */
function processarColaboradorDesligado(colaborador, usuarioGW) {
  if (!colaborador || typeof colaborador !== 'object') {
    console.warn({
      event: "PROCESSAR_DESLIGADO_COLABORADOR_NULL_OU_INVALIDO",
      colaborador_type: typeof colaborador,
      colaborador_value: colaborador,
      usuarioGW_primaryEmail: usuarioGW && usuarioGW.primaryEmail ? usuarioGW.primaryEmail : null,
      stack_trace: new Error().stack,
      reason: "Colaborador é null, undefined ou não é um objeto"
    });
    return;
  }

  const colaboradorInfo = obterIdentificacaoColaborador(colaborador);

  if (!colaboradorInfo.cpf && !colaboradorInfo.emailProfissional) {
    console.warn({
      event: "PROCESSAR_DESLIGADO_COLABORADOR_SEM_IDENTIFICACAO",
      cpf: colaboradorInfo.cpf,
      emailProfissional: colaboradorInfo.emailProfissional,
      colaborador_keys: colaborador ? Object.keys(colaborador) : null,
      colaborador_cpf_raw: colaborador && colaborador.cpf ? colaborador.cpf : null,
      colaborador_emailProfissional_raw: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
      reason: "Colaborador HCM sem cpf e sem emailProfissional"
    });
    return;
  }

  if (!usuarioGW || !usuarioGW.primaryEmail || typeof usuarioGW.primaryEmail !== 'string' || !usuarioGW.primaryEmail.trim()) {
    console.warn({
      event: "PROCESSAR_DESLIGADO_USUARIO_INVALIDO",
      cpf: colaboradorInfo.cpf,
      emailProfissional: colaboradorInfo.emailProfissional,
      usuarioGW_primaryEmail: usuarioGW && usuarioGW.primaryEmail ? usuarioGW.primaryEmail : null,
      usuarioGW_orgUnitPath: usuarioGW && usuarioGW.orgUnitPath ? usuarioGW.orgUnitPath : null,
      usuarioGW_id: usuarioGW && usuarioGW.id ? usuarioGW.id : usuarioGW && usuarioGW.userKey ? usuarioGW.userKey : null,
      usuarioGW_suspended: usuarioGW && typeof usuarioGW.suspended !== 'undefined' ? usuarioGW.suspended : null,
      reason: "Usuário do Workspace inválido ou sem primaryEmail"
    });
    return;
  }

  const uoDesligado = `${SUSPENDED_OU_PATH}/Desligado`;
  moverParaOUComSenhaNova(usuarioGW, uoDesligado, colaborador, true, true);
  removerLicencasSeSituacaoExigir(usuarioGW, colaborador, colaborador.situacao);
}

/**
 * Sincroniza colaboradores das situações que exigem remoção de licença.
 * Pode ser executada isoladamente pelo Apps Script Editor.
 */
function sincronizarDesligados() {
  const execId = Utilities.getUuid();
  console.info({ event: "TRIGGER_DESLIGADOS_START", execution_id: execId });

  try {
    const usuarios = listarTodosOsUsuarios(NOME_DOMINIO);
    const colabs = lerTodosColaboradores();
    const config = { tabelaMapeamentoUO: typeof carregarMapeamentoUO === 'function' ? carregarMapeamentoUO() : {} };
    
    if (!colabs || colabs.length === 0) {
      console.warn({ event: "TRIGGER_DESLIGADOS_ABORT", reason: "No HCM data" });
      return;
    }

    const cpfParaEmailGW = buildCPFMap(usuarios);
    let total = 0;
    let suspensos = 0;
    let ignorados = 0;
    let erros = 0;

    colabs.forEach(colaborador => {
      const situacao = String(colaborador.situacao || '');
      if (!SITUACOES.REMOVER_LICENCAS.has(situacao)) return;

      if (!colaboradorTemIdentificacao(colaborador)) {
        ignorados++;
        return;
      }

      total++;
      try {
        const usuarioGW = obterUsuarioGW(colaborador, usuarios, cpfParaEmailGW);
        if (!isUsuarioGWValido(usuarioGW)) {
          console.warn({
            event: 'DESLIGADOS_COLABORADOR_SEM_USUARIO_GW',
            cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null,
            emailProfissional: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
            reason: 'Colaborador HCM sem usuário GW válido'
          });
          ignorados++;
          return;
        }

        if (ehUsuarioGenerico(usuarioGW.primaryEmail, usuarioGW.orgUnitPath)) {
          console.info({
            event: 'DESLIGADOS_IGNORED_GENERIC_UO',
            email: mascararEmailParaLog(usuarioGW.primaryEmail),
            reason: 'Usuário em UO genérica'
          });
          ignorados++;
          return;
        }

        if (deveBloquearSuspensaoPorDataAdmissao(colaborador, usuarioGW)) {
          ignorados++;
          return;
        }

        if (situacao === SITUACAO_DESLIGAMENTO) {
          processarColaboradorDesligado(colaborador, usuarioGW);
        } else {
          processarColaboradorAfastado(colaborador, usuarioGW, situacao);
        }
        suspensos++;
      } catch (e) {
        erros++;
        console.error({ 
          event: "DESLIGADOS_COLABORADOR_ERROR", 
          cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null, 
          error: e.message 
        });
      }
    });

    console.info({
      event: "TRIGGER_DESLIGADOS_COMPLETE",
      execution_id: execId,
      total: total,
      suspensos: suspensos,
      ignorados: ignorados,
      erros: erros
    });
  } catch (e) {
    console.error({ event: "TRIGGER_DESLIGADOS_FATAL_ERROR", error: e.message, stack: e.stack });
  }
}

/*
 * Processamento exclusivo de colaboradores afastados em situação de suspensão.
 * Neste projeto, só lidamos com usuários que devem ir para unidades organizacionais de suspensão.
 */
function mapearTipoAfastamento(codigoSituacao) {
  return SITUACAO_OU_MAP[String(codigoSituacao)] || SITUACAO_OU_DEFAULT;
}

// NOTA IMPORTANTE: processarColaboradorAfastado() é invocada automaticamente pelo fluxo de sincronização.
// Não deve ser chamada isoladamente no Apps Script Editor sem parâmetros válidos.
function processarColaboradorAfastado(colaborador, usuarioGW, situacao) {
  if (!colaborador || typeof colaborador !== 'object') {
    console.warn({
      event: "PROCESSAR_AFASTADO_COLABORADOR_NULL_OU_INVALIDO",
      colaborador_type: typeof colaborador,
      colaborador_value: colaborador,
      situacao: situacao,
      usuarioGW_primaryEmail: usuarioGW && usuarioGW.primaryEmail ? usuarioGW.primaryEmail : null,
      stack_trace: new Error().stack,
      reason: "Colaborador é null, undefined ou não é um objeto"
    });
    return;
  }

  const colaboradorInfo = obterIdentificacaoColaborador(colaborador);

  if (!colaboradorInfo.cpf && !colaboradorInfo.emailProfissional) {
    console.warn({
      event: "PROCESSAR_AFASTADO_COLABORADOR_SEM_IDENTIFICACAO",
      cpf: colaboradorInfo.cpf,
      emailProfissional: colaboradorInfo.emailProfissional,
      situacao: situacao,
      colaborador_keys: colaborador ? Object.keys(colaborador) : null,
      colaborador_cpf_raw: colaborador && colaborador.cpf ? colaborador.cpf : null,
      colaborador_emailProfissional_raw: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
      reason: "Colaborador HCM sem cpf e sem emailProfissional"
    });
    return;
  }

  if (!usuarioGW || !usuarioGW.primaryEmail || typeof usuarioGW.primaryEmail !== 'string' || !usuarioGW.primaryEmail.trim()) {
    console.warn({
      event: "PROCESSAR_AFASTADO_USUARIO_INVALIDO",
      cpf: colaboradorInfo.cpf,
      emailProfissional: colaboradorInfo.emailProfissional,
      situacao: situacao,
      usuarioGW_primaryEmail: usuarioGW && usuarioGW.primaryEmail ? usuarioGW.primaryEmail : null,
      usuarioGW_orgUnitPath: usuarioGW && usuarioGW.orgUnitPath ? usuarioGW.orgUnitPath : null,
      usuarioGW_id: usuarioGW && usuarioGW.id ? usuarioGW.id : usuarioGW && usuarioGW.userKey ? usuarioGW.userKey : null,
      usuarioGW_suspended: usuarioGW && typeof usuarioGW.suspended !== 'undefined' ? usuarioGW.suspended : null,
      reason: "Usuário do Workspace inválido ou sem primaryEmail"
    });
    return;
  }

  const tipoAfastamento = mapearTipoAfastamento(situacao);
  const uoAfastamento = `${SUSPENDED_OU_PATH}/${tipoAfastamento}`;
  moverParaOUComSenhaNova(usuarioGW, uoAfastamento, colaborador, true, false);
  removerLicencasSeSituacaoExigir(usuarioGW, colaborador, situacao);
}

/**
 * Sincroniza apenas colaboradores afastados (situações de afastamento).
 * Pode ser executada isoladamente pelo Apps Script Editor.
 */
function sincronizarAfastados() {
  const execId = Utilities.getUuid();
  console.info({ event: "TRIGGER_AFASTADOS_START", execution_id: execId });

  try {
    const usuarios = listarTodosOsUsuarios(NOME_DOMINIO);
    const colabs = lerTodosColaboradores();
    const config = { tabelaMapeamentoUO: typeof carregarMapeamentoUO === 'function' ? carregarMapeamentoUO() : {} };
    
    if (!colabs || colabs.length === 0) {
      console.warn({ event: "TRIGGER_AFASTADOS_ABORT", reason: "No HCM data" });
      return;
    }

    const cpfParaEmailGW = buildCPFMap(usuarios);
    let total = 0;
    let suspensos = 0;
    let ignorados = 0;
    let erros = 0;

    colabs.forEach(colaborador => {
      const situacao = String(colaborador.situacao || '');
      if (situacao === SITUACAO_DESLIGAMENTO || (!SITUACOES.AFASTAMENTO.has(situacao) && !SITUACOES.SUSPENSAO.has(situacao))) {
        return;
      }

      if (!colaboradorTemIdentificacao(colaborador)) {
        ignorados++;
        return;
      }

      total++;
      try {
        const usuarioGW = obterUsuarioGW(colaborador, usuarios, cpfParaEmailGW);
        if (!isUsuarioGWValido(usuarioGW)) {
          console.warn({
            event: 'AFASTADOS_COLABORADOR_SEM_USUARIO_GW',
            cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null,
            emailProfissional: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
            situacao: situacao,
            reason: 'Colaborador HCM sem usuário GW válido'
          });
          ignorados++;
          return;
        }

        if (ehUsuarioGenerico(usuarioGW.primaryEmail, usuarioGW.orgUnitPath)) {
          console.info({
            event: 'AFASTADOS_IGNORED_GENERIC_UO',
            email: mascararEmailParaLog(usuarioGW.primaryEmail),
            situacao: situacao,
            reason: 'Usuário em UO genérica'
          });
          ignorados++;
          return;
        }

        if (deveBloquearSuspensaoPorDataAdmissao(colaborador, usuarioGW)) {
          ignorados++;
          return;
        }

        processarColaboradorAfastado(colaborador, usuarioGW, situacao);
        suspensos++;
      } catch (e) {
        erros++;
        console.error({ 
          event: "AFASTADOS_COLABORADOR_ERROR", 
          cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null, 
          situacao: situacao,
          error: e.message 
        });
      }
    });

    console.info({
      event: "TRIGGER_AFASTADOS_COMPLETE",
      execution_id: execId,
      total: total,
      suspensos: suspensos,
      ignorados: ignorados,
      erros: erros
    });
  } catch (e) {
    console.error({ event: "TRIGGER_AFASTADOS_FATAL_ERROR", error: e.message, stack: e.stack });
  }
}

function reativarUsuario(usuarioGW, uoDestinoAtivo, colaborador) {
  try {
    const senha = gerarSenhaColaborador(colaborador);
    const dados = {
      password: senha,
      suspended: false,
      changePasswordAtNextLogin: true,
      orgUnitPath: uoDestinoAtivo
    };

    const payload = { ...dados };
    atualizarNomeEOU(usuarioGW, colaborador, uoDestinoAtivo);
    atualizarCustomSchemas(usuarioGW, colaborador);
    atualizarOrganizacao(usuarioGW, colaborador);
    atualizarManager(usuarioGW, colaborador);

    try {
      atualizarUsuarioComRetry(payload, usuarioGW.primaryEmail, { source: "USER_REACTIVATED", email: usuarioGW.primaryEmail });
      console.info({ event: "USER_REACTIVATED", email: mascararEmailParaLog(usuarioGW.primaryEmail), uo: uoDestinoAtivo, payload });
    } catch (e) {
      console.error({ event: "USER_REACTIVATE_ERROR", email: mascararEmailParaLog(usuarioGW.primaryEmail), error: e.message });
      tentarReativacaoFallback(usuarioGW, dados);
    }
  } catch (e) {
    console.error({ event: "REACTIVATE_FAIL", email: mascararEmailParaLog(usuarioGW.primaryEmail), error: e.message });
  }
}

function tentarReativacaoFallback(usuarioGW, dadosOriginais) {
  try {
    const fallbackPayload = { ...dadosOriginais, orgUnitPath: "/" };
    atualizarUsuarioComRetry(fallbackPayload, usuarioGW.primaryEmail, { source: "USER_REACTIVATED_FALLBACK", email: usuarioGW.primaryEmail });
    console.warn({ event: "USER_REACTIVATED_FALLBACK", email: mascararEmailParaLog(usuarioGW.primaryEmail), payload: fallbackPayload });
  } catch (e2) {
    console.error({ event: "USER_REACTIVATE_FALLBACK_ERROR", email: mascararEmailParaLog(usuarioGW.primaryEmail), error: e2.message });
  }
}

function moverParaOU(usuarioGW, ouDestino, colaborador = null, suspender = false) {
  try {
    if (suspender && deveBloquearSuspensaoPorDataAdmisssao(colaborador, usuarioGW)) {
      console.info({ event: "SUSPENSAO_IGNORADA_DATA_ADMISSAO_FUTURA", email: mascararEmailParaLog(usuarioGW.primaryEmail), dataAdmissao: (colaborador && colaborador.dataAdmissao) || usuarioGW.customSchemas?.Informacoes_HCM?.dataAdmissao });
      return;
    }

    const ouAtual = String(usuarioGW.orgUnitPath || '');
    const ouEsperada = String(ouDestino || '');
    const suspensoAtual = Boolean(usuarioGW.suspended);
    const suspensoEsperado = Boolean(suspender);

    if (ouAtual === ouEsperada && suspensoAtual === suspensoEsperado) {
      console.info({ event: "MOVE_SKIPPED_ALREADY", email: mascararEmailParaLog(usuarioGW.primaryEmail), uo: ouDestino, suspended: suspender });
      return;
    }

    const dados = { orgUnitPath: ouDestino };
    if (suspender) {
      dados.suspended = true;
    }

    executarMovimentacaoComRetry(usuarioGW, ouDestino, dados, suspender);
  } catch (e) {
    console.error({ event: "MOVE_FAIL", email: mascararEmailParaLog(usuarioGW.primaryEmail), ou: ouDestino, error: e.message });
  }
}

function moverParaOUComSenhaNova(usuarioGW, ouDestino, colaborador, suspender = false) {
  try {
    if (suspender && deveBloquearSuspensaoPorDataAdmisao(colaborador, usuarioGW)) {
      console.info({ event: "SUSPENSAO_IGNORADA_DATA_ADMISSAO_FUTURA", email: mascararEmailParaLog(usuarioGW.primaryEmail), dataAdmissao: (colaborador && colaborador.dataAdmissao) || usuarioGW.customSchemas?.Informacoes_HCM?.dataAdmisao });
      return;
    }

    const ouAtual = String(usuarioGW.orgUnitPath || '');
    const ouEsperada = String(ouDestino || '');
    const suspensoAtual = Boolean(usuarioGW.suspended);
    const suspensoEsperado = Boolean(suspender);

    if (ouAtual === ouEsperada && suspensoAtual === suspensoEsperado) {
      console.info({ event: "MOVE_SKIPPED_ALREADY", email: mascararEmailParaLog(usuarioGW.primaryEmail), uo: ouDestino, suspended: suspender });
      return;
    }

    const senha = gerarSenhaAleatoria(12);
    const dados = {
      orgUnitPath: ouDestino,
      password: senha,
      changePasswordAtNextLogin: true,
      suspended: suspender
    };

    executarMovimentacaoComRetry(usuarioGW, ouDestino, dados, suspender);
  } catch (e) {
    console.error({ event: "MOVE_FAIL", email: mascararEmailParaLog(usuarioGW.primaryEmail), ou: ouDestino, error: e.message });
  }
}

function executarMovimentacaoComRetry(usuarioGW, ouDestino, dados, suspender) {
  const eventType = suspender ? "USER_MOVED_AND_SUSPENDED" : "USER_MOVED_AWAY";
  const source = suspender ? "MOVE_AND_SUSPEND" : "USER_MOVED_AWAY";

  try {
    atualizarUsuarioComRetry(dados, usuarioGW.primaryEmail, { source, email: usuarioGW.primaryEmail });
    console.info({ event: eventType, email: mascararEmailParaLog(usuarioGW.primaryEmail), uo: ouDestino, suspended: suspender, payload: dados });
  } catch (e) {
    if (e.message && e.message.includes('INVALID_OU_ID')) {
      tentarCriarOUERetentarMovimentacao(usuarioGW, ouDestino, dados, source);
    } else {
      console.error({ event: "MOVE_ERROR", email: mascararEmailParaLog(usuarioGW.primaryEmail), ou: ouDestino, error: e.message });
    }
  }
}

function tentarCriarOUERetentarMovimentacao(usuarioGW, ouDestino, dados, source) {
  console.warn({ event: "OU_NOT_FOUND", email: mascararEmailParaLog(usuarioGW.primaryEmail), ou: ouDestino, action: "creating" });
  if (criarOUSeNaoExistir(ouDestino)) {
    try {
      atualizarUsuarioComRetry(dados, usuarioGW.primaryEmail, { source, email: usuarioGW.primaryEmail });
      console.info({ event: "MOVE_SUCCESS_AFTER_OU_CREATE", email: mascararEmailParaLog(usuarioGW.primaryEmail), uo: ouDestino, payload: dados });
    } catch (e2) {
      console.error({ event: "MOVE_RETRY_FAIL", email: mascararEmailParaLog(usuarioGW.primaryEmail), ou: ouDestino, error: e2.message });
    }
  }
}

// Processamento de colaboradores e determinação de destino para sincronização

function obterUsuarioGW(colaborador, usuariosGW, cpfParaEmailGW) {
  const cpfHCM = UtilsCPF.normalizar(colaborador.cpf);
  const emailHCM = (colaborador.emailProfissional || '').trim().toLowerCase();

  if (!cpfHCM) return null;
  let usuarioGW = cpfParaEmailGW[cpfHCM] ? usuariosGW[cpfParaEmailGW[cpfHCM].toLowerCase()] : null;

    if (!usuarioGW && emailHCM && usuariosGW[emailHCM]) {
    const userByEmail = usuariosGW[emailHCM];
    const cpfGW = userByEmail.customSchemas?.Informacoes_HCM?.CPF;
    if (UtilsCPF.normalizar(cpfGW) && UtilsCPF.normalizar(cpfGW) !== cpfHCM) {
      console.warn('[getUsuarioGW] Conflito de CPF: email=' + mascararEmailParaLog(emailHCM) + ', HCM=' + cpfHCM + ', GW=' + cpfGW);
      return null;
    }
    usuarioGW = userByEmail;
  }

  return usuarioGW;
}

function deveProcessarColaborador(colaborador, usuarioGW) {
  const situacao = String(colaborador.situacao || '');
  if (!situacao || (!SITUACOES.ATIVAS.has(situacao) && !SITUACOES.AFASTAMENTO.has(situacao) && !SITUACOES.SUSPENSAO.has(situacao))) {
    return false;
  }
  if (!usuarioGW) {
    return false;
  }
  if (ehUsuarioGenerico(usuarioGW.primaryEmail, usuarioGW.orgUnitPath)) {
    return false;
  }
  return true;
}

function buscarOUPorChaveMapeamento(mapaUO, chave) {
  if (!chave || !mapaUO) return null;

  const chaveNormalizada = normalizarChaveMapeamentoUO(chave);
  if (!chaveNormalizada) return null;

  if (mapaUO[chaveNormalizada]) return mapaUO[chaveNormalizada];

  const matches = Object.keys(mapaUO).filter(function (key) {
    if (!key) return false;
    return chaveNormalizada.indexOf(key) !== -1 || key.indexOf(chaveNormalizada) !== -1;
  });

  if (!matches.length) return null;

  const melhorMatch = matches.reduce(function (best, current) {
    return current.length > best.length ? current : best;
  }, matches[0]);

  return mapaUO[melhorMatch] || null;
}

function determinarOUDestino(colaborador, config, usuarioGW) {
  const departamento = normalizarChaveMapeamentoUO(colaborador && colaborador.departamento);
  const cc = normalizarChaveMapeamentoUO(colaborador && colaborador.centroCusto);
  const mapaUO = config && config.tabelaMapeamentoUO ? config.tabelaMapeamentoUO : {};

  const ouMapeadaDepartamento = buscarOUPorChaveMapeamento(mapaUO, departamento);
  const ouMapeadaCentroCusto = buscarOUPorChaveMapeamento(mapaUO, cc);
  const ouMapeada = ouMapeadaDepartamento || ouMapeadaCentroCusto;
  let ouDestino = ouMapeada;

  let origemMapeamento = null;
  if (ouMapeadaDepartamento) {
    origemMapeamento = 'DEPARTAMENTO';
  } else if (ouMapeadaCentroCusto) {
    origemMapeamento = 'CENTRO_CUSTO';
  }

  if (!ouDestino) {
    ouDestino = (usuarioGW && usuarioGW.orgUnitPath) ? usuarioGW.orgUnitPath : '/';
    console.warn({
      event: "MAPEAMENTO_UO_NAO_ENCONTRADO",
      email: usuarioGW && usuarioGW.primaryEmail,
      departamento: departamento,
      centroCusto: cc,
      fallback: ouDestino
    });
  } else {
    console.info({
      event: "MAPEAMENTO_UO_APLICADO",
      email: usuarioGW && usuarioGW.primaryEmail,
      origem: origemMapeamento,
      departamento: departamento,
      centroCusto: cc,
      ou: ouDestino
    });
  }

  const ouNormalizada = normalizarOrgUnitPathParaPatch(ouDestino, usuarioGW && usuarioGW.primaryEmail);
  if (!ouNormalizada && !ouMapeada) {
    return usuarioGW.orgUnitPath || '/';
  }

  if (!ouNormalizada && ouMapeada) {
    console.error({
      event: "MAPEAMENTO_UO_INVALIDO",
      email: usuarioGW && usuarioGW.primaryEmail,
      departamento: departamento,
      centroCusto: cc,
      ouMapeada: ouMapeada
    });
    throw new Error(`MAPEAMENTO_UO_INVALIDO: ${ouMapeada}`);
  }

  return ouNormalizada;
}

function processarColaboradorIndividual(cpfHCM, usuariosGWObject, cpfParaEmailGW, config) {
  try {
    const colaborador = buscarColaboradorPorCPF(UtilsCPF.normalizar(cpfHCM));
    if (!colaborador) {
      console.warn({ event: "COLABORADOR_NAO_ENCONTRADO", cpf: mascararCpfParaLog(cpfHCM) });
      return false;
    }

    const usuarioGW = obterUsuarioGW(colaborador, usuariosGWObject, cpfParaEmailGW);
    if (!deveProcessarColaborador(colaborador, usuarioGW)) {
      console.warn({ event: "COLABORADOR_IGNORADO", cpf: cpfHCM, email: usuarioGW && usuarioGW.primaryEmail ? mascararEmailParaLog(usuarioGW.primaryEmail) : null });
      return false;
    }

    const ouDestino = determinarOUDestino(colaborador, config, usuarioGW);
    const stats = { processed: 1, skipped: 0, updates: 0, errors: 0 };
    processarColaboradorPorSituacao(colaborador, usuarioGW, config, stats);
    return stats.updates > 0;
  } catch (e) {
    console.error({ event: "PROCESSAR_INDIVIDUAL_ERROR", cpf: mascararCpfParaLog(cpfHCM), error: e.message });
    return false;
  }
}

function processarColaboradorPorSituacao(colaborador, usuarioGW, config, stats) {
  const situacao = String(colaborador.situacao || '');
  const ouDestino = determinarOUDestino(colaborador, config, usuarioGW);

    if (UOS_GENERICAS.includes(ouDestino)) {
    const estaSuspenso = Boolean(usuarioGW.suspended);
    const estaEmOUSuspensao = String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH);
    const precisaReativar = estaSuspenso || estaEmOUSuspensao;
    if (precisaReativar) {
      console.info(`[ATIVACAO_UO_GENERICA] Reativando ${mascararEmailParaLog(usuarioGW.primaryEmail)} na UO genérica ${ouDestino} (COMPORTAMENTO_UOS_GENERICAS.MANTER_ATIVO=${COMPORTAMENTO_UOS_GENERICAS.MANTER_ATIVO})`);
      reativarUsuario(usuarioGW, ouDestino, colaborador);
      stats.updates++;
      return;
    }
    if (atualizarNomeEOU(usuarioGW, colaborador, ouDestino)) stats.updates++;
    if (atualizarCustomSchemas(usuarioGW, colaborador)) stats.updates++;
    if (atualizarOrganizacao(usuarioGW, colaborador)) stats.updates++;
    if (atualizarManager(usuarioGW, colaborador)) stats.updates++;
    return;
  }

  if (SITUACOES.ATIVAS.has(situacao)) {
    const precisaReativar = Boolean(usuarioGW.suspended) || String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH);
    if (precisaReativar) {
      reativarUsuario(usuarioGW, ouDestino, colaborador);
      stats.updates++;
      return;
    }
    if (atualizarNomeEOU(usuarioGW, colaborador, ouDestino)) stats.updates++;
    if (atualizarCustomSchemas(usuarioGW, colaborador)) stats.updates++;
    if (atualizarOrganizacao(usuarioGW, colaborador)) stats.updates++;
    if (atualizarManager(usuarioGW, colaborador)) stats.updates++;
    return;
  }

    if (SITUACOES.SUSPENSAO.has(situacao)) {
    if (UOS_GENERICAS.includes(ouDestino)) {
      console.info(`[ATENCAO_SUSPENSAO_UO_GENERICA] Colaborador ${mascararEmailParaLog(usuarioGW.primaryEmail)} não pode ser suspenso em UOS_GENERICAS. Ativando...`);
      reativarUsuario(usuarioGW, ouDestino, colaborador);
      stats.updates++;
      return;
    }
    if (situacao === SITUACAO_DESLIGAMENTO) {
      processarColaboradorDesligado(colaborador, usuarioGW);
    } else {
      processarColaboradorAfastado(colaborador, usuarioGW, situacao);
    }
    stats.updates++;
    return;
  }

  if (SITUACOES.AFASTAMENTO.has(situacao)) {
    processarColaboradorAfastado(colaborador, usuarioGW, situacao);
    stats.updates++;
    return;
  }

  stats.skipped++;
}

function processarApenasNomeEOU(colaboradorOuCpf, usuariosGWObject, cpfParaEmailGW, config) {
  try {
    const colaborador = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object')
      ? colaboradorOuCpf
      : buscarColaboradorPorCPF(UtilsCPF.normalizar(colaboradorOuCpf));
    if (!colaborador) return false;

    const situacao = String(colaborador.situacao || '');
    const usuarioGW = obterUsuarioGW(colaborador, usuariosGWObject, cpfParaEmailGW);
    if (!usuarioGW) return false;

    const ouDestino = determinarOUDestino(colaborador, config, usuarioGW);

    if (UOS_GENERICAS.includes(ouDestino)) {
      const estaSuspenso = Boolean(usuarioGW.suspended);
      const estaEmOUSuspensao = String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH);
      const precisaReativar = estaSuspenso || estaEmOUSuspensao;
      if (precisaReativar) {
        console.info(`[ATIVACAO_UO_GENERICA] Reativando ${mascararEmailParaLog(usuarioGW.primaryEmail)} na UO genérica ${ouDestino} (processarApenasNomeEOU)`);
        reativarUsuario(usuarioGW, ouDestino, colaborador);
        return true;
      }
      return atualizarNomeEOU(usuarioGW, colaborador, ouDestino);
    }

    if (!SITUACOES.ATIVAS.has(situacao)) {
      if (SITUACOES.SUSPENSAO.has(situacao)) {
        if (UOS_GENERICAS.includes(ouDestino)) {
          console.info(`[ATENCAO_SUSPENSAO_UO_GENERICA] Colaborador ${mascararEmailParaLog(usuarioGW.primaryEmail)} não pode ser suspenso em UOS_GENERICAS. Ativando...`);
          reativarUsuario(usuarioGW, ouDestino, colaborador);
          return true;
        }
      if (situacao === SITUACAO_DESLIGAMENTO) {
          processarColaboradorDesligado(colaborador, usuarioGW);
        } else {
          processarColaboradorAfastado(colaborador, usuarioGW, situacao);
        }
        return true;
      }
      if (SITUACOES.AFASTAMENTO.has(situacao)) {
        processarColaboradorAfastado(colaborador, usuarioGW, situacao);
        return true;
      }
      return false;
    }

    const precisaReativar = Boolean(usuarioGW.suspended) || String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH);
    if (precisaReativar) {
      reativarUsuario(usuarioGW, ouDestino, colaborador);
      return true;
    }
    return atualizarNomeEOU(usuarioGW, colaborador, ouDestino);
  } catch (e) {
    const cpfLog = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object') ? colaboradorOuCpf.cpf : colaboradorOuCpf;
    console.error({ event: "APENAS_NOME_OU_ERROR", cpf: mascararCpfParaLog(cpfLog), error: e.message });
    return false;
  }
}

function processarApenasSchemas(colaboradorOuCpf, usuariosGWObject, cpfParaEmailGW) {
  try {
    const colaborador = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object')
      ? colaboradorOuCpf
      : buscarColaboradorPorCPF(UtilsCPF.normalizar(colaboradorOuCpf));
    if (!colaborador) return false;

    const usuarioGW = obterUsuarioGW(colaborador, usuariosGWObject, cpfParaEmailGW);
    if (!usuarioGW) return false;
    return atualizarCustomSchemas(usuarioGW, colaborador);
  } catch (e) {
    const cpfLog = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object') ? colaboradorOuCpf.cpf : colaboradorOuCpf;
    console.error({ event: "APENAS_SCHEMAS_ERROR", cpf: mascararCpfParaLog(cpfLog), error: e.message });
    return false;
  }
}

function processarApenasOrganizacao(colaboradorOuCpf, usuariosGWObject, cpfParaEmailGW) {
  try {
    const colaborador = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object')
      ? colaboradorOuCpf
      : buscarColaboradorPorCPF(UtilsCPF.normalizar(colaboradorOuCpf));
    if (!colaborador) return false;

    const usuarioGW = obterUsuarioGW(colaborador, usuariosGWObject, cpfParaEmailGW);
    if (!usuarioGW) return false;
    return atualizarOrganizacao(usuarioGW, colaborador);
  } catch (e) {
    const cpfLog = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object') ? colaboradorOuCpf.cpf : colaboradorOuCpf;
    console.error({ event: "APENAS_ORGANIZACAO_ERROR", cpf: mascararCpfParaLog(cpfLog), error: e.message });
    return false;
  }
}

function processarApenasManager(colaboradorOuCpf, usuariosGWObject, cpfParaEmailGW) {
  try {
    const colaborador = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object')
      ? colaboradorOuCpf
      : buscarColaboradorPorCPF(UtilsCPF.normalizar(colaboradorOuCpf));
    if (!colaborador) return false;

    const usuarioGW = obterUsuarioGW(colaborador, usuariosGWObject, cpfParaEmailGW);
    if (!usuarioGW) return false;
    return atualizarManager(usuarioGW, colaborador);
  } catch (e) {
    const cpfLog = (colaboradorOuCpf && typeof colaboradorOuCpf === 'object') ? colaboradorOuCpf.cpf : colaboradorOuCpf;
    console.error({ event: "APENAS_MANAGER_ERROR", cpf: mascararCpfParaLog(cpfLog), error: e.message });
    return false;
  }
}

function processarColaboradorAfastado(colaborador, usuarioGW, situacao) {
  const tipoAfastamento = mapearTipoAfastamento(situacao);
  const uoAfastamento = `${SUSPENDED_OU_PATH}/${tipoAfastamento}`;
  moverParaOUComSenhaNova(usuarioGW, uoAfastamento, colaborador, false);
}

function processarColaboradorDesligado(colaborador, usuarioGW) {
  const uoDesligado = `${SUSPENDED_OU_PATH}/Desligado`;
  moverParaOUComSenhaNova(usuarioGW, uoDesligado, colaborador, true);
}

function mapearTipoAfastamento(codigoSituacao) {
  return SITUACAO_OU_MAP[String(codigoSituacao)] || SITUACAO_OU_DEFAULT;
}

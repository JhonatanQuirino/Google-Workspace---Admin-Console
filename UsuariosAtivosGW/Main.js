/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Ativa um colaborador cuja situação no HCM é "1" e garante a UO correta.
 *
 * O fluxo aceita um objeto de colaborador HCM ou um CPF válido.
 * Não deve ser executado com entrada inválida, vazia ou com CPF ausente.
 *
 * @param {Object|string} colaboradorOuCpf - Objeto de colaborador do HCM ou CPF do colaborador.
 * @param {Object} [contexto] - Contexto pré-carregado para evitar recargas em lote.
 * @returns {boolean} true se houve ativação ou movimentação; false se não houve ação.
 */
function ativarColaboradorSituacao1(colaboradorOuCpf, contexto) {
  try {
    const cpfNormalizado = obterCpfEntradaColaborador(colaboradorOuCpf);
    if (!cpfNormalizado) {
      console.warn('[ATIVAR_COLABORADOR] Entrada inválida ou CPF ausente. Não há CPF válido para processar.');
      return false;
    }

    const colaborador = resolverColaboradorHCM(colaboradorOuCpf, cpfNormalizado);
    if (!colaborador) {
      console.warn('[ATIVAR_COLABORADOR] Colaborador não encontrado no HCM. CPF consultado:', cpfNormalizado);
      return false;
    }

    const situacao = obterSituacaoColaborador(colaborador);
    if (situacao !== SITUACAO_ATIVA) {
      console.warn('[ATIVAR_COLABORADOR] Situação diferente de 1. Fluxo ignorado. CPF=' + cpfNormalizado + ' situacao=' + (situacao || 'ausente'));
      return false;
    }

    const ctx = contexto || buildAtivacaoContexto();
    if (!ctx) {
      console.error('[ATIVAR_COLABORADOR] Falha ao construir contexto de ativação.');
      return false;
    }

    const usuarioGW = obterUsuarioGW(colaborador, ctx.usuariosGWObject, ctx.cpfParaEmailGW);
    if (!usuarioGW) {
      console.warn('[ATIVAR_COLABORADOR] Usuário GW correspondente não encontrado. CPF=' + cpfNormalizado);
      return false;
    }

    const ouDestino = determinarOUDestino(colaborador, ctx.config, usuarioGW);
    if (!ouDestino) {
      console.warn('[ATIVAR_COLABORADOR] UO de destino não determinada. CPF=' + cpfNormalizado);
      return false;
    }

    const estaEmOUSuspensao = String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH);
    if (estaEmOUSuspensao) {
      reativarUsuario(usuarioGW, ouDestino, colaborador);
      return true;
    }

    if (String(usuarioGW.orgUnitPath || '') !== String(ouDestino || '')) {
      moverParaOU(usuarioGW, ouDestino, false);
      return true;
    }

    console.info('[ATIVAR_COLABORADOR] Usuário já ativo na UO correta. CPF=' + cpfNormalizado + ' email=' + usuarioGW.primaryEmail);
    return false;
  } catch (e) {
    console.error('[ATIVAR_COLABORADOR] Erro inesperado: ' + (e && e.message ? e.message : e));
    return false;
  }
}

function resolverColaboradorHCM(colaboradorOuCpf, cpfNormalizado) {
  if (colaboradorOuCpf && typeof colaboradorOuCpf === 'object') {
    const situacao = obterSituacaoColaborador(colaboradorOuCpf);
    if (situacao !== '') {
      return colaboradorOuCpf;
    }
    return buscarColaboradorPorCPF(cpfNormalizado);
  }
  return buscarColaboradorPorCPF(cpfNormalizado);
}

function buildAtivacaoContexto() {
  const usuariosGWObject = listarTodosOsUsuarios(NOME_DOMINIO);
  if (!usuariosGWObject) {
    console.error('[ATIVAR_COLABORADOR] Falha ao carregar usuários do Google Workspace.');
    return null;
  }

  return {
    usuariosGWObject: usuariosGWObject,
    cpfParaEmailGW: buildCPFMap(usuariosGWObject),
    config: { tabelaMapeamentoUO: carregarMapeamentoUO() }
  };
}

function ativarColaboradoresSituacao1() {
  try {
    const colaboradores = lerTodosColaboradores();
    if (!colaboradores || colaboradores.length === 0) {
      console.warn('[ATIVAR_COLABORADOR] Nenhum colaborador encontrado no banco.');
      return false;
    }

    const contexto = buildAtivacaoContexto();
    if (!contexto) {
      return false;
    }

    let totalSituacao1 = 0;
    let ativados = 0;
    let ignorados = 0;

    colaboradores.forEach(function (colaborador) {
      if (!colaborador || typeof colaborador !== 'object') {
        return;
      }

      const situacao = obterSituacaoColaborador(colaborador);
      if (situacao !== SITUACAO_ATIVA) {
        ignorados += 1;
        return;
      }

      totalSituacao1 += 1;
      if (ativarColaboradorSituacao1(colaborador, contexto)) {
        ativados += 1;
      }
    });

    console.info('[ATIVAR_COLABORADOR] Processamento concluído.', {
      totalSituacao1: totalSituacao1,
      ativados: ativados,
      ignorados: ignorados,
      totalLidos: colaboradores.length
    });

    return ativados > 0;
  } catch (e) {
    console.error('[ATIVAR_COLABORADOR] Erro no processamento em lote: ' + (e && e.message ? e.message : e));
    return false;
  }
}

function obterSituacaoColaborador(colaborador) {
  if (!colaborador || typeof colaborador !== 'object') return '';

  const encontrado = buscarSituacaoRecursiva(colaborador);
  return encontrado != null ? String(encontrado).trim() : '';
}

function obterCpfEntradaColaborador(colaboradorOuCpf) {
  if (!colaboradorOuCpf) return null;

  if (typeof colaboradorOuCpf === 'object') {
    const cpfRaw = colaboradorOuCpf.cpf || colaboradorOuCpf.CPF || colaboradorOuCpf.documento || colaboradorOuCpf.Documento || '';
    return UtilsCPF.normalizar(String(cpfRaw));
  }

  return UtilsCPF.normalizar(String(colaboradorOuCpf));
}

function buscarSituacaoRecursiva(obj, profundidade = 0, visitados = new Set()) {
  if (profundidade > 5 || !obj || typeof obj !== 'object') return null;

  if (visitados.has(obj)) return null;
  visitados.add(obj);

  const aliases = [
    'situacao',
    'situacaoColaborador',
    'situacaoHCM',
    'situacaoAtual',
    'situacaoNumero',
    'status',
    'estado',
    'state',
    'situation'
  ];

  for (let alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, alias) && obj[alias] != null) {
      return obj[alias];
    }
  }

  for (let key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const resultado = buscarSituacaoRecursiva(obj[key], profundidade + 1, visitados);
      if (resultado != null) {
        return resultado;
      }
    }
  }

  return null;
}

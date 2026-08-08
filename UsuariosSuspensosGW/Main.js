/*
 * Gerencia utilitários compartilhados para sincronização de suspensão.
 * 
 * A lógica específica de suspensão é delegada para:
 * - Suspenso_Desligado.js: sincronizarDesligados()
 * - Suspenso_Afastado.js: sincronizarAfastados()
 */

function carregarContextoSuspensao() {
  const usuarios = listarTodosOsUsuarios(NOME_DOMINIO);
  const colabs = lerTodosColaboradores();
  const config = { tabelaMapeamentoUO: typeof carregarMapeamentoUO === 'function' ? carregarMapeamentoUO() : {} };
  return { usuarios, colabs, config };
}

function processarSuspensao(usuariosGW, colabsHCM, config) {
  const { emailsHCM, cpfsHCM } = buildHcmSets(colabsHCM);
  const cpfParaEmailGW = buildCPFMap(usuariosGW);

  let total = 0;
  let suspensos = 0;
  let ignorados = 0;
  let erros = 0;

  // Processa colaboradores desligados (situacao = 7)
  colabsHCM.forEach(colaborador => {
    const situacao = String(colaborador.situacao || '');
    if (situacao !== SITUACAO_DESLIGAMENTO) return;

    if (!colaboradorTemIdentificacao(colaborador)) {
        ignorados++;
        return;
      }

    total++;
    try {
      const usuarioGW = obterUsuarioGW(colaborador, usuariosGW, cpfParaEmailGW);
      if (!isUsuarioGWValido(usuarioGW)) {
        console.warn({
          event: 'SUSPENSAO_COLABORADOR_SEM_USUARIO_GW',
          cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null,
          emailProfissional: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
          situacao: situacao,
          usuarioGW_primaryEmail: usuarioGW && usuarioGW.primaryEmail ? usuarioGW.primaryEmail : null,
          usuarioGW_orgUnitPath: usuarioGW && usuarioGW.orgUnitPath ? usuarioGW.orgUnitPath : null,
          reason: 'Colaborador HCM em situa\u00e7\u00e3o de suspens\u00e3o sem usu\u00e1rio GW v\u00e1lido'
        });
        ignorados++;
        return;
      }

      if (ehUsuarioGenerico(usuarioGW.primaryEmail, usuarioGW.orgUnitPath)) {
        console.info({
          event: 'SUSPENSAO_IGNORED_GENERIC_UO',
          email: mascararEmailParaLog(usuarioGW.primaryEmail),
          orgUnitPath: usuarioGW.orgUnitPath,
          situacao: situacao,
          reason: 'Usu\u00e1rio em UO gen\u00e9rica'
        });
        ignorados++;
        return;
      }

      if (deveBloquearSuspensaoPorDataAdmissao(colaborador, usuarioGW)) {
        ignorados++;
        return;
      }

      processarColaboradorDesligado(colaborador, usuarioGW);
      suspensos++;
    } catch (e) {
      erros++;
      console.error({ event: "PROCESSAR_SUSPENSAO_COLABORADOR_ERROR", cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null, error: e.message });
    }
  });

  // Processa colaboradores afastados (outras situações de suspensão)
  colabsHCM.forEach(colaborador => {
    const situacao = String(colaborador.situacao || '');
    if (situacao === SITUACAO_DESLIGAMENTO || (!SITUACOES.AFASTAMENTO.has(situacao) && !SITUACOES.SUSPENSAO.has(situacao))) return;

    if (!colaboradorTemIdentificacao(colaborador)) {
        ignorados++;
        return;
      }

    total++;
    try {
      const usuarioGW = obterUsuarioGW(colaborador, usuariosGW, cpfParaEmailGW);
      if (!isUsuarioGWValido(usuarioGW)) {
        ignorados++;
        return;
      }

      if (ehUsuarioGenerico(usuarioGW.primaryEmail, usuarioGW.orgUnitPath)) {
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
      console.error({ event: "PROCESSAR_SUSPENSAO_AFASTADO_ERROR", cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null, error: e.message });
    }
  });

  // Processa usuários GW órfãos
  Object.values(usuariosGW).forEach(usuarioGW => {
    try {
      const emailGW = String(usuarioGW.primaryEmail || '').toLowerCase();
      const cpfGW = usuarioGW.customSchemas?.Informacoes_HCM?.CPF
        ? UtilsCPF.normalizar(String(usuarioGW.customSchemas.Informacoes_HCM.CPF))
        : null;

      if (emailsHCM.has(emailGW) || (cpfGW && cpfsHCM.has(cpfGW))) {
        return;
      }

      if (ehUsuarioGenerico(emailGW, usuarioGW.orgUnitPath)) {
        ignorados++;
        return;
      }

      if (usuarioGW.suspended && String(usuarioGW.orgUnitPath || '').startsWith(SUSPENDED_OU_PATH)) {
        return;
      }

      if (deveBloquearSuspensaoPorDataAdmissao(null, usuarioGW)) {
        console.info({ event: "SUSPENSAO_IGNORED_FUTURE_ADMISSION", email: mascararEmailParaLog(emailGW), reason: "admissao futura" });
        ignorados++;
        return;
      }

      moverParaOUComSenhaNova(usuarioGW, SUSPENDED_OU_PATH, {}, true, false);
      suspensos++;
    } catch (e) {
      erros++;
      console.error({ event: "PROCESSAR_SUSPENSAO_ORFAO_ERROR", email: usuarioGW.primaryEmail, error: e.message });
    }
  });

  return { total, suspensos, ignorados, erros };
}

function buildHcmSets(colabs) {}

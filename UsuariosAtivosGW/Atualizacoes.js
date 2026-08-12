/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

function atualizarNomeEOU(usuarioGW, dadosHCM, uoDestino) {
  try {
    let firstName = dadosHCM.firstName;
    let lastName = dadosHCM.lastName;
    if ((!firstName || !lastName) && dadosHCM.nomeCompleto) {
      const partes = dadosHCM.nomeCompleto.trim().split(/\s+/);
      if (partes.length === 1) {
        firstName = partes[0];
        lastName = '';
      } else if (partes.length > 1) {
        firstName = partes[0];
        lastName = partes.slice(1).join(' ');
      }
    }

    const givenName = firstName || usuarioGW.name?.givenName || 'Nome';
    const familyName = lastName || usuarioGW.name?.familyName || 'Sobrenome';
    const needsNameUpdate = saoDiferentes(usuarioGW.name?.givenName, givenName) ||
                           saoDiferentes(usuarioGW.name?.familyName, familyName);
    const needsOUUpdate = saoDiferentes(usuarioGW.orgUnitPath, uoDestino);

    if (!needsNameUpdate && !needsOUUpdate) {
      Logger.info(`[processarColaboradoresNomeOU] Sem alteração: ${mascararEmailParaLog(usuarioGW.primaryEmail)}`);
      return false;
    }

    const payload = {};
    if (needsNameUpdate) {
      payload.name = { givenName, familyName };
    }
    if (needsOUUpdate) {
      payload.orgUnitPath = uoDestino;
    }

    atualizarUsuarioComRetry(payload, usuarioGW.primaryEmail, { source: "UPDATE_NAME_OU", email: usuarioGW.primaryEmail });
    Logger.info(JSON.stringify({ evento: "NOME_OU_ATUALIZADO", email: mascararEmailParaLog(usuarioGW.primaryEmail), dados: payload }));
    return true;
  } catch (e) {
    console.error('[atualizarUsuarioComRetry] Falha ao atualizar Nome/OU (' + mascararEmailParaLog(usuarioGW.primaryEmail) + '): ' + e.message);
    return false;
  }
}

function atualizarCustomSchemas(usuarioGW, dadosHCM) {
  try {
    const schemaName = "Informacoes_HCM";
    const customSchemas = {};
    let temAlteracao = false;
    const cpfPadronizadoHCM = UtilsCPF.normalizar(dadosHCM.cpf);
    let cpfGW = usuarioGW.customSchemas?.[schemaName]?.["CPF"];
    if (cpfGW) cpfGW = UtilsCPF.normalizar(cpfGW);

    if (saoDiferentes(cpfGW, cpfPadronizadoHCM)) {
      customSchemas["CPF"] = (cpfPadronizadoHCM.length === 11) ? cpfPadronizadoHCM : null;
      temAlteracao = true;
    }

    ['dataNascimento', 'dataAdmissao', 'dataAgendamento'].forEach(campo => {
      let valGW = usuarioGW.customSchemas?.[schemaName]?.[campo];
      let valHCM = dadosHCM[campo];
      if (saoDiferentes(valGW, valHCM)) {
        const partes = valHCM ? valHCM.split('/') : null;
        const valido = (partes && partes.length === 3 && partes[2].length === 4);
        customSchemas[campo] = valido ? valHCM : null;
        temAlteracao = true;
      }
    });

    if (!temAlteracao) {
      Logger.info('[processarColaboradoresSchemas] Schemas sem alteração: ' + mascararEmailParaLog(usuarioGW.primaryEmail));
      return false;
    }

    const payload = {
      customSchemas: {
        [schemaName]: customSchemas
      }
    };

    atualizarUsuarioComRetry(payload, usuarioGW.primaryEmail, { source: "UPDATE_SCHEMAS", email: usuarioGW.primaryEmail });
    Logger.info(JSON.stringify({ evento: "SCHEMAS_ATUALIZADOS", email: mascararEmailParaLog(usuarioGW.primaryEmail), campos: Object.keys(customSchemas) }));
    return true;
  } catch (e) {
    console.error('[atualizarUsuarioComRetry] Falha ao atualizar schemas (' + mascararEmailParaLog(usuarioGW.primaryEmail) + '): ' + e.message);
    return false;
  }
}

function atualizarOrganizacao(usuarioGW, dadosHCM) {
  try {
    const orgGW = (usuarioGW.organizations || []).find(o => o.primary === true) || {};
    const needsUpdate = saoDiferentes(orgGW.title, dadosHCM.cargo) ||
                        saoDiferentes(orgGW.department, dadosHCM.departamento) ||
                        saoDiferentes(orgGW.costCenter, dadosHCM.centroCusto);
    if (!needsUpdate) {
      Logger.info('[processarColaboradoresOrganizacao] Sem alteração para: ' + mascararEmailParaLog(usuarioGW.primaryEmail));
      return false;
    }
    const payload = {
      organizations: [{
        name: orgGW.name || 'Missão Sal da Terra',
        title: dadosHCM.cargo || '',
        department: dadosHCM.departamento || '',
        costCenter: dadosHCM.centroCusto || '',
        description: dadosHCM.tipoColaborador || '',
        primary: true
      }]
    };
    atualizarUsuarioComRetry(payload, usuarioGW.primaryEmail, { source: "UPDATE_ORGANIZATION", email: usuarioGW.primaryEmail });
    Logger.info(JSON.stringify({ evento: "ORGANIZACAO_ATUALIZADA", email: mascararEmailParaLog(usuarioGW.primaryEmail) }));
    return true;
  } catch (e) {
    console.error({ event: "UPDATE_ORGANIZATION_ERROR", email: mascararEmailParaLog(usuarioGW.primaryEmail), error: e.message });
    return false;
  }
}

function atualizarManager(usuarioGW, dadosHCM) {
  try {
    const mgrGW = (usuarioGW.relations || []).find(r => r.type === 'manager')?.value;
    if (saoDiferentes(mgrGW, dadosHCM.superiorImediato)) {
      const payload = {
        relations: dadosHCM.superiorImediato ? [{ value: dadosHCM.superiorImediato, type: 'manager' }] : []
      };
      atualizarUsuarioComRetry(payload, usuarioGW.primaryEmail, { source: "UPDATE_MANAGER", email: usuarioGW.primaryEmail });
      console.info({ event: "MANAGER_UPDATED", email: mascararEmailParaLog(usuarioGW.primaryEmail), manager: dadosHCM.superiorImediato });
      return true;
    } else {
      console.info({ event: "MANAGER_NO_CHANGE", email: mascararEmailParaLog(usuarioGW.primaryEmail) });
      return false;
    }
  } catch (e) {
    console.error({ event: "UPDATE_MANAGER_ERROR", email: mascararEmailParaLog(usuarioGW.primaryEmail), error: e.message });
    return false;
  }
}

function atualizarUsuarioComRetry(payload, email, context) {
  const MAX_TENTATIVAS = 3;
  const payloadFinal = { ...(payload || {}) };
  let tentouCriarOuAposInvalidId = false;
  const source = String((context && context.source) || '');
  const ouObrigatoria = (
    source === 'UPDATE_NAME_OU' ||
    source === 'USER_REACTIVATED' ||
    source === 'USER_REACTIVATED_FALLBACK' ||
    source === 'MOVE_AND_SUSPEND' ||
    source === 'USER_MOVED_AWAY'
  );

  if (Object.prototype.hasOwnProperty.call(payloadFinal, 'orgUnitPath')) {
    const ouNormalizada = normalizarOrgUnitPathParaPatch(payloadFinal.orgUnitPath, email);
    if (!ouNormalizada) {
      if (ouObrigatoria) {
        throw new Error(`ORG_UNIT_PATH_INVALIDO: ${payloadFinal.orgUnitPath}`);
      }
      delete payloadFinal.orgUnitPath;
      console.warn({
        event: "ORG_UNIT_PATH_REMOVIDO_DO_PATCH",
        email: mascararEmailParaLog(email),
        original: payload && payload.orgUnitPath,
        context: context || {}
      });
    } else {
      payloadFinal.orgUnitPath = ouNormalizada;
    }
  }

  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    try {
      AdminDirectory.Users.patch(payloadFinal, email);
      return true;
    } catch (e) {
      const message = String((e && e.message) || e || '').toLowerCase();
      const invalidOuId = message.includes('invalid_ou_id') || message.includes('invalid ou id');

      if (
        invalidOuId &&
        !tentouCriarOuAposInvalidId &&
        typeof payloadFinal.orgUnitPath === 'string' &&
        payloadFinal.orgUnitPath !== '/'
      ) {
        tentouCriarOuAposInvalidId = true;
        console.warn({
          event: "INVALID_OU_ID_DETECTADO",
          email: mascararEmailParaLog(email),
          source: source,
          orgUnitPath: payloadFinal.orgUnitPath,
          acao: "TENTAR_CRIAR_OU_E_REPROCESSAR"
        });
        try {
          criarOUSeNaoExistir(payloadFinal.orgUnitPath);
          Utilities.sleep(600);
          continue;
        } catch (eCreate) {
          console.error({
            event: "INVALID_OU_ID_CRIACAO_OU_FALHOU",
            email: mascararEmailParaLog(email),
            source: source,
            orgUnitPath: payloadFinal.orgUnitPath,
            error: eCreate && eCreate.message ? eCreate.message : eCreate
          });
        }
      }

      const retryable = (
        message.includes('empty response') ||
        message.includes('service unavailable') ||
        message.includes('service is currently unavailable') ||
        message.includes('backend error') ||
        message.includes('internal error') ||
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')
      );

      if (retryable && i < MAX_TENTATIVAS - 1) {
        const baseDelay = 2000;
        const maxDelay = 30000;
        const jitter = Math.floor(Math.random() * 1000);
        const delay = Math.min(baseDelay * Math.pow(2, i) + jitter, maxDelay);
        console.warn({ event: "USER_UPDATE_RETRY", attempt: i + 1, email: mascararEmailParaLog(email), delay_ms: delay, error: e && e.message ? e.message : e, context: context || {} });
        Utilities.sleep(delay);
        continue;
      }

      throw e;
    }
  }
  return false;
}

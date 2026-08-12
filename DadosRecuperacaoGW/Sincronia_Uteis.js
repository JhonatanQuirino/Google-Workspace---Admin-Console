/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

// Uteis para o serviço de sincronização do Google Workspace com HCM

function saoDiferentes(val1, val2) {
  return String(val1 || '').trim().toLowerCase() !== String(val2 || '').trim().toLowerCase();
}

function mascararEmailParaLog(email) {
  if (!email || typeof email !== 'string') return '';
  const valor = email.trim().toLowerCase();
  const idx = valor.indexOf('@');
  if (idx <= 1) return '***' + (idx >= 0 ? valor.slice(idx) : '');
  return valor[0] + '***' + valor.slice(idx);
}

function mascararCpfParaLog(cpf) {
  if (!cpf || typeof cpf !== 'string') return '';
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length < 4) return '***';
  return '***' + numeros.slice(-4);
}

function ehUsuarioGenerico(email, orgUnitPath) {
  if (orgUnitPath && UOS_GENERICAS.includes(orgUnitPath.trim())) {
    return true;
  }
  return false;
}

function normalizarOrgUnitPathParaPatch(orgUnitPath, email) {
  let valor = String(orgUnitPath || '').trim();

  if (!valor) return '/';
  if (valor === '/') return '/';

  if (/^\[object\s+object\]$/i.test(valor)) {
    console.error({ event: "OU_VALOR_INVALIDO_OBJECT", email: mascararEmailParaLog(email), orgUnitPath: valor });
    return null;
  }

  const matchId = valor.match(/^id\s*[:=]\s*(.+)$/i);
  if (matchId && matchId[1]) {
    valor = 'id:' + String(matchId[1]).trim();
  }

  if (valor.toLowerCase().startsWith('id:')) {
    const orgUnitId = valor.slice(3).trim();

    try {
      let ou = null;
      try {
        ou = AdminDirectory.Orgunits.get('my_customer', valor);
      } catch (_e1) {
        ou = null;
      }

      if (!ou && orgUnitId) {
        try {
          ou = AdminDirectory.Orgunits.get('my_customer', orgUnitId);
        } catch (_e2) {
          ou = null;
        }
      }

      if (!ou && orgUnitId) {
        try {
          const resp = AdminDirectory.Orgunits.list('my_customer', { type: 'all' });
          const lista = (resp && resp.organizationUnits) ? resp.organizationUnits : [];
          ou = lista.find(item => String(item.orgUnitId || '').trim() === orgUnitId) || null;
        } catch (_e3) {
          ou = null;
        }
      }

      const resolvido = String((ou && ou.orgUnitPath) || '').trim();

      if (resolvido) {
        console.warn({ event: "OU_ID_RESOLVIDO_PARA_PATH", email: mascararEmailParaLog(email), orgUnitId: valor, orgUnitPath: resolvido });
        valor = resolvido;
      } else {
        console.error({ event: "OU_ID_SEM_PATH", email: mascararEmailParaLog(email), orgUnitId: valor });
        return null;
      }
    } catch (e) {
      console.error({ event: "OU_ID_INVALIDO", email: mascararEmailParaLog(email), orgUnitId: valor, error: e && e.message ? e.message : e });
      return null;
    }
  }

  if (!valor.startsWith('/')) {
    valor = '/' + valor;
  }

  valor = valor.replace(/\\+/g, '/');
  valor = valor.replace(/\/+$/g, '');
  if (!valor) return '/';

  const segmentos = valor
    .split('/')
    .map(function (p) { return String(p || '').trim(); })
    .filter(function (p) { return p.length > 0; });

  const caminho = '/' + segmentos.join('/');
  return caminho.replace(/\/{2,}/g, '/');
}

function normalizarChaveMapeamentoUO(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase();
}

function criarOUSeNaoExistir(ouPath) {
  try {
    const partes = normalizarSegmentosOU(ouPath);
    if (!partes.length) {
      return false;
    }
    const caminhoSemRaiz = partes.join('/');

    try {
      AdminDirectory.Orgunits.get('my_customer', caminhoSemRaiz);
      return false;
    } catch (e) {
      if (!erroOrgUnitNaoEncontrada(e)) {
        throw e;
      }
    }

    let pathAtual = '';
    for (let i = 0; i < partes.length; i++) {
      pathAtual += '/' + partes[i];
      const parentPath = i === 0 ? '/' : '/' + partes.slice(0, i).join('/');

      try {
        AdminDirectory.Orgunits.get('my_customer', partes.slice(0, i + 1).join('/'));
      } catch (e) {
        if (erroOrgUnitNaoEncontrada(e)) {
          const novaOU = {
            name: partes[i],
            parentOrgUnitPath: parentPath,
            description: `OU criada automaticamente pelo sistema de sincronização`
          };

          AdminDirectory.Orgunits.insert(novaOU, 'my_customer');
          console.info({ event: "OU_CREATED", path: pathAtual });
          Utilities.sleep(500);
        } else {
          throw e;
        }
      }
    }

    return true;
  } catch (e) {
    console.error({ event: "OU_CREATE_ERROR", path: ouPath, error: e.message });
    return false;
  }
}

function buildCPFMap(usuariosGWObject) {
  const cpfMap = {};
  const schemaName = "Informacoes_HCM";
  Object.values(usuariosGWObject).forEach(user => {
    const cpfGW = user.customSchemas?.[schemaName]?.["CPF"];
    if (cpfGW) {
      const cpfNormalizado = UtilsCPF.normalizar(cpfGW);
      if (cpfNormalizado) {
        cpfMap[cpfNormalizado] = user.primaryEmail;
      }
    }
  });
  return cpfMap;
}

function buscarColaboradorPorCPF(cpfNormalizado) {
  try {
    const todosColaboradores = lerTodosColaboradores();
    if (!todosColaboradores || todosColaboradores.length === 0) {
      return null;
    }
    return todosColaboradores.find(colab => {
      const cpfColab = UtilsCPF.normalizar(colab.cpf);
      return cpfColab === cpfNormalizado;
    }) || null;
  } catch (e) {
    console.error({ event: "BUSCAR_COLABORADOR_ERROR", cpf: mascararCpfParaLog(cpfNormalizado), error: e.message });
    return null;
  }
}



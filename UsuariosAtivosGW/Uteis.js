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

function parseDataAdmissao(dataStr) {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const valor = dataStr.trim();
  if (!valor) return null;

  let data = null;
  const br = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const dia = Number(br[1]);
    const mes = Number(br[2]);
    const ano = Number(br[3]);
    data = new Date(ano, mes - 1, dia);
    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== (mes - 1) ||
      data.getDate() !== dia
    ) {
      return null;
    }
  } else {
    const iso = new Date(valor);
    if (!isNaN(iso.getTime())) {
      data = iso;
    }
  }

  if (!data) return null;
  data.setHours(0, 0, 0, 0);
  return data;
}

function dataAdmissaoFutura(dataAdmissao) {
  const data = parseDataAdmissao(dataAdmissao);
  if (!data) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return data.getTime() > hoje.getTime();
}

function deveBloquearSuspensaoPorDataAdmissao(colaborador, usuarioGW) {
  const dataColaborador = colaborador && colaborador.dataAdmissao;
  const dataGW = usuarioGW?.customSchemas?.Informacoes_HCM?.dataAdmissao;
  const dataBase = dataColaborador || dataGW;

  if (!dataBase) return false;
  if (!dataAdmissaoFutura(dataBase)) return false;

  Logger.warn(`[SUSPENSAO_BLOQUEADA_DATA_ADMISSAO_FUTURA] ${mascararEmailParaLog(usuarioGW.primaryEmail)} dataAdmissao=${dataBase}`);
  return true;
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

function erroOrgUnitNaoEncontrada(e) {
  const msg = String((e && e.message) || '').toLowerCase();
  return msg.includes('notfound') || msg.includes('not found') || msg.includes('org unit not found');
}

function normalizarSegmentosOU(ouPath) {
  return String(ouPath || '')
    .replace(/\\+/g, '/')
    .split('/')
    .map(function (p) { return String(p || '').trim(); })
    .filter(function (p) { return p.length > 0; });
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
      const parentPath = i === 0 ? '/' : '/' + partes.slice(0, i + 1).join('/');

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
    if (!cpfNormalizado) return null;

    const colaboradorDireto = lerColaboradorPorCPF(cpfNormalizado);
    if (colaboradorDireto) {
      return colaboradorDireto;
    }

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

function gerarSenhaColaborador(colaborador) {
  const cpfNormalizado = obterCpfEntradaColaborador(colaborador);
  const primeiroNome = obterPrimeiroNomeColaborador(colaborador);

  if (primeiroNome && cpfNormalizado) {
    return primeiroNome.toLowerCase() + '@' + cpfNormalizado;
  }

  return UtilsSenha.gerar(12);
}

function gerarSenhaAleatoria(tamanho = 12) {
  return UtilsSenha.gerar(tamanho);
}

function obterPrimeiroNomeColaborador(colaborador) {
  if (!colaborador || typeof colaborador !== 'object') return null;

  const aliases = ['firstName', 'primeiroNome', 'nome', 'nomeCompleto', 'givenName', 'fullName', 'name'];
  const valor = buscarValorRecursivo(colaborador, aliases);
  if (!valor || typeof valor !== 'string') return null;

  const partes = valor.trim().split(/\s+/);
  if (partes.length === 0) return null;

  return partes[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buscarValorRecursivo(obj, aliases, profundidade = 0, visitados = new Set()) {
  if (!obj || typeof obj !== 'object' || profundidade > 5 || visitados.has(obj)) return null;
  visitados.add(obj);

  for (let alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(obj, alias) && obj[alias]) {
      return obj[alias];
    }
  }

  for (let key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const resultado = buscarValorRecursivo(obj[key], aliases, profundidade + 1, visitados);
      if (resultado) return resultado;
    }
  }

  return null;
}

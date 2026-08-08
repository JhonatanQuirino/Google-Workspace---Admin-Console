// Uteis para o serviço de sincronização do Google Workspace com HCM

function garantirTodosLocaisCadastradosGW() {
    try {
      const dados = lerTodosColaboradores();
      if (!dados || dados.length === 0) {
        Logger.log('[RELATORIO] Nenhum colaborador encontrado para relatório de locais não reconhecidos.');
      } else {
        const buildingsFinal = obterLocaisValidosGW();
        if (!buildingsFinal || buildingsFinal.length === 0) {
          Logger.log('[RELATORIO] Nenhum prédio encontrado no Google Workspace para comparação.');
          return;
        }

        const setLocaisUsuarios = new Set();
        dados.forEach(colab => {
          let valueLocation = colab.nomeMesa || colab.idEdificio;
          if (typeof valueLocation === 'string') valueLocation = valueLocation.trim();
          if (valueLocation && valueLocation.length > 0 && valueLocation !== 'Não informado') {
            setLocaisUsuarios.add(valueLocation);
          }
        });
        const buildingsFinalNorm = buildingsFinal.map(normalizarNomeLocal);
        const locaisNaoReconhecidos = [];
        Array.from(setLocaisUsuarios).forEach(loc => {
          const locNorm = normalizarNomeLocal(loc);
          if (buildingsFinalNorm.indexOf(locNorm) === -1) {
            locaisNaoReconhecidos.push(loc);
          }
        });
        if (locaisNaoReconhecidos.length > 0) {
          Logger.log('[RELATORIO] ValueLocations dos usuários NÃO reconhecidos como prédios válidos no GW:');
          locaisNaoReconhecidos.forEach(loc => Logger.log('  - ' + loc));
          Logger.log('[RELATORIO] Total não reconhecidos: ' + locaisNaoReconhecidos.length);
        } else {
          Logger.log('[RELATORIO] Todos os valueLocations dos usuários estão reconhecidos como prédios válidos no GW.');
        }
      }
    } catch (e) {
      Logger.log('[RELATORIO] Erro ao gerar relatório de locais não reconhecidos: ' + e.message);
    }
}

function obterLocaisValidosGW() {
  try {
    var locais = [];
    var pageToken = null;
    do {
      var resp = AdminDirectory.Resources.Buildings.list('my_customer', { maxResults: 200, pageToken: pageToken });
      if (resp && resp.buildings && resp.buildings.length > 0) {
        locais = locais.concat(resp.buildings.map(b => b.buildingName));
      }
      pageToken = resp.nextPageToken;
    } while (pageToken);
    Logger.log('[obterLocaisValidosGW] Locais válidos encontrados: ' + JSON.stringify(locais));
    return locais;
  } catch (e) {
    Logger.log('[obterLocaisValidosGW] Erro ao buscar locais válidos: ' + e.message);
    return [];
  }
}

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

  console.warn(`[SUSPENSAO_BLOQUEADA_DATA_ADMISSAO_FUTURA] ${mascararEmailParaLog(usuarioGW.primaryEmail)} dataAdmissao=${dataBase}`);
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

function moverParaOUComSenhaNova(usuarioGW, orgUnitPath, colaborador, senhaNova = false, suspender = true) {
  if (!usuarioGW || !usuarioGW.primaryEmail) {
    console.warn({
      event: "MOVER_PARA_OU_USUARIO_INVALIDO",
      primaryEmail: usuarioGW && usuarioGW.primaryEmail,
      cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null,
      emailProfissional: colaborador && colaborador.emailProfissional ? colaborador.emailProfissional : null,
      orgUnitPath: orgUnitPath,
      reason: "Usuário do Workspace inválido ou sem primaryEmail"
    });
    return false;
  }

  const email = String(usuarioGW.primaryEmail).trim().toLowerCase();
  const ouDestino = normalizarOrgUnitPathParaPatch(orgUnitPath, email);
  if (!ouDestino) {
    throw new Error(`OrgUnitPath inválido para usuário ${email}: ${orgUnitPath}`);
  }

  const currentOu = normalizarOrgUnitPathParaPatch(usuarioGW.orgUnitPath, email);
  const currentSuspended = Boolean(usuarioGW.suspended);
  const targetSuspended = Boolean(suspender);

  if (currentOu === ouDestino && currentSuspended === targetSuspended) {
    console.info({
      event: "USUARIO_JA_NA_OU_CORRETA_IGNORADO",
      email: mascararEmailParaLog(email),
      orgUnitPath: currentOu,
      suspended: currentSuspended
    });
    return; // Já está no estado desejado, não faz nada
  }

  const dados = {
    orgUnitPath: ouDestino,
    suspended: targetSuspended
  };

  if (senhaNova) {
    const novaSenha = UtilsSenha.gerar(14, { usarEspeciais: true });
    dados.password = novaSenha;
    dados.changePasswordAtNextLogin = true;
  }

  const MAX_TENTATIVAS = 4;
  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    try {
      AdminDirectory.Users.update(dados, email);
      console.info({
        event: "MOVER_PARA_OU_COM_SENHA_NOVA",
        email: mascararEmailParaLog(email),
        orgUnitPath: ouDestino,
        senhaNova: senhaNova
      });
      return; // Sucesso, sai do loop
    } catch (e) {
      const message = String((e && e.message) || e || '').toLowerCase();
      const isRetryableError = (
        message.includes('conflicting') ||
        message.includes('unknown error') ||
        message.includes('server error') ||
        message.includes('service invoked too many times') ||
        message.includes('empty response') ||
        message.includes('service is currently unavailable') ||
        message.includes('backend error') ||
        message.includes('internal error') ||
        message.includes('rate limit') ||
        message.includes('quota') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')
      );

      if (isRetryableError && i < MAX_TENTATIVAS - 1) {
        const baseDelay = 2000;
        const maxDelay = 15000;
        const jitter = Math.floor(Math.random() * 1000);
        const delay = Math.min(baseDelay * Math.pow(2, i) + jitter, maxDelay);
        console.warn(`Tentativa ${i + 1}/${MAX_TENTATIVAS} falhou ao mover usuário ${mascararEmailParaLog(email)}, erro: ${e.message}. Aguardando ${delay}ms para nova tentativa.`);
        Utilities.sleep(delay);
      } else {
        console.error({
          event: "MOVER_PARA_OU_COM_SENHA_NOVA_ERRO",
          email: mascararEmailParaLog(email),
          orgUnitPath: ouDestino,
          error: e && e.message ? e.message : e
        });
        throw e;
      }
    }
  }
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

function garantirOUsDeAfastamento() {
  const ousNecessarias = REQUIRED_SUSPENSION_OUS;

  let criadas = 0;
  ousNecessarias.forEach(ou => {
    if (criarOUSeNaoExistir(ou)) criadas++;
  });

  if (criadas > 0) {
    console.info({ event: "OUS_CREATED", count: criadas, paths: ousNecessarias });
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

function gerarSenhaColaborador(colaborador) {
  return UtilsSenha.gerar(12);
}

function gerarSenhaAleatoria(tamanho = 12) {
  return UtilsSenha.gerar(tamanho);
}

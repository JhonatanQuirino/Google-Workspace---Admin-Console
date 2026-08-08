function obterUsuarioGW(colaborador, usuariosGW, cpfParaEmailGW) {
  const cpfHCM = UtilsCPF.normalizar(colaborador.cpf);
  const emailHCM = (colaborador.emailProfissional || '').trim().toLowerCase();

  if (!cpfHCM) return null;
  let usuarioGW = cpfParaEmailGW[cpfHCM] ? usuariosGW[cpfParaEmailGW[cpfHCM].toLowerCase()] : null;

  if (!usuarioGW && emailHCM && usuariosGW[emailHCM]) {
    const userByEmail = usuariosGW[emailHCM];
    const cpfGW = userByEmail.customSchemas?.Informacoes_HCM?.CPF;
    if (UtilsCPF.normalizar(cpfGW) && UtilsCPF.normalizar(cpfGW) !== cpfHCM) {
      Logger.warn('[getUsuarioGW] Conflito de CPF: email=' + mascararEmailParaLog(emailHCM) + ', HCM=' + cpfHCM + ', GW=' + cpfGW);
      return null;
    }
    usuarioGW = userByEmail;
  }

  return usuarioGW;
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

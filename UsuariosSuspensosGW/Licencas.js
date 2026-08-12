/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

var _licencasPorUsuarioCache = {};

function obterHeadersLicenciamento() {
  return {
    Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    Accept: 'application/json'
  };
}

function chamarApiLicenciamento(url, method) {
  const MAX_TENTATIVAS = 3;
  const options = {
    method: method || 'get',
    muteHttpExceptions: true,
    headers: obterHeadersLicenciamento()
  };

  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (code >= 200 && code < 300) {
      return text ? JSON.parse(text) : {};
    }

    const retryable = code === 429 || code === 500 || code === 502 || code === 503 || code === 504;
    if (retryable && i < MAX_TENTATIVAS - 1) {
      Utilities.sleep(1000 * (i + 1));
      continue;
    }

    const erro = new Error(formatarErroLicenciamento(code, text));
    erro.statusCode = code;
    throw erro;
  }

  return {};
}

function formatarErroLicenciamento(code, text) {
  try {
    const body = JSON.parse(text);
    const erro = body && body.error ? body.error : {};
    const details = erro.details || [];
    const serviceDisabled = details.some(function(detail) {
      return detail && detail.reason === 'SERVICE_DISABLED';
    });
    const metadata = details
      .filter(function(detail) { return detail && detail.metadata; })
      .map(function(detail) { return detail.metadata; })[0] || {};

    if (serviceDisabled) {
      return 'Enterprise License Manager API desativada no projeto Google Cloud ' +
        (metadata.containerInfo || metadata.consumer || '') +
        '. Habilite a API neste link e execute novamente: ' +
        (metadata.activationUrl || 'https://console.cloud.google.com/apis/library/licensing.googleapis.com');
    }

    if (erro.message) {
      return `Licensing API Error (${code}): ${erro.message}`;
    }
  } catch (_e) {
    // Mantem o retorno padrao abaixo quando a resposta nao for JSON.
  }

  return `Licensing API Error (${code}): ${text}`;
}

function listarLicencasPorProduto(productId, customerId) {
  const licencas = [];
  let pageToken = null;

  do {
    let response = null;

    if (
      typeof AdminLicenseManager !== 'undefined' &&
      AdminLicenseManager.LicenseAssignments &&
      typeof AdminLicenseManager.LicenseAssignments.listForProduct === 'function'
    ) {
      response = AdminLicenseManager.LicenseAssignments.listForProduct(
        productId,
        customerId,
        {
          maxResults: 500,
          pageToken: pageToken
        }
      );
    } else {
      let url = 'https://licensing.googleapis.com/apps/licensing/v1/product/' +
        encodeURIComponent(productId) +
        '/users?customerId=' +
        encodeURIComponent(customerId) +
        '&maxResults=500';

      if (pageToken) {
        url += '&pageToken=' + encodeURIComponent(pageToken);
      }

      response = chamarApiLicenciamento(url, 'get');
    }

    if (response && response.items) {
      licencas.push.apply(licencas, response.items);
    }
    pageToken = response && response.nextPageToken ? response.nextPageToken : null;
  } while (pageToken);

  return licencas;
}

function obterCustomerIdLicenciamento(usuarioGW) {
  const config = LICENCAS_GOOGLE_WORKSPACE || {};
  if (config.CUSTOMER_ID) {
    return config.CUSTOMER_ID;
  }

  if (usuarioGW && usuarioGW.customerId) {
    return usuarioGW.customerId;
  }

  if (usuarioGW && usuarioGW.primaryEmail) {
    try {
      const usuarioAtualizado = AdminDirectory.Users.get(usuarioGW.primaryEmail, { projection: 'basic' });
      if (usuarioAtualizado && usuarioAtualizado.customerId) {
        return usuarioAtualizado.customerId;
      }
    } catch (e) {
      console.warn({
        event: 'LICENCAS_CUSTOMER_ID_USUARIO_ERRO',
        email: mascararEmailParaLog(usuarioGW.primaryEmail),
        error: e && e.message ? e.message : e
      });
    }
  }

  throw new Error('Não foi possível obter customerId para consulta de licenças.');
}

function carregarLicencasPorUsuario(usuarioGW) {
  const config = LICENCAS_GOOGLE_WORKSPACE || {};
  const customerId = obterCustomerIdLicenciamento(usuarioGW);

  if (_licencasPorUsuarioCache[customerId]) {
    return _licencasPorUsuarioCache[customerId];
  }

  const productIds = config.PRODUCT_IDS || [];
  const mapa = {};
  let totalLicencas = 0;

  productIds.forEach(function(productId) {
    const licencas = listarLicencasPorProduto(productId, customerId);
    totalLicencas += licencas.length;

    licencas.forEach(function(licenca) {
      const email = String(licenca.userId || '').trim().toLowerCase();
      if (!email) return;
      if (!mapa[email]) mapa[email] = [];
      mapa[email].push({
        productId: licenca.productId || productId,
        skuId: licenca.skuId,
        userId: licenca.userId
      });
    });
  });

  console.info({
    event: 'LICENCAS_CARREGADAS',
    customerId: customerId,
    productIds: productIds,
    totalLicencas: totalLicencas,
    totalUsuariosComLicenca: Object.keys(mapa).length
  });

  _licencasPorUsuarioCache[customerId] = mapa;
  return mapa;
}

function removerAtribuicaoLicenca(licenca, email) {
  try {
    if (
      typeof AdminLicenseManager !== 'undefined' &&
      AdminLicenseManager.LicenseAssignments &&
      typeof AdminLicenseManager.LicenseAssignments.remove === 'function'
    ) {
      AdminLicenseManager.LicenseAssignments.remove(licenca.productId, licenca.skuId, email);
    } else {
      const url = 'https://licensing.googleapis.com/apps/licensing/v1/product/' +
        encodeURIComponent(licenca.productId) +
        '/sku/' +
        encodeURIComponent(licenca.skuId) +
        '/user/' +
        encodeURIComponent(email);

      chamarApiLicenciamento(url, 'delete');
    }
    return true;
  } catch (e) {
    if (e && (e.statusCode === 404 || String(e.message || e).indexOf('notFound') !== -1 || String(e.message || e).indexOf('Not Found') !== -1)) {
      return true;
    }
    throw e;
  }
}

function obterAtribuicaoLicenca(licenca, email) {
  try {
    if (
      typeof AdminLicenseManager !== 'undefined' &&
      AdminLicenseManager.LicenseAssignments &&
      typeof AdminLicenseManager.LicenseAssignments.get === 'function'
    ) {
      return AdminLicenseManager.LicenseAssignments.get(licenca.productId, licenca.skuId, email);
    }

    const url = 'https://licensing.googleapis.com/apps/licensing/v1/product/' +
      encodeURIComponent(licenca.productId) +
      '/sku/' +
      encodeURIComponent(licenca.skuId) +
      '/user/' +
      encodeURIComponent(email);

    return chamarApiLicenciamento(url, 'get');
  } catch (e) {
    if (e && (e.statusCode === 404 || String(e.message || e).indexOf('notFound') !== -1 || String(e.message || e).indexOf('Not Found') !== -1)) {
      return null;
    }
    throw e;
  }
}

function confirmarLicencaRemovida(licenca, email, situacao) {
  Utilities.sleep(500);
  const licencaAtual = obterAtribuicaoLicenca(licenca, email);

  if (!licencaAtual) {
    console.info({
      event: 'LICENCA_REMOCAO_CONFIRMADA',
      email: mascararEmailParaLog(email),
      productId: licenca.productId,
      skuId: licenca.skuId,
      situacao: situacao
    });
    return true;
  }

  console.warn({
    event: 'LICENCA_AINDA_ATRIBUIDA_APOS_REMOCAO',
    email: mascararEmailParaLog(email),
    productId: licenca.productId,
    skuId: licenca.skuId,
    situacao: situacao,
    hint: 'Verifique autoatribuição de licenças por OU/grupo no Admin Console.'
  });
  return false;
}

function removerLicencasUsuario(usuarioGW, colaborador, situacao) {
  if (!usuarioGW || !usuarioGW.primaryEmail) {
    console.warn({
      event: 'LICENCAS_USUARIO_INVALIDO',
      cpf: colaborador && colaborador.cpf ? mascararCpfParaLog(colaborador.cpf) : null,
      situacao: situacao
    });
    return { removidas: 0, erros: 0 };
  }

  const email = String(usuarioGW.primaryEmail).trim().toLowerCase();

  try {
    const mapa = carregarLicencasPorUsuario(usuarioGW);
    const licencas = mapa[email] || [];

    if (licencas.length === 0) {
      console.info({
        event: 'LICENCAS_NENHUMA_ATRIBUIDA',
        email: mascararEmailParaLog(email),
        situacao: situacao
      });
      return { removidas: 0, erros: 0 };
    }

    let removidas = 0;
    let erros = 0;

    licencas.forEach(function(licenca) {
      try {
        removerAtribuicaoLicenca(licenca, email);
        if (confirmarLicencaRemovida(licenca, email, situacao)) {
          removidas++;
        } else {
          erros++;
        }
        console.info({
          event: 'LICENCA_REMOVIDA',
          email: mascararEmailParaLog(email),
          productId: licenca.productId,
          skuId: licenca.skuId,
          situacao: situacao
        });
      } catch (e) {
        erros++;
        console.error({
          event: 'LICENCA_REMOVER_ERRO',
          email: mascararEmailParaLog(email),
          productId: licenca.productId,
          skuId: licenca.skuId,
          situacao: situacao,
          error: e && e.message ? e.message : e
        });
      }
    });

    delete mapa[email];
    return { removidas: removidas, erros: erros };
  } catch (e) {
    console.error({
      event: 'LICENCAS_REMOVER_USUARIO_ERRO',
      email: mascararEmailParaLog(email),
      situacao: situacao,
      error: e && e.message ? e.message : e
    });
    return { removidas: 0, erros: 1 };
  }
}

function removerLicencasSeSituacaoExigir(usuarioGW, colaborador, situacao) {
  const codigoSituacao = String(situacao || (colaborador && colaborador.situacao) || '');
  if (!SITUACOES.REMOVER_LICENCAS.has(codigoSituacao)) {
    return { removidas: 0, erros: 0 };
  }

  return removerLicencasUsuario(usuarioGW, colaborador, codigoSituacao);
}

function diagnosticarLicencasUsuario(email) {
  const usuarioGW = AdminDirectory.Users.get(email, { projection: 'full' });
  const mapa = carregarLicencasPorUsuario(usuarioGW);
  const licencas = mapa[String(email || '').trim().toLowerCase()] || [];
  const resultado = {
    email: mascararEmailParaLog(email),
    customerId: obterCustomerIdLicenciamento(usuarioGW),
    totalLicencas: licencas.length,
    licencas: licencas
  };
  console.info({ event: 'LICENCAS_DIAGNOSTICO_USUARIO', resultado: resultado });
  return resultado;
}

/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */


function executarVerificacoesDeAniversario() {
  Logger.log("Iniciando verificações diárias de aniversários (nascimento e empresa)");

  if (typeof verificarServicoAdminDirectory === 'function' && !verificarServicoAdminDirectory()) {
    Logger.log("Serviço AdminDirectory não disponível. Processo abortado.");
    return;
  }

  const fusoHorario = Session.getScriptTimeZone();
  const hoje = new Date();
  const diaHoje = Utilities.formatDate(hoje, fusoHorario, "dd");
  const mesHoje = Utilities.formatDate(hoje, fusoHorario, "MM");
  const anoHoje = hoje.getFullYear();
  const hojeStr = `${mesHoje}-${diaHoje}`;

  let todosUsuarios;
  try {
    Logger.log("Buscando lista de usuários do Google Workspace...");
    const usuariosGW = listarTodosOsUsuarios(NOME_DOMINIO);
    if (!usuariosGW) {
      throw new Error("Falha ao listar usuários do Google.");
    }
    if (Array.isArray(usuariosGW)) {
      todosUsuarios = usuariosGW;
    } else if (typeof usuariosGW === 'object' && usuariosGW !== null) {
      todosUsuarios = Object.values(usuariosGW);
    } else {
      Logger.log("Formato inesperado para a lista de usuários. Processo abortado.");
      return;
    }
    if (!Array.isArray(todosUsuarios) || todosUsuarios.length === 0) {
      Logger.log("A lista de usuários está vazia ou não é um array. Processo abortado.");
      return;
    }
    Logger.log(`Lista carregada: ${todosUsuarios.length} usuários.`);
  } catch (e) {
    Logger.log(`Erro ao buscar usuários: ${e.message}`);
    return;
  }

  try {
    Logger.log(`Verificando aniversários de nascimento (${hojeStr})`);
    _verificarAniversariosNascimento(todosUsuarios, hojeStr);
  } catch (e) {
    Logger.log(`Erro ao verificar aniversários de nascimento: ${e.message}`);
  }

  try {
    Logger.log(`Verificando aniversários de empresa (${hojeStr})`);
    _verificarAniversariosEmpresa(todosUsuarios, hojeStr, anoHoje);
  } catch (e) {
    Logger.log(`Erro ao verificar aniversários de empresa: ${e.message}`);
  }

  Logger.log("Verificações diárias concluídas.");
}

function _verificarAniversariosNascimento(todosUsuarios, hojeStr) {
  let aniversariantesEncontrados = [];
  let falhasEnvio = [];
  const schemaName = "Informacoes_HCM";
  const fieldName = "dataNascimento";

  for (const usuario of todosUsuarios) {
    if (!usuario || !usuario.primaryEmail) {
      Logger.log(`Ignorado registro de usuário inválido durante verificação de aniversário de nascimento: ${JSON.stringify(usuario)}`);
      continue;
    }

    if (usuario.suspended) {
      continue;
    }
    
    if (!usuario.customSchemas || !usuario.customSchemas[schemaName] || !usuario.customSchemas[schemaName][fieldName]) {
      continue;
    }

    const dataNascUsuario = usuario.customSchemas[schemaName][fieldName];
    const partesData = dataNascUsuario.split('/');
    
    if (partesData.length !== 3 || partesData[0].length !== 2 || partesData[1].length !== 2 || partesData[2].length !== 4) {
      Logger.log(`Data de nascimento inválida para ${usuario.primaryEmail}: ${dataNascUsuario}. Formato esperado: DD/MM/AAAA.`);
      continue;
    }
    
    const mesUsuario = partesData[1];
    const diaUsuario = partesData[0];
    const aniversarioUsuarioStr = `${mesUsuario}-${diaUsuario}`;
    
    if (hojeStr === aniversarioUsuarioStr) {
      Logger.log(`Aniversariante encontrado (nascimento): ${usuario.primaryEmail}`);
      try {
        enviarEmailDeParabens(usuario);
        aniversariantesEncontrados.push(usuario.primaryEmail);
        Logger.log(`E-mail de aniversário enviado para ${usuario.primaryEmail}.`);
      } catch (emailError) {
        Logger.log(`Erro ao enviar e-mail de aniversário para ${usuario.primaryEmail}: ${emailError.message}`);
        falhasEnvio.push(usuario.primaryEmail);
      }
    }
  } 
  
    Logger.log("Verificação de aniversários de nascimento concluída.");
    Logger.log(`Total de aniversariantes parabenizados (nascimento): ${aniversariantesEncontrados.length}`);
    if (falhasEnvio.length > 0) {
      Logger.log(`Falha ao enviar e-mail de aniversário para: ${falhasEnvio.join(', ')}`);
  }
}

function _verificarAniversariosEmpresa(todosUsuarios, hojeStr, anoHoje) {
  let aniversariantesEncontrados = [];
  let falhasEnvio = [];
  const schemaName = "Informacoes_HCM";
  const fieldName = "dataAdmissao";

  for (const usuario of todosUsuarios) {
    if (!usuario || !usuario.primaryEmail) {
      Logger.log(`Ignorado registro de usuário inválido durante verificação de tempo de empresa: ${JSON.stringify(usuario)}`);
      continue;
    }

    if (usuario.suspended) {
      continue;
    }
    
    if (!usuario.customSchemas || !usuario.customSchemas[schemaName] || !usuario.customSchemas[schemaName][fieldName]) {
      continue;
    }

    const dataAdmissaoStr = usuario.customSchemas[schemaName][fieldName];
    const partesData = dataAdmissaoStr.split('/');
    
    if (partesData.length !== 3 || partesData[0].length !== 2 || partesData[1].length !== 2 || partesData[2].length !== 4) {
      Logger.log(`Data de admissão inválida para ${usuario.primaryEmail}: ${dataAdmissaoStr}. Formato esperado: DD/MM/AAAA.`);
      continue;
    }
    
    const diaAdmissao = partesData[0];
    const mesAdmissao = partesData[1];
    const anoAdmissao = parseInt(partesData[2], 10);
    
    const aniversarioEmpresaStr = `${mesAdmissao}-${diaAdmissao}`;
    
    if (hojeStr === aniversarioEmpresaStr) {
      const anosDeEmpresa = anoHoje - anoAdmissao;

      if (anosDeEmpresa > 0) {
        Logger.log(`Aniversariante de empresa encontrado: ${usuario.primaryEmail} (${anosDeEmpresa} anos)`);
        try {
          enviarEmailTempoDeEmpresa(usuario, anosDeEmpresa);
          aniversariantesEncontrados.push(usuario.primaryEmail);
          Logger.log(`E-mail de tempo de empresa (${anosDeEmpresa} anos) enviado para ${usuario.primaryEmail}.`);
        } catch (emailError) {
          Logger.log(`Erro ao enviar e-mail de tempo de empresa para ${usuario.primaryEmail}: ${emailError.message}`);
          falhasEnvio.push(usuario.primaryEmail);
        }
      } else {
         Logger.log(`Ignorado ${usuario.primaryEmail}: anos de empresa <= 0 (${anosDeEmpresa})`);
      }
    }
  }
  
    Logger.log("Verificação de tempo de empresa concluída.");
    Logger.log(`Total de aniversariantes parabenizados (empresa): ${aniversariantesEncontrados.length}`);
    if (falhasEnvio.length > 0) {
      Logger.log(`Falha ao enviar e-mail de tempo de empresa para: ${falhasEnvio.join(', ')}`);
  }
}

function enviarEmailDeParabens(usuario) {
  if (!usuario || !usuario.primaryEmail) {
    Logger.log(`Ignorado envio de aniversário: usuário inválido ou sem e-mail (${JSON.stringify(usuario)})`);
    return;
  }

  const emailDestinatario = usuario.primaryEmail;
  const emailPessoal = (usuario.recoveryEmail || '').trim();
  const primeiroNome = (usuario.name && usuario.name.givenName) ? usuario.name.givenName : "Colaborador(a)";

  const template = HtmlService.createTemplateFromFile('Email_Aniversario');
  template.primeiroNome = primeiroNome;
  template.organizationSignatureName = ORGANIZATION_SIGNATURE_NAME;
  template.organizationSignatureTitle = ORGANIZATION_SIGNATURE_TITLE;
  template.birthdayImageUrl = BIRTHDAY_IMAGE_URL;
  const htmlBody = template.evaluate().getContent();

  const assuntoOriginal = `🎁 A ${ORGANIZATION_NAME} preparou um presente especial para você! 🎉`;
  const nomeRemetenteOriginal = ORGANIZATION_SENDER_NAME;
  const emailRemetente = EMAIL_COMUNICACAO;

  const assuntoCodificado = "=?UTF-8?B?" + 
                           Utilities.base64Encode(assuntoOriginal, Utilities.Charset.UTF_8) +
                           "?=";
  
  const fromCodificado = "=?UTF-8?B?" + 
                        Utilities.base64Encode(nomeRemetenteOriginal, Utilities.Charset.UTF_8) +
                        "?= <" + emailRemetente + ">";

  const opcoesEmail = {
    htmlBody: htmlBody,
    from: fromCodificado,
    charset: "UTF-8"
  };
  if (emailPessoal && emailPessoal.toLowerCase() !== emailDestinatario.toLowerCase()) {
    opcoesEmail.cc = emailPessoal;
  }

  GmailApp.sendEmail(emailDestinatario, assuntoCodificado, "", opcoesEmail);
}

function testarEnvioEmailAniversario() {
  Logger.log("Teste: enviando e-mail de aniversário para EMAIL_ADMIN...");

  if (!EMAIL_ADMIN) {
    Logger.log("EMAIL_ADMIN não configurado. Defina a propriedade EMAIL_ADMIN antes de testar.");
    return;
  }

  const usuarioDeTeste = {
    primaryEmail: EMAIL_ADMIN,
    name: {
      givenName: "Teste"
    }
  };

  try {
    enviarEmailDeParabens(usuarioDeTeste);
    
    Logger.log(`E-mail de teste enviado para ${EMAIL_ADMIN}. Verifique a caixa de entrada.`);
    
  } catch (e) {
    Logger.log(`Erro ao enviar e-mail de teste: ${e.message}`);
    Logger.log("Verifique se a API do Gmail está habilitada e a permissão 'Enviar como' está configurada.");
  }
}

function enviarEmailTempoDeEmpresa(usuario, anosDeEmpresa) {
  if (!usuario || !usuario.primaryEmail) {
    Logger.log(`Ignorado envio de tempo de empresa: usuário inválido ou sem e-mail (${JSON.stringify(usuario)})`);
    return;
  }

  const emailDestinatario = usuario.primaryEmail;
  const primeiroNome = (usuario.name && usuario.name.givenName) ? usuario.name.givenName : "Colaborador(a)";
  
  const singularPlural = (anosDeEmpresa === 1) ? "ano" : "anos";
  
  const assuntoOriginal = `Feliz ${anosDeEmpresa} ${singularPlural} de ${ORGANIZATION_NAME}! 🎉🥳`;
  
  const nomeRemetenteOriginal = ORGANIZATION_SENDER_NAME;
  const emailRemetente = EMAIL_COMUNICACAO;

  const assuntoCodificado = "=?UTF-8?B?" + 
                            Utilities.base64Encode(assuntoOriginal, Utilities.Charset.UTF_8) +
                            "?=";
  
  const fromCodificado = "=?UTF-8?B?" + 
                        Utilities.base64Encode(nomeRemetenteOriginal, Utilities.Charset.UTF_8) +
                        "?= <" + emailRemetente + ">";

  
  const template = HtmlService.createTemplateFromFile('Email_TempoEmpresa');
  template.primeiroNome = primeiroNome;
  template.anosDeEmpresa = anosDeEmpresa;
  template.singularPlural = singularPlural;
  template.organizationSignatureName = ORGANIZATION_SIGNATURE_NAME;
  template.organizationSignatureTitle = ORGANIZATION_SIGNATURE_TITLE;
  template.companyAnniversaryImageUrl = COMPANY_ANNIVERSARY_IMAGE_URL;
  const htmlBody = template.evaluate().getContent();
  
  GmailApp.sendEmail(emailDestinatario, assuntoCodificado, "", {
    htmlBody: htmlBody,
    from: fromCodificado, 
    charset: "UTF-8"
  });
}

function testarEnvioEmailTempoDeEmpresa() {
  Logger.log("Teste: enviando e-mail de tempo de empresa para EMAIL_ADMIN...");

  if (!EMAIL_ADMIN) {
    Logger.log("EMAIL_ADMIN não configurado. Defina a propriedade EMAIL_ADMIN antes de testar.");
    return;
  }

  const usuarioDeTeste = {
    primaryEmail: EMAIL_ADMIN,
    name: {
      givenName: "Teste"
    }
  };
  
  const anosDeTeste = 5;

  try {
    enviarEmailTempoDeEmpresa(usuarioDeTeste, anosDeTeste);
    
    Logger.log(`E-mail de teste de tempo de empresa (${anosDeTeste} anos) enviado para ${EMAIL_ADMIN}. Verifique a caixa de entrada.`);
    
  } catch (e) {
    Logger.log(`Erro ao enviar e-mail de teste: ${e.message}`);
    Logger.log("Verifique se a API do Gmail está habilitada e a permissão 'Enviar como' está configurada.");
  }
}






function executarCriacaoAutomatica() {
  const execId = Utilities.getUuid();
  const startTs = Date.now();

  console.info({ event: "AUTO_CREATE_INIT", execution_id: execId, type: "USER_PROVISIONING" });

  try {
   
    const usuariosGWObject = _criacao_listarUsuariosGW(NOME_DOMINIO);
    if (!usuariosGWObject) {
      throw new Error('Falha ao carregar usuários existentes do Google.');
    }


    const cpfParaEmailGW = {};
    const schemaName = "Informacoes_HCM";
    const fieldNameCPF = "CPF";

    Object.values(usuariosGWObject).forEach(user => {
      const cpfGW = user.customSchemas?.[schemaName]?.[fieldNameCPF];
      if (cpfGW) {
         
         cpfParaEmailGW[UtilsCriacaoUsuarios.padronizarCPF(cpfGW)] = user.primaryEmail;
      }
    });


    const dadosHCM = lerTodosColaboradores();
    if (!dadosHCM) {
      throw new Error('Falha ao ler dados dos colaboradores do Firebase.');
    }

    const colaboradoresParaCriar = dadosHCM.filter(colaborador => {
      const situacaoOk = String(colaborador.situacao).trim() === SITUACAO_ATIVA;
      if (!situacaoOk) return false;

      const emailProfissional = (colaborador.emailProfissional || '').toString().trim().toLowerCase();
      if (!emailProfissional) return true;

      return !usuariosGWObject[emailProfissional];
    });

    console.info({
      event: "DATA_LOADED",
      hcm_total: dadosHCM.length,
      gw_total: Object.keys(usuariosGWObject).length,
      eligible_count: colaboradoresParaCriar.length
    });

    if (colaboradoresParaCriar.length === 0) {
      console.info({ event: "AUTO_CREATE_COMPLETE", message: "No new users to create.", stats: { success: 0, fail: 0, skipped: 0 } });
      return;
    }


    const mapaUO = carregarMapeamentoUO();
    if (!mapaUO) {
      console.warn({ event: "CONFIG_WARN", message: "Mapeamento UO não carregado. Usuários irão para a raiz." });
    }


    const stats = { success: 0, fail: 0, skipped: 0 };


    const emailsExistentes = Object.keys(usuariosGWObject);

    colaboradoresParaCriar.forEach(colaborador => {
      const nomeOriginal = colaborador.nomeCompleto || `${colaborador.firstName} ${colaborador.lastName}`;
      const cpfOriginal = colaborador.cpf;
      const cpfPadronizado = UtilsCriacaoUsuarios.padronizarCPF(cpfOriginal);

      try {
        if (!cpfPadronizado || cpfPadronizado.length !== 11) {
          console.warn({ event: "INVALID_DATA", cpf: cpfOriginal, name: nomeOriginal, reason: "Invalid CPF" });
          stats.fail++;
          return;
        }

        if (cpfParaEmailGW[cpfPadronizado]) {
          console.warn({ event: "USER_EXISTS", cpf: cpfPadronizado, email_gw: cpfParaEmailGW[cpfPadronizado], message: "CPF already mapped" });
          stats.skipped++;
          return;
        }

        const novoEmail = _criacao_obterEmailAlvo(colaborador, emailsExistentes, usuariosGWObject);
        if (!novoEmail) {
          const emailProfissional = (colaborador.emailProfissional || '').toString().trim().toLowerCase();
          console.error({
            event: "EMAIL_TARGET_FAIL",
            name: nomeOriginal,
            cpf: cpfPadronizado,
            emailProfissional: emailProfissional || null,
            message: emailProfissional ? "Target email already exists or is invalid" : "Could not generate unique email"
          });
          stats.fail++;
          return;
        }

        const departamentoTratado = normalizarChaveMapeamentoUO(colaborador.departamento);
        const centroCustoTratado = normalizarChaveMapeamentoUO(colaborador.centroCusto);
        let uoDestino = '/';

        if (mapaUO) {
          uoDestino = buscarOUPorChaveMapeamento(mapaUO, centroCustoTratado) || buscarOUPorChaveMapeamento(mapaUO, departamentoTratado) || '/';
        }

        if (uoDestino === '/') {
           console.warn({ event: "UO_FALLBACK", departamento: departamentoTratado, cc: centroCustoTratado, cpf: cpfPadronizado, email: novoEmail });
        }

        _criacao_criarUsuario(colaborador, novoEmail, uoDestino);

        emailsExistentes.push(novoEmail.toLowerCase());
        stats.success++;
      } catch (e) {
        stats.fail++;
        console.error({ event: "USER_CREATE_ERROR", cpf: cpfPadronizado, name: nomeOriginal, error: e.message, stack: e.stack });
      }
    });

    console.info({
      event: "AUTO_CREATE_SUMMARY",
      execution_id: execId,
      duration_ms: Date.now() - startTs,
      stats: stats
    });

  } catch (e) {
    console.error({ event: "AUTO_CREATE_FATAL", execution_id: execId, error: e.message, stack: e.stack });
  }
}

// Evita tentativas de criação quando o e-mail parece ser um placeholder/teste
function isTestEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  // padrões comuns de e-mails de teste/placeholder
  if (/\b(teste|test|example)\b/.test(e)) return true;
  if (e.indexOf('dominio') !== -1) return true; // captura 'teste@dominio.com' e similares
  return false;
}

function _criacao_criarUsuario(dadosHCM, novoEmail, uoDestino) {
    const cpfPadronizado = UtilsCriacaoUsuarios.padronizarCPF(dadosHCM.cpf);
    const senhaPadronizada = UtilsCriacaoUsuarios.gerarSenhaPrimeiroNomeCPF(dadosHCM.firstName, dadosHCM.cpf);

    // Se detectarmos e-mail de teste/placeholder, não tentar inserir no Google Workspace
    if (isTestEmail(novoEmail)) {
      console.warn({ event: 'SKIP_TEST_EMAIL', email: novoEmail, cpf: cpfPadronizado, reason: 'Detected test/placeholder email, skipping creation in GW' });
      return;
    }


  const emailPessoalLimpo = (dadosHCM.emailPessoal || '').trim();
  const celularLimpo = (dadosHCM.numeroCelular || '').trim();

  const newUser = {
    primaryEmail: novoEmail,
    name: {
      givenName: dadosHCM.firstName || 'Nome',
      familyName: dadosHCM.lastName || 'Sobrenome'
    },
    orgUnitPath: uoDestino,
    password: senhaPadronizada,
    changePasswordAtNextLogin: true,
    recoveryEmail: emailPessoalLimpo || null,
    recoveryPhone: celularLimpo || null,
    organizations: [{
      name: 'Missão Sal da Terra',
      title: dadosHCM.cargo || '',
      department: dadosHCM.departamento || '',
      costCenter: dadosHCM.centroCusto || '',
      description: dadosHCM.tipoColaborador || '',
      primary: true
    }],
    relations: (dadosHCM.superiorImediato && dadosHCM.superiorImediato.includes('@'))
      ? [{ value: dadosHCM.superiorImediato, type: 'manager' }]
      : [],
    locations: []
  };


  const schemaFields = { "CPF": cpfPadronizado };
 
  if (dadosHCM.dataNascimento) {
      const p = dadosHCM.dataNascimento.split('/');
      if (p.length === 3 && p[2].length === 4) schemaFields["dataNascimento"] = dadosHCM.dataNascimento;
  }
  if (dadosHCM.dataAdmissao) {
      const p = dadosHCM.dataAdmissao.split('/');
      if (p.length === 3 && p[2].length === 4) schemaFields["dataAdmissao"] = dadosHCM.dataAdmissao;
  }

  if (dadosHCM.dataAgendamento) {
      const p = dadosHCM.dataAgendamento.split('/');
      if (p.length === 3 && p[2].length === 4) schemaFields["dataAgendamento"] = dadosHCM.dataAgendamento;
  }

  newUser.customSchemas = { "Informacoes_HCM": schemaFields };


  if (!newUser.recoveryEmail) delete newUser.recoveryEmail;
  if (!newUser.recoveryPhone) delete newUser.recoveryPhone;
  if (newUser.relations.length === 0) delete newUser.relations;
  if (newUser.locations.length === 0) delete newUser.locations;


  const org = newUser.organizations?.[0];
  if (org && !org.title && !org.department && !org.costCenter && !org.description) {
    delete newUser.organizations;
  }

    try {
        // Verifica se o e-mail já existe no Google Workspace
        var usuarioExistente = null;
        try {
            usuarioExistente = AdminDirectory.Users.get(novoEmail);
        } catch (e) {
            // Se não existe, o erro será ignorado
            usuarioExistente = null;
        }
        if (usuarioExistente) {
            console.warn({ event: "USER_EXISTS_EMAIL", email: novoEmail, message: "E-mail já existe no Google Workspace" });
            return;
        }
        AdminDirectory.Users.insert(newUser);
        console.info({
                event: "USER_CREATED",
                email: novoEmail,
                cpf: cpfPadronizado,
                uo: uoDestino
        });
        _criacao_enviarNotificacaoLider(dadosHCM, novoEmail);
    } catch (e) {
        console.error({ event: "GW_INSERT_FAIL", email: novoEmail, payload: newUser, error: e.message, stack: e.stack });
        throw e;
    }
}

function _criacao_gerarEmailUnico(firstName, lastName, emailsExistentes, dominio) {
  if (!firstName) return null;

    const fName = UtilsCriacaoUsuarios.normalizeName(firstName);
  if (!fName) return null;

  const lastNameStr = String(lastName || '');
  const stopWords = new Set(['de', 'da', 'do', 'dos', 'das']);
  const significantLastNames = lastNameStr.split(' ')
    .map(part => UtilsCriacaoUsuarios.normalizeName(part))
    .filter(part => part && !stopWords.has(part) && part.length > 1);


  const emailsSet = new Set(emailsExistentes.map(e => e.toLowerCase()));
  const candidates = [];


  if (significantLastNames.length > 0) {
    const lName = significantLastNames[significantLastNames.length - 1];
    candidates.push(`${fName}.${lName}`);
   
    if (significantLastNames.length > 1) {
       candidates.push(`${fName}.${significantLastNames[0]}`);
    }
  }


  if (significantLastNames.length > 0) {
     const lName = significantLastNames[significantLastNames.length - 1];
     candidates.push(`${lName}.${fName}`);
  }


  if (significantLastNames.length > 0) {
    const lName = significantLastNames[significantLastNames.length - 1];
    candidates.push(`${fName}${lName.charAt(0)}`);
  }

  candidates.push(fName);


  for (const cand of candidates) {
    if (!cand) continue;
    const email = `${cand}@${dominio}`.toLowerCase();
    if (!emailsSet.has(email)) return email;
  }

}
function _criacao_formatarEmailProfissional(colaborador) {
  const email = (colaborador.emailProfissional || '').toString().trim().toLowerCase();
  return email && email.indexOf('@') > 0 ? email : null;
}






function _criacao_obterEmailAlvo(colaborador, emailsExistentes, usuariosGWObject) {
  const emailProfissional = _criacao_formatarEmailProfissional(colaborador);
  if (emailProfissional) {
    const emailExistente = emailsExistentes.some(e => String(e || '').toLowerCase() === emailProfissional);
    if (!usuariosGWObject[emailProfissional] && !emailExistente) {
      return emailProfissional;
    }
    return null;
  }
  return _criacao_gerarEmailUnico(colaborador.firstName, colaborador.lastName, emailsExistentes, NOME_DOMINIO);
}

function _criacao_listarUsuariosGW(dominio) {
  try {
    const usuariosMap = {};
    let pageToken;
    let pageCount = 0;
   
    do {
      const response = AdminDirectory.Users.list({
        domain: dominio,
        maxResults: 500,
        pageToken: pageToken,
        projection: 'full',
        customFieldMask: 'Informacoes_HCM'
      });
     
      if (response.users) {
        response.users.forEach(user => {
          usuariosMap[user.primaryEmail.toLowerCase()] = user;
        });
      }
      pageToken = response.nextPageToken;
      pageCount++;
    } while (pageToken);


    return usuariosMap;

  } catch (e) {
    console.error({ event: "GW_LIST_ERROR", error: e.message, stack: e.stack });
    return null;
  }
}


function _criacao_enviarNotificacaoLider(dadosHCM, novoEmail) {
    const emailGerente = dadosHCM.superiorImediato && dadosHCM.superiorImediato.includes('@')
        ? dadosHCM.superiorImediato
        : (typeof EMAIL_DESTINATARIO !== 'undefined' ? EMAIL_DESTINATARIO : null);

    if (!emailGerente) {
      console.warn({ event: "NOTIFICATION_FAIL", reason: "Manager email or default recipient not set/found." });
      return;
    }
   
    const nomeColaborador = dadosHCM.nomeCompleto || `${dadosHCM.firstName} ${dadosHCM.lastName}`;
   
    let stringBcc = "";
    if (typeof EMAILS_EM_COPIA !== 'undefined' && EMAILS_EM_COPIA) {
        stringBcc = Array.isArray(EMAILS_EM_COPIA) ? EMAILS_EM_COPIA.join(',') : String(EMAILS_EM_COPIA);
    }

    // Usa o sistema de templating do Apps Script para mais robustez com caracteres especiais.
    // IMPORTANTE: O template HTML deve usar a sintaxe <?= VARIAVEL ?> em vez de {{VARIAVEL}}.
    const template = HtmlService.createTemplateFromFile(EMAIL_CONSTANTS.TEMPLATES.USER_CREATION);
    template.NOME_COLABORADOR = nomeColaborador;
    template.EMAIL = novoEmail;
    template.CARGO = dadosHCM.cargo || '-';
    template.CENTRO_CUSTO = dadosHCM.centroCusto || '-';

    const htmlBody = template.evaluate().getContent();

    try {
        GmailApp.sendEmail(emailGerente, `✅ Usuário Do Novo Colaborador: ${nomeColaborador} (${novoEmail})`, '', {
            htmlBody: htmlBody,
            bcc: stringBcc,
            name: NOME_REMETENTE,
            from: EMAIL_REMETENTE
        });
        console.info({ event: "NOTIFICATION_SENT", recipient: emailGerente, bcc: stringBcc, user_created: novoEmail });
    } catch (e) {
        console.warn({ event: "NOTIFICATION_FAIL", recipient: emailGerente, error: e.message, stack: e.stack });
    }
}

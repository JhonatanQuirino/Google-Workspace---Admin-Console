/**
 * Serviço de Boas-Vindas
 * Responsável por gerenciar o envio de emails de boas-vindas para novos colaboradores
 * Segue o padrão de arquitetura do projeto com métodos estáticos
 */

class BoasVindasService {

  /**
   * Envia email de boas-vindas automaticamente para usuários criados na última semana
   * Exclui o último dia para dar tempo de configuração
   * @public
   * @static
   * @param {boolean} testMode - Se true, simula envio sem executar ações reais
   * @returns {Object} Resultado da operação com estatísticas
   */
  static enviarAutomatico(testMode = false) {
    const execId = Utilities.getUuid();
    console.info({
      event: "AUTO_WELCOME_INIT",
      execution_id: execId,
      timestamp: new Date().toISOString(),
      test_mode: testMode
    });

    if (typeof verificarServicoAdminDirectory === 'function' && !verificarServicoAdminDirectory()) {
      console.warn({
        event: "ADMIN_DIRECTORY_UNAVAILABLE",
        execution_id: execId
      });
      return { sucesso: 0, falhas: 0, colaboradores: [], testMode };
    }

    const hoje = new Date();
    const umaSemanaAtras = new Date(hoje.getTime() - (7 * 24 * 60 * 60 * 1000));
    const umDiaAtras = new Date(hoje.getTime() - (1 * 24 * 60 * 60 * 1000));
    
    console.info({
      event: "TIME_WINDOW",
      execution_id: execId,
      start_date: umaSemanaAtras.toISOString(),
      end_date: umDiaAtras.toISOString()
    });

    const resultado = BoasVindasService._processarEnvioEmLote(umaSemanaAtras, umDiaAtras, execId, testMode);
    
    // Notificar erro crítico se houver falha total
    if (resultado.erroCritico && !testMode) {
      BoasVindasService._notificarErroCritico(resultado.erroCritico, execId);
    }

    // Finaliza o processo e, se aplicado, envia o relatório após conclusão de todos os envios
    BoasVindasService._finalizarEnvios(resultado, execId, testMode);

    console.info({
      event: "AUTO_WELCOME_SUMMARY",
      execution_id: execId,
      stats: {
        success: resultado.sucesso,
        fail: resultado.falhas
      }
    });
    return resultado;
  }

  /**
   * Envia email de boas-vindas manualmente para usuários criados nos últimos 7 dias
   * Útil para reenvio ou envio em massa
   * @public
   * @static
   * @param {boolean} testMode - Se true, simula envio sem executar ações reais
   * @returns {Object} Resultado da operação com estatísticas
   */
  static enviarManualUltimaSemana(testMode = false) {
    const execId = Utilities.getUuid();
    console.info({
      event: "MANUAL_WELCOME_INIT",
      execution_id: execId,
      timestamp: new Date().toISOString(),
      test_mode: testMode
    });

    try {
      const diasRetroativos = 7;
      const dataLimite = new Date(Date.now() - (diasRetroativos * 24 * 60 * 60 * 1000));

      console.info({
        event: "TIME_WINDOW",
        days: diasRetroativos,
        limit_date: dataLimite.toISOString()
      });

      const usuariosElegiveis = BoasVindasService._buscarUsuariosElegiveis(dataLimite);

      if (usuariosElegiveis.length === 0) {
        console.warn({
          event: "MANUAL_WELCOME_COMPLETE",
          message: "Nenhum usuário novo encontrado no período especificado"
        });
        return { sucesso: 0, falhas: 0, colaboradores: [], testMode };
      }

      const resultado = BoasVindasService._enviarParaLista(usuariosElegiveis, execId, testMode);

      // Finaliza o processo e, se aplicado, envia o relatório após conclusão de todos os envios
      BoasVindasService._finalizarEnvios(resultado, execId, testMode);

      console.info({
        event: "MANUAL_WELCOME_SUMMARY",
        execution_id: execId,
        stats: {
          success: resultado.sucesso,
          fail: resultado.falhas,
          total_processed: usuariosElegiveis.length,
          test_mode: testMode
        }
      });

      return resultado;
      
    } catch (e) {
      console.error({
        event: "MANUAL_WELCOME_ERROR",
        execution_id: execId,
        error: e.message,
        stack: e.stack
      });
      
      const erroCritico = {
        tipo: 'MANUAL_EXCEPTION',
        mensagem: e.message,
        stack: e.stack
      };
      
      if (!testMode) {
        BoasVindasService._notificarErroCritico(erroCritico, execId);
      }
      
      return { sucesso: 0, falhas: 0, colaboradores: [], testMode, erroCritico };
    }
  }

  /**
   * Finaliza um ciclo de envio de boas-vindas e dispara o relatório somente após
   * todos os envios terem sido processados.
   * @private
   * @static
   * @param {Object} resultado - Resultado do envio
   * @param {string} execId - ID de execução para logs
   * @param {boolean} testMode - Se true, não envia relatório
   */
  static _finalizarEnvios(resultado, execId, testMode) {
    console.info({
      event: "PROCESSAMENTO_CONCLUIDO",
      execution_id: execId,
      sucessos: resultado.sucesso,
      falhas: resultado.falhas
    });

    if (testMode) {
      console.info({
        event: "TEST_MODE_ATIVO_RELATORIO_IGNORADO",
        execution_id: execId
      });
      return;
    }

    if (!Array.isArray(resultado.colaboradores) || resultado.colaboradores.length === 0) {
      console.warn({
        event: "NENHUM_COLABORADOR_PROCESSADO",
        execution_id: execId
      });
      return;
    }

    BoasVindasService._enviarRelatorioEnvios(resultado.colaboradores, execId);
  }

  /**
   * Busca usuários elegíveis para receber boas-vindas a partir de uma data limite
   * @private
   * @static
   * @param {Date} dataLimite - Data mínima de criação do usuário
   * @returns {Array} Lista de usuários elegíveis
   */
  static _buscarUsuariosElegiveis(dataLimite) {
    const usuariosElegiveis = [];
    let pageToken;
    let totalUsersChecked = 0;

    try {
      do {
        const response = AdminDirectory.Users.list({
          domain: GOOGLE_WORKSPACE_CONSTANTS.DOMAIN,
          maxResults: 500,
          pageToken: pageToken,
          projection: 'full',
          customFieldMask: 'Informacoes_HCM'
        });

        if (response.users) {
          totalUsersChecked += response.users.length;

          response.users.forEach(user => {
            if (user.suspended || !user.creationTime) {
              return;
            }

            const creationTime = new Date(user.creationTime);
            if (creationTime >= dataLimite) {
              usuariosElegiveis.push(user);
            }
          });
        }

        pageToken = response.nextPageToken;
      } while (pageToken);

      console.info({
        event: "FILTER_COMPLETE",
        checked_users: totalUsersChecked,
        eligible_count: usuariosElegiveis.length
      });

      return usuariosElegiveis;

    } catch (e) {
      console.error({
        event: "FETCH_USERS_ERROR",
        error: e.message,
        stack: e.stack
      });
      return [];
    }
  }

  /**
   * Filtra usuários elegíveis com base em critérios de negócio (função pura para testes)
   * @private
   * @static
   * @param {Array} usuarios - Lista de usuários a filtrar
   * @param {Date} dataInicio - Data inicial do período
   * @param {Date} dataFim - Data final do período
   * @returns {Array} Usuários que atendem aos critérios
   */
  static _filtrarUsuariosElegiveis(usuarios, dataInicio, dataFim) {
    return usuarios.filter(usuario => {
      if (usuario.suspended || !usuario.creationTime) {
        return false;
      }

      const dataCriacao = new Date(usuario.creationTime);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });
  }

  /**
   * Processa envio em lote para usuários dentro de um período específico
   * @private
   * @static
   * @param {Date} dataInicio - Data inicial do período
   * @param {Date} dataFim - Data final do período
   * @param {string} execId - ID de execução para logs
    * @param {boolean} testMode - Se true, simula envios sem executar
   * @returns {Object} Objeto com contadores de sucesso, falhas e lista de colaboradores
   */
   static _processarEnvioEmLote(dataInicio, dataFim, execId, testMode = false) {
    let sucesso = 0;
    let falhas = 0;
    const colaboradores = [];
    let erroCritico = null;

    try {
      const usuariosGW = listarTodosOsUsuarios(GOOGLE_WORKSPACE_CONSTANTS.DOMAIN);
      if (!usuariosGW) {
        console.error({
          event: "FALHA_LISTAR_USUARIOS",
          execution_id: execId
        });
        erroCritico = {
          tipo: 'GOOGLE_WORKSPACE_API',
          mensagem: 'Falha ao listar usuários do Google Workspace',
          detalhes: 'A API retornou null ou falhou após todas as tentativas de retry'
        };
        return { sucesso, falhas, colaboradores, testMode, erroCritico };
      }

      const todosUsuarios = Object.values(usuariosGW);
      const usuariosElegiveis = BoasVindasService._filtrarUsuariosElegiveis(todosUsuarios, dataInicio, dataFim);

      for (const usuario of usuariosElegiveis) {
          if (usuario.orgUnitPath && UOS_GENERICAS.includes(usuario.orgUnitPath.trim())) {
            console.info({
              event: "USUARIO_UO_GENERICA_IGNORADO",
              execution_id: execId,
              email: usuario.primaryEmail
            });
            continue;
          }
          try {
            if (!testMode) {
              BoasVindasService._enviarEmail(usuario);
            } else {
              console.info({
                event: "TEST_MODE_EMAIL_NAO_ENVIADO",
                execution_id: execId,
                email: usuario.primaryEmail
              });
            }
            sucesso++;
            console.info({
              event: "BOAS_VINDAS_ENVIADAS",
              execution_id: execId,
              email: usuario.primaryEmail
            });
            
            // Coletar dados do colaborador para relatório
            colaboradores.push(BoasVindasService._extrairDadosColaborador(usuario));
          } catch (emailError) {
            falhas++;
            console.error({
              event: "FALHA_ENVIO_BOAS_VINDAS",
              execution_id: execId,
              email: usuario.primaryEmail,
              error: emailError.message
            });
          }
      }

    } catch (e) {
      console.error({
        event: "PROCESSAR_LOTE_ERRO_FATAL",
        execution_id: execId,
        error: e.message,
        stack: e.stack
      });
      erroCritico = {
        tipo: 'EXCEPTION',
        mensagem: e.message,
        stack: e.stack
      };
    }

  return { sucesso, falhas, colaboradores, testMode, erroCritico };
  }

  /**
   * Envia emails para uma lista específica de usuários
   * @private
   * @static
   * @param {Array} listaUsuarios - Lista de objetos de usuário
    * @param {boolean} testMode - Se true, simula envios sem executar
   * @param {string} execId - ID de execução para logs
   * @returns {Object} Objeto com contadores de sucesso, falhas e lista de colaboradores
   */
   static _enviarParaLista(listaUsuarios, execId, testMode = false) {
    let sucesso = 0;
    let falhas = 0;
    const colaboradores = [];
    const arquivoVideo = !testMode ? BoasVindasService._buscarVideoBoasVindas() : null;

    for (let i = 0; i < listaUsuarios.length; i++) {
      const usuario = listaUsuarios[i];
      const email = usuario.primaryEmail;
      if (usuario.orgUnitPath && UOS_GENERICAS.includes(usuario.orgUnitPath.trim())) {
        console.info({
          event: "USUARIO_UO_GENERICA_IGNORADO",
          execution_id: execId,
          email: email
        });
        continue;
      }
      try {
        if (!testMode) {
          BoasVindasService._enviarEmail(usuario, arquivoVideo);
        } else {
          console.info({
            event: "TEST_MODE_EMAIL_NAO_ENVIADO",
            execution_id: execId,
            email: email
          });
        }
        sucesso++;
        console.info({
          event: "BOAS_VINDAS_ENVIADAS",
          execution_id: execId,
          email: email
        });
        
        // Coletar dados do colaborador para relatório
        colaboradores.push(BoasVindasService._extrairDadosColaborador(usuario));
      } catch (e) {
        falhas++;
        console.error({
          event: "SEND_ERROR",
          execution_id: execId,
          email: email,
          error: e.message,
          stack: e.stack
        });
      }

      // Espacamento mínimo entre envios para evitar rate limit.
      if (!testMode && i < listaUsuarios.length - 1) {
        Utilities.sleep(1500);
      }
    }

    return { sucesso, falhas, colaboradores, testMode };
  }

  /**
   * Envia email de boas-vindas individual para um usuário
   * @private
   * @static
   * @param {Object} usuario - Objeto do usuário do Google Workspace
   * @param {GoogleAppsScript.Drive.File|null} arquivoVideo - Arquivo a anexar se disponível
   * @param {number} [attempt=1] - Número da tentativa atual
   * @throws {Error} Erro se falhar ao enviar email
   */
  static _enviarEmail(usuario, arquivoVideo = null, attempt = 1) {
    const emailDestinatario = usuario.primaryEmail;

    try {
      const primeiroNome = usuario.name.givenName || "Colaborador(a)";
      const cpfColaborador = usuario.customSchemas?.Informacoes_HCM?.CPF || 'Não informado';

      // Configurações do email
      const assuntoOriginal = `Bem-vindo(a) à ${ORGANIZATION_NAME}! 🎉🌱`;
      const nomeRemetenteOriginal = ORGANIZATION_SENDER_NAME;
      const emailRemetente = CEP_EMAIL;

      // Codificação UTF-8
      const assuntoCodificado = BoasVindasService._encodeUTF8(assuntoOriginal);
      const fromCodificado = `${BoasVindasService._encodeUTF8(nomeRemetenteOriginal)} <${emailRemetente}>`;

      // Preparar template HTML (usa nome padronizado e constante)
      const tplName = EMAIL_CONSTANTS.TEMPLATES.WELCOME.replace(/\.html$/i, '');
      const template = HtmlService.createTemplateFromFile(tplName);
      template.primeiroNome = primeiroNome;
      template.cpfColaborador = cpfColaborador;
      template.usuario = usuario;
      template.organizationName = ORGANIZATION_NAME;
      template.organizationSupportEmail = ORGANIZATION_SUPPORT_EMAIL;
      template.organizationSignatureName = ORGANIZATION_SIGNATURE_NAME;
      template.organizationSignatureTitle = ORGANIZATION_SIGNATURE_TITLE;
      template.organizationPortalUrl = ORGANIZATION_PORTAL_URL;
      template.organizationLogoUrl = ORGANIZATION_LOGO_URL;
      const htmlBody = template.evaluate().getContent();

      const emailOptions = {
        htmlBody: htmlBody,
        from: fromCodificado,
        charset: "UTF-8"
      };

      // Adicionar anexo se disponível (fora do loop, repassado pelo chamador)
      if (arquivoVideo) {
        emailOptions.attachments = [arquivoVideo.getBlob()];
        console.info({
          event: "PREPARANDO_ENVIO_COM_ANEXO",
          email: emailDestinatario
        });
      } else {
        console.info({
          event: "PREPARANDO_ENVIO_SEM_ANEXO",
          email: emailDestinatario
        });
      }

      try {
        GmailApp.sendEmail(emailDestinatario, assuntoCodificado, "", emailOptions);
        console.info({
          event: "EMAIL_ENVIADO_SUCESSO",
          email: emailDestinatario
        });
      } catch (sendError) {
        if (attempt < 3 && /Limit Exceeded|User-rate limit exceeded/i.test(sendError.message)) {
          const waitMs = BoasVindasService._parseRetryAfterMillis(sendError.message) || 20000;
          const sleepMs = Math.min(Math.max(waitMs, 5000), 30000);
          console.warn({
            event: "RATE_LIMIT_DETECTADO",
            email: emailDestinatario,
            attempt: attempt,
            delay_ms: sleepMs
          });
          Utilities.sleep(sleepMs);
          return BoasVindasService._enviarEmail(usuario, arquivoVideo, attempt + 1);
        }
        console.error({
          event: "ERRO_ENVIO_EMAIL",
          email: emailDestinatario,
          error: sendError.message,
          stack: sendError.stack
        });
        throw sendError;
      }

    } catch (e) {
      console.error({ event: "ERRO_GERACAO_EMAIL_FATAL", email: emailDestinatario, error: e.message, stack: e.stack });
      throw e;
    }
  }

  /**
   * Extrai o tempo de espera do erro de rate limit, em milissegundos
   * @private
   * @static
   * @param {string} message - Mensagem de erro do Google
   * @returns {number|null} Tempo em milissegundos ou null se não identificado
   */
  static _parseRetryAfterMillis(message) {
    const match = message.match(/Retry after ([0-9TZ:\.\-]+Z)/i);
    if (!match) {
      return null;
    }

    const retryDate = new Date(match[1]);
    if (isNaN(retryDate.getTime())) {
      return null;
    }

    const diff = retryDate.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  }

  /**
   * Busca o arquivo de vídeo de boas-vindas no Drive
   * @private
   * @static
   * @returns {GoogleAppsScript.Drive.File|null} Arquivo do vídeo ou null se não encontrado
   */
  static _buscarVideoBoasVindas() {
    try {
      if (typeof WELCOME_VIDEO_ID === 'undefined' || !WELCOME_VIDEO_ID) {
        console.warn({ event: "VIDEO_ID_NAO_DEFINIDO" });
        return null;
      }

      const arquivo = DriveApp.getFileById(WELCOME_VIDEO_ID);
      console.info({
        event: "VIDEO_ENCONTRADO",
        video_id: WELCOME_VIDEO_ID
      });
      return arquivo;

    } catch (e) {
      console.warn({
        event: "VIDEO_NAO_ENCONTRADO",
        video_id: WELCOME_VIDEO_ID,
        error: e.message
      });
      return null;
    }
  }

  /**
   * Extrai dados relevantes do colaborador para relatório
   * @private
   * @static
   * @param {Object} usuario - Objeto do usuário do Google Workspace
   * @returns {Object} Dados formatados do colaborador
   */
  static _extrairDadosColaborador(usuario) {
    const dataAdmissao = usuario.customSchemas?.Informacoes_HCM?.dataAdmissao;
    const dataAdmissaoFormatada = BoasVindasService._formatarDataAdmissao(dataAdmissao);

    // Extrair apenas a última parte do caminho da unidade organizacional
    let unidadeFinal = 'Não informada';
    if (usuario.orgUnitPath) {
      const partes = usuario.orgUnitPath.split('/').filter(p => p.trim() !== '');
      unidadeFinal = partes.length > 0 ? partes[partes.length - 1] : 'Não informada';
    }

    return {
      unidade: unidadeFinal,
      nomeCompleto: usuario.name.fullName,
      cargo: usuario.organizations?.[0]?.title || 'Não informado',
      dataAdmissao: dataAdmissaoFormatada,
      email: usuario.primaryEmail
    };
  }

  /**
   * Formata data de admissão com validação robusta para evitar datas epoch inválidas
   * @private
   * @static
   * @param {string|number} dataAdmissao - Valor bruto da data de admissão
   * @returns {string} Data formatada em dd/MM/yyyy ou "Não informada"
   */
  static _formatarDataAdmissao(dataAdmissao) {
    const dataValida = BoasVindasService._parseDataAdmissao(dataAdmissao);
    if (!dataValida) {
      return 'Não informada';
    }
    return Utilities.formatDate(dataValida, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }

  /**
   * Converte diferentes formatos de data de admissão para Date
   * @private
   * @static
   * @param {string|number} valor - Valor bruto da data
   * @returns {Date|null} Data válida normalizada ou null
   */
  static _parseDataAdmissao(valor) {
    if (valor === null || valor === undefined) {
      return null;
    }

    if (typeof valor === 'number') {
      if (valor <= 0) {
        return null;
      }

      const dataNumerica = new Date(valor);
      if (isNaN(dataNumerica.getTime())) {
        return null;
      }
      return dataNumerica;
    }

    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();
    if (!texto || texto === '0' || texto === '0000-00-00') {
      return null;
    }

    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
      const dia = Number(br[1]);
      const mes = Number(br[2]);
      const ano = Number(br[3]);
      const dataBR = new Date(ano, mes - 1, dia);

      if (
        dataBR.getFullYear() !== ano ||
        dataBR.getMonth() !== (mes - 1) ||
        dataBR.getDate() !== dia
      ) {
        return null;
      }

      return dataBR;
    }

    const dataISO = new Date(texto);
    if (isNaN(dataISO.getTime())) {
      return null;
    }

    if (dataISO.getTime() <= 0) {
      return null;
    }

    return dataISO;
  }

  /**
   * Envia email de relatório com lista de colaboradores que receberam boas-vindas
   * @private
   * @static
   * @param {Array} colaboradores - Lista de colaboradores que receberam email
   * @param {string} execId - ID de execução para logs
   */
  static _enviarRelatorioEnvios(colaboradores, execId) {
    try {
      console.info({
        event: "ENVIANDO_RELATORIO",
        execution_id: execId,
        total_colaboradores: colaboradores.length
      });

      // Ordenar por unidade e depois por nome
      colaboradores.sort((a, b) => {
        if (a.unidade !== b.unidade) {
          return a.unidade.localeCompare(b.unidade);
        }
        return a.nomeCompleto.localeCompare(b.nomeCompleto);
      });

      // Preparar template HTML
      const tplName = EMAIL_CONSTANTS.TEMPLATES.WELCOME_REPORT.replace(/\.html$/i, '');
      const template = HtmlService.createTemplateFromFile(tplName);
      template.colaboradores = colaboradores;
      template.totalColaboradores = colaboradores.length;
      template.dataHoraEnvio = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      template.execId = execId;
      const htmlBody = template.evaluate().getContent();

      const assunto = `Relatório de Boas-Vindas - ${colaboradores.length} colaborador(es)`;

      GmailApp.sendEmail(
        EMAIL_CONSTANTS.RECIPIENTS.WELCOME_CC,
        assunto,
        "",
        {
          htmlBody: htmlBody,
          charset: "UTF-8",
          name: "Sistema de Integração HCM"
        }
      );

      console.info({
        event: "RELATORIO_ENVIADO_SUCESSO",
        execution_id: execId,
        destinatario: EMAIL_CONSTANTS.RECIPIENTS.WELCOME_CC
      });

    } catch (e) {
      console.error({
        event: "ERRO_ENVIO_RELATORIO",
        execution_id: execId,
        error: e.message,
        stack: e.stack
      });
    }
  }

  /**
   * Codifica texto em UTF-8 para headers de email
   * @private
   * @static
   * @param {string} texto - Texto a ser codificado
   * @returns {string} Texto codificado no formato RFC 2047
   */
  static _encodeUTF8(texto) {
    return "=?UTF-8?B?" + Utilities.base64Encode(texto, Utilities.Charset.UTF_8) + "?=";
  }

  /**
   * Notifica administradores sobre erro crítico no serviço
   * @private
   * @static
   * @param {Object} erro - Objeto com informações do erro
   * @param {string} execId - ID de execução
   */
  static _notificarErroCritico(erro, execId) {
    try {
      const assunto = '🚨 Erro Crítico - Serviço de Boas-Vindas';
      const corpo = `
Ocorreu um erro crítico no Serviço de Boas-Vindas que impediu o envio de emails para novos colaboradores.

🔴 DETALHES DO ERRO:
Tipo: ${erro.tipo}
Mensagem: ${erro.mensagem}
Execution ID: ${execId}
Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

${erro.detalhes ? `Detalhes Adicionais: ${erro.detalhes}\n\n` : ''}
${erro.stack ? `Stack Trace:\n${erro.stack}\n\n` : ''}
⚠️ AÇÃO NECESSÁRIA:
- Verificar saúde da API do Google Workspace
- Verificar quotas e limites de API
- Considerar executar novamente o envio manual: BoasVindasService.enviarManualUltimaSemana()

Atenciosamente,
Sistema de Integração HCM
      `;

      MailApp.sendEmail(
        EMAIL_CONSTANTS.RECIPIENTS.CRITICAL_ERROR,
        assunto,
        corpo
      );

      console.info({
        event: "ALERTA_ERRO_CRITICO_ENVIADO",
        execution_id: execId,
        destinatario: EMAIL_CONSTANTS.RECIPIENTS.CRITICAL_ERROR
      });
    } catch (e) {
      console.error({
        event: "FALHA_ENVIO_ALERTA_CRITICO",
        execution_id: execId,
        error: e.message
      });
    }
  }

  /**
   * Função de teste para validar funcionalidade sem efeitos colaterais
     * @public
     * @static
     * @returns {Object} Resultado dos testes
     */
    static testarServico() {
      console.log('=== INICIANDO TESTES DO SERVIÇO DE BOAS-VINDAS ===');
    
      const resultados = {
        testes: [],
        sucessos: 0,
        falhas: 0
      };

      // Teste 1: Filtragem de usuários
      try {
        const hoje = new Date('2026-02-09');
        const usuarios = [
          { primaryEmail: 'user1@test.com', suspended: false, creationTime: '2026-02-08T10:00:00Z' },
          { primaryEmail: 'user2@test.com', suspended: true, creationTime: '2026-02-08T10:00:00Z' },
          { primaryEmail: 'user3@test.com', suspended: false, creationTime: '2026-02-01T10:00:00Z' },
          { primaryEmail: 'user4@test.com', suspended: false, creationTime: '2026-02-10T10:00:00Z' }
        ];
      
        const dataInicio = new Date('2026-02-02');
        const dataFim = new Date('2026-02-09');
        const filtrados = BoasVindasService._filtrarUsuariosElegiveis(usuarios, dataInicio, dataFim);
      
        const esperado = 1; // Apenas user1 deve passar
        const passou = filtrados.length === esperado;
      
        resultados.testes.push({
          nome: 'Filtragem de usuários elegíveis',
          passou: passou,
          esperado: esperado,
          obtido: filtrados.length,
          detalhes: filtrados.map(u => u.primaryEmail)
        });
      
        if (passou) resultados.sucessos++;
        else resultados.falhas++;
      } catch (e) {
        resultados.testes.push({
          nome: 'Filtragem de usuários elegíveis',
          passou: false,
          erro: e.message
        });
        resultados.falhas++;
      }

      // Teste 2: Extração de dados
      try {
        const usuarioTeste = {
          name: { fullName: 'João Silva' },
          primaryEmail: 'joao.silva@test.com',
          orgUnitPath: '/Technology/Development',
          organizations: [{ title: 'Desenvolvedor' }],
          customSchemas: {
            Informacoes_HCM: {
              dataAdmissao: '2026-01-15'
            }
          }
        };
      
        const dados = BoasVindasService._extrairDadosColaborador(usuarioTeste);
        const passou = dados.nomeCompleto === 'João Silva' && 
                       dados.cargo === 'Desenvolvedor' &&
                       dados.unidade === 'Desenvolvimento';
      
        resultados.testes.push({
          nome: 'Extração de dados do colaborador',
          passou: passou,
          dados: dados
        });
      
        if (passou) resultados.sucessos++;
        else resultados.falhas++;
      } catch (e) {
        resultados.testes.push({
          nome: 'Extração de dados do colaborador',
          passou: false,
          erro: e.message
        });
        resultados.falhas++;
      }

      // Teste 3: Modo de teste (simula envio)
      try {
        console.log('\n--- Executando envio em TEST MODE ---');
        const resultado = BoasVindasService.enviarAutomatico(true);
      
        const passou = resultado.testMode === true;
      
        resultados.testes.push({
          nome: 'Modo de teste (sem envio real)',
          passou: passou,
          resultado: resultado
        });
      
        if (passou) resultados.sucessos++;
        else resultados.falhas++;
      } catch (e) {
        resultados.testes.push({
          nome: 'Modo de teste (sem envio real)',
          passou: false,
          erro: e.message
        });
        resultados.falhas++;
      }

      console.log('\n=== RESULTADO DOS TESTES ===');
      console.log(`✅ Sucessos: ${resultados.sucessos}`);
      console.log(`❌ Falhas: ${resultados.falhas}`);
      console.log('\nDetalhes:', JSON.stringify(resultados, null, 2));
    
      return resultados;
    }
}

// ============================================
// FUNÇÕES DE COMPATIBILIDADE (Deprecated)
// Manter por compatibilidade com triggers existentes
// ============================================

/**
 * Função de compatibilidade com triggers existentes
 * @deprecated Use BoasVindasService.enviarAutomatico() em novos triggers
 */
function enviarEmailBoasVindasNovosColaboradores() {
  return BoasVindasService.enviarAutomatico();
}

/**
 * Função de compatibilidade com triggers existentes
 * @deprecated Use BoasVindasService.enviarManualUltimaSemana() em novos triggers
 */
function enviarBoasVindasManualSemana() {
  return BoasVindasService.enviarManualUltimaSemana();
}

/**
 * Verifica se o serviço avançado AdminDirectory está disponível no Apps Script.
 * @returns {boolean} true se o serviço estiver definido e acessível
 */
function verificarServicoAdminDirectory() {
  try {
    return typeof AdminDirectory !== 'undefined' &&
           AdminDirectory !== null &&
           typeof AdminDirectory.Users === 'object' &&
           typeof AdminDirectory.Users.list === 'function';
  } catch (e) {
    return false;
  }
}

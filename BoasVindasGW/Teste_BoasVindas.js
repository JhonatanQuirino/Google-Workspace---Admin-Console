/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Testes para o Serviço de Boas-Vindas
 * Valida funcionalidade sem executar ações reais (sem envio de emails)
 */

/**
 * Executa todos os testes do serviço de boas-vindas
 * @public
 */
function testarServicoBoasVindas() {
  return BoasVindasService.testarServico();
}

/**
 * Teste específico: Validar filtragem de usuários elegíveis
 * @public
 */
function testarFiltragemUsuarios() {
  console.log('=== Teste: Filtragem de Usuários ===');
  
  const usuarios = [
    { primaryEmail: 'novo@test.com', suspended: false, creationTime: '2026-02-08T10:00:00Z' },
    { primaryEmail: 'suspenso@test.com', suspended: true, creationTime: '2026-02-08T10:00:00Z' },
    { primaryEmail: 'antigo@test.com', suspended: false, creationTime: '2025-12-01T10:00:00Z' },
    { primaryEmail: 'futuro@test.com', suspended: false, creationTime: '2026-02-10T10:00:00Z' },
    { primaryEmail: 'semdata@test.com', suspended: false, creationTime: null }
  ];
  
  const dataInicio = new Date('2026-02-02');
  const dataFim = new Date('2026-02-09');
  
  const filtrados = BoasVindasService._filtrarUsuariosElegiveis(usuarios, dataInicio, dataFim);
  
  console.log(`Total de usuários: ${usuarios.length}`);
  console.log(`Usuários filtrados: ${filtrados.length}`);
  console.log('Usuários elegíveis:', filtrados.map(u => u.primaryEmail));
  
  // Validações
  const validacoes = {
    deveIncluirNovo: filtrados.some(u => u.primaryEmail === 'novo@test.com'),
    naoDeveIncluirSuspenso: !filtrados.some(u => u.primaryEmail === 'suspenso@test.com'),
    naoDeveIncluirAntigo: !filtrados.some(u => u.primaryEmail === 'antigo@test.com'),
    naoDeveIncluirFuturo: !filtrados.some(u => u.primaryEmail === 'futuro@test.com'),
    naoDeveIncluirSemData: !filtrados.some(u => u.primaryEmail === 'semdata@test.com')
  };
  
  const todosPassed = Object.values(validacoes).every(v => v === true);
  
  console.log('\nValidações:', validacoes);
  console.log(`\n${todosPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  return { filtrados, validacoes, passou: todosPassed };
}

/**
 * Teste específico: Validar extração de dados do colaborador
 * @public
 */
function testarExtracaoDados() {
  console.log('=== Teste: Extração de Dados ===');
  
  const usuarioCompleto = {
    name: { fullName: 'Maria Santos', givenName: 'Maria' },
    primaryEmail: 'maria.santos@example.test',
    orgUnitPath: '/People/Personnel',
    organizations: [{ title: 'Analista de RH' }],
    customSchemas: {
      Informacoes_HCM: {
        dataAdmissao: '2026-01-15',
        CPF: '12345678901'
      }
    }
  };
  
  const usuarioIncompleto = {
    name: { fullName: 'João Silva' },
    primaryEmail: 'joao.silva@example.test'
  };
  
  const dadosCompleto = BoasVindasService._extrairDadosColaborador(usuarioCompleto);
  const dadosIncompleto = BoasVindasService._extrairDadosColaborador(usuarioIncompleto);
  
  console.log('\nDados extraídos (completo):', dadosCompleto);
  console.log('\nDados extraídos (incompleto):', dadosIncompleto);
  
  // Validações
  const validacoes = {
    nomeExtraido: dadosCompleto.nomeCompleto === 'Maria Santos',
    cargoExtraido: dadosCompleto.cargo === 'Analista de RH',
    unidadeExtraida: dadosCompleto.unidade === 'Departamento Pessoal',
    dataFormatadaOuNaoInformada: dadosCompleto.dataAdmissao === '15/01/2026' || dadosCompleto.dataAdmissao.includes('/'),
    lidaComDadosFaltantes: dadosIncompleto.cargo === 'Não informado' && dadosIncompleto.unidade === 'Não informada' && dadosIncompleto.dataAdmissao === 'Não informada'
  };
  
  const todosPassed = Object.values(validacoes).every(v => v === true);
  
  console.log('\nValidações:', validacoes);
  console.log(`\n${todosPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  return { dadosCompleto, dadosIncompleto, validacoes, passou: todosPassed };
}

/**
 * Teste de integração: Simular envio automático em modo de teste
 * @public
 */
function testarEnvioAutomaticoSimulado() {
  console.log('=== Teste: Envio Automático (Simulado) ===');
  console.log('ATENÇÃO: Este teste NÃO enviará emails reais\n');
  
  try {
    const resultado = BoasVindasService.enviarAutomatico(true);
    
    console.log('\nResultado:', resultado);
    
    const validacoes = {
      testModeAtivo: resultado.testMode === true,
      retornaObjeto: typeof resultado === 'object',
      temContadores: 'sucesso' in resultado && 'falhas' in resultado,
      temColaboradores: Array.isArray(resultado.colaboradores)
    };
    
    const todosPassed = Object.values(validacoes).every(v => v === true);
    
    console.log('\nValidações:', validacoes);
    console.log(`\n${todosPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
    
    return { resultado, validacoes, passou: todosPassed };
    
  } catch (e) {
    console.error('ERRO:', e.message);
    console.error('Stack:', e.stack);
    return { passou: false, erro: e.message };
  }
}

/**
 * Teste de integração: Simular envio manual em modo de teste
 * @public
 */
function testarEnvioManualSimulado() {
  console.log('=== Teste: Envio Manual (Simulado) ===');
  console.log('ATENÇÃO: Este teste NÃO enviará emails reais\n');
  
  try {
    const resultado = BoasVindasService.enviarManualUltimaSemana(true);
    
    console.log('\nResultado:', resultado);
    
    const validacoes = {
      testModeAtivo: resultado.testMode === true,
      retornaObjeto: typeof resultado === 'object',
      temContadores: 'sucesso' in resultado && 'falhas' in resultado,
      temColaboradores: Array.isArray(resultado.colaboradores)
    };
    
    const todosPassed = Object.values(validacoes).every(v => v === true);
    
    console.log('\nValidações:', validacoes);
    console.log(`\n${todosPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
    
    if (resultado.colaboradores && resultado.colaboradores.length > 0) {
      console.log('\nPrimeiro colaborador encontrado:', resultado.colaboradores[0]);
    }
    
    return { resultado, validacoes, passou: todosPassed };
    
  } catch (e) {
    console.error('ERRO:', e.message);
    console.error('Stack:', e.stack);
    return { passou: false, erro: e.message };
  }
}

/**
 * Executa todos os testes em sequência
 * @public
 */
function executarTodosOsTestesBoasVindas() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SUITE DE TESTES - SERVIÇO DE BOAS-VINDAS               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const resultados = {
    filtragem: testarFiltragemUsuarios(),
    extracao: testarExtracaoDados(),
    envioAutomatico: testarEnvioAutomaticoSimulado(),
    envioManual: testarEnvioManualSimulado()
  };
  
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  RESUMO DOS TESTES                                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  const totalTestes = Object.keys(resultados).length;
  const testesPassaram = Object.values(resultados).filter(r => r.passou).length;
  const testesFalharam = totalTestes - testesPassaram;
  
  console.log(`\n✅ Passou: ${testesPassaram}/${totalTestes}`);
  console.log(`❌ Falhou: ${testesFalharam}/${totalTestes}`);
  
  if (testesFalharam === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉');
  } else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM');
  }
  
  return resultados;
}

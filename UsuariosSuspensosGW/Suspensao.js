// Triggers e wrappers de sincronização para o serviço de sincronização

// Removed out-of-scope helper `carregarConfiguracao` and `triggerSincronizarDadosPessoais`.
// This project focuses exclusively on suspending users; schema and full hierarchy syncs are out of scope.

function sincronizarSuspensaoTrigger() {
  const execId = Utilities.getUuid();
  console.info({ event: "TRIGGER_SUSPENSAO_WRAPPER_START", execution_id: execId });
  try {
    // Delega para a função principal em Main.js que contém a lógica de suspensão.
    sincronizarSuspensao();
    console.info({ event: "TRIGGER_SUSPENSAO_WRAPPER_COMPLETE", execution_id: execId });
  } catch (e) {
    console.error({ event: "TRIGGER_SUSPENSAO_WRAPPER_ERROR", error: e && e.message ? e.message : e });
    throw e;
  }
}

// Removed `triggerSincronizarHierarquia` as it's out of scope for suspension-only project.

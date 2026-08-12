/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

/**
 * Wrapper global to allow running class test methods via clasp run
 */
function runTestarServico() {
  try {
    return BoasVindasService.testarServico();
  } catch (e) {
    throw new Error('runTestarServico failed: ' + e.message);
  }
}

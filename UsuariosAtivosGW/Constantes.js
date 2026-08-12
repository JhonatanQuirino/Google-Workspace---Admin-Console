/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

const NOME_DOMINIO = PropertiesService.getScriptProperties().getProperty('NOME_DOMINIO') || 'example.com';
const SUSPENDED_OU_PATH = PropertiesService.getScriptProperties().getProperty('SUSPENDED_OU_PATH');
const SITUACAO_ATIVA = PropertiesService.getScriptProperties().getProperty('SITUACAO_ATIVA');

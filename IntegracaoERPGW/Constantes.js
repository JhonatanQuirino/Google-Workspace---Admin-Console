/*
 * Copyright (c) 2026 Jhonatan Quirino
 * Todos os direitos reservados.
 */

const ERP_PROPERTIES = PropertiesService.getScriptProperties();

const ERP_CONFIG = {
  firebase: {
    databaseUrl: ERP_PROPERTIES.getProperty('FIREBASE_DATABASE_URL'),
    clientEmail: ERP_PROPERTIES.getProperty('FIREBASE_CLIENT_EMAIL'),
    privateKey: ERP_PROPERTIES.getProperty('FIREBASE_PRIVATE_KEY'),
    projectId: ERP_PROPERTIES.getProperty('FIREBASE_PROJECT_ID'),
    colaboradoresPath: ERP_PROPERTIES.getProperty('FIREBASE_COLABORADORES_PATH') || 'colaboradores'
  },
  inbound: {
    jwtSecret: ERP_PROPERTIES.getProperty('INBOUND_JWT_SECRET'),
    issuer: ERP_PROPERTIES.getProperty('INBOUND_JWT_ISSUER'),
    audience: ERP_PROPERTIES.getProperty('INBOUND_JWT_AUDIENCE')
  },
  source: {
    url: ERP_PROPERTIES.getProperty('ERP_SOURCE_URL'),
    method: ERP_PROPERTIES.getProperty('ERP_SOURCE_METHOD') || 'get',
    headersJson: ERP_PROPERTIES.getProperty('ERP_SOURCE_HEADERS'),
    recordsPath: ERP_PROPERTIES.getProperty('ERP_RESPONSE_RECORDS_PATH')
  },
  fieldMappingJson: ERP_PROPERTIES.getProperty('ERP_FIELD_MAPPING')
};

const COLABORADOR_FIELDS = [
  'cpf', 'nomeCompleto', 'firstName', 'lastName', 'emailProfissional', 'emailPessoal',
  'numeroCelular', 'cargo', 'departamento', 'centroCusto', 'tipoColaborador',
  'superiorImediato', 'situacao', 'dataNascimento', 'dataAdmissao', 'dataAgendamento'
];

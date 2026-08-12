Copyright (c) 2026 Jhonatan Quirino

# IntegracaoERPGW

Gateway genérico para receber colaboradores de ERPs (Sankhya, Senior, Protheus ou outro REST) e armazená-los no Firebase no formato consumido pelos módulos do HUB.

## Implantação

1. Crie um projeto Apps Script e envie os arquivos deste diretório.
2. Execute `start()` e configure as propriedades pendentes.
3. Implante o projeto como **Web App** e restrinja o acesso ao sistema que enviará os dados.
4. Faça um POST com JWT HS256 no corpo JSON. Execute `start()` novamente para validar as propriedades.

O instalador preserva propriedades existentes e não cria gatilhos. Caso use coleta agendada, crie manualmente um gatilho para `sincronizarERP`.

## Endpoint POST

Apps Script não expõe os headers HTTP em `doPost(e)`; por isso, envie o token no atributo `token` do JSON:

```json
{
  "token": "JWT_HS256",
  "source": "sankhya",
  "records": [{ "cpf": "", "nomeCompleto": "" }]
}
```

O JWT deve ter `alg: HS256`, `exp` futuro e assinatura com `INBOUND_JWT_SECRET`. Se configuradas, `INBOUND_JWT_ISSUER` e `INBOUND_JWT_AUDIENCE` também são validadas.

## Schema normalizado

Todo registro gravado em `colaboradores/{cpf}` contém: `cpf`, `nomeCompleto`, `firstName`, `lastName`, `emailProfissional`, `emailPessoal`, `numeroCelular`, `cargo`, `departamento`, `centroCusto`, `tipoColaborador`, `superiorImediato`, `situacao`, `dataNascimento`, `dataAdmissao`, `dataAgendamento` e metadados de integração.

Datas ISO são convertidas para `DD/MM/AAAA`. Campos ausentes ficam vazios; CPF e nome completo são obrigatórios.

## Propriedades

| Propriedade | Obrigatória | Descrição |
| --- | --- | --- |
| `INBOUND_JWT_SECRET` | Sim | Segredo HS256 para validar o POST; sensível |
| `FIREBASE_DATABASE_URL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` | Sim | Integração Firebase; valores sensíveis |
| `FIREBASE_COLABORADORES_PATH` | Não | Nó de destino; padrão `colaboradores` |
| `INBOUND_JWT_ISSUER`, `INBOUND_JWT_AUDIENCE` | Não | Restrições extras de JWT |
| `ERP_FIELD_MAPPING` | Não | JSON que associa campo normalizado a um caminho do payload ERP |
| `ERP_SOURCE_URL`, `ERP_SOURCE_METHOD`, `ERP_SOURCE_HEADERS`, `ERP_RESPONSE_RECORDS_PATH` | Não | Coleta REST agendada; cabeçalhos devem ser JSON |

Exemplo de `ERP_FIELD_MAPPING`: `{ "cpf": "employee.document", "nomeCompleto": "employee.name" }`.

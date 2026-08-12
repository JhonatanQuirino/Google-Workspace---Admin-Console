# Receptor de POST do Senior

Web App do Google Apps Script que recebe integrações do Senior, valida uma API key, enfileira o payload e grava os colaboradores no Firebase Realtime Database em segundo plano.

O endpoint responde assim que a fila é criada. Dessa forma, o Senior não aguarda a gravação individual de todos os colaboradores e não ultrapassa seu timeout de três minutos.

## Fluxo

```text
Senior --POST--> Web App --valida e cria fila--> resposta JSON: queued
                                  |
                                  v
                       gatilho processarFilaSenior
                                  |
                                  v
                             Firebase RTDB
```

Os dados do lote são mantidos temporariamente como um arquivo JSON no Drive. Os metadados da fila ficam nas Propriedades do script. Ao fim do processamento, o arquivo é movido para a lixeira e os metadados são removidos.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `WebApp.js` | `doGet`, `doPost`, leitura do corpo e respostas JSON. |
| `Autenticacao.js` | Validação da chave enviada pelo Senior. |
| `FilaSenior.js` | Persistência e consumo assíncrono da fila. |
| `Firebase.js` | Autenticação JWT e operações no Firebase RTDB. |
| `Validacoes.js` | Normalização do payload, CPF e mesclagem de dados. |
| `appsscript.json` | Permissões e configuração do Web App. |

## Propriedades do script

Em **Configurações do projeto > Propriedades do script**, configure:

| Propriedade | Obrigatória | Uso |
| --- | --- | --- |
| `SENIOR_API_KEY` | Sim | Chave esperada no POST. `SENIOR` é aceito apenas como compatibilidade com a configuração anterior. |
| `FIREBASE_DATABASE_URL` | Sim | URL raiz do Realtime Database, por exemplo `https://projeto.firebaseio.com`. |
| `FIREBASE_CLIENT_EMAIL` | Sim | E-mail da service account Firebase. |
| `FIREBASE_PRIVATE_KEY` | Sim | Chave privada PEM da service account. Pode conter `\n` literal. |
| `FIREBASE_PROJECT_ID` | Sim | ID do projeto Firebase. |

Nunca coloque essas credenciais em arquivos do projeto ou no payload do Senior.

## Requisição POST

Use a URL da implantação Web App terminada em `/exec`.

Envie a chave por um dos meios abaixo:

- cabeçalho `x-api-key`;
- cabeçalho `Authorization: Bearer <chave>`;
- parâmetro `apiKey` ou `api_key`.

O corpo deve ser JSON e pode ser um colaborador, um array ou um objeto com `colaboradores`.

```http
POST /exec
Content-Type: application/json
x-api-key: <SENIOR_API_KEY>
```

```json
{
  "colaboradores": [
    {
      "cpf": "12345678909",
      "nomeCompleto": "Nome do Colaborador",
      "emailProfissional": "nome@empresa.com",
      "situacao": "1"
    }
  ]
}
```

Também são aceitos `CPF` em maiúsculo e um objeto individual com `cpf` ou `CPF`.

## Respostas

Sucesso no recebimento:

```json
{
  "status": "queued",
  "execution_id": "...",
  "queue_id": "...",
  "total_colaboradores": 1
}
```

Falha de autenticação ou formato:

```json
{
  "status": "error",
  "execution_id": "...",
  "message": "API key inválida ou ausente."
}
```

O Apps Script Web App retorna JSON, mas não permite definir livremente o status HTTP via `ContentService`; portanto, o consumidor deve avaliar o campo `status` da resposta.

## Processamento no Firebase

- CPF válido: o registro é lido em `colaboradores/<cpf>`, mesclado com o payload e gravado no mesmo caminho.
- Campos vazios não substituem valores existentes não vazios.
- CPF ausente ou inválido: o payload é gravado em `colaboradores_fallback/<uuid>`.
- Cada gravação recebe `auditoria.tipo` (`criacao` ou `atualizacao`) e `auditoria.data`.

O worker processa por até quatro minutos por execução. Se ainda houver filas pendentes, ele cria outro gatilho para continuar. Um bloqueio de script impede dois workers simultâneos.

## Implantação

1. Sincronize os arquivos: `clasp push --force`.
2. No Apps Script, abra **Implantar > Gerenciar implantações**.
3. Edite a implantação Web App que o Senior já utiliza.
4. Selecione **Nova versão** e implante, preservando a mesma URL `/exec`.
5. Autorize as permissões de Drive, gatilhos e requisições externas, quando solicitado.

A conta que faz a implantação deve ser a proprietária do script ou pertencer ao mesmo domínio dela.

## Operação e diagnóstico

No Apps Script, consulte **Execuções** e filtre pelos eventos:

| Evento | Significado |
| --- | --- |
| `SENIOR_POST_QUEUED` | POST validado e fila criada. |
| `SENIOR_QUEUE_COMPLETE` | Fila concluída; inclui total, processados e erros. |
| `SENIOR_POST_ERROR` | Falha no recebimento, autenticação ou parsing. |
| `SENIOR_FIREBASE_ERROR` | Falha ao gravar um colaborador no Firebase. |

Se uma execução do worker falhar antes de finalizar, a fila e o arquivo permanecem armazenados. Rode manualmente `processarFilaSenior` no editor do Apps Script para retomar o processamento, após corrigir a causa.

## Teste rápido

Use um CPF válido de teste e uma chave configurada nas Propriedades do script. A resposta deve chegar rapidamente com `status: "queued"`; em seguida, confirme a execução do worker e o registro no Firebase.

```bash
curl -X POST 'https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: SUA_CHAVE' \
  --data '{"cpf":"12345678909","nomeCompleto":"Nome de Teste"}'
```

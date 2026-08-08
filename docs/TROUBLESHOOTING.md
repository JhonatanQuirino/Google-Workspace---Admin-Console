# Guia de Solução de Problemas

## Problemas comuns

### Autorização OAuth ausente

Se `AdminDirectory` ou `Gmail` estiverem indefinidos, verifique os escopos em `appsscript.json` e reautorize o projeto.

### Erros de autenticação do Firebase

Verifique se `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PROJECT_ID` estão configurados corretamente.

### Propriedades faltando

Se `NOME_DOMINIO` ou `EMAIL_ADMIN` estiverem vazios, configure as propriedades do script no Editor do Apps Script.

### Limites de API

Se houver erros `429` ou `quota exceeded`, reduza a frequência de execução e distribua as cargas.

## Solução por módulo

### `AniversariantesGW`

- Confirme se os campos de data estão no formato `DD/MM/AAAA`.
- Verifique o acesso ao Gmail.

### `BoasVindasGW`

- Confirme os usuários recém-criados no Admin Directory.
- Use o modo de teste para validar antes de enviar e-mails.

### `criacaoUsuarioGW`

- Verifique os dados do Firebase.
- Confirme a correspondência de CPF entre HCM e Workspace.

### `DadosRecuperacaoGW`

- Verifique se os dados de recuperação existem no Firebase.
- Confirme se os campos de telefone e e-mail estão corretos.

### `UsuariosAtivosGW`

- Verifique se o mapeamento de OU está presente.
- Confirme a lógica de ativação para situação `1`.

### `UsuariosSuspensosGW`

- Confirme as regras de suspensão e desligamento no HCM.
- Verifique as OUs de suspensão e as licenças no Admin License Manager.

## Passos de depuração

1. Execute a função do módulo manualmente no editor do Apps Script.
2. Verifique os logs.
3. Corrija propriedades faltantes.
4. Reautorize se necessário.

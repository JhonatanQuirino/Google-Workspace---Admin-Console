Copyright (c) 2026 Jhonatan Quirino

# FAQ

## O repositório tem `package.json` no nível raiz?
Não. Cada módulo é um projeto Apps Script independente.

## Como configurar as propriedades do script?
No Editor do Apps Script, abra o projeto do módulo e vá para **Configurações do projeto** > **Propriedades do script**. Adicione as chaves necessárias.

## Qual módulo devo usar?
- `criacaoUsuarioGW`: criação de usuários a partir do HCM
- `DadosRecuperacaoGW`: sincronização de dados de recuperação
- `UsuariosAtivosGW`: gerenciamento de usuários ativos e de unidade organizacional
- `UsuariosSuspensosGW`: gestão de suspensão e desligamento
- `BoasVindasGW`: e-mails de boas-vindas
- `AniversariantesGW`: aniversários e tempo de empresa

## Posso rodar todos os módulos juntos?
Sim, mas cada módulo precisa de implantação e configuração próprias.

## Por que não vejo gatilhos no código?
Os gatilhos são configurados no editor do Apps Script ou via `clasp`, não necessariamente no código fonte.

## Onde estão os templates de e-mail?
Os templates HTML estão dentro de cada módulo, por exemplo `Email_BoasVindas.html` e `Email_Aniversario.html`.

## Como testar um módulo?
Use `clasp run` para executar funções de teste, por exemplo:

```bash
cd BoasVindasGW
clasp run testarServicoBoasVindas
```

## Como o Firebase é acessado?
Acesso ao Firebase é feito por `UrlFetchApp` e JWT de serviço em `Integracao_Firebase.js`.

## O projeto funciona em outro domínio?
Sim, desde que `NOME_DOMINIO` e as configurações de OU sejam ajustadas corretamente.

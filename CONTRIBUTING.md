# Contribuindo para o GW Admin Hub

Obrigado pelo interesse em contribuir! Este documento descreve as diretrizes e instruções para contribuir com o projeto.

## Código de Conduta

O projeto busca um ambiente acolhedor e inclusivo. Todos os colaboradores devem:

- Ser respeitosos e profissionais
- Valorizar perspectivas diversas
- Oferecer feedback construtivo
- Reportar violações para [jhqsouza@gmail.com](mailto:jhqsouza@gmail.com)

## Como começar

### Fork e clone

```bash
# Faça fork do repositório no GitHub
# Clone o seu fork
git clone https://github.com/seu-usuario/gw-admin-hub.git
cd gw-admin-hub

# Adicione o repositório upstream
git remote add upstream https://github.com/original-org/gw-admin-hub.git
```

### Configuração de desenvolvimento

```bash
# Instale dependências de Node.js caso utilize ferramentas de build ou clasp
npm install

# Instale clasp globalmente para trabalhar com Google Apps Script
npm install -g @google/clasp

# Autentique-se no Google
clasp login

# Configure seu .clasp.json para desenvolvimento
```

Veja [SETUP.md](docs/SETUP.md) para instruções detalhadas de configuração.

## Fluxo de desenvolvimento

### Nomeação de branches

Use nomes descritivos para as branches:

```
feature/<nome-da-funcionalidade>    # Nova funcionalidade
fix/<nome-do-bug>                  # Correção de bug
docs/<tema-da-documentação>        # Atualizações de documentação
refactor/<componente>              # Refatoração de código
test/<nome-do-teste>               # Adições de teste
chore/<tarefa-de-manutenção>       # Tarefa de manutenção
```

Exemplos:
- `feature/melhoria-provisionamento-usuarios`
- `fix/retry-autenticacao-firebase`
- `docs/guia-integracao-api`

### Fazendo mudanças

1. Crie uma branch de feature:

```bash
git checkout -b feature/seu-recurso
```

2. Faça suas alterações:
- Siga as diretrizes de codificação
- Escreva mensagens de commit claras
- Inclua testes para novas funcionalidades
- Atualize a documentação quando necessário

3. Teste suas alterações:

```bash
cd criacaoUsuarioGW
clasp run testarServico
```

4. Faça commit com mensagem clara:

```bash
git commit -m "feat(criacaoUsuarioGW): adicionar validação de CPF com retry

- Implementa backoff exponencial para falhas de API
- Adiciona tentativas configuráveis
- Inclui testes

Fixes #123"
```

## Convenção de mensagens de commit

Use o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
<tipo>(<escopo>): <assunto>

<corpo>

<rodape>
```

**Tipos**:
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: documentação
- `style`: formatação ou estilo de código
- `refactor`: refatoração de código
- `test`: testes
- `chore`: tarefas de manutenção

## Padrões de codificação

### JavaScript / Google Apps Script

#### Guia de estilo
- Use `const` por padrão e `let` para reatribuição
- Evite `var` sempre que possível
- Use camelCase para variáveis e funções
- Use PascalCase para classes
- Use UPPER_SNAKE_CASE para constantes
- Use indentação de 2 espaços
- Use nomes de variáveis significativos

#### Estrutura de código

```javascript
/**
 * Descreve a função
 * @param {type} parametro - Descrição do parâmetro
 * @returns {type} Descrição do retorno
 */
function minhaFuncao(parametro) {
  if (!parametro) {
    console.error('parametro é obrigatório');
    return null;
  }
  return resultado;
}
```

#### Tratamento de erros

Use `try/catch` ao chamar APIs externas e registre os erros de forma estruturada.

#### Logging

Utilize logs estruturados em JSON:

```javascript
console.info({
  event: 'USER_CREATED',
  execution_id: Utilities.getUuid(),
  timestamp: new Date().toISOString(),
  user_email: maskEmail(email),
  duration_ms: Date.now() - startTime
});
```

#### Comentários
- Escreva comentários explicando o motivo, não apenas o que o código faz
- Mantenha os comentários atualizados
- Use JSDoc para funções e classes

## Testes

- Adicione testes para novas funcionalidades
- Mantenha os testes determinísticos e independentes
- Execute os testes antes de abrir pull request

## Documentação

### Atualizando a documentação

- Atualize `docs/` sempre que adicionar ou modificar funcionalidades
- Garanta que a documentação reflita o estado atual do código
- Use exemplos claros e práticos

## Processo de Pull Request

1. Crie uma branch com um nome descritivo
2. Garanta que os testes passem
3. Atualize a documentação, quando necessário
4. Abra um Pull Request com descrição clara
5. Referencie issues relacionadas, se houver

## Licença de contribuições

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT do projeto.

## Agradecimentos

Obrigado por contribuir para o GW Admin Hub!

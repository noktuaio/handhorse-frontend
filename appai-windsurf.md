# appai – Guia para o Agente de IA

Este documento define **como o agente de IA deve projetar e evoluir o app** do ecossistema Autonom.ia.
Ele é a referência principal para decisões de arquitetura e organização de código.

---

## 1. Visão do App Dinâmico

- **Entrada principal**: o usuário interage via **prompt textual** (pedido de consulta, inclusão, alteração, relatório, etc.).
- **Camada de IA (entre front e backend)**:
  - Interpreta a intenção do usuário e extrai parâmetros.
  - Decide **quais rotas/serviços de backend** serão chamadas.
  - Gera **metadados de UI (uiSchema)** descrevendo como a tela deve ser montada.
- **Resposta para o front** sempre segue o padrão:
  - `data`: dados de negócio (já tipados e validados).
  - `uiSchema`: estrutura declarativa que descreve **layouts, componentes, bindings e ações** da tela.
- O **frontend não conhece diretamente as rotas internas** chamadas pelo backend; ele apenas consome `data + uiSchema` e monta a interface via uma **engine de UI dinâmica**.

---

## 2. Arquitetura em Camadas e Domínios

Sempre organizar o código em **domínios de negócio** e **camadas claras**.

### 2.1. Domínios de negócio

Exemplos de domínios (não exaustivo):

- Auth / Usuário
- Empresa / Conta / Produto
- Funil / Conversas / Kanban
- Billing (faturas, planos, assinaturas, consumo)
- Integrações (WAHA, Chatwoot, etc.)

Cada domínio deve ter **modelos, regras de negócio e contratos bem definidos**, separados de UI e infraestrutura.

### 2.2. Camadas sugeridas (frontend)

- `shared/domain/<dominio>`
  - Tipos de domínio (interfaces e tipos puros).
  - Regras de negócio puras (sem chamadas HTTP, sem React).
  - Schemas de validação.

- `shared/application/<dominio>`
  - **Casos de uso** (use cases): funções que orquestram regras de negócio + infraestrutura.
  - Exemplo: `loginUserUseCase`, `loadFunnelDistributionUseCase`, `createInvoiceUseCase`.
  - Essa camada é o ponto de entrada para contexts, hooks e telas.

- `shared/infrastructure/<dominio>`
  - Adapters HTTP (ex.: `AuthApi`, `FunnelApi`, `BillingApi`).
  - Mapeamento DTO ⇄ modelos de domínio.
  - Nunca expor detalhes de cliente HTTP para a UI.

- `shared/ui`
  - Componentes de UI reutilizáveis (inputs, tabelas, charts, layouts, modais).
  - **Camada de UI dinâmica** (`shared/ui/dynamic`), que recebe `uiSchema + data` e monta telas genéricas.

### 2.3. Camada de IA (frontend)

- `shared/infrastructure/ai`
  - Cliente HTTP para chamar o orquestrador de IA (ex.: `/ai/interpret`, `/ai/execute-intent`).

- `shared/application/ai`
  - `interpretPromptUseCase`: envia prompt + contexto para a IA, recebe `data + uiSchema`.
  - `executeIntentUseCase`: envia ações do usuário (submit de formulário, clique em botão) para a IA continuar o fluxo.

---

## 3. Modelo de Metadados de UI (uiSchema)

O agente de IA **deve sempre respeitar um contrato forte e versionado** para descrever telas.

Conceitos principais (forma conceitual, não código final):

- `UIScreen`
  - `id`: string
  - `title`: string
  - `layout`: tipo de layout (grid, flex, wizard, tabs, etc.).
  - `sections`: `UISection[]`.

- `UISection`
  - `id`: string
  - `title?`: string
  - `description?`: string
  - `components`: `UIComponent[]`.

- `UIComponent` (união discriminada)
  - Tipos comuns:
    - `field` (entrada de dado)
    - `table` (listagem)
    - `card` (resumo)
    - `chart` (gráficos)
    - `form` (agrupador de campos e ações)
    - `tabs` (abas)
    - `action` (botões, ícones acionáveis)
  - Cada tipo deve possuir propriedades específicas claras (fieldType, dataSource, columns, actions, etc.).

Regras gerais:

- Sempre incluir **bindings explícitos** (`dataPath`, `dataSource`) para conectar componentes a dados.
- Sempre descrever **ações** com IDs ou intents (`actionId`, `intentId`) que possam ser enviados de volta à camada de IA.
- Sempre considerar **visibilidade condicional** (`visibleIf`) e **estado** (`readonly`, `disabled`) via expressões simples ou flags.

---

## 4. Fluxos principais

### 4.1. Fluxo de prompt inicial

1. Usuário digita um prompt no front.
2. Front chama `interpretPromptUseCase` (camada `application/ai`).
3. A camada de IA no backend:
   - Interpreta a intenção.
   - Chama serviços/backend necessários.
   - Monta `data + uiSchema`.
4. Front recebe resposta e redireciona/renderiza uma tela dinâmica usando a engine de UI.

### 4.2. Fluxo de ações na tela dinâmica

1. Usuário interage com componentes dinâmicos (form submit, clique em botão, troca de aba).
2. A engine de UI dispara um `executeIntentUseCase` com:
   - `intentId` ou `actionId`.
   - `payload` (dados do formulário/estado atual).
3. A camada de IA executa nova lógica (incluindo chamadas de backend) e devolve **novo** `data + uiSchema`.
4. Front atualiza a tela sem acoplar-se diretamente a rotas específicas.

---

## 5. Padrões de Código e Estilo

O agente de IA **deve sempre seguir** estas regras ao criar ou alterar código:

- **Arquitetura primeiro**: respeitar e estender a organização em domínios e camadas.
- **KISS & DRY**: manter soluções simples, sem duplicar lógica.
- **SOLID & YAGNI**:
  - Cada arquivo/classe/função com responsabilidade única.
  - Não implementar features genéricas sem necessidade real.
- **Performance de renderização**:
  - Minimizar re-renders com `useMemo`/`useCallback` quando necessário.
  - Não usar `useEffect` para lógica que possa ser expressa de forma declarativa.
- **Controle de fluxo**:
  - **Não usar `if` aninhado ou `else`** – preferir early-returns ou `switch`.
  - **Não usar `while` / `do-while`** – preferir métodos de array (`map`, `filter`, `reduce`) ou recursão controlada.
- **Configuração centralizada**:
  - Manter limites de campos, endpoints de API e tokens de estilo em um arquivo central (por exemplo, `src/utils/globalSettings.ts` ou equivalente no projeto).
- **TypeScript estrito**:
  - Evitar `any`.
  - Preferir tipos explícitos e interfaces bem nomeadas.
- **Testes**:
  - Criar ou atualizar testes unitários para cada novo comportamento ou edge case relevante.

---

## 6. Diretrizes para Evolução

Quando o agente de IA for criar ou evoluir features:

1. **Identificar o domínio** da feature (ex.: funil, billing, WAHA, etc.).
2. **Definir/atualizar modelos de domínio** e contratos (`interfaces`, `schemas`).
3. **Criar/ajustar casos de uso** na camada `application`.
4. **Ajustar infraestrutura** (adapters HTTP) apenas quando necessário.
5. **Projetar/atualizar o `uiSchema`** retornado pela camada de IA, sempre seguindo o modelo definido neste documento.
6. **Reutilizar componentes de UI** existentes, adicionando adaptadores dinâmicos se preciso.

Este arquivo deve ser mantido sempre atualizado quando houver mudanças relevantes na arquitetura do app dinâmico ou no contrato de `uiSchema`.

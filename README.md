# UPA Entrega

Sistema interno para gestão da **logística de entrega domiciliar de medicamentos** da UPA. O sistema não interfere no atendimento médico, na emissão de receitas nem na dispensação/estoque de medicamentos — esses processos continuam nos sistemas oficiais da unidade. Aqui é controlado apenas o ciclo da entrega: do registro do pedido até a confirmação do recebimento pelo paciente, por um entregador da própria UPA, sem custo para o paciente.

## Stack

- **Backend:** Node.js, Express, Prisma, PostgreSQL, JWT + bcrypt
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query
- **Infra:** Docker Compose

## Subir com Docker (recomendado)

```bash
docker compose up --build
```

| Serviço   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173        |
| Backend   | http://localhost:3001        |
| PostgreSQL| localhost:5432               |

## Credenciais iniciais (seed)

| Perfil      | E-mail                | Senha           |
|-------------|------------------------|-----------------|
| Admin       | admin@upa.local        | Admin@123       |
| Operador    | operador@upa.local     | Operador@123    |
| Entregador  | entregador@upa.local   | Entregador@123  |

## Desenvolvimento local (sem Docker)

### Banco de dados

```bash
docker compose up db -d
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate:dev
npm run db:seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Papéis de usuário

- **Administrador**: acesso total, inclusive gestão de usuários.
- **Operador**: cria e acompanha pedidos, monta rotas, gerencia o catálogo de medicamentos.
- **Entregador**: acesso restrito à tela "Minhas entregas" — vê só os pedidos da rota atribuída a ele e confirma a entrega por PIN. Essa separação de papéis via JWT é a mesma base que permitirá, no futuro, um app mobile dedicado ao entregador sem mudanças na API.

## Funcionalidades

- Login seguro com JWT e controle de papéis (Admin / Operador / Entregador)
- Cadastro de paciente por **CPF**, com preenchimento automático em pedidos futuros e **múltiplos endereços** por paciente (residência, trabalho, etc.)
- Endereço com consulta automática de CEP (ViaCEP)
- Registro de pedido em etapas (paciente → endereço → medicamentos → revisão), sem etapa de pagamento — a entrega é gratuita
- PIN de confirmação de entrega **gerado automaticamente pelo sistema** na criação do pedido
- Fluxo de status com histórico auditável: Pedido recebido → Em separação → Separado → Aguardando saída → Em rota → Entregue (ou Cancelado)
- Impressão de etiqueta de identificação do pedido (paciente, endereço, medicamentos, PIN)
- Montagem de rotas: agrupar pedidos prontos e atribuir a um entregador da UPA
- Tela "Minhas entregas" para o entregador confirmar cada entrega informando o PIN dado pelo paciente
- Mensagens prontas para copiar/compartilhar (WhatsApp manual) em cada etapa relevante
- Página pública do paciente (`/acompanhar/:token`) — somente leitura, com status atual, histórico de movimentações e PIN, sem necessidade de login
- Catálogo simples de medicamentos (nome/unidade) para agilizar a seleção nos pedidos
- Gestão de usuários (admin)
- Identidade visual UPA 24h e Prefeitura de Cabo Frio (logos em `frontend/public/logos/`)

## Fluxo operacional

1. Paciente é atendido e recebe a prescrição normalmente pela unidade.
2. Na farmácia, opta pela entrega domiciliar. O funcionário busca o paciente pelo **CPF**.
3. Se já cadastrado, dados e endereços são preenchidos automaticamente; o funcionário escolhe um endereço existente ou cadastra um novo. Se não cadastrado, o sistema cria o cadastro nesse momento.
4. Funcionário registra os medicamentos da receita e observações; o pedido é criado com status **Pedido recebido**, um PIN é gerado e uma mensagem com link público fica pronta para copiar/enviar.
5. A farmácia separa os medicamentos pelos seus próprios processos/sistemas internos (o UPA Entrega **não controla estoque nem disponibilidade** de medicamento). O operador só reflete o andamento: **Em separação** → **Separado**.
6. Ao acondicionar a sacola, é possível imprimir a etiqueta do pedido. O pedido passa para **Aguardando saída**.
7. O responsável pela logística agrupa pedidos prontos em uma **rota** e atribui a um entregador da UPA. Os pedidos passam para **Em rota**.
8. O entregador usa a tela "Minhas entregas" para ver sua lista, se desloca e, ao chegar, pede ao paciente o **PIN** (disponível na página pública/mensagens). Confirmando o PIN, o pedido vira **Entregue**.
9. A página pública é atualizada automaticamente a cada mudança de status, encerrando o acompanhamento quando entregue.

## Fluxo de status

```
Pedido recebido → Em separação → Separado → Aguardando saída → Em rota → Entregue
                                                                        ↘ Cancelado
```

`Em rota` só é atingido ao vincular o pedido a uma rota; `Entregue` só é atingido confirmando o PIN de entrega.

## Estrutura

```
├── backend/                    API Express + Prisma
├── frontend/                   React + Vite
│   └── public/logos/           Logos UPA e Cabo Frio
├── docker-compose.yml
└── README.md
```

## Produção

Para deploy em VM Linux, ajuste as variáveis de ambiente:

- `JWT_SECRET` — secret forte e único
- `DATABASE_URL` — conexão PostgreSQL
- `FRONTEND_URL` — URL do frontend para CORS
- `VITE_API_URL` — URL da API no build do frontend

## Fora de escopo (preparado para evolução)

- App mobile nativo para o entregador (a API já é organizada por papel via JWT para suportar isso sem mudanças estruturais)
- Tela dedicada de administração de pacientes (hoje o cadastro/edição de endereço acontece embutido no fluxo de novo pedido)
- Envio automático de WhatsApp (hoje é copiar/colar manual)
- Controle de estoque/disponibilidade de medicamento (responsabilidade dos sistemas internos da UPA)
- Relatórios avançados e permissões granulares

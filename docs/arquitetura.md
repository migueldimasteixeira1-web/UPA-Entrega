# Arquitetura

## Visão geral

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│  Frontend   │──────▶│   Backend (API)  │──────▶│  PostgreSQL  │
│ React + Vite│      │  Express + Prisma │      └──────────────┘
└─────────────┘      └────────┬─────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
             MinIO (S3)   SMTP (e-mail)   APIs externas
          (receita, foto)  (fila async)   (CEP, geocoding,
                                            otimização de rota)
```

Monólito simples de propósito: um backend Express, um frontend React separado (SPA), um Postgres. Nada de microsserviços, filas externas (RabbitMQ/SQS) ou cache distribuído — a escala real (uma UPA, alguns operadores, um punhado de entregadores) não justifica essa complexidade, e adicioná-la seria "poluição sem uso prático".

Em produção (VM), um único Nginx serve o frontend estático **e** faz proxy de `/api` pro backend, na mesma origem — evita configuração de CORS especial e funciona em qualquer dispositivo da rede da UPA sem VPN. Em desenvolvimento, o Vite dev server e o backend rodam em portas separadas (5173 e 3001), com o Vite fazendo o proxy.

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Backend | Node.js + Express | Simples, sem framework opinativo demais pra um domínio pequeno |
| ORM | Prisma | Migrações versionadas, tipagem do client gerada do schema |
| Banco | PostgreSQL | Relacional — o domínio é fortemente relacional (paciente → endereço → pedido → rota) |
| Frontend | React + Vite | SPA simples, build rápido |
| Estilo | Tailwind CSS | Sem biblioteca de componentes — os componentes em `frontend/src/components/` são todos próprios, pequenos e específicos deste app |
| Estado de servidor | TanStack Query | Cache/refetch de chamadas à API, sem Redux/estado global manual |
| Autenticação | JWT + bcrypt | Sem sessão em banco — o token carrega `userId` + `role` |
| Storage de arquivo | MinIO (S3-compatível) | Receita médica e foto de comprovação ficam fora do Postgres (não inflam o backup do banco); mesma API do S3 real, migração direta se um dia sair de VM única |
| Deploy | Docker Compose + Nginx | Um `docker compose up` sobe tudo; TLS autoassinado por padrão, suficiente pra uso interno |

## Estrutura de pastas

```
backend/
├── prisma/
│   ├── schema.prisma        # única fonte de verdade do modelo de dados
│   ├── migrations/          # uma pasta por migração, nunca editada à mão depois de aplicada
│   └── seed.js               # dados de demonstração (SEED_DEMO_DATA=true)
├── src/
│   ├── app.js                # monta o Express, registra toda rota — ver aqui pra saber "o que a API expõe"
│   ├── index.js               # só chama app.listen(); carrega .env
│   ├── routes/                # um arquivo por recurso (orders, patients, routes, medications, users, auth)
│   ├── middleware/             # authenticate/requireRole (auth.js), upload de arquivo (upload.js)
│   └── lib/                    # tudo que não é rota HTTP: regras de domínio, integrações, PDF, e-mail
│       ├── constants.js         # enums de status, transições válidas, máscaras de CPF/nome
│       ├── schemas.js            # validação de entrada (zod) — um schema por endpoint que recebe corpo
│       ├── orderSerializer.js     # única fonte de verdade de "o que cada papel pode ver de um pedido"
│       ├── geocoding.js            # endereço → coordenada (ver integrações-externas.md)
│       ├── routing/optimize.js      # coordenadas → sequência de entrega otimizada
│       ├── storage.js                # upload/URL assinada pro MinIO
│       ├── email/                     # fila assíncrona de e-mail (queue.js, worker.js, templates.js, provider.js)
│       └── pdf/receiptPdf.js           # comprovante de pedido em PDF, gerado sob demanda
└── tests/                      # um arquivo por recurso, integração contra Postgres/MinIO reais (não mockados)

frontend/
├── src/
│   ├── App.jsx                # define as rotas (react-router) e quem pode acessar cada uma
│   ├── pages/                  # uma página por rota; new-order/ tem os passos do wizard de pedido
│   ├── components/              # componentes reutilizáveis entre páginas (ActionMenu, Modal, StatusBadge...)
│   └── lib/                      # api.js (client HTTP), auth.jsx (contexto de sessão), masks.js, constants.js
└── tests/                      # testes de componente/hook (Vitest + Testing Library), mockando fetch
```

## Autenticação e papéis

Três papéis (`UserRole`): `ADMIN`, `OPERADOR`, `ENTREGADOR`. Login devolve um JWT contendo `userId` e `role`; toda rota protegida passa por `authenticate` (valida o token e recarrega o usuário do banco — checa `active` a cada requisição, não só no login) e depois por `requireRole(...)`/`requireAdmin` conforme o endpoint.

- **Admin**: acesso total, inclusive gestão de usuários e auditoria.
- **Operador**: cria/acompanha pedidos, despacha rotas, gerencia catálogo de medicamentos.
- **Entregador**: só enxerga `/entregas` (tela "Minhas entregas") — vê apenas os pedidos da rota atribuída a ele, nunca o PIN de entrega em texto (ver [fluxos.md](./fluxos.md)).

O controle de "o que cada papel vê" não é só rota bloqueada — dentro de uma mesma rota, `orderSerializer.js` decide quais campos aparecem na resposta JSON conforme quem está pedindo (`formatOrder` pra staff, `formatOrderForCourier` pro entregador, que nunca inclui o hash do PIN nem o CPF sem máscara).

## Onde procurar cada coisa

| Preciso entender... | Comece por |
|---|---|
| Quais rotas a API expõe | `backend/src/app.js` |
| Uma regra de negócio específica de pedido | `backend/src/routes/orders.routes.js` |
| Validação de um campo de formulário | `backend/src/lib/schemas.js` |
| O que muda quando o status de um pedido muda | `backend/src/lib/constants.js` (`VALID_TRANSITIONS`) e [fluxos.md](./fluxos.md) |
| Uma tela específica | `frontend/src/pages/` |
| Uma chamada à API do frontend | `frontend/src/lib/api.js` |

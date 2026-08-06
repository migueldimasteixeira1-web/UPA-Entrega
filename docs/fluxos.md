# Fluxos principais

## 1. Ciclo de vida do pedido

```
PEDIDO_RECEBIDO → EM_SEPARACAO → SEPARADO → AGUARDANDO_SAIDA → EM_ROTA → ENTREGUE
        │               │            │                             ↘ CANCELADO
        └───────────────┴────────────┴───────────────────────────────┘
```

As transições válidas estão centralizadas em `VALID_TRANSITIONS` (`backend/src/lib/constants.js`) e checadas por `canTransition(from, to)` — nenhuma rota decide isso por conta própria. Dois detalhes importantes:

- **`AGUARDANDO_SAIDA → EM_ROTA` não passa pelo endpoint genérico de status** (`PATCH /api/orders/:id/status`). Olhando `VALID_TRANSITIONS`, `AGUARDANDO_SAIDA` só permite ir pra `CANCELADO` por ali — a única forma de chegar a `EM_ROTA` é pelo despacho em lote (`POST /api/delivery-routes`, seção 3). Isso é proposital: entrar em rota é sempre consequência de um despacho, nunca uma ação isolada de "mudar status".
- **`EM_ROTA → ENTREGUE` também não passa pelo endpoint genérico** — só acontece confirmando o PIN de entrega (seção 2).

## 2. PIN de entrega

Todo pedido nasce com um PIN de 6 dígitos gerado na criação (`generateDeliveryPin()`), guardado só como hash (`deliveryPinHash`, bcrypt) — o valor em texto puro existe por poucas linhas de código, usado ali mesmo pra gerar o hash e montar o e-mail de confirmação, e descartado. Nenhuma rota devolve o PIN em texto depois disso.

O paciente recebe o PIN por e-mail no momento da confirmação do pedido (se tiver e-mail cadastrado — obrigatório desde a issue #40). Sem e-mail, o PIN precisa ser informado pessoalmente ao paciente pela equipe.

**Confirmar entrega** (`POST /api/orders/:id/confirm-delivery`, só `ADMIN`/`ENTREGADOR`) exige, nessa ordem:

1. Pedido estar com status `EM_ROTA`.
2. Quem está confirmando ser `ADMIN` **ou** o entregador dono da rota daquele pedido (`route.courierId === req.user.id`) — um entregador não confirma entrega de rota alheia.
3. PIN informado bater com o hash (`bcrypt.compare`).
4. Foto do medicamento entregue anexada — **só exigida/enviada depois do PIN validar**, pra não gastar upload+compressão numa tentativa de PIN errado.

Existe também `POST /api/orders/:id/verify-pin`, que roda os mesmos passos 1–3 sem finalizar nada (sem mudar status, sem exigir foto) — usado pelo app do entregador pra dar feedback real ("PIN certo, agora tire a foto") antes de liberar a etapa de câmera.

Ambas as rotas dividem o mesmo rate limiter por IP (`confirmDeliveryLimiter`) — o PIN tem só 1 milhão de combinações (6 dígitos), então força bruta é uma ameaça real sem limite de tentativas; e as duas rotas juntas formariam uma segunda superfície de ataque se tivessem limites independentes.

Quando o último pedido não-terminal (nem `ENTREGUE` nem `CANCELADO`) de uma rota é entregue, a rota vira `FINALIZADA` automaticamente — ninguém "fecha uma rota" manualmente.

## 3. Despacho em lote e otimização de rota

Reflete o fluxo operacional real (definido explicitamente na issue #69, depois da tela original de "montar rota manualmente" ter sido descartada por não fazer sentido pro dia a dia): o entregador não sai da unidade de saúde a cada pedido — pedidos se acumulam em `AGUARDANDO_SAIDA` conforme terminam a separação, e saem todos juntos num despacho, em horários definidos pela operação (ex.: uma saída de manhã, outra à tarde).

```
Pedidos em AGUARDANDO_SAIDA
        │
        ▼
Operador clica "Despachar" (tela Rotas) e escolhe um entregador
        │
        ▼
POST /api/delivery-routes { courierId, orderIds: [todos os AGUARDANDO_SAIDA] }
        │
        ├─▶ optimizeDeliverySequence() calcula a melhor ordem de visita
        │   (ver integracoes-externas.md — ORS/VROOM), com fallback pra
        │   ordem de chegada (FIFO) se a otimização não rodar
        │
        ▼
Route criada (EM_ANDAMENTO) + todos os pedidos → EM_ROTA, routeSequence
gravado na ordem calculada
```

Pedido que fica pronto (`AGUARDANDO_SAIDA`) **depois** de um despacho não entra na rota já criada — isso não precisa de nenhuma lógica de "trava"; cai de graça do próprio modelo, já que o despacho só considera quem estava em `AGUARDANDO_SAIDA` no exato momento do clique. Ele espera o próximo despacho.

A chamada de otimização acontece **fora** da transação de banco que cria a rota (mesmo raciocínio do upload de receita em `createOrder`) — não faz sentido segurar uma transação de Postgres aberta esperando uma API externa responder. Se a chamada falhar ou não houver `ORS_API_KEY` configurada, o despacho segue normalmente, só sem otimizar (ordem de chegada).

## 4. Notificações por e-mail

Toda notificação (confirmação de pedido com PIN, mudança de status) é enfileirada (`EmailNotification`, status `PENDING`) na mesma transação que gera o evento, nunca enviada de forma síncrona. Um worker (`lib/email/worker.js`) roda em intervalo configurável (`EMAIL_WORKER_INTERVAL_MS`), processa pendentes/falhas com retentativa. Sem `SMTP_HOST` configurado, o "envio" vira só um log no console — útil em desenvolvimento, sem precisar de um provedor de e-mail de teste.

O reenvio manual ("Reenviar e-mail" no detalhe do pedido) reaproveita o conteúdo já gerado, não cria um PIN novo nem regenera o e-mail do zero.

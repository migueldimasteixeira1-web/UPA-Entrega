# Integrações externas

Nenhuma integração externa deste projeto pode travar uma operação do usuário se estiver fora do ar. Esse é o critério que guiou cada uma das decisões abaixo — vale ler o "o que acontece se falhar" antes de mexer em qualquer uma delas.

## ViaCEP — texto do endereço

**O quê:** `GET https://viacep.com.br/ws/{cep}/json/`, chamado direto do frontend (`frontend/src/lib/viacep.js`) quando o operador digita um CEP no cadastro de endereço. Devolve rua/bairro/cidade/estado em texto — preenchimento automático de formulário, nada mais.

**Se falhar:** o operador preenche o endereço manualmente. Não bloqueia nada, é só perda de conveniência.

**Chave necessária:** nenhuma.

## AwesomeAPI — CEP → coordenada

**O quê:** `GET https://cep.awesomeapi.com.br/json/{cep}`, chamado do backend (`backend/src/lib/geocoding.js`) sempre que um endereço é criado ou editado com CEP. É a fonte **principal** de geocodificação (issue #73) — devolve `lat`/`lng` reais e diferenciados por CEP, validado manualmente contra endereços reais de Cabo Frio.

**Por que essa e não outra:** testamos geocodificação por bairro (ORS estruturado, Nominatim, Photon) e por CEP (Nominatim, BrasilAPI) antes de chegar aqui — nenhuma tinha cobertura boa pra Cabo Frio. BrasilAPI, por exemplo, tem o campo de coordenada na resposta mas ele vem sempre vazio, mesmo pra CEPs de capitais conhecidas. A AwesomeAPI foi a única que devolveu coordenada real de forma consistente, sem exigir chave nenhuma.

**Se falhar:** CEP não encontrado (404) ou erro de rede → `geocodeAddress()` cai pro respaldo por texto via ORS (abaixo). Se isso também falhar (ou não tiver `ORS_API_KEY`), o endereço fica sem coordenada — cadastro continua normal, só não participa do cálculo de rota otimizada depois (vai pro fim da sequência no despacho).

**Chave necessária:** nenhuma. Limite gratuito de 100 mil requisições/mês — folga enorme pro volume real deste sistema.

## OpenRouteService (ORS) — respaldo de geocodificação + otimização de rota

**O quê:** dois usos distintos, mesma API (`openrouteservice.org`), mesma `ORS_API_KEY`:

1. **Geocodificação por texto** (`GET /geocode/search`, `backend/src/lib/geocoding.js`) — respaldo só pra endereço sem CEP. Usa deliberadamente **só rua+número+cidade+estado** no texto de busca, nunca bairro nem CEP juntos: testado com bairro+CEP incluídos, o ORS devolveu, com confiança máxima, um endereço em Florianópolis/SC pra uma rua de Cabo Frio (bug real, encontrado e corrigido durante a validação da issue #73). Rua não encontrada cai pro centro genérico da cidade — impreciso, mas nunca erra de cidade.
2. **Otimização de rota** (`POST /optimization`, `backend/src/lib/routing/optimize.js`) — recebe a coordenada da UPA (origem e retorno fixos, constante `UPA_ORIGIN`) e a lista de coordenadas dos pedidos do lote a despachar; usa o motor **VROOM** (resolve o problema do caixeiro-viajante) e devolve a ordem de visita que minimiza deslocamento total.

**Se falhar:** geocodificação por texto retorna `null` (endereço fica sem coordenada); otimização retorna `null` e o despacho usa a ordem de chegada dos pedidos (FIFO) em vez de uma ordem calculada. Nenhum dos dois bloqueia nada — só perde precisão/otimização.

**Chave necessária:** `ORS_API_KEY` (`backend/.env`) — grátis, mas exige criar conta em openrouteservice.org. Cota gratuita: 500 requisições/dia só no endpoint de otimização, 2.500/dia e 40 mil/mês no total da conta — folgado pro volume real (uma UPA despachando algumas vezes por dia).

**Se o volume um dia justificar mais:** dá pra auto-hospedar o mesmo motor (VROOM + OSRM) via Docker, sem cota nenhuma — considerado e descartado por enquanto porque a cota gratuita já é suficiente e auto-hospedar significa manter infraestrutura própria (dados de mapa, atualização periódica) sem necessidade real hoje.

**A coordenada da própria UPA** (`UPA_ORIGIN` em `optimize.js`) foi geocodificada manualmente via Nominatim/OpenStreetMap, com precisão de nome de rua (não do número exato do endereço) — suficiente pra distância entre paradas dentro da cidade.

## SMTP — envio de e-mail

**O quê:** confirmação de pedido (com PIN) e notificações de mudança de status, via `nodemailer` (`backend/src/lib/email/provider.js`) configurado por SMTP genérico — qualquer provedor transacional (Resend, SES, Mailgun, ou um SMTP de teste) funciona, trocar de provedor é só trocar variável de ambiente, sem mudar código.

**Se falhar/não configurado:** sem `SMTP_HOST`, o "envio" vira um `console.log` — o sistema continua funcionando normalmente em desenvolvimento, sem precisar de conta de e-mail nenhuma. Em produção, uma falha de envio marca a linha como `FAILED` na fila (`EmailNotification`) e o worker tenta de novo depois — nunca trava a criação do pedido, que já terminou antes do e-mail sequer ser processado (ver [fluxos.md](./fluxos.md#4-notificações-por-e-mail)).

**Chave necessária:** credenciais do provedor SMTP escolhido (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`). Pendência conhecida antes de produção real: domínio próprio verificado (SPF/DKIM/DMARC), senão o provedor tende a marcar como spam.

## MinIO (S3-compatível) — storage de anexos

**O quê:** receita médica (upload obrigatório na criação do pedido) e foto de comprovação de entrega, via `@aws-sdk/client-s3` apontado pro MinIO self-hosted (`backend/src/lib/storage.js`). Comprimidas com `sharp` antes do upload. Ficam fora do Postgres de propósito — não inflam o backup do banco, e a mesma API do S3 real permite migrar pra um S3 de verdade sem mudar código, só a configuração.

**Se falhar:** upload de receita é obrigatório pra criar o pedido — uma falha aqui bloqueia a criação (é o único ponto desta lista onde uma integração externa fora do ar impede uma ação do usuário, porque não existe fallback sensato pra "pedido sem receita anexada"). Falha na foto de comprovação de entrega bloqueia a confirmação de entrega pelo mesmo motivo.

**Chave necessária:** `S3_ENDPOINT`/`S3_ACCESS_KEY`/`S3_SECRET_KEY` — já vem configurado por padrão no `compose.dev.yaml`/`compose.yaml` (MinIO sobe junto, sem precisar de conta externa).

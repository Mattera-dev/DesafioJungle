# Arquitetura e Documentação Técnica — KURIO NFT Marketplace

## 1. Visão Geral da Arquitetura

```
src/
├── components/
│   ├── layout/        # Navbar, Footer, ProfileSidebar, AuthModal, SimulationToolbar
│   └── ui/            # Skeletons com shimmer effect e primitivos adaptados do shadcn/ui
├── contexts/          # AuthContext (sessão e retomada) e ToastContext (feedback acessível)
├── hooks/             # Hooks TanStack Query (queries, mutations e atualização otimista)
├── lib/               # Aritmética decimal exata em ETH (BigInt micro-ETH) e utilitários
├── mocks/             # MSW: fixtures, banco persistente (db.ts), REST (handlers.ts) e Socket.IO (socket.ts)
├── pages/             # Telas: Home, NftDetail, Cart, Checkout, OrderConfirmation, Profile, Wallets, Auth
├── services/          # Axios HTTP client (api.ts), QueryClient (queryClient.ts) e Socket.IO (realtime.ts)
└── types/             # Contratos tipados compartilhados entre transporte, cache e UI (contracts.ts)
```

---

## 2. Contratos REST

Todas as chamadas passam pela instância Axios (`src/services/api.ts`) com interceptors de autenticação (`Authorization: Bearer <token>`) e propagação de cenário MSW (`x-mock-scenario`).

| Recurso | Método e Rota | Descrição e Códigos de Status |
| --- | --- | --- |
| **Cadastro** | `POST /api/auth/register` | Cria conta, mescla carrinho do visitante e inicia sessão (`201`, `409 Conflict`, `422 Validation`) |
| **Login** | `POST /api/auth/login` | Autentica credenciais e mescla carrinho do visitante (`200`, `401 Invalid`, `422 Validation`) |
| **Sessão** | `GET /api/auth/session` | Valida token ativo (`200`, `401 Session Expired`) |
| **Logout** | `POST /api/auth/logout` | Revoga token de sessão atual (`200`) |
| **Catálogo NFTs** | `GET /api/nfts` | Filtros combináveis (`q`, `categories`, `networks`, `minPrice`, `maxPrice`, `tab`, `sort`, `page`, `limit`) + facets (`200`, `500`) |
| **Detalhe NFT** | `GET /api/nfts/:id` | Retorna NFT com edições, atributos, avaliações e itens relacionados (`200`, `404 Not Found`) |
| **Favoritos** | `GET /api/favorites` | Lista favoritos isolados pelo usuário autenticado (`200`, `401`) |
| **Favoritar** | `POST /api/favorites/:nftId` | Inclui favorito (com **atualização otimista e rollback** no cliente) (`200`, `401`, `404`) |
| **Desfavoritar** | `DELETE /api/favorites/:nftId` | Remove favorito (`200`, `401`) |
| **Carrinho** | `GET /api/cart` | Retorna itens, subtotal, desconto, taxa de rede (`0.016 ETH`), total e flag `hasOutdatedItems` (`200`) |
| **Adicionar Item** | `POST /api/cart/items` | Adiciona NFT/edição respeitando disponibilidade máxima (`200`, `404`, `409 Limit Exceeded`) |
| **Alterar Item** | `PATCH /api/cart/items/:itemId` | Atualiza quantidade inteira respeitando estoque da edição (`200`, `409`) |
| **Remover Item** | `DELETE /api/cart/items/:itemId` | Remove item do carrinho (`200`) |
| **Aceitar Cotação** | `POST /api/cart/acknowledge` | Confirma novos preços/quantidades após evento em tempo real (`200`) |
| **Cotação / Cupom** | `POST /api/quote` | Valida cupom (`KURIO10`, `GENESIS05`, `EXPIRADO20`), taxas e total (`200`, `422 Invalid/Expired`) |
| **Criar Pedido** | `POST /api/orders` | Criação idempotente via header `Idempotency-Key` (`201`, `200 Recovered`, `409 Quote Outdated / Idempotency Conflict`, `422`, `504 Timeout`) |
| **Consultar Pedido** | `GET /api/orders/:id` | Retorna estado (`pending`, `confirmed`, `rejected`) e snapshot imutável do recibo (`200`, `401`, `403`, `404`) |
| **Perfil** | `GET / PUT /api/profile` | Consulta e atualiza dados e avatar do colecionador (`200`, `422`) |
| **Senha** | `PUT /api/profile/password` | Altera senha validando a senha atual com hash simulado (`200`, `422`) |
| **Carteiras** | `GET / PUT /api/wallets` | Consulta e cadastra/atualiza carteira principal e secundária (`200`, `422`) |

---

## 3. Precisão Decimal em ETH

Todos os valores monetários em ETH trafegam como **strings decimais** (ex.: `"1.19"`, `"0.016"`, `"26.846"`).
O módulo `src/lib/eth.ts` converte strings decimais para `BigInt` na escala de micro-ETH ($10^6$) antes de qualquer soma, subtração, multiplicação por quantidade inteira ou cálculo percentual de desconto, eliminando erros de ponto flutuante IEEE 754.

---

## 4. Tempo Real com Socket.IO e MSW (`@mswjs/socket.io-binding`)

- **Transporte**: O cliente utiliza `socket.io-client` configurado com `transports: ['websocket']`. Na camada de mocks, o MSW intercepta a conexão WebSocket em `/socket.io/` usando `ws.link(/\/socket\.io\//)` integrado ao `@mswjs/socket.io-binding` (`toSocketIo(connection)`).
- **Eventos Implementados**:
  1. `nft.updated`: Carrega `{ eventId, resourceId, version, timestamp, priceEth, editions }`. Atualiza o cache do catálogo e do detalhe no TanStack Query e invalida carrinho/cotação para sinalizar mudanças de preço ou disponibilidade.
  2. `order.updated`: Carrega `{ eventId, resourceId, userId, version, timestamp, status, transactionHash, failureReason }`. Estritamente isolado por `userId`.
- **Idempotência de Eventos e Ordenação Monotônica**:
  - `realtime.ts` mantém `processedEventIds` (`Set<string>`) e `resourceVersions` (`Map<string, number>`).
  - Eventos duplicados (mesmo `eventId`) ou atrasados (`payload.version <= currentVersion`) são descartados silenciosamente sem regredir o estado da UI nem disparar notificações repetidas.
  - Pedidos em estado terminal (`confirmed` ou `rejected`) jamais regridem para `pending`.
- **Reconciliação Pós-Reconexão**:
  - Ao receber o evento `connect` (incluindo reconexão após queda), o cliente re-vincula o token da sessão (`auth:bind`) e invalida as queries ativas (`nfts`, `nft`, `cart`, `quote`, `orders`, `order`) para reconciliar o estado local com a API REST.

---

## 5. Estratégia de Cache, Sessão e Isolamento de Dados

- **Isolamento por Usuário**: Todas as query keys privadas incluem o `userId` ativo (`['favorites', userId]`, `['wallets', userId]`, `['orders', userId]`, `['order', userId, orderId]`).
- **Logout e Troca de Conta**: A função `clearPrivateUserCache()` remove imediatamente do `QueryClient` todas as entradas privadas da sessão anterior e `resetRealtimeStateForSessionChange()` desvincula o socket (`auth:unbind`).
- **Expiração de Sessão e Retomada**: Quando o interceptor Axios detecta `401` em rota autenticada, dispara o evento `kurio:session-expired`, abrindo o modal de login com `returnTo` preenchido com a URL atual e preservando o estado local do formulário de checkout para retomada imediata.
- **Atualização Otimista com Rollback**: Implementada em `useToggleFavoriteMutation` (`src/hooks/useQueries.ts`), atualizando instantaneamente o botão de favorito e a lista de interesse e revertendo para o snapshot anterior (`context.previous`) caso a requisição falhe.


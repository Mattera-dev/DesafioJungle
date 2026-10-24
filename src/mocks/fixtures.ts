import { NFT, User, Wallet } from '@/types/contracts';

export interface MockUserRecord extends User {
  passwordHash: string;
}

export const INITIAL_USERS: MockUserRecord[] = [
  {
    id: 'user-1',
    name: 'Alex Rivera',
    username: 'alexrivera',
    email: 'colecionador@kurio.art',
    passwordHash: 'hashed:Kurio@2026',
    avatar: '/assets/nfts/emerald-ape.png',
    bio: 'Colecionador de arte digital generativa e edições raras na Ethereum.',
    phone: '+55 11 98888-0042',
    profileName: 'Alex.Kurio',
    referralCode: 'KURIO-ALEX42',
    ensName: 'alexrivera',
    ensDomain: '.eth',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Nova Sato',
    username: 'novasato',
    email: 'artista@kurio.art',
    passwordHash: 'hashed:Kurio@2026',
    avatar: '/assets/nfts/ivory-ape.png',
    bio: 'Artista 3D e criadora da coleção Kurio Editions.',
    phone: '+55 11 97777-0088',
    profileName: 'NovaSato.Art',
    referralCode: 'KURIO-NOVA88',
    ensName: 'novasato',
    ensDomain: '.eth',
    createdAt: '2026-02-10T14:30:00.000Z',
  },
];

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'wallet-1',
    userId: 'user-1',
    kind: 'primary',
    displayName: 'Alex Rivera',
    nickname: 'Vault Principal ETH',
    network: 'Ethereum',
    profileName: 'Alex.Kurio',
    address: '0x71C95911E9a5D330f4D621842EC243EE1343292e',
    secondaryAddressOrEns: 'alexrivera.eth',
    walletType: 'Coinbase Wallet',
    referralCode: 'KURIO-ALEX42',
    email: 'colecionador@kurio.art',
    ensDomain: '.eth',
    ensName: 'alexrivera',
    isConnected: true,
    updatedAt: '2026-08-01T12:00:00.000Z',
  },
  {
    id: 'wallet-2',
    userId: 'user-2',
    kind: 'primary',
    displayName: 'Nova Sato',
    nickname: 'Studio Wallet',
    network: 'Ethereum',
    profileName: 'NovaSato.Art',
    address: '0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5',
    secondaryAddressOrEns: 'novasato.eth',
    walletType: 'MetaMask',
    referralCode: 'KURIO-NOVA88',
    email: 'artista@kurio.art',
    ensDomain: '.eth',
    ensName: 'novasato',
    isConnected: true,
    updatedAt: '2026-08-02T12:00:00.000Z',
  },
];

export const COUPONS: Record<
  string,
  { code: string; type: 'percent' | 'fixed'; value: number; expired?: boolean; description: string }
> = {
  KURIO10: {
    code: 'KURIO10',
    type: 'percent',
    value: 10,
    description: '10% de desconto de lançamento',
  },
  GENESIS05: {
    code: 'GENESIS05',
    type: 'fixed',
    value: 0.5,
    description: '0.50 ETH de bônus gênesis',
  },
  EXPIRADO20: {
    code: 'EXPIRADO20',
    type: 'percent',
    value: 20,
    expired: true,
    description: 'Cupom promocional expirado',
  },
};

const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    author: 'Lucas Mendes',
    avatar: '/assets/nfts/purple-ape.png',
    rating: 5,
    comment: 'Acabamento impecável, metadados no IPFS verificados rapidamente e comunidade ativa.',
    date: '12 de outubro de 2026',
  },
  {
    id: 'rev-2',
    author: 'Helena Costa',
    avatar: '/assets/nfts/golden-ape.png',
    rating: 5,
    comment: 'A edição 1/50 veio com acesso ao arquivo em altíssima resolução. Excelente curadoria da Kurio.',
    date: '15 de outubro de 2026',
  },
  {
    id: 'rev-3',
    author: 'Rafael K.',
    avatar: '/assets/nfts/ivory-ape.png',
    rating: 5,
    comment: 'Transação rápida na rede Ethereum e procedência transparente no contrato ERC-721.',
    date: '18 de outubro de 2026',
  },
];

function createEditions(basePrice: string, outOfStockEdition?: '1/1' | '1/10') {
  return [
    {
      type: '1/1' as const,
      priceEth: basePrice,
      available: outOfStockEdition === '1/1' ? 0 : 1,
      total: 1,
    },
    {
      type: '1/10' as const,
      priceEth: basePrice,
      available: outOfStockEdition === '1/10' ? 0 : 6,
      total: 10,
    },
    {
      type: '1/50' as const,
      priceEth: basePrice,
      available: 15,
      total: 50,
    },
    {
      type: 'ABERTA' as const,
      priceEth: basePrice,
      available: 99,
      total: 500,
    },
  ];
}

const CORE_NFTS: NFT[] = [
  {
    id: 'emerald-ape-042',
    name: 'Emerald Ape #042',
    tokenId: '#0042',
    collection: 'Kurio Apes',
    category: 'Arte digital',
    network: 'Ethereum',
    priceEth: '1.19',
    image: '/assets/nfts/emerald-ape.png',
    gallery: [
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
    fullDescription: [
      'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrado na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    networkDetails: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    rating: 5,
    reviewCount: 19,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.19'),
    isNewRelease: true,
    isTrending: true,
    isFeatured: true,
    createdAt: '2026-10-20T18:00:00.000Z',
    version: 1,
  },
  {
    id: 'sage-nomad-009',
    name: 'Sage Nomad #009',
    tokenId: '#0009',
    collection: 'Kurio Apes',
    category: 'Arte 3D',
    network: 'Ethereum',
    priceEth: '1.69',
    image: '/assets/nfts/purple-ape.png',
    gallery: [
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Escultura 3D renderizada com iluminação volumétrica da série Nomad, cunhada na rede Ethereum com garantia de autenticidade.',
    fullDescription: [
      'Sage Nomad #009 combina texturas orgânicas e estética urbana futurista na coleção Kurio Apes. Cada detalhe foi modelado em alta definição e armazenado de forma descentralizada.',
      'Os detentores possuem acesso antecipado aos drops trimestrais do estúdio e direitos de exibição comercial.',
    ],
    networkDetails: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Bucket Hat', 'Moletom Roxo', 'Épico'],
    rating: 5,
    reviewCount: 14,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.69'),
    isNewRelease: true,
    isTrending: true,
    createdAt: '2026-10-19T17:00:00.000Z',
    version: 1,
  },
  {
    id: 'neon-vessel-552',
    name: 'Neon Vessel #552',
    tokenId: '#0552',
    collection: 'Kurio Editions',
    category: 'Generativa',
    network: 'Ethereum',
    priceEth: '1.95',
    originalPriceEth: '2.29',
    image: '/assets/nfts/ivory-ape.png',
    gallery: [
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Edição especial de alfaiataria digital da série Kurio Editions, com paleta marfim e esmeralda verificada on-chain.',
    fullDescription: [
      'Neon Vessel #552 sintetiza elegância clássica e identidade criptográfica. Seus atributos de raridade estão eternizados no bloco de cunhagem.',
      'Inclui pacote de texturas 8K e certificado de procedência assinado pelo criador.',
    ],
    networkDetails: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Blazer Marfim', 'Gola Alta', 'Lendário'],
    rating: 5,
    reviewCount: 27,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.95'),
    isNewRelease: false,
    isTrending: true,
    createdAt: '2026-10-18T16:00:00.000Z',
    version: 1,
  },
  {
    id: 'cosmic-bloom-118',
    name: 'Cosmic Bloom #118',
    tokenId: '#0118',
    collection: 'Kurio Apes',
    category: 'Colecionáveis',
    network: 'Polygon',
    priceEth: '1.29',
    image: '/assets/nfts/purple-ape.png',
    gallery: [
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Colecionável verificado da linha Cosmic Bloom com taxas otimizadas e metadados permanentes.',
    fullDescription: [
      'Cosmic Bloom #118 explora contrastes suaves e expressão minimalista dentro do universo Kurio Apes.',
      'Verificado em contrato auditado com suporte multi-carteira.',
    ],
    networkDetails: 'Cunhado na Polygon com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x8B11...44C2 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Chapéu Urbano', 'Violeta', 'Raro'],
    rating: 5,
    reviewCount: 11,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.29'),
    isNewRelease: true,
    isTrending: false,
    createdAt: '2026-10-17T15:00:00.000Z',
    version: 1,
  },
  {
    id: 'violet-nomad-314',
    name: 'Violet Nomad #314',
    tokenId: '#0314',
    collection: 'Kurio Apes',
    category: 'Arte digital',
    network: 'Ethereum',
    priceEth: '1.39',
    image: '/assets/nfts/purple-ape.png',
    gallery: [
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Obra selecionada da série Nomad com tiragem limitada e acesso ao clube de colecionadores Kurio.',
    fullDescription: [
      'Violet Nomad #314 destaca-se pela harmonia cromática e composição de personagem icônica.',
      'Acompanha arquivo master desbloqueável após confirmação na blockchain.',
    ],
    networkDetails: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Nomad', 'Violeta', 'Edição Curada'],
    rating: 5,
    reviewCount: 22,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.39'),
    isNewRelease: false,
    isTrending: true,
    createdAt: '2026-10-16T14:00:00.000Z',
    version: 1,
  },
  {
    id: 'ivory-baron-088',
    name: 'Ivory Baron #088',
    tokenId: '#0088',
    collection: 'Kurio Apes',
    category: 'Avatares',
    network: 'Ethereum',
    priceEth: '1.79',
    image: '/assets/nfts/ivory-ape.png',
    gallery: [
      '/assets/nfts/ivory-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/golden-ape.png',
    ],
    shortDescription:
      'Retrato nobre da coleção Kurio Apes, combinando estética editorial contemporânea e raridade verificada.',
    fullDescription: [
      'Ivory Baron #088 foi concebido para colecionadores que buscam peças de destaque em galerias digitais.',
      'Inclui direito de voto nas curadorias sazonais da plataforma Kurio.',
    ],
    networkDetails: 'Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Alfaiataria', 'Argola Ouro', 'Ultra Raro'],
    rating: 5,
    reviewCount: 31,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('1.79'),
    isNewRelease: true,
    isTrending: true,
    createdAt: '2026-10-15T13:00:00.000Z',
    version: 1,
  },
  {
    id: 'golden-beat-207',
    name: 'Golden Beat #207',
    tokenId: '#0207',
    collection: 'Kurio Beats',
    category: 'Música',
    network: 'Solana',
    priceEth: '0.99',
    image: '/assets/nfts/golden-ape.png',
    gallery: [
      '/assets/nfts/golden-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/ivory-ape.png',
    ],
    shortDescription:
      'NFT audiovisual com trilha sonora original lossless desbloqueável e arte de capa numerada.',
    fullDescription: [
      'Golden Beat #207 une cultura musical eletrônica e ilustração digital de alta precisão.',
      'Cada edição concede acesso às stems de áudio originais e sessões exclusivas.',
    ],
    networkDetails: 'Cunhado com ponte verificada e metadados permanentes no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x3F19...90A1 - Contrato inteligente verificado.',
    attributes: ['Headphones', 'Dourado', 'Áudio Lossless'],
    rating: 5,
    reviewCount: 16,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('0.99'),
    isNewRelease: true,
    isTrending: false,
    createdAt: '2026-10-14T12:00:00.000Z',
    version: 1,
  },
  {
    id: 'amber-pulse-412',
    name: 'Amber Pulse #412',
    tokenId: '#0412',
    collection: 'Kurio Beats',
    category: 'Fotografia',
    network: 'Polygon',
    priceEth: '0.79',
    image: '/assets/nfts/golden-ape.png',
    gallery: [
      '/assets/nfts/golden-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/ivory-ape.png',
    ],
    shortDescription:
      'Composição luminosa em tons âmbar e verde floresta, parte da seleção especial de outono da Kurio.',
    fullDescription: [
      'Amber Pulse #412 celebra a sinestesia entre som e imagem no ecossistema Web3.',
      'Acompanha certificado digital e acesso à galeria imersiva.',
    ],
    networkDetails: 'Cunhado na Polygon com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x8B11...44C2 - Contrato inteligente ERC-721 verificado.',
    attributes: ['Âmbar', 'Estúdio', 'Verificado'],
    rating: 4,
    reviewCount: 9,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('0.79', '1/1'),
    isNewRelease: false,
    isTrending: false,
    createdAt: '2026-10-13T11:00:00.000Z',
    version: 1,
  },
  {
    id: 'golden-signal-160',
    name: 'Golden Signal #160',
    tokenId: '#0160',
    collection: 'Kurio Editions',
    category: 'Utilidade',
    network: 'Solana',
    priceEth: '0.39',
    image: '/assets/nfts/golden-ape.png',
    gallery: [
      '/assets/nfts/golden-ape.png',
      '/assets/nfts/emerald-ape.png',
      '/assets/nfts/purple-ape.png',
      '/assets/nfts/ivory-ape.png',
    ],
    shortDescription:
      'Passe colecionável de utilidade que garante prioridade na lista de acesso dos próximos lançamentos gênesis.',
    fullDescription: [
      'Golden Signal #160 funciona tanto como obra de arte colecionável quanto como credencial de membro no ecossistema Kurio.',
      'Desbloqueia taxas reduzidas e drops exclusivos para detentores.',
    ],
    networkDetails: 'Cunhado com procedência imutável e metadados armazenados no IPFS.',
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x3F19...90A1 - Contrato inteligente verificado.',
    attributes: ['Passe Genesis', 'Headphones Verde', 'Utilidade'],
    rating: 5,
    reviewCount: 25,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions('0.39'),
    isNewRelease: true,
    isTrending: true,
    createdAt: '2026-10-12T10:00:00.000Z',
    version: 1,
  },
];

const EXTRA_CATEGORIES = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
  'Jogos',
  'Avatares',
  'Utilidade',
] as const;

const EXTRA_NETWORKS = ['Ethereum', 'Polygon', 'Solana'] as const;
const EXTRA_IMAGES = [
  '/assets/nfts/emerald-ape.png',
  '/assets/nfts/purple-ape.png',
  '/assets/nfts/ivory-ape.png',
  '/assets/nfts/golden-ape.png',
];

const GENERATED_NFTS: NFT[] = Array.from({ length: 27 }, (_, idx) => {
  const num = idx + 10;
  const tokenNum = String(200 + idx).padStart(4, '0');
  const category = EXTRA_CATEGORIES[idx % EXTRA_CATEGORIES.length];
  const network = EXTRA_NETWORKS[idx % EXTRA_NETWORKS.length];
  const image = EXTRA_IMAGES[idx % EXTRA_IMAGES.length];
  const priceVal = (0.45 + ((idx * 0.37) % 4.5)).toFixed(2);
  const names = [
    'Obsidian Ape',
    'Solaris Nomad',
    'Velvet Baron',
    'Quantum Beat',
    'Cipher Vessel',
    'Aurora Ape',
    'Zenith Nomad',
    'Mythic Signal',
    'Prismatic Baron',
  ];
  const baseName = names[idx % names.length];

  return {
    id: `kurio-nft-${num}`,
    name: `${baseName} #${200 + idx}`,
    tokenId: `#${tokenNum}`,
    collection: idx % 2 === 0 ? 'Kurio Apes' : 'Kurio Editions',
    category,
    network,
    priceEth: priceVal,
    image,
    gallery: EXTRA_IMAGES,
    shortDescription: `Obra digital certificada da categoria ${category}, cunhada na rede ${network} com tiragem verificada.`,
    fullDescription: [
      `${baseName} #${200 + idx} faz parte do acervo expandido da Kurio, unindo curadoria artística e prova criptográfica de autenticidade.`,
      'Inclui acesso à arte em alta resolução e histórico completo de procedência on-chain.',
    ],
    networkDetails: `Cunhado na ${network} com procedência imutável e metadados armazenados no IPFS.`,
    contractDetails:
      'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
    copyrightDetails: '0x7A42...19E8 - Contrato inteligente ERC-721 verificado.',
    attributes: [category, network, idx % 3 === 0 ? 'Raro' : 'Edição Especial'],
    rating: 4 + (idx % 2),
    reviewCount: 5 + idx,
    reviews: DEFAULT_REVIEWS,
    editions: createEditions(priceVal, idx % 7 === 0 ? '1/1' : undefined),
    isNewRelease: idx % 2 === 0,
    isTrending: idx % 3 === 0,
    createdAt: new Date(Date.now() - (idx + 10) * 86400000).toISOString(),
    version: 1,
  };
});

export const INITIAL_NFTS: NFT[] = [...CORE_NFTS, ...GENERATED_NFTS];


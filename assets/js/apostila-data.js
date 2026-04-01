const orderedSections = [
  {
    id: "ukemi-rolamentos",
    titulo: "UKEMI-WAZA / ROLAMENTOS",
    categoria: "UKEMI-WAZA",
    itens: [
      "Rolamento para frente estático",
      "Rolamento para frente dinâmico",
      "Caída para trás estática em guarda",
      "Rolamento para trás dinâmico",
      "Rolamento Lateral estático",
      "Rolamento Lateral dinâmico",
      "Caída lateral",
      "Postura lateral cócoras",
      "Caída facial à frente",
      "Caída facial para trás",
      "Tábua",
    ],
  },
  {
    id: "ukemi-saltos",
    titulo: "UKEMI-WAZA / SALTOS",
    categoria: "UKEMI-WAZA",
    itens: [
      "Salto para frente em rolamento",
      "Salto sobre um obstáculo vertical em rolamento",
      "Salto sobre um obstáculo horizontal",
      "Cambalhota",
      "Salto sobre uma tábua",
      "Sapo",
      "Gato",
      "Palha de arroz",
    ],
  },
  {
    id: "shimsei-bases",
    titulo: "SHIMSEI / BASES",
    categoria: "SHIMSEI",
    itens: [
      "KO KUTSU - Perna de trás em flexão e a da frente avançada",
      "KIBA TATCHI - A cavalo",
      "FUDO DACHI - Meio passo peso distribuído",
      "HI SOKO - Pés juntos",
      "ZEM KUTSU - Esquerda à frente em flexão",
    ],
  },
  {
    id: "tai-sabaki",
    titulo: "TAI SABAKI / ESQUIVA DO CORPO",
    categoria: "TAI SABAKI",
    itens: [
      "8 MOVIMENTOS SIMPLES",
    ],
  },
  {
    id: "shintai",
    titulo: "SHINTAI / DESLIZAMENTO NA BASE KIBADASHI",
    categoria: "SHINTAI",
    itens: [
      "DESLIZAMENTO COMPLETO",
    ],
  },
  {
    id: "nague-waza",
    titulo: "NAGUE-WAZA / QUEDAS, PROJEÇÕES",
    categoria: "NAGUE-WAZA",
    itens: [
      "Ukiogoshi",
      "Okuri ashi harai",
      "Koshi guruma",
      "Kuchiki taoshi",
      "Sumi otoshi",
      "Uki otoshi",
      "Tomoe nage com um pé",
      "Kami waza (kani bassi) = tesoura",
      "Ippon seoi nage",
      "Seoi nage",
      "Sumi gaeshi com um pé",
      "Tsuri komi goshi",
      "Ogoshi",
      "Tai otoshi",
      "Harai goshi",
      "Uchi mata",
      "Kata guruma",
      "Osoto maki komi",
      "Osoto gari",
      "Sukui nage",
      "Oushi gari",
      "Kosoto gake",
      "Yoko wakare",
      "Hiza guruma",
      "Osoto guruma",
    ],
  },
  {
    id: "contra-ataque-projecoes",
    titulo: "CONTRA ATAQUE DAS PROJEÇÕES ACIMA",
    categoria: "CONTRA ATAQUE",
    itens: [
      "A critério 1",
      "A critério 2",
      "A critério 3",
      "A critério 4",
    ],
  },
  {
    id: "kansetsu-te-waza",
    titulo: "KANSETSU. TE-WAZA / CHAVE DE BRAÇO",
    categoria: "KANSETSU. TE-WAZA",
    itens: [
      "Juji gatame 2 no tate shiho gatame",
      "Juji gatame 3 a partir do joelho na barriga e girando para o lado oposto",
      "Juji gatame no tate shiho gatame nos dois braços",
      "Juji gatame na guarda nos dois braços com trava",
      "Juji gatame na guarda",
      "Juji gatame na guarda nos dois braços",
      "Ude garame 1 no Tate shiho gatame",
      "Ude garame 2 no Yoko shiho gatame",
      "Ude garame 2 na guarda",
      "Ude garame 2 em pé",
      "Ude garame 2 no kami shiho gatame",
      "Juji gatame 1 no tate shiho gatame",
      "Kote gaeshi chave de pulsos para dentro",
      "Kote gaeshi chave de pulso para fora",
      "Kote gaeshi contra a mão na lapela, estando em pé",
      "Kote gaeshi no sankaku",
      "Kote gaeshi na imobilização lateral",
    ],
  },
  {
    id: "shime-waza",
    titulo: "SHIME-WAZA / ESTRANGULAMENTOS",
    categoria: "SHIME-WAZA",
    itens: [
      "Jigoku jime",
      "Hakada jime 4  na guarda",
      "Okuri eri jime pegada pelas costas ajoelhado",
      "Okuri eri jime 2 montado nas costas",
      "Okuri eri jime 3 em relógio",
      "Sode guruma jime na guarda",
      "Estrangulamento com a lapela a partir do Yoko shiho gatame",
      "Contornada no tate shiho gatame",
      "Cruz direta no tate shiho gatame",
      "Sankaku jime 1 (tradicional)",
      "Sankaku jime 2 (invertido)",
      "Sankaku jime 3 (nos quatro apoios)",
      "Hakada jime com pegada pelas costas",
      "Finalização no omoplata",
      "Jiaku Jime no tate shiho gatame",
      "Juji gatame pulando na guarda a critério",
    ],
  },
  {
    id: "katame-passagem",
    titulo: "KATAME-WAZA / PASSAGEM DA GUARDA",
    categoria: "KATAME-WAZA",
    itens: [
      "Pelo meio",
      "Por fora esgrimando as duas pernas",
      "Passagem de guarda em pé",
      "Dinâmica com drill",
      "Lateral",
      "Estrangulamento iniciando em pé",
    ],
  },
  {
    id: "ne-waza-raspagem",
    titulo: "NE-WAZA / RASPAGEM",
    categoria: "NE-WAZA",
    itens: [
      "Raspagem capotagem",
      "Raspagem no omoplata",
      "Raspagem balancinho",
      "Raspagem para +2 pontos",
      "Raspagem tesoura para +4 pontos",
      "Raspagem dinâmica quando em pé",
    ],
  },
  {
    id: "ne-waza-imobilizacoes",
    titulo: "NE-WAZA / IMOBILIZAÇÕES",
    categoria: "NE-WAZA",
    itens: [
      "Yoko shiho gatame",
      "Kami shiho gatame",
      "Ushiro kesa gatame",
      "Tate shiho gatame",
      "Kata gatame",
      "Kesa gatame cabeça baixa",
    ],
  },
  {
    id: "ne-waza-saidas",
    titulo: "NE-WAZA / SAÍDAS DAS IMOBILIZAÇÕES COM FINALIZAÇÃO A CRITÉRIO",
    categoria: "NE-WAZA",
    itens: [
      "Saída Ushiro kesa gatame",
      "Saída Tate shiho gatame",
      "Saída Kata gatame",
      "Saída Kesa gatame cabeça baixa",
      "Saída Yoko shiho gatame",
      "Saída kami shiho gatame",
    ],
  },
  {
    id: "katame-dominios",
    titulo: "KATAME-WAZA / DOMÍNIOS BÁSICOS",
    categoria: "KATAME-WAZA",
    itens: [
      "DOMÍNIO COM O JOELHO NA BARRIGA",
      "DOMÍNIO DOS QUATRO APOIOS A PARTIR DA LATERAL",
    ],
  },
  {
    id: "kansentsu-ashi-chaves",
    titulo: "KANSETSU. ASHI-WAZA / CHAVES DE PERNAS OU NOS PÉS",
    categoria: "KANSETSU. ASHI-WAZA",
    itens: [
      "De pé em uma perna",
      "Sentado, ataque em uma perna",
      "De pé (ataque em uma perna girando e acompanhando o adversário)",
      "Sentado, ataque nas duas pernas do adversário",
    ],
  },
  {
    id: "kansentsu-ashi-defesas",
    titulo: "KANSETSU. ASHI-WAZA / DEFESAS",
    categoria: "KANSETSU. ASHI-WAZA",
    itens: [
      "De pé em uma perna",
      "Sentado, ataque em uma perna",
    ],
  },
  {
    id: "defesa-agarramentos",
    titulo: "DEFESA CONTRA AGARRAMENTOS",
    categoria: "DEFESA CONTRA AGARRAMENTOS",
    itens: [
      "Prisão do tronco pela frente (braços soltos)",
      "Prisão do tronco pela frente (braços presos)",
      "Prisão do tronco por trás (braços presos)",
    ],
  },
  {
    id: "movimento-luta",
    titulo: "MOVIMENTO DA LUTA",
    categoria: "MOVIMENTO DA LUTA",
    itens: [
      "Pular na guarda corretamente",
      "Defesa do bate estaca com os dois braços",
      "Defesa do bate estaca com um braço",
      "Domínio das costas a partir da guarda com o oponente em pé",
      "Domínio das costas quando os dois estão em pé",
    ],
  },
];

function normalizeApostilaItemName(nome) {
  const text = String(nome || "");
  if (!text) {
    return "";
  }

  const firstChar = text.charAt(0);
  const upperFirstChar = firstChar.toLocaleUpperCase("pt-BR");

  if (firstChar === upperFirstChar) {
    return text;
  }

  return `${upperFirstChar}${text.slice(1)}`;
}

export const apostilaSections = orderedSections.map((section, sectionIndex) => {
  const ordemSecao = sectionIndex + 1;

  const itens = section.itens.map((nome, itemIndex) => ({
    id: `${section.id}-${String(itemIndex + 1).padStart(2, "0")}`,
    nome: normalizeApostilaItemName(nome),
    categoria: section.categoria,
    linhaGrupo: section.titulo,
    secaoId: section.id,
    secaoTitulo: section.titulo,
    ordemSecao,
    ordemItem: itemIndex + 1,
    significado: "",
    detalhesExecucao: "",
    pontosDeAtencao: "",
    errosComuns: "",
    observacoesDoProfessor: "",
  }));

  return {
    ...section,
    ordemSecao,
    itens,
  };
});

export const apostilaItems = apostilaSections.flatMap((section) => section.itens);

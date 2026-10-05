/* Monta os endereços do TSE e traduz o JSON para um formato simples.
   O mapa usa só as funções daqui. */

const Tse = {};

/* "1.234,5" vira 1234.5. Número puro passa direto. */
Tse.numero = function (valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (valor == null) return 0;
  let texto = String(valor).trim();
  if (!texto) return 0;
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
};

Tse.comZeros = function (valor, tamanho) {
  return String(valor).padStart(tamanho, "0");
};

Tse.comoLista = function (valor) {
  if (!valor || valor === "") return [];
  return Array.isArray(valor) ? valor : [valor];
};

/* Andamento da contagem. Arquivo pequeno, sem nome de candidato.
   Termina com -ab.json. */
Tse.enderecoAndamento = function (turno, cargo, sigla) {
  const eleicao = Config.codigoEleicao(turno, cargo);
  const eleicao6 = Tse.comZeros(eleicao, 6);
  const pasta = String(sigla || "br").toLowerCase();
  const arquivo = pasta + "-e" + eleicao6 + "-ab.json";
  return Tse._montar(eleicao, "dados", pasta, arquivo, {
    tipo: "andamento",
    cargo: cargo,
    lugar: pasta
  });
};

/* Votos. Termina com -u.json.
   codigoCidade é o código do TSE com 5 dígitos. Vazio = estado ou Brasil. */
Tse.enderecoVotos = function (turno, cargo, sigla, codigoCidade) {
  const eleicao = Config.codigoEleicao(turno, cargo);
  const eleicao6 = Tse.comZeros(eleicao, 6);
  const cargo4 = Tse.comZeros(cargo.cargo, 4);
  const pasta = String(sigla || "br").toLowerCase();
  const lugar = codigoCidade ? pasta + Tse.comZeros(codigoCidade, 5) : pasta;
  const arquivo = lugar + "-c" + cargo4 + "-e" + eleicao6 + "-u.json";
  return Tse._montar(eleicao, "dados", pasta, arquivo, {
    tipo: "votos",
    cargo: cargo,
    lugar: lugar,
    cidade: codigoCidade || ""
  });
};

/* Lista de cidades: código do TSE (5 dígitos) e código do IBGE (7 dígitos).
   Os códigos de cidade não mudam no 2º turno, então a tabela é a do 1º. */
Tse.enderecoCidades = function () {
  const eleicao = 6257;
  const arquivo = "mun-e" + Tse.comZeros(eleicao, 6) + "-cm.json";
  return Tse._montar(eleicao, "config", "", arquivo, { tipo: "cidades" });
};

Tse._montar = function (eleicao, pastaTipo, pastaLugar, arquivo, extra) {
  const pedacos = [Config.origem, Config.ciclo, String(eleicao)];
  const partes = [
    { texto: Config.origem, explicacao: "Site oficial de resultados do TSE" },
    { texto: Config.ciclo, explicacao: "Ciclo: eleições de 2026" },
    { texto: String(eleicao), explicacao: Tse._explicarEleicao(eleicao) }
  ];
  pedacos.push(pastaTipo);
  partes.push({
    texto: pastaTipo,
    explicacao: pastaTipo === "dados" ? "Pasta dos arquivos de apuração" : "Pasta de tabelas auxiliares"
  });
  if (pastaLugar) {
    pedacos.push(pastaLugar);
    partes.push({ texto: pastaLugar, explicacao: Tse._explicarLugar(pastaLugar) });
  }
  pedacos.push(arquivo);
  partes.push({ texto: arquivo, explicacao: Tse._explicarArquivo(arquivo, extra) });
  return {
    url: pedacos.join("/"),
    partes: partes,
    leitura: Tse._leitura(extra, arquivo)
  };
};

Tse._explicarEleicao = function (eleicao) {
  const n = Number(eleicao);
  if (n === 6257) return "Eleição federal do 1º turno (presidente)";
  if (n === 6258) return "Eleição federal do 2º turno (presidente)";
  if (n === 6259) return "Eleição estadual do 1º turno (governador, senador e deputados)";
  if (n === 6260) return "Eleição estadual do 2º turno (governador e senador, onde houver)";
  return "Código da eleição";
};

Tse._explicarLugar = function (pasta) {
  if (pasta === "br") return "Brasil inteiro";
  const uf = Config.ufPorSigla(pasta);
  return uf ? uf.nome + ", em letras minúsculas" : "Sigla do estado, em letras minúsculas";
};

Tse._explicarArquivo = function (arquivo) {
  if (arquivo.endsWith("-ab.json")) {
    return "Andamento: porcentagem de seções já contadas. Não traz candidato.";
  }
  if (arquivo.endsWith("-cm.json")) {
    return "Tabela de cidades, com o código do TSE e o código do IBGE.";
  }
  return "Votos dos candidatos neste lugar. A letra u significa resultado unificado.";
};

Tse._leitura = function (extra, arquivo) {
  if (!extra || extra.tipo === "cidades") {
    return "Tabela oficial com o nome de cada cidade e os dois códigos dela.";
  }
  const cargo = extra.cargo ? extra.cargo.nome : "este cargo";
  if (extra.tipo === "andamento") {
    const onde = extra.lugar === "br" ? "no Brasil" : "neste estado";
    return "Andamento de " + cargo + " " + onde + ". Procure pstn: é a porcentagem de seções já contadas.";
  }
  if (extra.cidade) {
    return "Votos de " + cargo + " nesta cidade. Procure nmu (nome na urna) e vap (votos).";
  }
  const onde = extra.lugar === "br" ? "no Brasil" : "neste estado";
  return "Votos de " + cargo + " " + onde + ". Procure nmu (nome na urna) e vap (votos).";
};

Tse.baixar = async function (endereco) {
  const url = typeof endereco === "string" ? endereco : endereco.url;
  try {
    const resposta = await fetch(url, { cache: "no-cache" });
    if (!resposta.ok) return { ok: false, status: resposta.status, url: url };
    const json = await resposta.json();
    return { ok: true, status: resposta.status, url: url, json: json, idg: json.idg || "" };
  } catch (erro) {
    return { ok: false, status: 0, url: url, erro: erro };
  }
};

/* Guarda a tabela de cidades para não baixar de novo. */
let _tabela = null;
Tse.tabelaDeCidades = function () {
  if (!_tabela) {
    _tabela = Tse.baixar(Tse.enderecoCidades()).then((baixado) => {
      if (!baixado.ok) {
        _tabela = null;
        throw new Error("tabela de cidades indisponível");
      }
      return Tse.lerCidades(baixado.json);
    });
  }
  return _tabela;
};

/* Devolve { ac: { "1200013": { codigo, ibge, nome } } }.
   A chave é o código do IBGE, que é o mesmo do desenho da cidade. */
Tse.lerCidades = function (json) {
  const porUf = {};
  Tse.comoLista(json && json.abr).forEach((uf) => {
    const sigla = String(uf.cd || "").toLowerCase();
    porUf[sigla] = {};
    Tse.comoLista(uf.mu).forEach((cidade) => {
      const ibge = String(cidade.cdi);
      porUf[sigla][ibge] = {
        codigo: String(cidade.cd),
        ibge: ibge,
        nome: cidade.nm || ""
      };
    });
  });
  return porUf;
};

/* O percentual de seções (pstn) de um lugar não mistura com o de outro.
   Brasil lê só a linha br. Estado e cidade leem só o arquivo daquele estado.
   Se o arquivo ainda não é do estado pedido, devolve vazio em vez do número do Brasil. */
Tse.escolherApuracao = function (tipo, fontes, sigla, codigo) {
  const dados = fontes || {};
  if (tipo === "br") {
    const locais = dados.brasil && dados.brasil.locais;
    return (locais && locais.br) || null;
  }
  if (!dados.uf || dados.ufSigla !== sigla) return null;
  const locais = dados.uf.locais || {};
  if (tipo === "uf") return locais[String(sigla || "").toLowerCase()] || null;
  if (tipo === "mun") {
    if (!codigo) return null;
    return locais[String(codigo)] || null;
  }
  return null;
};

/* Locais indexados pelo código que vem em cdabr (br, sp, 01120...). */
Tse.lerAndamento = function (json) {
  const locais = {};
  Tse.comoLista(json && json.abr).forEach((item) => {
    const secoes = item.s || {};
    const eleitores = item.e || {};
    locais[String(item.cdabr)] = {
      tipo: item.tpabr || "",
      codigo: String(item.cdabr),
      pstn: Tse.numero(secoes.pstn),
      secoesContadas: Tse.numero(secoes.st),
      secoesTotal: Tse.numero(secoes.ts),
      eleitoresContados: Tse.numero(eleitores.est),
      eleitoresTotal: Tse.numero(eleitores.te),
      eleitoresPercentual: Tse.numero(eleitores.pestn),
      relogio: [item.dt || "", item.ht || "", secoes.st || "", secoes.pstn || ""].join("|"),
      data: item.dt || "",
      hora: item.ht || ""
    };
  });
  return {
    idg: (json && json.idg) || "",
    data: (json && json.dg) || "",
    hora: (json && json.hg) || "",
    locais: locais
  };
};

Tse.siglasDaColigacao = function (grupo) {
  if (!grupo || grupo.tp !== "c") return [];
  return String(grupo.com || "")
    .split("/")
    .map((parte) => parte.trim())
    .filter(Boolean);
};

Tse.lerCandidatos = function (json) {
  const lista = [];
  const cargos = Tse.comoLista(json && json.carg);
  cargos.forEach((bloco) => {
    Tse.comoLista(bloco.agr).forEach((grupo) => {
      const coligacao = Tse.siglasDaColigacao(grupo);
      Tse.comoLista(grupo.par).forEach((partido) => {
        Tse.comoLista(partido.cand).forEach((cand) => {
          const vice = Tse.comoLista(cand.vs)[0];
          lista.push({
            numero: String(cand.n != null ? cand.n : ""),
            nome: cand.nmu || cand.nm || "Sem nome",
            votos: Tse.numero(cand.vap),
            percentual: Tse.numero(cand.pvapn != null && cand.pvapn !== "" ? cand.pvapn : cand.pvap),
            partido: partido.sg || "",
            coligacao: coligacao,
            vice: vice ? (vice.nmu || vice.nm || "") : ""
          });
        });
      });
    });
  });
  lista.sort((a, b) => b.votos - a.votos || String(a.numero).localeCompare(String(b.numero), "pt-BR"));
  return lista;
};

globalThis.Tse = Tse;

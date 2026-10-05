/* Números oficiais da eleição de 2026.
   Tudo que muda de um turno para o outro fica neste arquivo.
   A página técnica do TSE explica estes códigos:
   https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados */

const Config = {
  origem: "https://resultados.tse.jus.br/oficial",
  ciclo: "ele2026",
  intervaloMs: 20000,
  paginaTecnica: "https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados",
  paginaResultados: "https://resultados.tse.jus.br/oficial/app/index.html",
  catalogo: "https://resultados.tse.jus.br/oficial/comum/config/ele-c.json",

  turnos: {
    "1": { nome: "1º turno", federal: 6257, estadual: 6259 },
    "2": { nome: "2º turno", federal: 6258, estadual: 6260 }
  },

  /* ambito federal = presidente. ambito estadual = os outros cargos.
     cargo é o número que entra no nome do arquivo (0001, 0003...).
     disputa majoritaria pinta o estado pela pessoa que lidera.
     disputa proporcional só pinta o percentual apurado, porque a lista é grande. */
  cargos: [
    { id: "presidente", nome: "Presidente", ambito: "federal", cargo: 1, disputa: "majoritaria" },
    { id: "governador", nome: "Governador", ambito: "estadual", cargo: 3, disputa: "majoritaria" },
    { id: "senador", nome: "Senador", ambito: "estadual", cargo: 5, disputa: "majoritaria" },
    { id: "dep-federal", nome: "Deputado federal", ambito: "estadual", cargo: 6, disputa: "proporcional" },
    { id: "dep-estadual", nome: "Deputado estadual", ambito: "estadual", cargo: 7, disputa: "proporcional", exceto: "DF", lista: 24 },
    { id: "dep-distrital", nome: "Deputado distrital", ambito: "estadual", cargo: 8, disputa: "proporcional", apenas: "DF" }
  ],

  /* Vermelho no mapa: só a sigla do próprio candidato, se estiver nesta lista.
     Azul: qualquer outro partido. A chapa não muda a cor. */
  corVermelho: "#b91c1c",
  corAzul: "#1d4e89",
  partidosEsquerda: [
    { sigla: "PDT", nome: "Partido Democrático Trabalhista", numero: 12 },
    { sigla: "PCDOB", nome: "Partido Comunista do Brasil", numero: 65 },
    { sigla: "PSOL", nome: "Partido Socialismo e Liberdade", numero: 50 },
    { sigla: "PSB", nome: "Partido Socialista Brasileiro", numero: 40 },
    { sigla: "PT", nome: "Partido dos Trabalhadores", numero: 13 },
    { sigla: "PTB", nome: "Partido Trabalhista Brasileiro", numero: 14 },
    { sigla: "PV", nome: "Partido Verde", numero: 43 }
  ],

  /* ibge é o código de 2 dígitos usado no desenho do mapa. */
  estados: [
    { sigla: "AC", nome: "Acre", ibge: "12" },
    { sigla: "AL", nome: "Alagoas", ibge: "27" },
    { sigla: "AP", nome: "Amapá", ibge: "16" },
    { sigla: "AM", nome: "Amazonas", ibge: "13" },
    { sigla: "BA", nome: "Bahia", ibge: "29" },
    { sigla: "CE", nome: "Ceará", ibge: "23" },
    { sigla: "DF", nome: "Distrito Federal", ibge: "53" },
    { sigla: "ES", nome: "Espírito Santo", ibge: "32" },
    { sigla: "GO", nome: "Goiás", ibge: "52" },
    { sigla: "MA", nome: "Maranhão", ibge: "21" },
    { sigla: "MT", nome: "Mato Grosso", ibge: "51" },
    { sigla: "MS", nome: "Mato Grosso do Sul", ibge: "50" },
    { sigla: "MG", nome: "Minas Gerais", ibge: "31" },
    { sigla: "PA", nome: "Pará", ibge: "15" },
    { sigla: "PB", nome: "Paraíba", ibge: "25" },
    { sigla: "PR", nome: "Paraná", ibge: "41" },
    { sigla: "PE", nome: "Pernambuco", ibge: "26" },
    { sigla: "PI", nome: "Piauí", ibge: "22" },
    { sigla: "RJ", nome: "Rio de Janeiro", ibge: "33" },
    { sigla: "RN", nome: "Rio Grande do Norte", ibge: "24" },
    { sigla: "RS", nome: "Rio Grande do Sul", ibge: "43" },
    { sigla: "RO", nome: "Rondônia", ibge: "11" },
    { sigla: "RR", nome: "Roraima", ibge: "14" },
    { sigla: "SC", nome: "Santa Catarina", ibge: "42" },
    { sigla: "SP", nome: "São Paulo", ibge: "35" },
    { sigla: "SE", nome: "Sergipe", ibge: "28" },
    { sigla: "TO", nome: "Tocantins", ibge: "17" }
  ]
};

Config.ufPorSigla = function (sigla) {
  const alvo = String(sigla || "").toUpperCase();
  return Config.estados.find((uf) => uf.sigla === alvo) || null;
};

Config.ufPorIbge = function (codigo) {
  const alvo = String(codigo);
  return Config.estados.find((uf) => uf.ibge === alvo) || null;
};

Config.siglaLimpa = function (sigla) {
  return String(sigla || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

Config.numeroPartido = function (numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return 0;
  if (digitos.length <= 2) return parseInt(digitos, 10) || 0;
  return parseInt(digitos.slice(0, 2), 10) || 0;
};

Config.ehEsquerda = function (sigla, numero) {
  const lista = Config.partidosEsquerda;
  const propria = Config.siglaLimpa(sigla);
  if (propria && lista.some((partido) => partido.sigla === propria)) return true;
  if (!propria) {
    const codigo = Config.numeroPartido(numero);
    return lista.some((partido) => partido.numero === codigo);
  }
  return false;
};

Config.corDoBloco = function (sigla, numero) {
  return Config.ehEsquerda(sigla, numero) ? Config.corVermelho : Config.corAzul;
};

Config.cargoPorId = function (id) {
  return Config.cargos.find((cargo) => cargo.id === id) || Config.cargos[0];
};

Config.cargoExisteNaUf = function (cargo, sigla) {
  if (cargo.apenas && cargo.apenas !== sigla) return false;
  if (cargo.exceto && cargo.exceto === sigla) return false;
  return true;
};

Config.codigoEleicao = function (turno, cargo) {
  const escolhido = Config.turnos[String(turno)] || Config.turnos["1"];
  return escolhido[cargo.ambito];
};

globalThis.Config = Config;

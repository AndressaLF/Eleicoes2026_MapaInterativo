/* Confere os endereços e a leitura do JSON sem abrir o navegador.
   Uso: node tests/verificar.js */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.join(__dirname, "..");
const sandbox = { console, globalThis: null, fetch };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const codigo = ["js/config.js", "js/tse.js"]
  .map((arquivo) => fs.readFileSync(path.join(raiz, arquivo), "utf8"))
  .join("\n");
vm.runInContext(codigo, sandbox);

const Config = sandbox.Config;
const Tse = sandbox.Tse;
let falhas = 0;

function igual(obtido, esperado, nome) {
  if (obtido !== esperado) {
    falhas += 1;
    console.error("FALHOU", nome);
    console.error("  obtido  ", obtido);
    console.error("  esperado", esperado);
  }
}

const presidente = Config.cargoPorId("presidente");
const governador = Config.cargoPorId("governador");

igual(
  Tse.enderecoVotos("1", presidente, "br").url,
  "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json",
  "votos de presidente no Brasil"
);
igual(
  Tse.enderecoAndamento("1", presidente, "br").url,
  "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json",
  "andamento do Brasil"
);
igual(
  Tse.enderecoVotos("1", presidente, "ac", "01120").url,
  "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ac/ac01120-c0001-e006257-u.json",
  "votos de uma cidade"
);
igual(
  Tse.enderecoVotos("1", governador, "sp").url,
  "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/sp/sp-c0003-e006259-u.json",
  "governador de São Paulo"
);
igual(
  Tse.enderecoVotos("2", presidente, "br").url,
  "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json",
  "presidente no 2º turno"
);
igual(
  Tse.enderecoCidades().url,
  "https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json",
  "tabela de cidades"
);

igual(Tse.numero("1.234,5"), 1234.5, "número brasileiro");
igual(Tse.numero("0,00"), 0, "zero com vírgula");
igual(Config.cargoExisteNaUf(Config.cargoPorId("dep-distrital"), "SP"), false, "distrital fora do DF");
igual(Config.cargoExisteNaUf(Config.cargoPorId("dep-estadual"), "DF"), false, "estadual no DF");
igual(Config.ufPorIbge("35").sigla, "SP", "código IBGE de São Paulo");

const andamento = Tse.lerAndamento({
  dg: "04/10/2026",
  hg: "17:10:00",
  idg: "1",
  abr: [{
    tpabr: "uf",
    cdabr: "ac",
    dt: "04/10/2026",
    ht: "17:05:00",
    s: { pstn: "25", st: "10", ts: "40" },
    e: { te: "1000", est: "200", pestn: "20" }
  }]
});
igual(andamento.locais.ac.pstn, 25, "percentual de seções");
igual(andamento.locais.ac.secoesTotal, 40, "total de seções");

const candidatos = Tse.lerCandidatos({
  carg: {
    agr: [{
      par: [{
        sg: "PL",
        cand: [{ n: "22", nmu: "NOME", vap: "10", pvap: "50,00", vs: [{ nmu: "VICE" }] }]
      }]
    }]
  }
});
igual(candidatos.length, 1, "um candidato");
igual(candidatos[0].votos, 10, "votos do candidato");
igual(candidatos[0].vice, "VICE", "vice");

const geo = JSON.parse(fs.readFileSync(path.join(raiz, "data", "brasil-estados.geojson"), "utf8"));
igual(geo.features.length, 27, "27 estados no desenho");
geo.features.forEach((feature) => {
  if (!Config.ufPorIbge(feature.properties.codarea)) {
    falhas += 1;
    console.error("Código do IBGE sem estado:", feature.properties.codarea);
  }
});

const cidades = Tse.lerCidades({
  abr: [{ cd: "ac", mu: [{ cd: "01120", cdi: "1200013", nm: "ACRELANDIA" }] }]
});
igual(cidades.ac["1200013"].codigo, "01120", "liga IBGE ao código do TSE");

if (falhas) {
  console.error(falhas + " verificação(ões) falharam");
  process.exit(1);
}
console.log("Endereços e leitura do JSON conferidos.");

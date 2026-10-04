/* Desenha o Brasil, amplia o estado e repete a leitura a cada 20 segundos.
   O desenho dos estados está em data/brasil-estados.geojson.
   O desenho das cidades é pedido ao IBGE só quando alguém abre o estado. */

const Mapa = {
  folha: null,
  estados: null,
  cidades: null,
  malhas: {},
  vista: "",
  cidadeAtiva: "",
  andamentoBrasil: null,
  andamentoUf: null,
  votos: {},
  seqVista: 0,
  seqDados: 0,
  cidadeToken: 0,
  ocupado: false,
  deNovo: false,
  pausado: false
};

const COR_VAZIA = "#e8dcc4";
const COR_CHEIA = "#0b6b3a";
const PALETA = ["#1d4e89", "#c0392b", "#1e7f4f", "#d97706", "#6d28d9", "#0f766e", "#9f1239", "#365314", "#b45309", "#155e75"];

function iniciarMapa() {
  preencherControles();
  Mapa.folha = L.map("mapa", {
    preferCanvas: true,
    minZoom: 3,
    maxZoom: 16,
    zoomControl: true
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
    maxZoom: 16
  }).addTo(Mapa.folha);

  document.getElementById("cargo").addEventListener("change", aoMudarCargo);
  document.getElementById("turno").addEventListener("change", aoMudarCargo);
  document.getElementById("modo").addEventListener("change", aoMudarModo);
  document.getElementById("estado").addEventListener("change", aoEscolherEstado);
  document.getElementById("voltar").addEventListener("click", voltarAoBrasil);
  document.getElementById("atualizar").addEventListener("click", () => pedirAtualizacao(true));
  document.getElementById("buscar-cidade").addEventListener("change", aoBuscarCidade);
  window.addEventListener("resize", () => Mapa.folha.invalidateSize());
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && Mapa.vista) voltarAoBrasil();
  });

  carregarEstados().then(() => {
    aplicarLink();
    const ufInicial = document.getElementById("estado").value;
    pedirAtualizacao(true);
    if (ufInicial) abrirEstado(ufInicial);
    setInterval(() => pedirAtualizacao(false), Config.intervaloMs);
  }).catch(() => {
    definirStatus("Não consegui carregar o desenho do Brasil.");
  });
}

function preencherControles() {
  const turno = document.getElementById("turno");
  const cargo = document.getElementById("cargo");
  const estado = document.getElementById("estado");
  Object.keys(Config.turnos).forEach((id) => turno.appendChild(opcao(id, Config.turnos[id].nome)));
  Config.cargos.forEach((item) => cargo.appendChild(opcao(item.id, item.nome)));
  Config.estados.forEach((uf) => estado.appendChild(opcao(uf.sigla, uf.nome)));
  ajustarModo();
}

function opcao(valor, rotulo) {
  const item = document.createElement("option");
  item.value = valor;
  item.textContent = rotulo;
  return item;
}

function cargoAtual() {
  return Config.cargoPorId(document.getElementById("cargo").value);
}

function turnoAtual() {
  return document.getElementById("turno").value || "1";
}

function modoAtual() {
  return document.getElementById("modo").value;
}

function ajustarModo() {
  const modo = document.getElementById("modo");
  const majoritario = cargoAtual().disputa === "majoritaria";
  modo.querySelector('option[value="lider"]').disabled = !majoritario;
  if (!majoritario && modo.value === "lider") modo.value = "apuracao";
}

function aplicarLink() {
  const params = new URLSearchParams(location.search);
  if (params.get("turno")) document.getElementById("turno").value = params.get("turno");
  if (params.get("cargo")) document.getElementById("cargo").value = params.get("cargo");
  ajustarModo();
  const uf = (params.get("uf") || "").toUpperCase();
  if (Config.ufPorSigla(uf)) document.getElementById("estado").value = uf;
}

async function carregarEstados() {
  const resposta = await fetch("data/brasil-estados.geojson");
  if (!resposta.ok) throw new Error("geojson");
  const geo = await resposta.json();
  Mapa.estados = L.geoJSON(geo, {
    style: estiloEstado,
    onEachFeature: prepararEstado
  }).addTo(Mapa.folha);
  Mapa.folha.fitBounds(Mapa.estados.getBounds(), { padding: [12, 12] });
}

function prepararEstado(feature, camada) {
  const uf = Config.ufPorIbge(feature.properties.codarea);
  camada.bindTooltip("", { sticky: true });
  camada.on("click", () => {
    if (uf) abrirEstado(uf.sigla);
  });
}

function estiloEstado(feature) {
  const uf = Config.ufPorIbge(feature.properties.codarea);
  const sigla = uf ? uf.sigla : "";
  const cargo = cargoAtual();
  const existe = uf && Config.cargoExisteNaUf(cargo, sigla);
  const aberto = sigla && sigla === Mapa.vista;
  let fill = COR_VAZIA;
  if (existe) {
    const lider = liderDe(sigla);
    if (modoAtual() === "lider" && lider && lider.cor) fill = lider.cor;
    else fill = corApuracao(percentualDe(sigla));
  }
  if (Mapa.vista && !aberto) {
    return { color: "#8a8175", weight: 0.6, fillColor: "#d9d3c7", fillOpacity: 0.25 };
  }
  if (aberto) {
    return { color: "#1c1915", weight: 2.4, fillColor: fill, fillOpacity: 0.12 };
  }
  return { color: "#5c564c", weight: 1, fillColor: fill, fillOpacity: 0.88 };
}

function corApuracao(percentual) {
  return misturar(COR_VAZIA, COR_CHEIA, Math.max(0, Math.min(100, percentual)) / 100);
}

function misturar(origem, destino, t) {
  const a = hex(origem);
  const b = hex(destino);
  const rgb = [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  return "rgb(" + rgb.join(",") + ")";
}

function hex(cor) {
  return [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
}

function corCandidato(numero) {
  const n = Math.abs(parseInt(numero, 10) || 0);
  return PALETA[n % PALETA.length];
}

function percentualDe(sigla) {
  const locais = Mapa.andamentoBrasil && Mapa.andamentoBrasil.locais;
  const item = locais && locais[sigla.toLowerCase()];
  return item ? item.pstn : 0;
}

function liderDe(sigla) {
  return Mapa.votos[chaveVotos(sigla)] || null;
}

function chaveVotos(sigla, codigoCidade) {
  return [turnoAtual(), cargoAtual().id, sigla, codigoCidade || ""].join(":");
}

function pintar() {
  if (!Mapa.estados) return;
  Mapa.estados.eachLayer((camada) => {
    const uf = Config.ufPorIbge(camada.feature.properties.codarea);
    camada.setStyle(estiloEstado(camada.feature));
    if (!uf) return;
    const lider = liderDe(uf.sigla);
    let texto = uf.nome + " · " + formatarPercentual(percentualDe(uf.sigla)) + " das seções";
    if (modoAtual() === "lider" && lider && lider.nome) {
      texto += " · " + lider.nome;
    }
    if (!Config.cargoExisteNaUf(cargoAtual(), uf.sigla)) {
      texto = uf.nome + " · este cargo não concorre aqui";
    }
    camada.setTooltipContent(texto);
  });
  atualizarLegenda();
  if (Mapa.cidades) pintarCidades();
}

function atualizarLegenda() {
  const caixa = document.getElementById("legenda");
  caixa.replaceChildren();
  if (modoAtual() !== "lider") {
    const titulo = document.createElement("strong");
    titulo.textContent = "Seções já contadas";
    const faixa = document.createElement("div");
    faixa.className = "faixa";
    const escala = document.createElement("div");
    escala.className = "escala";
    escala.appendChild(document.createElement("span")).textContent = "0%";
    escala.appendChild(document.createElement("span")).textContent = "100%";
    caixa.append(titulo, faixa, escala);
    return;
  }
  const titulo = document.createElement("strong");
  titulo.textContent = "Quem lidera no estado";
  caixa.appendChild(titulo);
  const vistos = {};
  Config.estados.forEach((uf) => {
    const lider = liderDe(uf.sigla);
    if (!lider || !lider.nome || vistos[lider.numero]) return;
    vistos[lider.numero] = true;
    const linha = document.createElement("div");
    linha.className = "pessoa-legenda";
    const amostra = document.createElement("span");
    amostra.className = "amostra";
    amostra.style.background = lider.cor;
    linha.appendChild(amostra);
    linha.appendChild(document.createTextNode(lider.numero + " " + lider.nome));
    caixa.appendChild(linha);
  });
  if (!caixa.children[1]) {
    const aviso = document.createElement("p");
    aviso.textContent = "Ainda sem votos para definir quem lidera.";
    caixa.appendChild(aviso);
  }
}

function aoMudarCargo() {
  ajustarModo();
  Mapa.andamentoBrasil = null;
  Mapa.andamentoUf = null;
  Mapa.pausado = false;
  pedirAtualizacao(true);
}

function aoMudarModo() {
  if (modoAtual() === "lider") pedirAtualizacao(true);
  else pintar();
}

function aoEscolherEstado() {
  const sigla = document.getElementById("estado").value;
  if (!sigla) voltarAoBrasil();
  else abrirEstado(sigla);
}

function enquadrar(limites, zoomMaximo) {
  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Mapa.folha.flyToBounds(limites, {
    padding: [24, 24],
    maxZoom: zoomMaximo,
    duration: reduzir ? 0 : 0.75
  });
}

async function abrirEstado(sigla) {
  const uf = Config.ufPorSigla(sigla);
  if (!uf) return;
  Mapa.vista = uf.sigla;
  Mapa.cidadeAtiva = "";
  document.getElementById("estado").value = uf.sigla;
  document.getElementById("voltar").disabled = false;
  document.getElementById("caixa-cidade").hidden = false;
  const camada = camadaDoEstado(uf.sigla);
  if (camada) enquadrar(camada.getBounds(), 12);
  pintar();
  definirStatus("Abrindo " + uf.nome + "…");
  const token = ++Mapa.seqVista;
  Mapa.cidadeToken += 1;
  try {
    const malha = await malhaDoEstado(uf);
    if (token !== Mapa.seqVista) return;
    desenharCidades(uf, malha);
    await atualizarEstado(uf);
  } catch (erro) {
    console.warn(erro);
    if (token !== Mapa.seqVista) return;
    definirStatus("O estado foi ampliado. O desenho das cidades não carregou desta vez.");
    try {
      await atualizarEstado(uf);
    } catch (falha) {
      console.warn(falha);
    }
  }
}

function voltarAoBrasil() {
  Mapa.seqVista += 1;
  Mapa.cidadeToken += 1;
  Mapa.vista = "";
  Mapa.cidadeAtiva = "";
  Mapa.andamentoUf = null;
  document.getElementById("estado").value = "";
  document.getElementById("voltar").disabled = true;
  document.getElementById("caixa-cidade").hidden = true;
  document.getElementById("buscar-cidade").value = "";
  if (Mapa.cidades) {
    Mapa.folha.removeLayer(Mapa.cidades);
    Mapa.cidades = null;
  }
  if (Mapa.estados) enquadrar(Mapa.estados.getBounds(), 6);
  pintar();
  mostrarPainelBrasil();
}

function camadaDoEstado(sigla) {
  let achou = null;
  Mapa.estados.eachLayer((camada) => {
    const uf = Config.ufPorIbge(camada.feature.properties.codarea);
    if (uf && uf.sigla === sigla) achou = camada;
  });
  return achou;
}

function malhaDoEstado(uf) {
  if (!Mapa.malhas[uf.ibge]) {
    const url = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/"
      + uf.ibge
      + "?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio";
    Mapa.malhas[uf.ibge] = fetch(url).then((resposta) => {
      if (!resposta.ok) throw new Error("IBGE " + resposta.status);
      return resposta.json();
    }).catch((erro) => {
      delete Mapa.malhas[uf.ibge];
      throw erro;
    });
  }
  return Mapa.malhas[uf.ibge];
}

function desenharCidades(uf, geo) {
  if (Mapa.cidades) Mapa.folha.removeLayer(Mapa.cidades);
  Mapa.cidades = L.geoJSON(geo, {
    style: estiloCidade,
    onEachFeature: (feature, camada) => {
      camada.bindTooltip("", { sticky: true });
      camada.on("click", () => selecionarCidade(uf, feature.properties.codarea, camada));
    }
  }).addTo(Mapa.folha);
  preencherBusca(uf);
  pintarCidades();
}

function cidadePorIbge(uf, ibge) {
  const tabela = Mapa.tabela && Mapa.tabela[uf.sigla.toLowerCase()];
  return tabela ? tabela[String(ibge)] : null;
}

function estiloCidade(feature) {
  const uf = Config.ufPorSigla(Mapa.vista);
  const registro = uf && cidadePorIbge(uf, feature.properties.codarea);
  const ap = registro && Mapa.andamentoUf && Mapa.andamentoUf.locais[registro.codigo];
  const ativa = registro && registro.codigo === Mapa.cidadeAtiva;
  return {
    color: ativa ? "#1c1915" : "#6d655a",
    weight: ativa ? 2.4 : 0.7,
    fillColor: corApuracao(ap ? ap.pstn : 0),
    fillOpacity: 0.78
  };
}

function pintarCidades() {
  if (!Mapa.cidades) return;
  const uf = Config.ufPorSigla(Mapa.vista);
  Mapa.cidades.eachLayer((camada) => {
    camada.setStyle(estiloCidade(camada.feature));
    const registro = uf && cidadePorIbge(uf, camada.feature.properties.codarea);
    const ap = registro && Mapa.andamentoUf && Mapa.andamentoUf.locais[registro.codigo];
    const nome = registro ? nomeBonito(registro.nome) : "Cidade";
    const pct = ap ? formatarPercentual(ap.pstn) : "sem dado";
    camada.setTooltipContent(nome + " · " + pct + " das seções");
  });
}

function preencherBusca(uf) {
  const lista = document.getElementById("lista-cidades");
  lista.replaceChildren();
  const tabela = (Mapa.tabela && Mapa.tabela[uf.sigla.toLowerCase()]) || {};
  Object.values(tabela)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .forEach((cidade) => {
      const item = document.createElement("option");
      item.value = nomeBonito(cidade.nome);
      item.dataset.codigo = cidade.codigo;
      item.dataset.ibge = cidade.ibge;
      lista.appendChild(item);
    });
}

function aoBuscarCidade() {
  const nome = document.getElementById("buscar-cidade").value.trim().toLowerCase();
  const uf = Config.ufPorSigla(Mapa.vista);
  if (!nome || !uf || !Mapa.cidades) return;
  let achou = null;
  Mapa.cidades.eachLayer((camada) => {
    if (achou) return;
    const registro = cidadePorIbge(uf, camada.feature.properties.codarea);
    if (registro && nomeBonito(registro.nome).toLowerCase() === nome) achou = { registro, camada };
  });
  if (achou) selecionarCidade(uf, achou.registro.ibge, achou.camada);
}

async function selecionarCidade(uf, ibge, camada) {
  const registro = cidadePorIbge(uf, ibge);
  if (!registro) return;
  Mapa.cidadeAtiva = registro.codigo;
  pintarCidades();
  enquadrar(camada.getBounds(), 13);
  const ap = Mapa.andamentoUf && Mapa.andamentoUf.locais[registro.codigo];
  desenharPainel({
    titulo: nomeBonito(registro.nome),
    resumo: uf.nome + " · " + cargoAtual().nome,
    apuracao: ap,
    nota: "Lendo os votos desta cidade…",
    arquivo: null,
    candidatos: []
  });
  const token = ++Mapa.cidadeToken;
  const pacote = await votosDe(uf.sigla, registro.codigo, ap && ap.relogio);
  if (token !== Mapa.cidadeToken || Mapa.cidadeAtiva !== registro.codigo) return;
  desenharPainel({
    titulo: nomeBonito(registro.nome),
    resumo: uf.nome + " · " + cargoAtual().nome,
    apuracao: ap,
    nota: pacote.nota,
    arquivo: pacote.arquivo,
    candidatos: pacote.candidatos
  });
}

async function atualizarEstado(uf) {
  const token = Mapa.seqVista;
  if (!Mapa.tabela) Mapa.tabela = await Tse.tabelaDeCidades();
  if (token !== Mapa.seqVista || Mapa.vista !== uf.sigla) return;
  const endereco = Tse.enderecoAndamento(turnoAtual(), cargoAtual(), uf.sigla);
  const baixado = await Tse.baixar(endereco);
  if (token !== Mapa.seqVista || Mapa.vista !== uf.sigla) return;
  if (!baixado.ok) {
    definirStatus(mensagemFalha(baixado, "o estado"));
    return;
  }
  Mapa.andamentoUf = Tse.lerAndamento(baixado.json);
  pintarCidades();
  if (!Mapa.cidadeAtiva) await mostrarPainelUf(uf, token);
}

async function mostrarPainelUf(uf, token) {
  const ap = Mapa.andamentoUf && Mapa.andamentoUf.locais[uf.sigla.toLowerCase()];
  const cargo = cargoAtual();
  if (!Config.cargoExisteNaUf(cargo, uf.sigla)) {
    const texto = cargo.apenas
      ? cargo.nome + " só concorre no Distrito Federal."
      : "No Distrito Federal o cargo equivalente é Deputado distrital.";
    desenharPainel({ titulo: uf.nome, resumo: cargo.nome, apuracao: ap, nota: texto, candidatos: [], arquivo: null });
    definirStatus(uf.nome + " ampliado.");
    return;
  }
  desenharPainel({
    titulo: uf.nome,
    resumo: cargo.nome + " · " + Config.turnos[turnoAtual()].nome,
    apuracao: ap,
    nota: "Lendo os votos do estado…",
    candidatos: [],
    arquivo: null
  });
  const pacote = await votosDe(uf.sigla, "", ap && ap.relogio);
  if (token !== Mapa.seqVista || Mapa.vista !== uf.sigla || Mapa.cidadeAtiva) return;
  desenharPainel({
    titulo: uf.nome,
    resumo: cargo.nome + " · " + Config.turnos[turnoAtual()].nome,
    apuracao: ap,
    nota: pacote.nota,
    arquivo: pacote.arquivo,
    candidatos: pacote.candidatos
  });
  const quando = Mapa.andamentoUf ? Mapa.andamentoUf.data + " " + Mapa.andamentoUf.hora : "";
  definirStatus(uf.nome + " ampliado. Arquivo do TSE: " + (quando.trim() || "sem horário") + ".");
}

async function votosDe(sigla, codigoCidade, relogio) {
  const chave = chaveVotos(sigla, codigoCidade);
  const guardado = Mapa.votos[chave];
  if (guardado && guardado.relogio === (relogio || "") && !guardado.forcar) return guardado;
  const endereco = Tse.enderecoVotos(turnoAtual(), cargoAtual(), sigla, codigoCidade);
  const baixado = await Tse.baixar(endereco);
  if (!baixado.ok) {
    const pacote = {
      relogio: relogio || "",
      candidatos: [],
      nota: baixado.status === 404
        ? "O TSE ainda não publicou os votos deste lugar."
        : "Não consegui ler os votos agora.",
      arquivo: endereco,
      nome: "",
      numero: "",
      cor: ""
    };
    if (baixado.status !== 404) return pacote;
    Mapa.votos[chave] = pacote;
    return pacote;
  }
  const candidatos = Tse.lerCandidatos(baixado.json);
  const primeiro = candidatos.find((c) => c.votos > 0) || null;
  const pacote = {
    relogio: relogio || "",
    candidatos: candidatos,
    nota: notaDosCandidatos(candidatos),
    arquivo: endereco,
    nome: primeiro ? primeiro.nome : "",
    numero: primeiro ? primeiro.numero : "",
    cor: primeiro ? corCandidato(primeiro.numero) : ""
  };
  Mapa.votos[chave] = pacote;
  return pacote;
}

function notaDosCandidatos(candidatos) {
  if (!candidatos.length) return "Este arquivo não trouxe candidatos.";
  const total = candidatos.reduce((soma, c) => soma + c.votos, 0);
  if (total === 0) {
    if (candidatos.length > 20) {
      return "Nenhum voto computado ainda. O arquivo já lista " + candidatos.length + " candidatos.";
    }
    return "Nenhum voto computado ainda. A lista abaixo é a que o TSE já publicou.";
  }
  return "";
}

function pedirAtualizacao(forcar) {
  if (Mapa.ocupado) {
    Mapa.deNovo = true;
    return;
  }
  Mapa.ocupado = true;
  const volta = (async () => {
    do {
      Mapa.deNovo = false;
      await atualizarTudo(forcar);
      forcar = false;
    } while (Mapa.deNovo);
  })();
  volta.finally(() => {
    Mapa.ocupado = false;
  });
}

async function atualizarTudo(forcar) {
  if (!forcar && (document.hidden || Mapa.pausado)) return;
  if (forcar) Mapa.votos = {};
  const seq = ++Mapa.seqDados;
  const cargo = cargoAtual();
  const endereco = Tse.enderecoAndamento(turnoAtual(), cargo, "br");
  const baixado = await Tse.baixar(endereco);
  if (seq !== Mapa.seqDados) return;
  if (!baixado.ok) {
    if (baixado.status === 404) Mapa.pausado = true;
    definirStatus(mensagemFalha(baixado, "o Brasil"));
    return;
  }
  Mapa.pausado = false;
  const novo = Tse.lerAndamento(baixado.json);
  const mudou = !Mapa.andamentoBrasil || Mapa.andamentoBrasil.idg !== novo.idg;
  Mapa.andamentoBrasil = novo;
  pintar();
  if (!Mapa.vista) await mostrarBrasil(cargo, seq);
  else if (mudou || forcar) {
    const uf = Config.ufPorSigla(Mapa.vista);
    if (uf) await atualizarEstado(uf);
  }
  if (modoAtual() === "lider") await buscarLideres(seq);
  if (!Mapa.vista && Mapa.andamentoBrasil) {
    const quando = [Mapa.andamentoBrasil.data, Mapa.andamentoBrasil.hora].filter(Boolean).join(" às ");
    definirStatus("Brasil. Arquivo do TSE gerado em " + (quando || "horário não informado") + ". Nova leitura em 20 segundos.");
  }
}

async function mostrarBrasil(cargo, seq) {
  const ap = Mapa.andamentoBrasil && Mapa.andamentoBrasil.locais.br;
  if (cargo.id !== "presidente") {
    if (seq !== Mapa.seqDados || Mapa.vista) return;
    desenharPainel({
      titulo: "Brasil",
      resumo: cargo.nome + " · " + Config.turnos[turnoAtual()].nome,
      apuracao: ap,
      nota: "Os votos deste cargo são publicados por estado. Clique em um estado para ampliar e ver os candidatos. O eleitor do exterior entra no total do Brasil e não tem estado no mapa.",
      candidatos: [],
      arquivo: Tse.enderecoAndamento(turnoAtual(), cargo, "br")
    });
    return;
  }
  const relogio = ap && ap.relogio;
  const pacote = await votosDe("br", "", relogio);
  if (seq !== Mapa.seqDados || Mapa.vista) return;
  desenharPainel({
    titulo: "Brasil",
    resumo: cargo.nome + " · " + Config.turnos[turnoAtual()].nome,
    apuracao: ap,
    nota: pacote.nota,
    arquivo: pacote.arquivo,
    candidatos: pacote.candidatos
  });
}

async function buscarLideres(seq) {
  const cargo = cargoAtual();
  if (cargo.disputa !== "majoritaria") return;
  const locais = (Mapa.andamentoBrasil && Mapa.andamentoBrasil.locais) || {};
  const fila = Config.estados.filter((uf) => {
    if (!Config.cargoExisteNaUf(cargo, uf.sigla)) return false;
    const ap = locais[uf.sigla.toLowerCase()];
    const guardado = Mapa.votos[chaveVotos(uf.sigla)];
    return !guardado || guardado.relogio !== ((ap && ap.relogio) || "");
  });
  if (!fila.length) {
    pintar();
    return;
  }
  definirStatus("Lendo quem lidera em " + fila.length + " estados…");
  await emFila(fila, 4, async (uf) => {
    if (seq !== Mapa.seqDados || modoAtual() !== "lider") return;
    const ap = locais[uf.sigla.toLowerCase()];
    await votosDe(uf.sigla, "", ap && ap.relogio);
  });
  if (seq === Mapa.seqDados) pintar();
}

async function emFila(itens, limite, tarefa) {
  let indice = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (indice < itens.length) {
      const atual = itens[indice];
      indice += 1;
      await tarefa(atual);
    }
  });
  await Promise.all(trabalhadores);
}

function mostrarPainelBrasil() {
  if (Mapa.andamentoBrasil) mostrarBrasil(cargoAtual(), Mapa.seqDados);
}

function desenharPainel(info) {
  document.getElementById("painel-titulo").textContent = info.titulo;
  document.getElementById("painel-resumo").textContent = info.resumo || "";
  const numeros = document.getElementById("painel-numeros");
  numeros.replaceChildren();
  const ap = info.apuracao;
  if (ap) {
    adicionarNumero(numeros, "Seções contadas", formatarInteiro(ap.secoesContadas) + " de " + formatarInteiro(ap.secoesTotal));
    adicionarNumero(numeros, "Percentual", formatarPercentual(ap.pstn));
    adicionarNumero(numeros, "Eleitores computados", formatarInteiro(ap.eleitoresContados));
    adicionarNumero(numeros, "Eleitores no lugar", formatarInteiro(ap.eleitoresTotal));
  }
  const lista = document.getElementById("painel-candidatos");
  lista.replaceChildren();
  const visiveis = (info.candidatos || []).filter((c) => c.votos > 0).slice(0, 8);
  const mostrarZeros = visiveis.length === 0 && (info.candidatos || []).length <= 20;
  (mostrarZeros ? info.candidatos : visiveis).forEach((c) => lista.appendChild(linhaCandidato(c)));
  document.getElementById("painel-nota").textContent = info.nota || "";
  const link = document.getElementById("painel-arquivo");
  if (info.arquivo && info.arquivo.url) {
    link.hidden = false;
    link.href = info.arquivo.url;
  } else {
    link.hidden = true;
  }
}

function adicionarNumero(lista, rotulo, valor) {
  const bloco = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = rotulo;
  dd.textContent = valor;
  bloco.append(dt, dd);
  lista.appendChild(bloco);
}

function linhaCandidato(c) {
  const item = document.createElement("li");
  const numero = document.createElement("span");
  numero.className = "numero";
  numero.textContent = c.numero;
  const texto = document.createElement("div");
  const nome = document.createElement("strong");
  nome.textContent = c.nome + (c.partido ? " · " + c.partido : "");
  texto.appendChild(nome);
  texto.appendChild(document.createElement("br"));
  texto.appendChild(document.createTextNode(formatarInteiro(c.votos) + " votos · " + formatarPercentual(c.percentual)));
  if (c.vice) {
    const vice = document.createElement("span");
    vice.className = "vice";
    vice.textContent = "Vice: " + c.vice;
    texto.appendChild(vice);
  }
  item.append(numero, texto);
  return item;
}

function mensagemFalha(baixado, lugar) {
  if (baixado.status === 404) {
    return "O TSE ainda não publicou o arquivo de " + lugar + ". A leitura automática foi pausada para não repetir um endereço vazio. Use Atualizar agora para tentar de novo.";
  }
  if (baixado.status === 0) return "Sem conexão com o TSE neste momento.";
  return "O TSE respondeu com o código " + baixado.status + ".";
}

function definirStatus(texto) {
  document.getElementById("status").textContent = texto;
}

function formatarPercentual(valor) {
  return Tse.numero(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

function formatarInteiro(valor) {
  return Tse.numero(valor).toLocaleString("pt-BR");
}

function nomeBonito(nome) {
  return String(nome || "").toLowerCase().replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

document.addEventListener("DOMContentLoaded", iniciarMapa);

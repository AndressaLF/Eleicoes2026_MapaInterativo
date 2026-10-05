"""Painel local da apuração. Mesmas escolhas e a mesma leitura do TSE da página em JavaScript."""

import html
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path

import plotly.graph_objects as go
import streamlit as st

import leitura_tse as tse

RAIZ = Path(__file__).resolve().parents[1]
GEOJSON_ESTADOS = RAIZ / "data" / "brasil-estados.geojson"
PAGINA_TSE = "https://resultados.tse.jus.br/oficial/app/index.html"

st.set_page_config(page_title="Mapa da apuração 2026", layout="wide", initial_sidebar_state="collapsed")


def iniciar_estado():
    padroes = {
        "turno": "1",
        "cargo": "presidente",
        "modo": "Quem lidera no estado",
        "lugar": "",
        "cidade": "",
        "geracao": 0,
        "pausado": False,
    }
    for chave, valor in padroes.items():
        if chave not in st.session_state:
            st.session_state[chave] = valor
    if "lugar_pendente" in st.session_state:
        st.session_state.lugar = st.session_state.pop("lugar_pendente")
        st.session_state.cidade = ""
        st.session_state.pausado = False
    if "cidade_pendente" in st.session_state:
        st.session_state.cidade = st.session_state.pop("cidade_pendente")


def ao_mudar_eleicao():
    st.session_state.pausado = False
    st.session_state.geracao += 1


def ao_mudar_lugar():
    st.session_state.cidade = ""
    st.session_state.pausado = False


def voltar_ao_brasil():
    st.session_state.lugar = ""
    st.session_state.cidade = ""
    st.session_state.pausado = False


def atualizar_agora():
    st.session_state.geracao += 1
    st.session_state.pausado = False
    baixar_json.clear()
    lideres_dos_estados.clear()


def pct(valor):
    texto = f"{tse.numero(valor):,.1f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".") + "%"


def inteiro(valor):
    return f"{int(round(tse.numero(valor))):,}".replace(",", ".")


def misturar(origem, destino, parte):
    parte = max(0.0, min(1.0, parte))

    def pedaco(cor, inicio):
        return int(cor[inicio:inicio + 2], 16)

    rgb = []
    for inicio in (1, 3, 5):
        a = pedaco(origem, inicio)
        b = pedaco(destino, inicio)
        rgb.append(round(a + (b - a) * parte))
    return "rgb(" + ",".join(str(item) for item in rgb) + ")"


def cor_apuracao(percentual):
    return misturar(tse.COR_VAZIA, tse.COR_CHEIA, tse.numero(percentual) / 100)


def mensagem_falha(status, turno):
    if status == 404:
        nome = tse.TURNOS.get(str(turno), {}).get("nome", "turno")
        return (
            "O TSE ainda não publicou o " + nome
            + ". No 1º turno os números já aparecem. "
            + "A leitura automática foi pausada para não repetir um endereço vazio."
        )
    if status == 0:
        return "Sem conexão com o TSE neste momento."
    return "O TSE respondeu com o código " + str(status) + "."


def aviso_cargo(cargo, sigla):
    if tse.cargo_vale_no_lugar(cargo, sigla):
        return ""
    if cargo.get("apenas"):
        return cargo["nome"] + " só concorre no Distrito Federal."
    return "No Distrito Federal o cargo equivalente é Deputado distrital."


def nota_dos_candidatos(candidatos):
    if not candidatos:
        return "Este arquivo não trouxe candidatos."
    if sum(item["votos"] for item in candidatos) == 0:
        if len(candidatos) > 20:
            return "Nenhum voto computado ainda. O arquivo já lista " + str(len(candidatos)) + " candidatos."
        return "Nenhum voto computado ainda. A lista abaixo é a que o TSE já publicou."
    return ""


def candidatos_visiveis(cargo, candidatos):
    limite = cargo.get("lista") or 8
    com_voto = [item for item in candidatos if item["votos"] > 0][:limite]
    if not com_voto and len(candidatos) <= 20:
        return candidatos
    return com_voto


def pacote_de_votos(baixado):
    if not baixado["ok"]:
        texto = "O TSE ainda não publicou os votos deste lugar." if baixado["status"] == 404 else "Não consegui ler os votos agora."
        return {"candidatos": [], "nota": texto, "url": baixado["url"], "nome": "", "numero": "", "cor": ""}
    lido = tse.ler_votos(baixado["json"])
    primeiro = next((item for item in lido["candidatos"] if item["votos"] > 0), None)
    return {
        "candidatos": lido["candidatos"],
        "nota": nota_dos_candidatos(lido["candidatos"]),
        "url": baixado["url"],
        "nome": primeiro["nome"] if primeiro else "",
        "numero": primeiro["numero"] if primeiro else "",
        "cor": tse.cor_do_bloco(primeiro["partido"], primeiro["numero"]) if primeiro else "",
    }


@st.cache_data(ttl=30, show_spinner=False)
def baixar_json(url, _geracao):
    return tse.baixar(url)


@st.cache_data(ttl=6 * 3600, show_spinner=False)
def tabela_cidades():
    baixado = tse.baixar(tse.endereco_cidades())
    if not baixado["ok"]:
        return {}
    return tse.ler_cidades(baixado["json"])


@st.cache_data(show_spinner=False)
def desenho_estados():
    if GEOJSON_ESTADOS.is_file():
        return json.loads(GEOJSON_ESTADOS.read_text(encoding="utf-8"))
    url = (
        "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR"
        "?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF"
    )
    baixado = tse.baixar(url, tempo_limite=40)
    if not baixado["ok"]:
        return None
    return baixado["json"]


@st.cache_data(ttl=180, show_spinner=False)
def lideres_dos_estados(turno, cargo_id, _geracao):
    """Uma leitura dos estados, guardada por 3 minutos. Não repete a cada atualização da tela."""
    cargo = tse.cargo_por_id(cargo_id)
    if cargo.get("disputa") != "majoritaria":
        return {}
    alvos = [uf for uf in tse.ESTADOS if tse.cargo_vale_no_lugar(cargo, uf["sigla"])]

    def um(uf):
        url = tse.endereco_votos(turno, cargo, uf["sigla"], "")
        return uf["sigla"], pacote_de_votos(tse.baixar(url))

    if not alvos:
        return {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        return dict(pool.map(um, alvos))


def _anel_leve(pontos, tolerancia):
    """Reduz os pontos do contorno. A forma do estado continua reconhecível."""
    if len(pontos) >= 2 and pontos[0][0] == pontos[-1][0] and pontos[0][1] == pontos[-1][1]:
        aberto = _anel_leve(pontos[:-1], tolerancia)
        if not aberto or aberto[0][0] != aberto[-1][0] or aberto[0][1] != aberto[-1][1]:
            aberto = aberto + [aberto[0]]
        return aberto
    if len(pontos) < 4:
        return pontos
    inicio, fim = pontos[0], pontos[-1]
    dx = fim[0] - inicio[0]
    dy = fim[1] - inicio[1]
    norma = (dx * dx + dy * dy) ** 0.5 or 1
    maior = 0
    indice = 0
    for i in range(1, len(pontos) - 1):
        px, py = pontos[i][0], pontos[i][1]
        dist = abs(dy * px - dx * py + fim[0] * inicio[1] - fim[1] * inicio[0]) / norma
        if dist > maior:
            maior = dist
            indice = i
    if maior <= tolerancia:
        return [inicio, fim]
    esquerda = _anel_leve(pontos[: indice + 1], tolerancia)
    direita = _anel_leve(pontos[indice:], tolerancia)
    return esquerda[:-1] + direita


def _aneis_da_geometria(geometria):
    tipo = geometria.get("type")
    coords = geometria.get("coordinates") or []
    if tipo == "Polygon":
        return [coords[0]] if coords else []
    if tipo == "MultiPolygon":
        return [poly[0] for poly in coords if poly]
    return []


def codigo_ibge(valor):
    texto = str(valor or "").strip()
    if texto.isdigit():
        return texto.zfill(7)
    return texto


@st.cache_data(ttl=6 * 3600, show_spinner=False)
def contornos_municipios(ibge_uf):
    """Contorno mínimo dos municípios de um estado. O resto do país fica de fora."""
    url = (
        "https://servicodados.ibge.gov.br/api/v3/malhas/estados/"
        + str(ibge_uf)
        + "?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio"
    )
    baixado = tse.baixar(url, tempo_limite=40)
    if not baixado["ok"] or not isinstance(baixado.get("json"), dict):
        return {}
    saida = {}
    for feature in baixado["json"].get("features") or []:
        codigo = codigo_ibge((feature.get("properties") or {}).get("codarea"))
        aneis = []
        for anel in _aneis_da_geometria(feature.get("geometry") or {}):
            if len(anel) >= 3:
                aneis.append(anel)
        if codigo and aneis:
            saida[codigo] = aneis
    return saida


def limites_dos_aneis(aneis, folga=0.12):
    xs = [ponto[0] for anel in aneis for ponto in anel]
    ys = [ponto[1] for anel in aneis for ponto in anel]
    if not xs:
        return None
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    dx = max((xmax - xmin) * folga, 0.02)
    dy = max((ymax - ymin) * folga, 0.02)
    return [xmin - dx, xmax + dx, ymin - dy, ymax + dy]


@st.cache_data(show_spinner=False)
def contornos_leves(tolerancia=0.18):
    """Guarda só o contorno externo de cada estado, com menos pontos."""
    geo = desenho_estados()
    if not geo:
        return {}
    saida = {}
    for feature in geo.get("features") or []:
        codigo = str((feature.get("properties") or {}).get("codarea") or "")
        aneis = []
        for anel in _aneis_da_geometria(feature.get("geometry") or {}):
            leve = _anel_leve(anel, tolerancia)
            if len(leve) >= 3:
                aneis.append(leve)
        if codigo and aneis:
            saida[codigo] = aneis
    return saida


def figura_mapa(contornos, linhas, altura, janela=None, revisao="brasil"):
    if not linhas:
        return None
    fig = go.Figure()
    for linha in linhas:
        xs = []
        ys = []
        for anel in contornos.get(str(linha["codigo_mapa"]), []):
            xs.extend([ponto[0] for ponto in anel])
            ys.extend([ponto[1] for ponto in anel])
            xs.append(anel[0][0])
            ys.append(anel[0][1])
            xs.append(None)
            ys.append(None)
        if not xs:
            continue
        fig.add_trace(go.Scatter(
            x=xs,
            y=ys,
            mode="lines",
            fill="toself",
            fillcolor=linha["cor"],
            line=dict(width=linha.get("espessura", 0.6), color=linha.get("contorno", "#5c564c")),
            hovertext=linha["texto"],
            hoverinfo="text",
            customdata=[linha["chave"]],
            showlegend=False,
        ))
    if janela:
        x0, x1, y0, y1 = janela
    else:
        x0, x1, y0, y1 = -74.2, -32.2, -34.2, 6.2
    fig.update_layout(
        height=altura,
        margin=dict(l=0, r=0, t=0, b=0),
        paper_bgcolor="#f4f0e6",
        plot_bgcolor="#d5e0d8",
        uirevision=revisao,
        xaxis=dict(visible=False, range=[x0, x1], fixedrange=True),
        yaxis=dict(visible=False, range=[y0, y1], scaleanchor="x", scaleratio=1, fixedrange=True),
    )
    return fig


def linhas_do_brasil(andamento, lideres, modo, cargo, sigla_aberta=""):
    locais = (andamento or {}).get("locais") or {}
    linhas = []
    for uf in tse.ESTADOS:
        pstn = (locais.get(uf["sigla"].lower()) or {}).get("pstn", 0)
        existe = tse.cargo_vale_no_lugar(cargo, uf["sigla"])
        lider = lideres.get(uf["sigla"]) if existe else None
        if not existe:
            cor = "#d9d3c7"
            texto = uf["nome"] + " · este cargo não concorre aqui"
        elif modo == "lider":
            cor = lider["cor"] if lider and lider.get("cor") else tse.COR_VAZIA
            texto = uf["nome"] + " · " + pct(pstn) + " das seções"
            if lider and lider.get("nome"):
                texto += " · " + lider["nome"]
        else:
            cor = cor_apuracao(pstn)
            texto = uf["nome"] + " · " + pct(pstn) + " das seções"
        if sigla_aberta and uf["sigla"] != sigla_aberta:
            cor = "#d9d3c7"
        linhas.append({
            "codigo_mapa": uf["ibge"],
            "chave": uf["sigla"],
            "cor": cor,
            "contorno": "#5c564c",
            "espessura": 0.6,
            "texto": texto,
        })
    return linhas


def linhas_municipios(sigla, codigo_cidade, andamento, lideres, modo):
    cidades = tabela_cidades().get(sigla.lower(), [])
    locais = (andamento or {}).get("locais") or {}
    lider = lideres.get(sigla) if modo == "lider" else None
    linhas = []
    for cidade in cidades:
        ativa = cidade["codigo"] == codigo_cidade
        pstn = (locais.get(cidade["codigo"]) or {}).get("pstn", 0)
        if codigo_cidade and not ativa:
            cor = "#d9d3c7"
        elif modo == "lider":
            cor = lider["cor"] if lider and lider.get("cor") else tse.COR_VAZIA
        else:
            cor = cor_apuracao(pstn)
        linhas.append({
            "codigo_mapa": codigo_ibge(cidade.get("ibge")),
            "chave": cidade["codigo"],
            "cor": cor,
            "contorno": "#1c1915" if ativa else "#6d655a",
            "espessura": 2.2 if ativa else 0.4,
            "texto": cidade["nome"] + " · " + pct(pstn) + " das seções",
        })
    return linhas


def html_legenda(modo):
    if modo != "lider":
        return """
        <div class="legenda">
          <strong>Seções já contadas</strong>
          <div class="faixa"></div>
          <div class="escala"><span>0%</span><span>100%</span></div>
        </div>
        """
    return ""


def html_numeros(ap):
    if not ap:
        return ""
    itens = [
        ("Seções contadas", inteiro(ap["secoes_contadas"]) + " de " + inteiro(ap["secoes_total"])),
        ("Percentual", pct(ap["pstn"])),
        ("Eleitores computados", inteiro(ap["eleitores_contados"])),
        ("Eleitores no lugar", inteiro(ap["eleitores_total"])),
    ]
    blocos = ["<dl class='numeros'>"]
    for rotulo, valor in itens:
        blocos.append("<div><dt>" + rotulo + "</dt><dd>" + valor + "</dd></div>")
    blocos.append("</dl>")
    return "".join(blocos)


def html_candidatos(lista):
    if not lista:
        return ""
    blocos = ["<ol class='candidatos'>"]
    for cand in lista:
        cor = tse.cor_do_bloco(cand["partido"], cand["numero"])
        partido = " · " + cand["partido"] if cand["partido"] else ""
        vice = "<span class='vice'>Vice: " + html.escape(cand["vice"]) + "</span>" if cand.get("vice") else ""
        blocos.append(
            "<li><span class='numero' style='background:" + cor + "'>"
            + html.escape(cand["numero"])
            + "</span><div><strong>"
            + html.escape(cand["nome"] + partido)
            + "</strong><br>"
            + html.escape(inteiro(cand["votos"]) + " votos · " + pct(cand["percentual"]))
            + vice
            + "</div></li>"
        )
    blocos.append("</ol>")
    return "".join(blocos)


def aplicar_visual():
    st.markdown(
        """
        <style>
        .stApp { background: #f4f0e6; color: #1d1a16; }
        .olho { margin: 0; color: #0e4d32; font-size: 0.75rem; font-weight: 700;
                letter-spacing: 0.04em; text-transform: uppercase; }
        .painel { background: #fffdf8; border: 1px solid #ddd4c4; border-radius: 14px;
                  padding: 14px; max-height: 78vh; overflow: auto; }
        .painel h2 { margin: 8px 0 4px; font-size: 1.25rem; }
        .resumo, .nota { margin: 0 0 8px; color: #4e483f; }
        .numeros { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 12px; }
        .numeros div { background: #f7f3ea; border-radius: 8px; padding: 8px; }
        .numeros dt { font-size: 0.75rem; color: #645d53; }
        .numeros dd { margin: 2px 0 0; font-weight: 700; }
        .candidatos { list-style: none; margin: 0; padding: 0; }
        .candidatos li { display: grid; grid-template-columns: auto 1fr; gap: 8px;
                         padding: 8px 0; border-top: 1px solid #ddd4c4; }
        .numero { display: inline-block; min-width: 2.4rem; text-align: center; color: white;
                  border-radius: 6px; padding: 2px 4px; font-size: 0.82rem; }
        .vice { display: block; color: #645d53; font-size: 0.85rem; }
        .legenda p, .escala { color: #534d44; font-size: 0.85rem; }
        .faixa { height: 12px; border-radius: 999px; margin: 6px 0;
                 background: linear-gradient(90deg, #e8dcc4, #0b6b3a); }
        .escala { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
        .status { text-align: right; color: #1d1a16; }
        a.arquivo { color: #0e4d32; }
        [data-testid="stSelectbox"] [data-baseweb="select"] > div {
          background-color: #ffffff !important;
        }
        [data-baseweb="menu"],
        [data-baseweb="popover"] [role="listbox"] {
          background-color: #ffffff !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def ler_lugar(turno, cargo, sigla, codigo, geracao):
    url_brasil = tse.endereco_andamento(turno, cargo, "br")
    brasil = baixar_json(url_brasil, geracao)
    if not brasil["ok"]:
        return {"ok": False, "status": brasil["status"], "url": url_brasil}
    andamento_brasil = tse.ler_andamento(brasil["json"])
    andamento_uf = None
    if sigla:
        url_uf = tse.endereco_andamento(turno, cargo, sigla)
        uf = baixar_json(url_uf, geracao)
        if not uf["ok"]:
            return {"ok": False, "status": uf["status"], "url": url_uf, "andamento_brasil": andamento_brasil}
        andamento_uf = tse.ler_andamento(uf["json"])
    if not sigla:
        ap = tse.apuracao_do_lugar(andamento_brasil, "", "")
    elif codigo:
        ap = tse.apuracao_do_lugar(andamento_uf, sigla, codigo)
    else:
        ap = tse.apuracao_do_lugar(andamento_uf, sigla, "")
    return {
        "ok": True,
        "andamento_brasil": andamento_brasil,
        "andamento_uf": andamento_uf,
        "apuracao": ap,
        "url_andamento": url_uf if sigla else url_brasil,
    }


def ler_votos_do_painel(turno, cargo, sigla, codigo, geracao):
    if not sigla and cargo["id"] != "presidente":
        return {
            "candidatos": [],
            "nota": (
                "Os votos deste cargo são publicados por estado. "
                "Clique em um estado para ampliar e ver os candidatos. "
                "O eleitor do exterior entra no total do Brasil e não tem estado no mapa."
            ),
            "url": tse.endereco_andamento(turno, cargo, "br"),
            "nome": "",
            "cor": "",
        }
    lugar = sigla or "br"
    url = tse.endereco_votos(turno, cargo, lugar, codigo)
    return pacote_de_votos(baixar_json(url, geracao))


def desenhar_controles():
    cargo = tse.cargo_por_id(st.session_state.cargo)
    opcoes_modo = ["Quem lidera no estado", "Percentual apurado"]
    if cargo.get("disputa") != "majoritaria":
        opcoes_modo = ["Percentual apurado"]
        st.session_state.modo = "Percentual apurado"
    lugares = [""] + [uf["sigla"] for uf in tse.ESTADOS]
    nomes = {"": "Brasil", **{uf["sigla"]: uf["nome"] for uf in tse.ESTADOS}}
    c1, c2, c3, c4, c5, c6 = st.columns([1, 1.3, 1.5, 1.3, 1, 1.1])
    with c1:
        st.selectbox("Turno", list(tse.TURNOS), format_func=lambda item: tse.TURNOS[item]["nome"], key="turno", on_change=ao_mudar_eleicao)
    with c2:
        st.selectbox("Cargo", [item["id"] for item in tse.CARGOS], format_func=lambda item: tse.cargo_por_id(item)["nome"], key="cargo", on_change=ao_mudar_eleicao)
    with c3:
        st.selectbox("Colorir por", opcoes_modo, key="modo")
    with c4:
        st.selectbox("Ir para", lugares, format_func=lambda item: nomes[item], key="lugar", on_change=ao_mudar_lugar)
    with c5:
        st.button("Ver o Brasil", disabled=not st.session_state.lugar, on_click=voltar_ao_brasil)
    with c6:
        st.button("Atualizar agora", on_click=atualizar_agora)


def chave_do_ponto(ponto):
    bruto = ponto.get("customdata")
    if isinstance(bruto, (list, tuple)) and bruto:
        return str(bruto[0])
    if isinstance(bruto, str):
        return bruto
    return ""


@st.fragment(run_every=timedelta(seconds=30))
def tela(turno, cargo_id, modo, sigla, codigo_cidade, geracao):
    turno = st.session_state.turno
    cargo_id = st.session_state.cargo
    modo = st.session_state.modo
    sigla = st.session_state.lugar
    codigo_cidade = st.session_state.cidade
    geracao = st.session_state.geracao
    cargo = tse.cargo_por_id(cargo_id)
    modo_interno = "lider" if modo == "Quem lidera no estado" and cargo.get("disputa") == "majoritaria" else "apuracao"
    if st.session_state.pausado and geracao == st.session_state.get("geracao_pausa"):
        with st.container():
            st.markdown("<p class='status'>" + html.escape(st.session_state.get("texto_pausa", "")) + "</p>", unsafe_allow_html=True)
        return
    with st.spinner("Lendo o arquivo do TSE…"):
        lugar = ler_lugar(turno, cargo, sigla, codigo_cidade, geracao)
    if not lugar["ok"]:
        texto = mensagem_falha(lugar["status"], turno)
        st.session_state.pausado = lugar["status"] == 404
        st.session_state.geracao_pausa = geracao
        st.session_state.texto_pausa = texto
        titulo = tse.ESTADO_POR_SIGLA[sigla]["nome"] if sigla in tse.ESTADO_POR_SIGLA else "Brasil"
        escrever_painel(titulo, cargo["nome"] + " · " + tse.TURNOS[turno]["nome"], None, texto, [], "", modo_interno)
        return
    st.session_state.pausado = False
    lideres = {}
    if modo_interno == "lider":
        chave_lider = turno + "|" + cargo_id + "|" + str(geracao)
        if st.session_state.get("chave_lider") != chave_lider:
            with st.spinner("Lendo quem lidera nos estados…"):
                lideres = lideres_dos_estados(turno, cargo_id, geracao)
            st.session_state.pacote_lideres = lideres
            st.session_state.chave_lider = chave_lider
        else:
            lideres = st.session_state.get("pacote_lideres") or {}
    aviso = aviso_cargo(cargo, sigla)
    votos = {"candidatos": [], "nota": aviso, "url": ""}
    if not aviso:
        votos = ler_votos_do_painel(turno, cargo, sigla, codigo_cidade, geracao)
    if sigla and codigo_cidade:
        cidades = tabela_cidades().get(sigla.lower(), [])
        registro = next((item for item in cidades if item["codigo"] == codigo_cidade), None)
        titulo = registro["nome"] if registro else codigo_cidade
        resumo = tse.ESTADO_POR_SIGLA[sigla]["nome"] + " · " + cargo["nome"]
    elif sigla:
        titulo = tse.ESTADO_POR_SIGLA[sigla]["nome"]
        resumo = cargo["nome"] + " · " + tse.TURNOS[turno]["nome"]
    else:
        titulo = "Brasil"
        resumo = cargo["nome"] + " · " + tse.TURNOS[turno]["nome"]
    quando = ""
    base = lugar["andamento_uf"] if sigla else lugar["andamento_brasil"]
    if base:
        quando = " ".join(parte for parte in (base.get("data"), base.get("hora")) if parte)
    if sigla:
        status = titulo + " ampliado. Arquivo do TSE: " + (quando or "sem horário") + "."
    else:
        status = "Brasil. Arquivo do TSE gerado em " + (quando.replace(" ", " às ", 1) if quando else "horário não informado") + ". Nova leitura do lugar em 30 segundos."
    mapa, painel = st.columns([2.15, 1], gap="small")
    with mapa:
        desenhar_mapa(lugar, lideres, modo_interno, cargo, sigla)
    with painel:
        escrever_painel(titulo, resumo, lugar["apuracao"], votos.get("nota", ""), votos.get("candidatos", []), votos.get("url", ""), modo_interno, cargo)
    st.caption(status)


def ler_clique(evento):
    pontos = getattr(getattr(evento, "selection", None), "points", None) if evento is not None else None
    if pontos is None and isinstance(getattr(evento, "selection", None), dict):
        pontos = evento.selection.get("points")
    if not pontos:
        return ""
    return chave_do_ponto(pontos[0])


def mostrar_figura(fig):
    return st.plotly_chart(
        fig,
        width="stretch",
        on_select="rerun",
        key="mapa-brasil",
        config={"displayModeBar": False, "responsive": True},
    )


def desenhar_mapa(lugar, lideres, modo, cargo, sigla):
    codigo_cidade = st.session_state.cidade if sigla else ""
    if sigla and sigla in tse.ESTADO_POR_SIGLA:
        with st.spinner("Abrindo os municípios…"):
            contornos = contornos_municipios(tse.ESTADO_POR_SIGLA[sigla]["ibge"])
        if contornos:
            linhas = linhas_municipios(sigla, codigo_cidade, lugar.get("andamento_uf"), lideres, modo)
            registro = next((item for item in tabela_cidades().get(sigla.lower(), []) if item["codigo"] == codigo_cidade), None)
            aneis_cidade = contornos.get(codigo_ibge(registro.get("ibge"))) if registro else None
            if aneis_cidade:
                janela = limites_dos_aneis(aneis_cidade)
            else:
                janela = limites_dos_aneis([anel for lista in contornos.values() for anel in lista], folga=0.04)
                if codigo_cidade:
                    st.caption("O contorno desta cidade não veio do IBGE. O mapa mostra o estado inteiro.")
            fig = figura_mapa(contornos, linhas, 640, janela, sigla + "-" + codigo_cidade)
            chave = ler_clique(mostrar_figura(fig))
            if chave.isdigit() and chave != st.session_state.cidade:
                st.session_state.cidade_pendente = chave
                st.rerun()
            return
        st.caption("O desenho dos municípios não carregou. O mapa mostra o estado.")
    contornos = contornos_leves()
    if not contornos:
        st.error("Não consegui carregar o desenho do Brasil.")
        return
    linhas = linhas_do_brasil(lugar.get("andamento_brasil"), lideres, modo, cargo, sigla)
    janela = None
    if sigla and sigla in tse.ESTADO_POR_SIGLA:
        aneis = contornos.get(tse.ESTADO_POR_SIGLA[sigla]["ibge"], [])
        janela = limites_dos_aneis(aneis, folga=0.08)
    fig = figura_mapa(contornos, linhas, 640, janela, sigla or "brasil")
    chave = ler_clique(mostrar_figura(fig))
    if chave in tse.ESTADO_POR_SIGLA and chave != st.session_state.lugar:
        st.session_state.lugar_pendente = chave
        st.rerun()


def escrever_painel(titulo, resumo, apuracao, nota, candidatos, url, modo, cargo=None):
    cargo = cargo or tse.cargo_por_id(st.session_state.cargo)
    lista = candidatos_visiveis(cargo, candidatos) if candidatos else []
    link = ""
    if url:
        link = "<p><a class='arquivo' href='" + html.escape(url) + "' target='_blank' rel='noopener'>Abrir o arquivo original do TSE</a></p>"
    st.markdown(
        "<div class='painel'>"
        + html_legenda(modo)
        + "<h2>" + html.escape(titulo) + "</h2>"
        + "</div>",
        unsafe_allow_html=True,
    )
    if st.session_state.lugar:
        cidades = tabela_cidades().get(st.session_state.lugar.lower(), [])
        opcoes = [""] + [item["codigo"] for item in cidades]
        rotulos = {"": "O estado inteiro"}
        rotulos.update({item["codigo"]: item["nome"] for item in cidades})
        if st.session_state.cidade not in rotulos:
            st.session_state.cidade = ""
        st.selectbox(
            "Buscar cidade neste estado",
            opcoes,
            format_func=lambda item: rotulos.get(item, item),
            key="cidade",
        )
        if not cidades:
            st.caption("A lista de cidades deste estado ainda não chegou.")
    st.markdown(
        "<div class='painel'>"
        + "<p class='resumo'>" + html.escape(resumo) + "</p>"
        + html_numeros(apuracao)
        + "</div>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div class='painel'>"
        + html_candidatos(lista)
        + ("<p class='nota'>" + html.escape(nota) + "</p>" if nota else "")
        + link
        + "</div>",
        unsafe_allow_html=True,
    )


def main():
    iniciar_estado()
    aplicar_visual()
    esquerda, direita = st.columns([3, 1.2])
    with esquerda:
        st.markdown("<p class='olho'>Eleições 2026 · TSE</p>", unsafe_allow_html=True)
        st.markdown("# Mapa da apuração")
    with direita:
        st.markdown("<p class='status'>Os dados são recarregados a cada 30 segundos.</p>", unsafe_allow_html=True)
    desenhar_controles()
    st.caption("Clique num estado para abrir os municípios. A cidade escolhida aproxima o mapa. O botão Ver o Brasil volta ao país.")
    cargo = tse.cargo_por_id(st.session_state.cargo)
    if cargo.get("disputa") != "majoritaria":
        st.caption("Deputado federal, estadual e distrital colorem o mapa pelo percentual de seções. Os nomes aparecem ao abrir o estado.")
    tela(
        st.session_state.turno,
        st.session_state.cargo,
        st.session_state.modo,
        st.session_state.lugar,
        st.session_state.cidade,
        st.session_state.geracao,
    )
    st.caption("Números: Tribunal Superior Eleitoral. Desenho dos estados: IBGE, em data/brasil-estados.geojson. [Ver a apuração no site do TSE](%s)." % PAGINA_TSE)


main()

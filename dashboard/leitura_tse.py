"""Monta os endereços do TSE e traduz o JSON para números simples.

O painel em app.py só usa as funções daqui. Os códigos são os mesmos de js/config.js.
"""

import unicodedata

import requests

ORIGEM = "https://resultados.tse.jus.br/oficial"
CICLO = "ele2026"

TURNOS = {
    "1": {"nome": "1º turno", "federal": 6257, "estadual": 6259},
    "2": {"nome": "2º turno", "federal": 6258, "estadual": 6260},
}

CARGOS = [
    {"id": "presidente", "nome": "Presidente", "ambito": "federal", "cargo": 1, "disputa": "majoritaria", "lista": 8},
    {"id": "governador", "nome": "Governador", "ambito": "estadual", "cargo": 3, "disputa": "majoritaria", "lista": 8},
    {"id": "senador", "nome": "Senador", "ambito": "estadual", "cargo": 5, "disputa": "majoritaria", "lista": 8},
    {"id": "dep-federal", "nome": "Deputado federal", "ambito": "estadual", "cargo": 6, "disputa": "proporcional", "lista": 8},
    {"id": "dep-estadual", "nome": "Deputado estadual", "ambito": "estadual", "cargo": 7, "disputa": "proporcional", "exceto": "DF", "lista": 24},
    {"id": "dep-distrital", "nome": "Deputado distrital", "ambito": "estadual", "cargo": 8, "disputa": "proporcional", "apenas": "DF", "lista": 8},
]

COR_VERMELHO = "#b91c1c"
COR_AZUL = "#1d4e89"
COR_VAZIA = "#e8dcc4"
COR_CHEIA = "#0b6b3a"

PARTIDOS_ESQUERDA = [
    {"sigla": "PDT", "nome": "Partido Democrático Trabalhista", "numero": 12},
    {"sigla": "PCDOB", "nome": "Partido Comunista do Brasil", "numero": 65},
    {"sigla": "PSOL", "nome": "Partido Socialismo e Liberdade", "numero": 50},
    {"sigla": "PSB", "nome": "Partido Socialista Brasileiro", "numero": 40},
    {"sigla": "PT", "nome": "Partido dos Trabalhadores", "numero": 13},
    {"sigla": "PTB", "nome": "Partido Trabalhista Brasileiro", "numero": 14},
    {"sigla": "PV", "nome": "Partido Verde", "numero": 43},
]

ESTADOS = [
    {"sigla": "AC", "nome": "Acre", "ibge": "12"},
    {"sigla": "AL", "nome": "Alagoas", "ibge": "27"},
    {"sigla": "AP", "nome": "Amapá", "ibge": "16"},
    {"sigla": "AM", "nome": "Amazonas", "ibge": "13"},
    {"sigla": "BA", "nome": "Bahia", "ibge": "29"},
    {"sigla": "CE", "nome": "Ceará", "ibge": "23"},
    {"sigla": "DF", "nome": "Distrito Federal", "ibge": "53"},
    {"sigla": "ES", "nome": "Espírito Santo", "ibge": "32"},
    {"sigla": "GO", "nome": "Goiás", "ibge": "52"},
    {"sigla": "MA", "nome": "Maranhão", "ibge": "21"},
    {"sigla": "MT", "nome": "Mato Grosso", "ibge": "51"},
    {"sigla": "MS", "nome": "Mato Grosso do Sul", "ibge": "50"},
    {"sigla": "MG", "nome": "Minas Gerais", "ibge": "31"},
    {"sigla": "PA", "nome": "Pará", "ibge": "15"},
    {"sigla": "PB", "nome": "Paraíba", "ibge": "25"},
    {"sigla": "PR", "nome": "Paraná", "ibge": "41"},
    {"sigla": "PE", "nome": "Pernambuco", "ibge": "26"},
    {"sigla": "PI", "nome": "Piauí", "ibge": "22"},
    {"sigla": "RJ", "nome": "Rio de Janeiro", "ibge": "33"},
    {"sigla": "RN", "nome": "Rio Grande do Norte", "ibge": "24"},
    {"sigla": "RS", "nome": "Rio Grande do Sul", "ibge": "43"},
    {"sigla": "RO", "nome": "Rondônia", "ibge": "11"},
    {"sigla": "RR", "nome": "Roraima", "ibge": "14"},
    {"sigla": "SC", "nome": "Santa Catarina", "ibge": "42"},
    {"sigla": "SP", "nome": "São Paulo", "ibge": "35"},
    {"sigla": "SE", "nome": "Sergipe", "ibge": "28"},
    {"sigla": "TO", "nome": "Tocantins", "ibge": "17"},
]

SIGLA_POR_IBGE = {item["ibge"]: item["sigla"] for item in ESTADOS}
ESTADO_POR_SIGLA = {item["sigla"]: item for item in ESTADOS}


def cargo_por_id(identificador):
    for cargo in CARGOS:
        if cargo["id"] == identificador:
            return cargo
    return CARGOS[0]


def cargo_vale_no_lugar(cargo, sigla):
    """Deputado estadual não existe no DF. Deputado distrital só existe no DF."""
    if not sigla:
        return True
    if cargo.get("apenas") and cargo["apenas"] != sigla:
        return False
    if cargo.get("exceto") and cargo["exceto"] == sigla:
        return False
    return True


def codigo_eleicao(turno, cargo):
    escolhido = TURNOS.get(str(turno), TURNOS["1"])
    return escolhido[cargo["ambito"]]


def numero(valor):
    """Converte o texto do TSE. "1.234,5" vira 1234.5."""
    if isinstance(valor, bool):
        return 0.0
    if isinstance(valor, (int, float)):
        return float(valor)
    if valor is None:
        return 0.0
    texto = str(valor).strip()
    if not texto:
        return 0.0
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return 0.0


def como_lista(valor):
    if not valor or valor == "":
        return []
    if isinstance(valor, list):
        return valor
    return [valor]


def com_zeros(valor, tamanho):
    return str(valor).zfill(tamanho)


def codigo_lugar(valor):
    """br e ac ficam letras. Código de cidade ganha zeros até 5 dígitos."""
    texto = str(valor or "").strip()
    if texto.isdigit():
        return texto.zfill(5)
    return texto.lower()


def sigla_limpa(sigla):
    texto = unicodedata.normalize("NFD", str(sigla or ""))
    texto = "".join(letra for letra in texto if unicodedata.category(letra) != "Mn")
    return "".join(letra for letra in texto.upper() if letra.isalnum())


def numero_partido(numero_candidato):
    digitos = "".join(letra for letra in str(numero_candidato or "") if letra.isdigit())
    if not digitos:
        return 0
    if len(digitos) <= 2:
        return int(digitos)
    return int(digitos[:2])


def eh_esquerda(sigla, numero_candidato):
    propria = sigla_limpa(sigla)
    if propria and any(partido["sigla"] == propria for partido in PARTIDOS_ESQUERDA):
        return True
    if not propria:
        codigo = numero_partido(numero_candidato)
        return any(partido["numero"] == codigo for partido in PARTIDOS_ESQUERDA)
    return False


def cor_do_bloco(sigla, numero_candidato):
    return COR_VERMELHO if eh_esquerda(sigla, numero_candidato) else COR_AZUL


def endereco_andamento(turno, cargo, sigla):
    eleicao = codigo_eleicao(turno, cargo)
    pasta = str(sigla or "br").lower()
    arquivo = f"{pasta}-e{com_zeros(eleicao, 6)}-ab.json"
    return _montar(eleicao, "dados", pasta, arquivo)


def endereco_votos(turno, cargo, sigla, codigo_cidade=""):
    eleicao = codigo_eleicao(turno, cargo)
    pasta = str(sigla or "br").lower()
    lugar = pasta + com_zeros(codigo_cidade, 5) if codigo_cidade else pasta
    arquivo = f"{lugar}-c{com_zeros(cargo['cargo'], 4)}-e{com_zeros(eleicao, 6)}-u.json"
    return _montar(eleicao, "dados", pasta, arquivo)


def endereco_cidades():
    eleicao = 6257
    arquivo = f"mun-e{com_zeros(eleicao, 6)}-cm.json"
    return _montar(eleicao, "config", "", arquivo)


def _montar(eleicao, pasta_tipo, pasta_lugar, arquivo):
    pedacos = [ORIGEM, CICLO, str(eleicao), pasta_tipo]
    if pasta_lugar:
        pedacos.append(pasta_lugar)
    pedacos.append(arquivo)
    return "/".join(pedacos)


def baixar(url, tempo_limite=25):
    try:
        resposta = requests.get(
            url,
            timeout=tempo_limite,
            headers={"User-Agent": "painel-apuracao-2026"},
        )
    except requests.RequestException:
        return {"ok": False, "status": 0, "url": url, "json": None}
    if resposta.status_code != 200:
        return {"ok": False, "status": resposta.status_code, "url": url, "json": None}
    try:
        return {"ok": True, "status": 200, "url": url, "json": resposta.json()}
    except ValueError:
        return {"ok": False, "status": 200, "url": url, "json": None}


def ler_andamento(conteudo):
    locais = {}
    for item in como_lista(conteudo.get("abr") if isinstance(conteudo, dict) else None):
        secoes = item.get("s") or {}
        eleitores = item.get("e") or {}
        codigo = codigo_lugar(item.get("cdabr"))
        locais[codigo] = {
            "tipo": item.get("tpabr") or "",
            "codigo": codigo,
            "pstn": numero(secoes.get("pstn")),
            "secoes_contadas": numero(secoes.get("st")),
            "secoes_total": numero(secoes.get("ts")),
            "eleitores_contados": numero(eleitores.get("est")),
            "eleitores_total": numero(eleitores.get("te")),
            "data": item.get("dt") or "",
            "hora": item.get("ht") or "",
            "relogio": "|".join([
                item.get("dt") or "",
                item.get("ht") or "",
                str(secoes.get("st") or ""),
                str(secoes.get("pstn") or ""),
            ]),
        }
    return {
        "data": (conteudo or {}).get("dg") or "",
        "hora": (conteudo or {}).get("hg") or "",
        "locais": locais,
    }


def apuracao_do_lugar(andamento, sigla, codigo_cidade):
    """Devolve só a linha do lugar pedido. Lugar ausente devolve vazio."""
    locais = (andamento or {}).get("locais") or {}
    if not sigla:
        return locais.get("br")
    if codigo_cidade:
        return locais.get(codigo_lugar(codigo_cidade))
    return locais.get(str(sigla).lower())


def ler_cidades(conteudo):
    por_uf = {}
    for uf in como_lista(conteudo.get("abr") if isinstance(conteudo, dict) else None):
        sigla = str(uf.get("cd") or "").lower()
        cidades = []
        for cidade in como_lista(uf.get("mu")):
            cidades.append({
                "codigo": codigo_lugar(cidade.get("cd")),
                "ibge": str(cidade.get("cdi") or ""),
                "nome": nome_bonito(cidade.get("nm") or ""),
            })
        cidades.sort(key=lambda item: item["nome"])
        por_uf[sigla] = cidades
    return por_uf


def ler_votos(conteudo):
    lista = []
    if not isinstance(conteudo, dict):
        conteudo = {}
    for bloco in como_lista(conteudo.get("carg")):
        for grupo in como_lista(bloco.get("agr")):
            for partido in como_lista(grupo.get("par")):
                for cand in como_lista(partido.get("cand")):
                    sigla = partido.get("sg") or ""
                    numero_candidato = str(cand.get("n") if cand.get("n") is not None else "")
                    vice = como_lista(cand.get("vs"))
                    vice_nome = ""
                    if vice:
                        vice_nome = vice[0].get("nmu") or vice[0].get("nm") or ""
                    lista.append({
                        "numero": numero_candidato,
                        "nome": cand.get("nmu") or cand.get("nm") or "Sem nome",
                        "votos": numero(cand.get("vap")),
                        "percentual": numero(
                            cand.get("pvapn") if cand.get("pvapn") not in (None, "") else cand.get("pvap")
                        ),
                        "partido": sigla,
                        "esquerda": eh_esquerda(sigla, numero_candidato),
                        "vice": vice_nome,
                    })
    lista.sort(key=lambda item: (-item["votos"], item["numero"]))
    return {
        "data": conteudo.get("dg") or "",
        "hora": conteudo.get("hg") or "",
        "candidatos": lista,
    }


def nome_bonito(nome):
    texto = str(nome or "").lower()
    return " ".join(parte[:1].upper() + parte[1:] for parte in texto.split())

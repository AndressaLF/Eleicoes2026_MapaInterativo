# Mapa da apuração 2026

Página aberta que desenha o Brasil com os números públicos do TSE. Qualquer pessoa pode abrir, escolher um cargo, clicar num estado e ver a contagem atualizar sozinha.

## Tecnologias utilizadas

Cada ferramenta entra numa parte da página. Nenhuma delas exige cadastro para ver o mapa.

| Tecnologia | O que é, em linguagem comum | Para que entra neste projeto |
|---|---|---|
| HTML | O esqueleto da página: títulos, menus, painel e texto | Organiza o que a pessoa vê e lê |
| CSS | A folha de visual | Define cores, tamanhos e o encaixe do mapa ao lado do painel |
| JavaScript | A linguagem que age dentro do navegador | Monta o endereço do TSE, lê o arquivo e pinta o mapa |
| Leaflet | Biblioteca de mapa pronta | Permite arrastar, aproximar e clicar em estados e cidades |
| GeoJSON | Formato de desenho de fronteiras | Guarda o contorno dos 27 estados em `data/brasil-estados.geojson` |
| IBGE | Instituto que publica os mapas oficiais do Brasil | Fornece o contorno dos estados e, ao abrir um estado, o das cidades |
| TSE (`resultados.tse.jus.br`) | Site oficial da apuração | Entrega os arquivos com seções contadas e votos |
| OpenStreetMap | Mapa de fundo gratuito | Mostra ruas e nomes por baixo das cores da apuração |
| GitHub Pages | Hospedagem gratuita de site estático | Publica a página para qualquer pessoa abrir, sem servidor próprio |
| Python | Linguagem usada só como um servidor local simples | Serve a pasta no seu computador com `python -m http.server` |
| Node.js | Opcional | Roda `node tests/verificar.js` para conferir se os endereços do TSE continuam certos |

O mapa em si é HTML, CSS e JavaScript. O navegador de cada visitante lê o TSE direto. Por isso a página cabe no GitHub Pages: lá não roda Python, e esta página não precisa de um programa no servidor.

## Como ver o mapa e interagir em tempo real

Tempo real, aqui, significa o seguinte: com a página aberta, ela pede de novo o arquivo do TSE a cada 20 segundos. A rede do TSE guarda cada arquivo por cerca de 20 a 60 segundos, então pedir mais rápido não traz voto novo. A faixa de cima mostra a data e a hora gravadas no arquivo.

Há duas formas de abrir.

### No seu computador

O navegador bloqueia a leitura do TSE se você der dois cliques em `index.html`. A pasta precisa ser servida por um endereço `http://`.

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

Para já cair num estado, cargo ou turno:

`http://localhost:8080/?uf=SP&cargo=governador&turno=1`

Cargos aceitos no endereço: `presidente`, `governador`, `senador`, `dep-federal`, `dep-estadual`, `dep-distrital`. Turno: `1` ou `2`.

### Para qualquer pessoa, pelo GitHub Pages

1. Envie esta pasta para um repositório público no GitHub.
2. Em Settings, Pages, escolha a branch principal e a pasta raiz (`/`).
3. O endereço fica `https://seu-usuario.github.io/nome-do-repositorio/`.

Quem abrir esse link vê o mesmo mapa. Cada visitante consulta o TSE do próprio computador. Não há máquina sua no meio.

### O que dá para fazer na tela

- Escolher turno e cargo nos menus de cima.
- Colorir pelo percentual de seções já contadas, do bege ao verde. Em Presidente, Governador e Senador, dá para colorir por quem lidera em cada estado.
- Clicar num estado, ou usar "Ir para", para esse estado ocupar a tela. A roda do mouse e os botões + e − aproximam até as cidades.
- Buscar uma cidade pelo nome, com o estado aberto, para ampliar essa cidade e ver os votos dela.
- Ler o painel ao lado: seções, eleitores e candidatos. O link abre o arquivo original do TSE.
- Voltar ao Brasil com o botão "Ver o Brasil" ou com a tecla Esc.
- Forçar uma leitura imediata com "Atualizar agora". Fora isso, a leitura seguinte acontece sozinha em 20 segundos.
- Descer até "Como usar o mapa" para ler o passo a passo, com um exemplo em cada etapa.

Deputado federal, estadual e distrital ficam só no percentual no mapa do país. A lista desses cargos é grande. Os nomes aparecem quando você abre o estado.

## O que foi feito

Cada etapa abaixo diz o que foi construído e uma situação para você testar. Faça na ordem. Se o resultado bater com o que está em "O que confirma", aquela parte está usável.

Antes de começar, na pasta do projeto, rode `python -m http.server 8080` e abra `http://localhost:8080`. Deixe essa aba aberta. Os links de arquivo podem ser abertos em outra aba.

### Etapa 1. Descobrir os códigos oficiais

O projeto leu a página técnica do TSE e o catálogo `ele-c.json`. No 1º turno, presidente é a eleição `6257`. Governador, senador e deputados são a `6259`. No 2º turno, os códigos são `6258` e `6260`.

**Situação.** Você quer ter certeza de que o mapa não inventou esses números.

**Como testar.** Abra o [ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json) e procure `6257`. Depois abra `js/config.js` no projeto e procure o mesmo número. No mapa, o menu Turno deve mostrar 1º turno e 2º turno, e o menu Cargo deve listar presidente, governador, senador e os três tipos de deputado.

**O que confirma.** O número do site oficial é o mesmo número do arquivo do projeto. Os menus deixam escolher turno e cargo sem a página quebrar.

### Etapa 2. Usar só endereços que o TSE documentou

Foram testados endereços já escritos pelo TSE. Um endereço inventado, repetido muitas vezes, pode fazer o TSE pausar o seu acesso por alguns minutos.

**Situação.** Você quer ver o arquivo cru antes de confiar no desenho do mapa.

**Como testar.** Abra, um de cada vez, o [andamento do Brasil](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json) e os [votos de presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json). Os dois estão na seção de dados, mais abaixo.

**O que confirma.** O navegador mostra um texto com chaves `{ }`, e não uma página de erro. No andamento aparece `pstn`. Nos votos aparece `nmu` ou `vap`.

### Etapa 3. Montar uma página que abre sem servidor próprio

A ferramenta é uma página de HTML, CSS e JavaScript. Ela pode ser publicada no GitHub Pages porque o navegador de quem visita é que lê o TSE.

**Situação.** Você quer saber se a ferramenta abre como um site, e não como um programa que precisa instalar.

**Como testar.** Confira se a pasta tem `index.html`, `css/estilos.css` e a pasta `js/`. Com o endereço `http://localhost:8080` aberto, a tela mostra o título "Mapa da apuração", os menus e um mapa do Brasil. Dê dois cliques em `index.html` só para comparar: o mapa pode aparecer, mas os números do TSE não carregam. Volte para `http://localhost:8080`.

**O que confirma.** Pelo endereço `http://localhost:8080`, mapa e menus aparecem juntos. A faixa de cima deixa de dizer apenas "Carregando" e passa a citar o arquivo do TSE.

### Etapa 4. Guardar o contorno dos estados

O desenho dos 27 estados foi baixado do IBGE e salvo em `data/brasil-estados.geojson`, para o Brasil aparecer logo.

**Situação.** Você quer ver o país inteiro antes de entrar num estado.

**Como testar.** Abra `data/brasil-estados.geojson`. No começo do texto deve aparecer `FeatureCollection`. No mapa, passe o mouse pelos estados.

**O que confirma.** O arquivo abre como texto. No mapa, o Brasil aparece dividido. O nome do estado surge ao passar o mouse, por exemplo São Paulo ou Acre.

### Etapa 5. Pintar o país com o andamento da contagem

O mapa do Brasil usa um arquivo pequeno, o `-ab.json`. A cor vai do bege, quando poucas seções foram contadas, ao verde, quando a contagem está avançada.

**Situação.** Você quer saber se a cor do estado corresponde ao número oficial, e se trocar o cargo troca a consulta.

**Como testar.** Deixe o cargo em Presidente. Olhe a cor dos estados e o painel "Brasil": ele mostra seções contadas e o percentual. Clique em "Abrir o arquivo original do TSE" e confira se o endereço termina em `br-e006257-ab.json`. Troque o cargo para Governador.

**O que confirma.** O link do painel muda e passa a conter `6259`, que é a eleição dos cargos estaduais. O percentual do painel continua legível. Se todas as seções ainda estiverem em zero, o mapa fica bege. Isso também é um resultado válido: o arquivo chegou e a contagem ainda não começou.

### Etapa 6. Ampliar o estado e abrir a cidade

Ao clicar num estado, o mapa ocupa a tela com ele, pede as cidades ao IBGE e o andamento daquele estado ao TSE. Ao clicar numa cidade, pede os votos dela.

**Situação.** Você quer acompanhar um estado de perto e uma cidade pelo nome.

**Como testar.** No menu "Ir para", escolha Acre. Espere as cidades aparecerem. Use a roda do mouse para aproximar e afastar. Na busca, digite Acrelândia e escolha o nome. Leia o painel. Abra o arquivo original. Pressione Esc.

**O que confirma.** O Acre ocupa a tela e as cidades ficam desenhadas. Acrelândia aproxima ainda mais e o painel mostra o nome dela. O arquivo da cidade contém `ac01120` no endereço. Esc devolve o mapa do Brasil inteiro. O botão "Ver o Brasil" faz o mesmo.

### Etapa 7. Atualizar sozinho a cada 20 segundos

A página pede o andamento de novo a cada 20 segundos. Se o TSE ainda não gerou arquivo novo, o desenho permanece. O botão "Atualizar agora" faz uma leitura na hora.

**Situação.** Você deixa a página aberta durante a apuração e quer ver se ela continua consultando sem você clicar o tempo todo.

**Como testar.** Leia a faixa de cima. Espere cerca de 20 segundos sem clicar no mapa. A faixa deve falar de novo em uma leitura. Clique em "Atualizar agora" e observe a faixa mudar na hora. Se quiser ver o pedido saindo do seu computador, aperte F12, abra a aba Rede (Network) e procure um arquivo que termine em `-ab.json`.

**O que confirma.** A faixa cita a data e a hora do arquivo do TSE e avisa a próxima leitura em 20 segundos. "Atualizar agora" responde na hora. Na aba Rede, o arquivo de andamento aparece de novo perto desse intervalo. A página continua possível de usar enquanto isso: dá para mudar o cargo e clicar num estado no meio da espera.

### Etapa 8. Ler o passo a passo da página

A parte de baixo da página explica, em linguagem comum, o que cada controle faz. Cada passo traz um exemplo para repetir na tela.

**Situação.** Uma pessoa que nunca abriu o mapa precisa saber por onde começar, sem ler código.

**Como testar.** Desça até "Como usar o mapa", ou clique em "Como usar" no título. Siga o exemplo do passo 1: 1º turno e Presidente. Depois o do passo 3: clique em São Paulo. Volte com Esc, como o passo 5 descreve.

**O que confirma.** Os nomes do texto são os mesmos da tela: Turno, Cargo, Colorir por, Ir para, Ver o Brasil e Atualizar agora. Dá para repetir os exemplos só com o mouse.

### Etapa 9. Conferir os endereços com um teste automático

O arquivo `tests/verificar.js` repete, em um comando, a checagem dos endereços e da leitura do JSON. Ele pede Node.js instalado. As etapas 1 a 8 já bastam para atestar o uso no navegador. Esta é uma confirmação extra.

**Situação.** Você alterou `js/config.js` ou `js/tse.js` e quer saber se os endereços continuam iguais aos do TSE.

**Como testar.** Na pasta do projeto, rode:

```bash
node tests/verificar.js
```

**O que confirma.** O terminal escreve `Endereços e leitura do JSON conferidos.` Se aparecer `FALHOU`, o endereço montado pelo projeto deixou de bater com o exemplo oficial. As etapas 1 a 8, feitas no navegador, continuam sendo a prova de que a ferramenta está usável para quem acompanha o mapa.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | Página: mapa, painel e o passo a passo de uso |
| `css/estilos.css` | Visual |
| `js/config.js` | Códigos da eleição, cargos e estados |
| `js/tse.js` | Monta o endereço do TSE e lê o JSON |
| `js/mapa.js` | Desenha, amplia e atualiza |
| `data/brasil-estados.geojson` | Contorno dos estados, fonte IBGE |
| `tests/verificar.js` | Conferência dos endereços |

Para conferir os endereços no computador, com Node.js instalado:

```bash
node tests/verificar.js
```

## Dados utilizados e de onde vêm

Esta seção existe para você refazer o projeto do zero. Tudo que o mapa mostra vem de dois lugares públicos: o IBGE desenha o território, e o TSE publica a apuração. Não há base escondida nem arquivo pago.

Um endpoint é só um endereço fixo na internet. Você cola no navegador e recebe um arquivo. O manual oficial de como montar esses endereços da apuração está no Tribunal Superior Eleitoral:

[Informações técnicas sobre a divulgação de resultados](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados)

Os Tribunais Regionais Eleitorais (os TRE de cada estado) organizam a votação local. O texto que ensina a usar os arquivos de votos do país inteiro, com os códigos, os nomes dos arquivos e o limite de consultas, é esse manual do TSE. O mapa pronto do tribunal está em [resultados.tse.jus.br](https://resultados.tse.jus.br/oficial/app/index.html). A página deste projeto só mostra o passo a passo de uso. Os endereços ficam nesta seção, para quem quiser refazer o mapa.

### Contornos do mapa

O desenho das fronteiras não vem do TSE. Vem do IBGE, no formato GeoJSON. GeoJSON é um texto que descreve o contorno de cada lugar.

O Brasil inteiro foi baixado uma vez e guardado em `data/brasil-estados.geojson`. Assim o país aparece mesmo que o IBGE demore. Para baixar de novo, abra este endereço e salve o resultado com esse nome de arquivo:

[Contorno dos 27 estados, qualidade mínima](https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF)

As cidades não ficam guardadas no projeto. Quando você abre um estado, o navegador pede o desenho daquele estado ao IBGE. O número no meio do endereço é o código do IBGE. O Acre é `12`. São Paulo é `35`. A lista completa está em `js/config.js`.

Exemplo, cidades do Acre:

[Contorno dos municípios do Acre](https://servicodados.ibge.gov.br/api/v3/malhas/estados/12?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio)

O fundo com ruas e nomes vem do OpenStreetMap, no endereço `tile.openstreetmap.org`. O navegador busca esses quadradinhos enquanto você arrasta o mapa. Eles não são salvos na pasta e não pedem chave.

### Números da apuração

Os votos e o andamento da contagem vêm do TSE, em arquivos JSON. JSON é um texto organizado com rótulos, por exemplo `pstn` para a porcentagem de seções já contadas.

Há quatro arquivos. Os três primeiros são lidos de novo enquanto a página está aberta. O quarto é uma tabela de apoio.

| O que é | Quando o mapa usa | Exemplo para abrir no navegador |
|---|---|---|
| Catálogo dos códigos da eleição | Uma vez, para saber que presidente é `6257` e os cargos estaduais são `6259` | [ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json) |
| Andamento da contagem, arquivo que termina em `-ab.json` | A cada 20 segundos. Pinta o mapa. Traz seções e eleitores, sem nome de candidato | [Andamento do Brasil, presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json) |
| Votos, arquivo que termina em `-u.json` | Quando você abre o Brasil (presidente), um estado ou uma cidade | [Votos de presidente no Brasil](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json) |
| Tabela de cidades | Na primeira vez que alguém abre um estado. Liga o código de 5 dígitos do TSE ao código de 7 dígitos do IBGE | [mun-e006257-cm.json](https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json) |

O andamento de um estado troca `br` pela sigla minúscula. O Acre fica assim:

[Andamento do Acre, presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ac/ac-e006257-ab.json)

Os votos de uma cidade juntam a sigla com o código de 5 dígitos, inclusive os zeros. Acrelândia é `01120`:

[Votos de presidente em Acrelândia](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ac/ac01120-c0001-e006257-u.json)

Dentro do andamento, procure `pstn` (porcentagem de seções), `dg` e `hg` (data e hora em que o TSE gerou o arquivo). Dentro dos votos, procure `nmu` (nome na urna) e `vap` (votos).

### Como reproduzir

1. Leia o [manual do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados) e abra o [ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json). Confira os códigos `6257`, `6259`, `6258` e `6260`.
2. Baixe o contorno dos estados pelo link do IBGE acima e salve em `data/brasil-estados.geojson`.
3. Abra os dois exemplos de presidente (andamento e votos) e confira se o navegador mostra um texto com chaves `{ }`.
4. Copie esta pasta, ou recrie os arquivos `index.html`, `css/estilos.css` e a pasta `js/`. Os endereços ficam montados em `js/tse.js`. Os códigos ficam em `js/config.js`.
5. Na pasta do projeto, rode `python -m http.server 8080` e abra `http://localhost:8080`.
6. Clique num estado. A página deve pedir as cidades ao IBGE e o andamento daquele estado ao TSE.

Se um endereço estiver errado, o TSE pode pausar o seu acesso por alguns minutos. Use os exemplos desta seção em vez de inventar números.

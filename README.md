# Mapa da apuração das Eleições de 2026

Eu fiz esta ferramenta para poder visualizar a contagem de votos do Brasil durante a apuração das eleições de 2026. A pessoa escolhe o turno e o cargo, vê o país de forma colorida e interativa, podendo até mesmo escolher o estado e a cidade de interesse. Os números saem do site público do TSE e a página os busca automaticamente, a cada 20 segundos. O objetivo é acompanhar a contagem num mapa simples, aberto a qualquer pessoa, sem instalar programa. Na pasta `dashboard` eu também fiz um painel em Python, com as mesmas escolhas da página. Esse painel só funciona no computador em que o programa foi iniciado. O link público abre o mapa.

## Sumário

- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Como ver o mapa e interagir em tempo real](#como-ver-o-mapa-e-interagir-em-tempo-real)
  - [No seu computador](#no-seu-computador)
  - [Para qualquer pessoa, pelo GitHub Pages](#para-qualquer-pessoa-pelo-github-pages)
  - [O que dá para fazer na tela](#o-que-dá-para-fazer-na-tela)
- [Teste geral](#teste-geral)
  - [Conferir o mapa com a página do TSE](#conferir-o-mapa-com-a-página-do-tse)
  - [Ensaio antes da divulgação](#ensaio-antes-da-divulgação)
- [O que eu fiz](#o-que-eu-fiz)
  - [Etapa 1. Descobrir os códigos oficiais](#etapa-1-descobrir-os-códigos-oficiais)
  - [Etapa 2. Usar só endereços que o TSE documentou](#etapa-2-usar-só-endereços-que-o-tse-documentou)
  - [Etapa 3. Montar uma página que abre sem servidor próprio](#etapa-3-montar-uma-página-que-abre-sem-servidor-próprio)
  - [Etapa 4. Guardar o contorno dos estados](#etapa-4-guardar-o-contorno-dos-estados)
  - [Etapa 5. Pintar o país com o andamento da contagem](#etapa-5-pintar-o-país-com-o-andamento-da-contagem)
  - [Etapa 6. Ampliar o estado e filtrar as cidades](#etapa-6-ampliar-o-estado-e-filtrar-as-cidades)
  - [Etapa 7. Atualizar sozinho a cada 20 segundos](#etapa-7-atualizar-sozinho-a-cada-20-segundos)
  - [Etapa 8. Ler o passo a passo da página](#etapa-8-ler-o-passo-a-passo-da-página)
  - [Etapa 9. Conferir os endereços com um teste automático](#etapa-9-conferir-os-endereços-com-um-teste-automático)
  - [Etapa 10. Preparar a página para o GitHub Pages](#etapa-10-preparar-a-página-para-o-github-pages)
- [Arquivos principais](#arquivos-principais)
  - [index.html](#indexhtml-a-página-que-a-pessoa-vê)
  - [css/estilos.css](#cssestiloscss-o-visual)
  - [js/config.js](#jsconfigjs-os-códigos-que-não-mudam-durante-a-apuração)
  - [js/tse.js](#jstsejs-o-endereço-e-a-leitura-dos-números)
  - [js/mapa.js](#jsmapajs-o-desenho-e-a-atualização)
  - [data/brasil-estados.geojson](#databrasil-estadosgeojson-o-contorno-do-país)
  - [tests/verificar.js](#testsverificarjs-a-conferência-automática)
  - [Como um clique percorre os arquivos](#como-um-clique-percorre-os-arquivos)
- [Painel local com Streamlit](#painel-local-com-streamlit)
  - [Como abrir o painel](#como-abrir-o-painel)
  - [O que a tela mostra](#o-que-a-tela-mostra)
  - [O que cada controle faz](#o-que-cada-controle-faz)
  - [De onde vem cada número do painel](#de-onde-vem-cada-número-do-painel)
  - [O que cada arquivo da pasta dashboard faz](#o-que-cada-arquivo-da-pasta-dashboard-faz)
    - [`dashboard/app.py`](#dashboardapppy--a-tela-que-o-streamlit-abre)
    - [`dashboard/leitura_tse.py`](#dashboardleitura_tsepy--os-códigos-e-a-leitura-do-tse)
    - [`dashboard/requirements.txt`](#dashboardrequirementstxt--as-bibliotecas-do-painel)
  - [O caminho de uma escolha](#o-caminho-de-uma-escolha)
- [Dados utilizados e de onde vêm](#dados-utilizados-e-de-onde-vêm)
  - [Contornos do mapa](#contornos-do-mapa)
  - [Números da apuração](#números-da-apuração)
  - [Como reproduzir](#como-reproduzir)

## Tecnologias utilizadas

Eu usei cada ferramenta numa parte da página. Nenhuma delas exige cadastro para ver o mapa.

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
| Python | Linguagem do painel local e também do servidor simples do mapa | No mapa, `python -m http.server` só entrega a pasta ao navegador. No painel, o Python lê o TSE e monta a tela |
| Streamlit | Programa que transforma um arquivo Python numa tela no navegador | Monta os menus, o mapa e o painel de `dashboard/app.py` |
| requests | Biblioteca que pede um endereço na internet e devolve o arquivo | Em `dashboard/leitura_tse.py`, baixa o JSON do TSE |
| Plotly | Biblioteca que desenha gráficos dentro da página | Em `dashboard/app.py`, desenha o contorno colorido dos estados |
| Node.js | Opcional | Roda `node tests/verificar.js` para conferir se os endereços do TSE continuam certos |

Eu montei o mapa em HTML, CSS e JavaScript. O navegador de cada visitante consulta o TSE direto. Por isso a página cabe no GitHub Pages: lá não roda Python, e esta página não precisa de um programa no servidor. O painel da pasta `dashboard` é outra peça. Ele só funciona localmente, no computador em que eu o abro, e lê os mesmos arquivos do TSE. O passo a passo está em [Painel local com Streamlit](#painel-local-com-streamlit).

## Como ver o mapa e interagir em tempo real

Tempo real, aqui, significa o seguinte: com a página aberta, ela pede de novo o arquivo do TSE a cada 20 segundos. A rede do TSE guarda cada arquivo por cerca de 20 a 60 segundos, então pedir mais rápido não traz voto novo. A faixa de cima mostra a data e a hora gravadas no arquivo.

Eu deixo o mapa aberto de duas formas.

### No seu computador

Eu sirvo a pasta por um endereço `http://`. Dois cliques em `index.html` fazem o navegador bloquear a consulta ao TSE.

```bash
python -m http.server 8080
```

Abra `http://localhost:8080`.

Para já cair num estado, cargo ou turno:

`http://localhost:8080/?uf=SP&cargo=governador&turno=1`

Cargos aceitos no endereço: `presidente`, `governador`, `senador`, `dep-federal`, `dep-estadual`, `dep-distrital`. Turno: `1` ou `2`.

### Para qualquer pessoa, pelo GitHub Pages

Os arquivos da página estão no repositório [AndressaLF/Eleicoes2026_MapaInterativo](https://github.com/AndressaLF/Eleicoes2026_MapaInterativo), na branch `main`, pasta raiz. O GitHub Pages publica essa pasta no endereço:

[https://andressalf.github.io/Eleicoes2026_MapaInterativo/](https://andressalf.github.io/Eleicoes2026_MapaInterativo/)

Quem abrir esse link vê o mapa. Cada visitante consulta o TSE do próprio computador. O meu computador não fica no meio.

O painel da pasta `dashboard` fica de fora desse link. Ele só abre no computador da pessoa que ligou o programa, em geral em `http://localhost:8501`.

### O que dá para fazer na tela

- Escolher turno e cargo nos menus de cima.
- Colorir pelo percentual de seções já contadas, do bege ao verde. Em Presidente, Governador e Senador, dá para colorir por quem lidera em cada estado.
- Clicar num estado, ou usar "Ir para", para esse estado ocupar a tela. A roda do mouse e os botões + e − aproximam até as cidades.
- Buscar uma cidade pelo nome, com o estado aberto, para ampliar essa cidade e ver os votos dela.
- Ler o painel ao lado: seções, eleitores e candidatos. O link abre o arquivo original do TSE.
- Voltar ao Brasil com o botão "Ver o Brasil" ou com a tecla Esc.
- Forçar uma leitura imediata com "Atualizar agora". Fora isso, a leitura seguinte acontece sozinha em 20 segundos.
- Descer até "Como usar o mapa" para ler o passo a passo, com um exemplo em cada etapa. Abaixo dos passos, o quadrinho **Documentação no GitHub** abre este arquivo no repositório.

Deputado federal, estadual e distrital ficam só no percentual no mapa do país. A lista desses cargos é grande. Os nomes aparecem quando você abre o estado.

## Teste geral

Este teste confere se o mapa está mostrando a mesma contagem que o TSE publica na hora. As duas telas leem a mesma apuração. O mapa busca de novo a cada 20 segundos. A página do TSE também se atualiza sozinha, no ritmo dela. Por isso a comparação vale quando o turno, o cargo e o lugar são os mesmos nas duas.

A página oficial da contagem é o Portal Resultados:

[Resultados do TSE](https://resultados.tse.jus.br/oficial/app/index.html)

No rodapé do mapa, o link **Ver a apuração no site do TSE** abre esse mesmo endereço.

### Conferir o mapa com a página do TSE

1. Deixe o mapa aberto em `http://localhost:8080`. No menu **Turno**, escolha "1º turno". No menu **Cargo**, escolha "Presidente". No menu **Ir para**, deixe "Brasil".
2. Abra outra aba e cole o endereço do Portal Resultados. Clique em **Escolher eleição** (ou **Selecionar eleição**) e escolha as Eleições de 2026. Em **UF**, deixe "Todas". Em **Município**, deixe "Todos". Abra o cargo Presidente.
3. Nas duas telas, olhe primeiro o andamento, que é o quanto da votação já foi contado. No mapa, o painel da direita mostra **Percentual** e **Seções contadas** (um número "de" outro, por exemplo "10 de 40"). No TSE, esse mesmo dado aparece como seções totalizadas, com um percentual. Os dois percentuais precisam ser iguais. As seções contadas do mapa precisam ser as mesmas seções totalizadas do TSE.
4. Depois olhe os candidatos. No mapa, cada linha traz o nome, a quantidade de votos e o percentual daquele candidato. No TSE, ache o mesmo nome. A quantidade de votos precisa ser a mesma. O percentual do candidato também. Esse percentual é a fatia dos votos. Ele é outro número, diferente do **Percentual** de seções do passo 3.
5. Clique em **Atualizar agora** no mapa. Espere a frase do alto citar de novo a data e a hora do arquivo do TSE. Olhe o Portal Resultados outra vez. Se uma tela andou alguns segundos na frente da outra, repita o **Atualizar agora** e compare de novo. A frase do alto do mapa diz a hora em que o TSE gerou o arquivo. Ela precisa estar próxima da hora mostrada no Portal Resultados.
6. Repita com um estado. No mapa, menu **Ir para**, escolha "Acre". No Portal Resultados, em **UF**, escolha Acre e mantenha Presidente no 1º turno. Compare de novo seções, percentual de seções e os votos do primeiro nome da lista.
7. Antes das 17h, horário de Brasília, as duas telas podem mostrar zero voto e zero seção contada. Isso confirma o teste: o mapa chegou no mesmo arquivo que o TSE, e a contagem oficial ainda não começou. Depois das 17h, os números sobem juntos nas duas telas.

**O que confirma.** Com o mesmo turno, o mesmo cargo e o mesmo lugar, o **Percentual** e as **Seções contadas** do mapa repetem as seções totalizadas do Portal Resultados. O nome, os votos e o percentual de cada candidato do painel repetem a lista do TSE. O mapa mostra até 8 candidatos que já têm voto. Em Deputado estadual, mostra os 24 mais votados. Quem tem mais votos aparece primeiro.

### Ensaio antes da divulgação

Em 4/10/2026, antes das 17h, eu abri os dois arquivos oficiais de presidente no Brasil, cada um uma vez. Os dois responderam.

- Andamento: [br-e006257-ab.json](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json). Data `03/10/2026`, hora `15:36:16`. No Brasil, `pstn` era `0`, seções contadas `st` era `0` e seções existentes `ts` era `499248`. O arquivo traz 29 linhas de lugar, o Brasil e os estados.
- Votos: [br-c0001-e006257-u.json](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json). Data `03/10/2026`, hora `14:47:37`. São 12 candidatos. Cada um tem `nmu` (nome na urna) e `vap` (votos). Todos os `vap` estavam em `0`.

A lista do painel usa esses mesmos rótulos. Eu repeti a conta do mapa trocando o zero por quantidades de exemplo, no mesmo formato do arquivo. A ordem saiu da maior quantidade para a menor. Quando o TSE gravar um `vap` maior que zero, o painel mostra esse número e coloca na frente quem tiver mais votos. O **Percentual** do painel continua sendo o `pstn` do andamento.

## O que eu fiz

Cada etapa abaixo registra o que eu construí, qual arquivo eu criei e o teste que o programador faz no computador. A ordem é a ordem em que eu trabalhei. O teste passou quando o que aparece na tela é o que está em "O que confirma".

Estes testes usam o navegador (Chrome, Edge ou Firefox) e, em duas etapas, a janela de comando. A barra de endereço é a faixa no topo do navegador, onde se cola o endereço do site. Ctrl+F busca uma palavra dentro da página aberta.

Antes dos testes, o programador sobe o mapa no próprio computador:

1. Abra a pasta do projeto.
2. Na barra de endereço dessa pasta, digite `powershell` e pressione Enter. Abre uma janela azul: o terminal.
3. Digite o comando abaixo e pressione Enter. Deixe essa janela aberta o tempo todo.

```bash
python -m http.server 8080
```

4. Abra o navegador. Na barra de endereço, cole `http://localhost:8080` e pressione Enter.
5. A página precisa mostrar o título "Mapa da apuração", os menus e o desenho do Brasil. Deixe essa aba aberta. Os outros endereços abrem em uma aba nova.

Em 4/10/2026, antes das 17h, eu fiz esses acessos. O catálogo, o andamento e os votos responderam. O desenho do Brasil tem 27 estados. O campo de cidade abre desligado. Os votos de presidente ainda estavam em zero, o que combina com a hora em que o TSE libera a contagem.

### Etapa 1. Descobrir os códigos oficiais

O projeto utiliza como base a [página técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados) e o [catálogo ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json). Neles estão as informações sobre os códigos das eleições, dos cargos e dos arquivos. No 1º turno, presidente é a eleição `6257`. Governador, senador e deputados são a `6259`. No 2º turno, os códigos são `6258` e `6260`.

**Arquivo que eu criei.** `js/config.js`. É a lista fixa: site do TSE, ciclo `ele2026`, turnos, cargos e os 27 estados com o código do IBGE.

**Situação.** Eu quis guardar no mapa os mesmos números que essas duas fontes publicam.

**Como testar.** O programador confere se os códigos do mapa são os mesmos do catálogo do TSE.

1. Abra uma aba nova. Cole este endereço e pressione Enter: [ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json).
2. A tela mostra um texto com chaves `{ }`. Esse texto é o catálogo. Pressione Ctrl+F, digite `6257` e Enter. O número precisa estar no texto.
3. Na mesma busca, procure `6258`, `6259` e `6260`. Os quatro números precisam aparecer.
4. Abra o arquivo `js/config.js` da pasta do projeto, no editor. Pressione Ctrl+F e procure os mesmos quatro números, um por vez.
5. Volte à aba `http://localhost:8080`. Clique no menu **Turno**. Precisam aparecer "1º turno" e "2º turno". Clique no menu **Cargo**. Precisam aparecer Presidente, Governador, Senador, Deputado federal, Deputado estadual e Deputado distrital. A página continua no lugar depois de cada escolha.

**O que confirma.** Cada número do catálogo está escrito igual em `js/config.js`. Os dois menus abrem e deixam escolher turno e cargo.

### Etapa 2. Usar só endereços que o TSE documentou

Eu usei endereços que a página técnica do TSE e o catálogo já indicam. Um endereço inventado, repetido muitas vezes, pode fazer o TSE pausar o acesso por alguns minutos.

**Arquivo que eu criei.** `js/tse.js`. Ele junta turno, cargo e lugar e forma o endereço. Também lê o texto que volta: `pstn` vira porcentagem de seções, `nmu` vira nome na urna e `vap` vira quantidade de votos.

**Situação.** Eu quis ver o arquivo cru antes de confiar no desenho do mapa.

**Como testar.** O programador abre os dois arquivos oficiais no navegador e confere os rótulos que o mapa usa.

1. Cole este endereço e pressione Enter: [andamento do Brasil](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json).
2. A tela precisa ser um texto com chaves `{ }`. Se aparecer uma página com a palavra "erro" ou "não encontrado", o acesso falhou.
3. Pressione Ctrl+F e digite `pstn`. Esse rótulo é a porcentagem de seções já contadas. Ao lado dele há um número, por exemplo `"pstn": "0"`.
4. Abra outra aba e cole este endereço: [votos de presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json).
5. Pressione Ctrl+F e digite `nmu`. Esse rótulo é o nome do candidato na urna. Depois procure `vap`. Esse rótulo é a quantidade de votos. Cada candidato do texto tem os dois.

**O que confirma.** Os dois endereços abrem como texto com `{ }`. Em 4/10/2026, antes das 17h, `pstn` e `vap` estavam em zero. Quando a contagem começa, esses mesmos rótulos passam a ter número maior que zero. O mapa mostra esse número. Ele usa o total que já está no arquivo.

### Etapa 3. Montar uma página que abre sem servidor próprio

Eu montei a ferramenta como uma página de HTML, CSS e JavaScript. O navegador de quem visita é que consulta o TSE. Por isso a mesma pasta pode ir para o GitHub Pages.

**Arquivos que eu criei.** `index.html` e `css/estilos.css`. O HTML reserva o título, os menus, o mapa, o painel e o texto de uso. O CSS encaixa o mapa ao lado do painel e deixa o campo desligado mais claro.

**Situação.** Eu quis que a ferramenta abrisse como um site, sem programa para instalar.

**Como testar.** O programador confere se a página abre pelo endereço local e se a consulta ao TSE sai dessa aba.

1. Na pasta do projeto, confira três itens: o arquivo `index.html`, o arquivo `css/estilos.css` e a pasta `js`.
2. Com a janela do `python` ainda aberta, acesse `http://localhost:8080`.
3. A tela mostra o título "Mapa da apuração", os menus **Turno**, **Cargo**, **Colorir por** e **Ir para**, o botão **Atualizar agora** e o desenho do Brasil. Por baixo das cores aparecem ruas. A página não pede chave nem login.
4. Leia a frase no alto. Ela sai de "Carregando o mapa…" e passa a dizer "Brasil. Arquivo do TSE gerado em", com uma data e uma hora, e termina com "Nova leitura em 20 segundos."
5. Feche essa aba, ache `index.html` na pasta e dê dois cliques nele. O desenho pode aparecer, mas a frase do alto não cita o arquivo do TSE. Feche essa aba e volte a `http://localhost:8080`.

**O que confirma.** Pelo endereço `http://localhost:8080`, mapa, menus e a frase com data e hora do TSE aparecem juntos. Pelo dois cliques no arquivo, a consulta ao TSE não completa.

### Etapa 4. Guardar o contorno dos estados

Eu baixei o desenho dos 27 estados no IBGE e salvei na pasta, para o Brasil aparecer logo.

**Arquivo que eu criei.** `data/brasil-estados.geojson`. É o contorno do país. As cidades não estão nele.

**Situação.** Eu quis ver o país inteiro antes de entrar num estado.

**Como testar.** O programador abre o arquivo do desenho e depois confere o mesmo desenho na tela.

1. Na pasta do projeto, abra `data/brasil-estados.geojson` no editor ou no Bloco de Notas.
2. Nas primeiras linhas, procure a palavra `FeatureCollection`. Ela precisa estar lá. Esse arquivo é um texto que descreve o contorno de cada estado.
3. Pressione Ctrl+F e digite `codarea`. Cada estado tem um código desses. São 27.
4. Volte a `http://localhost:8080`. Passe o mouse devagar sobre o mapa, sem clicar. O nome do estado aparece, por exemplo São Paulo ou Acre.

**O que confirma.** O arquivo abre como texto, começa com `FeatureCollection` e descreve 27 áreas. No mapa, o Brasil aparece dividido e o nome do estado surge ao passar o mouse.

### Etapa 5. Pintar o país com o andamento da contagem

Eu fiz o mapa do Brasil usar um arquivo pequeno, o `-ab.json`. A cor vai do bege, quando poucas seções foram contadas, ao verde, quando a contagem está avançada.

**Arquivo que eu criei.** `js/mapa.js`, na parte que pinta o país. Neste mesmo arquivo eu também ampliei o estado e repeti a leitura. As etapas 6 e 7 continuam nele. Eu reaproveitei este arquivo nas etapas seguintes.

**Situação.** Eu quis que a cor do estado correspondesse ao número oficial e que trocar o cargo trocasse a consulta.

**Como testar.** O programador compara o número do painel com o número do arquivo oficial, e depois troca o cargo para ver o endereço mudar.

1. Em `http://localhost:8080`, no menu **Turno**, escolha "1º turno". No menu **Cargo**, escolha "Presidente".
2. Olhe o painel à direita. O título é "Brasil". Ele mostra as seções contadas e um percentual.
3. Clique no link **Abrir o arquivo original do TSE**. Abre uma aba nova.
4. Olhe a barra de endereço dessa aba. O texto precisa terminar em `br-e006257-ab.json`.
5. Nessa aba, pressione Ctrl+F e digite `pstn`. O número ao lado de `pstn`, no trecho do Brasil, precisa ser o mesmo percentual do painel. Se os dois estiverem em 0, o teste passou: o arquivo chegou e a contagem ainda está em zero. O mapa fica bege.
6. Volte à aba do mapa. Troque **Cargo** para "Governador". Clique de novo em **Abrir o arquivo original do TSE**. O endereço dessa aba precisa conter `6259`.

**O que confirma.** Com Presidente, o arquivo termina em `br-e006257-ab.json` e o `pstn` é o mesmo percentual do painel. Com Governador, o endereço contém `6259`. Mapa bege com tudo em zero também conta: o arquivo chegou e a contagem ainda não começou.

### Etapa 6. Ampliar o estado e filtrar as cidades

Ao clicar num estado, o mapa ocupa a tela com ele, pede as cidades ao IBGE e o andamento daquele estado ao TSE. O campo "Buscar cidade neste estado" só então liga, e a lista traz só as cidades daquele estado. No mapa do Brasil, o campo fica desligado e a lista fica vazia.

**Arquivos desta etapa.** Eu não criei arquivo novo. Em `js/mapa.js` eu incluí a busca filtrada. Em `index.html` eu incluí o campo, que já abre desligado.

**Situação.** Eu quis acompanhar um estado de perto, com a lista só das cidades daquele estado.

**Como testar.** O programador confere o campo de cidade em três momentos: Brasil, Acre e São Paulo.

1. Em `http://localhost:8080`, no menu **Ir para**, deixe "Brasil".
2. No painel da direita, olhe **Buscar cidade neste estado**. O campo fica acinzentado. O texto dentro diz "Escolha um estado para buscar a cidade". Clicar nele não deixa digitar.
3. No menu **Ir para**, escolha "Acre". Espere o mapa aproximar e o desenho das cidades aparecer.
4. O campo deixa o tom acinzentado. O texto de dentro passa a "Digite o nome da cidade".
5. Clique no campo e digite `Acre`. A lista que abre traz cidades do Acre, entre elas Acrelândia.
6. Clique em Acrelândia. O mapa aproxima essa cidade e o título do painel muda. Clique em **Abrir o arquivo original do TSE**. A barra de endereço precisa conter `ac01120`.
7. Volte ao mapa. No menu **Ir para**, escolha "São Paulo". Espere as cidades. Clique no campo e digite `Campinas`. A lista traz cidades de São Paulo. Acrelândia fica de fora dessa lista.
8. Pressione a tecla Esc. O mapa volta ao Brasil, a lista esvazia e o campo fica acinzentado outra vez. O botão **Ver o Brasil** repete esse retorno.

**O que confirma.** No Brasil, o campo fica desligado. No Acre, Acrelândia aproxima o mapa e o arquivo da cidade contém `ac01120`. Em São Paulo, a lista é a de São Paulo. Esc, ou **Ver o Brasil**, desliga o campo de novo.

### Etapa 7. Atualizar sozinho a cada 20 segundos

Eu programei a página para pedir o andamento de novo a cada 20 segundos. Esse é o ritmo que cabe no limite do TSE: no mapa do Brasil, cada volta pede um arquivo de andamento. O arquivo de votos só é pedido de novo quando a hora gravada no andamento muda. O TSE guarda cada arquivo na rede por cerca de 20 a 60 segundos e aceita cerca de 100 consultas por segundo neste computador. Pedir de 5 em 5 segundos recebe a mesma cópia, sem voto novo, e gasta esse limite.

Se o endereço ainda não existe, o TSE responde que o arquivo não foi encontrado. A página então pausa a leitura automática, para não repetir um endereço vazio. Várias respostas desse tipo seguidas podem fazer o TSE pausar o acesso por cerca de 10 minutos. O botão "Atualizar agora" tenta de novo na hora, quando a pessoa pede. Se o TSE ainda não gerou arquivo novo, o desenho permanece.

**Arquivos desta etapa.** Eu não criei arquivo novo. O intervalo de 20 segundos está em `js/config.js`. O pedido repetido está em `js/mapa.js`.

**Situação.** Eu deixei a página aberta durante a apuração para ela continuar consultando sem um clique a cada leitura.

**Como testar.** O programador espera uma leitura sozinha e depois força outra na hora. O painel do navegador mostra o pedido saindo do computador.

1. Em `http://localhost:8080`, leia a frase no alto. Ela cita a data e a hora do arquivo do TSE e termina com "Nova leitura em 20 segundos."
2. Não clique em nada. Espere 20 segundos olhando essa frase. Ela é escrita de novo quando a leitura termina.
3. Clique no botão **Atualizar agora**. A frase muda na hora, sem esperar os 20 segundos.
4. Para ver o acesso sair do computador, pressione F12. Abre um painel na lateral ou embaixo da página. Clique na aba **Rede**. Se o navegador estiver em inglês, o nome da aba é **Network**.
5. Clique outra vez em **Atualizar agora**. Na lista, procure uma linha cujo nome termine em `-ab.json`.
6. Clique nessa linha. O endereço dela precisa começar com `https://resultados.tse.jus.br/`.
7. Feche o painel com F12. Troque o menu **Cargo** e clique num estado. A página continua usável no meio da espera.

**O que confirma.** A frase do alto cita data e hora do TSE e avisa a próxima leitura em 20 segundos. **Atualizar agora** responde na hora. Na aba Rede, a linha `-ab.json` aponta para o site do TSE.

### Etapa 8. Ler o passo a passo da página

Eu escrevi, na parte de baixo da página e em linguagem comum, o que cada controle faz. São seis passos, cada um com um exemplo para repetir na tela. O texto fica dentro de `index.html`.

**Arquivos desta etapa.** Eu não criei arquivo novo. O texto "Como usar o mapa" está em `index.html`.

**Situação.** Eu quis que uma pessoa que nunca abriu o mapa soubesse por onde começar, sem ler código.

**Como testar.** O programador segue o texto da própria página e confere se cada exemplo funciona com o mouse.

1. Em `http://localhost:8080`, clique em **Como usar**, ao lado do título, ou role a página até o fim.
2. O título da seção é "Como usar o mapa". Há seis passos numerados. Os nomes do texto são os mesmos dos menus: Turno, Cargo, Colorir por, Ir para, Ver o Brasil e Atualizar agora.
3. Siga o exemplo do passo 1: menu **Turno** em "1º turno" e menu **Cargo** em "Presidente".
4. Siga o exemplo do passo 3: clique no estado de São Paulo no mapa. O estado ocupa a tela.
5. No passo 4, com São Paulo aberto, clique em **Buscar cidade neste estado** e digite `Campinas`. A lista traz cidades de São Paulo. Acrelândia fica de fora.
6. Pressione Esc, como o passo 5 descreve. O mapa volta ao Brasil e o campo de cidade fica acinzentado.

**O que confirma.** Dá para repetir os seis exemplos só com o mouse. Os nomes escritos no texto são os nomes dos botões e dos menus. Ao voltar ao Brasil, o campo de cidade fica desligado. Abaixo dos seis passos, o quadrinho **Documentação no GitHub** aponta para [este arquivo no repositório](https://github.com/AndressaLF/Eleicoes2026_MapaInterativo#readme).

### Etapa 9. Conferir os endereços com um teste automático

Eu criei `tests/verificar.js` para repetir, em um comando, a checagem dos endereços e da leitura do JSON. Ele pede Node.js instalado. As etapas 1 a 8 já bastam para atestar o uso no navegador. Esta é uma confirmação extra.

**Arquivo que eu criei.** `tests/verificar.js`. Ele fica fora da página. Confere se os endereços que eu montei em `js/tse.js` continuam iguais aos exemplos oficiais, se o desenho tem 27 estados e se um voto escrito como texto vira número.

**Situação.** Quando eu altero `js/config.js` ou `js/tse.js`, eu quero saber se os endereços continuam iguais aos do TSE.

**Como testar.** O programador roda um comando na pasta do projeto. Este teste pede o programa Node.js. Se ele não estiver instalado, os testes das etapas 1 a 8, feitos no navegador, continuam valendo.

1. Abra o terminal na pasta do projeto. Pode ser a mesma janela do `python`, ou uma janela nova: na barra da pasta, digite `powershell` e pressione Enter.
2. Digite o comando abaixo e pressione Enter.

```bash
node tests/verificar.js
```

3. Se a janela responder que `node` não é reconhecido, pare por aqui. As etapas 1 a 8 já conferem o mapa no navegador.
4. Se o Node estiver instalado, leia a última linha. Ela precisa ser exatamente: `Endereços e leitura do JSON conferidos.`
5. Se aparecer a palavra `FALHOU`, leia as duas linhas de baixo. Uma mostra o endereço obtido. A outra mostra o endereço esperado. Os dois deixaram de ser iguais.

**O que confirma.** A última linha do terminal é `Endereços e leitura do JSON conferidos.` A palavra `FALHOU` significa que um endereço que eu montei mudou em relação ao exemplo oficial. A falta do `node` no computador não anula os testes feitos no navegador.

### Etapa 10. Preparar a página para o GitHub Pages

O GitHub Pages é o jeito que eu escolhi para deixar esta pasta no ar, de graça, para qualquer pessoa abrir um endereço na internet. O computador não precisa ficar ligado o tempo todo. O GitHub só entrega os arquivos prontos. Quem abre o endereço consulta o TSE no próprio navegador, no mesmo ritmo de 20 segundos.

**O que eu já fiz.** A página é feita de arquivos prontos: `index.html`, `css/estilos.css`, a pasta `js/` e `data/brasil-estados.geojson`. Eu enviei esses arquivos, e este README, para o repositório público [AndressaLF/Eleicoes2026_MapaInterativo](https://github.com/AndressaLF/Eleicoes2026_MapaInterativo), na branch `main`. O teste `tests/verificar.js` ficou só no computador, porque o Pages não executa esse arquivo.

**Pages.** O GitHub publica a pasta raiz da branch `main` em [https://andressalf.github.io/Eleicoes2026_MapaInterativo/](https://andressalf.github.io/Eleicoes2026_MapaInterativo/). No computador, o mesmo mapa continua em `http://localhost:8080`.

**Arquivos desta etapa.** Eu não criei arquivo novo da página. O registro Git guarda os mesmos arquivos das etapas anteriores.

**Situação.** Eu quis que o mapa pudesse ser aberto por qualquer pessoa, em outro computador, sem instalar nada.

**Como testar.** O programador abre os dois endereços.

1. No navegador, abra `http://localhost:8080`. O mapa, os menus e a frase com a hora do arquivo do TSE precisam aparecer.
2. Abra uma janela anônima. No Chrome ou no Edge, o atalho é Ctrl+Shift+N. Cole `https://andressalf.github.io/Eleicoes2026_MapaInterativo/` e pressione Enter.
3. Role até o fim. Abaixo dos seis passos, o quadrinho **Documentação no GitHub** precisa abrir [a documentação](https://github.com/AndressaLF/Eleicoes2026_MapaInterativo#readme).

**O que confirma.** Os dois endereços mostram o mesmo mapa, os menus e a frase com a hora do arquivo do TSE. Quem abre o link público consulta o TSE do próprio computador.

## Arquivos principais

Eu separei o mapa em sete arquivos. Cada um faz uma parte. O navegador abre o primeiro. Esse primeiro chama os outros, nesta ordem.

1. `index.html` monta a tela.
2. `css/estilos.css` define o visual.
3. `js/config.js` guarda os códigos oficiais.
4. `js/tse.js` monta o endereço do TSE e lê o arquivo que volta.
5. `js/mapa.js` desenha o Brasil, pinta as cores e repete a leitura.
6. `data/brasil-estados.geojson` é o desenho dos estados.
7. `tests/verificar.js` confere, fora do navegador, se os endereços continuam certos.

### `index.html` — a página que a pessoa vê

É o arquivo que o navegador abre. Dentro dele estão o título, os menus (turno, cargo, cor e estado), o espaço do mapa, o painel dos números e o texto "Como usar o mapa".

No final do arquivo há três chamadas, nesta ordem: `js/config.js`, `js/tse.js` e `js/mapa.js`. A ordem importa. O mapa só funciona se os códigos e a leitura do TSE já estiverem carregados. Também entra o Leaflet, a biblioteca que deixa arrastar e aproximar o mapa, e o visual de `css/estilos.css`.

Este arquivo não calcula voto. Ele só reserva o lugar de cada coisa na tela.

### `css/estilos.css` — o visual

Define cores, tamanhos e o encaixe do mapa ao lado do painel. No celular, o painel desce para baixo do mapa. Se este arquivo faltar, o mapa ainda lê o TSE, mas a página fica sem o arranjo visual.

### `js/config.js` — os códigos que não mudam durante a apuração

Guarda o que é fixo nesta eleição:

- o site do TSE (`resultados.tse.jus.br`) e o ciclo `ele2026`;
- o tempo entre uma leitura e outra: 20 segundos;
- o código de cada turno: 1º turno é `6257` para presidente e `6259` para os cargos estaduais; 2º turno é `6258` e `6260`;
- a lista de cargos (presidente, governador, senador e deputados) e o número de cada um no arquivo do TSE;
- a lista dos 27 estados, com a sigla e o código do IBGE usado no desenho.

Quando alguém troca o cargo no menu, o mapa consulta este arquivo para saber qual número colocar no endereço. Mudou o código oficial da eleição, o lugar de alterar é aqui.

### `js/tse.js` — o endereço e a leitura dos números

Recebe o turno, o cargo e o lugar escolhidos em `js/config.js` e monta o endereço completo. Exemplo: presidente no Brasil vira o arquivo de votos `br-c0001-e006257-u.json`.

Quando o TSE devolve o texto, este arquivo traduz os rótulos para números que o mapa entende:

- no andamento, `pstn` vira a porcentagem de seções já contadas, e `st` e `ts` viram seções contadas e seções existentes;
- nos votos, `nmu` vira o nome na urna, `vap` vira a quantidade de votos e `pvap` vira a porcentagem;
- na tabela de cidades, liga o código de 5 dígitos do TSE ao código de 7 dígitos do IBGE.

O mapa mostra as contas que este arquivo encontra no texto oficial do TSE.

### `js/mapa.js` — o desenho e a atualização

É o arquivo que age. Ao abrir a página, ele:

1. preenche os menus com os cargos e estados de `js/config.js`;
2. pede o desenho dos estados em `data/brasil-estados.geojson`;
3. pede o fundo de ruas ao OpenStreetMap;
4. pede o andamento do Brasil a `js/tse.js` e pinta cada estado;
5. repete essa leitura a cada 20 segundos.

Quando a pessoa clica num estado, este arquivo pede o contorno das cidades ao IBGE e os votos daquele estado ao TSE. Quando a pessoa busca uma cidade, pede só o arquivo daquela cidade. O painel ao lado é preenchido aqui, com seções, percentual e candidatos.

### `data/brasil-estados.geojson` — o contorno do país

É o desenho dos 27 estados, baixado do IBGE e guardado na pasta. Por isso o Brasil aparece mesmo que o IBGE demore na hora de abrir a página. As cidades não estão neste arquivo. O mapa só pede o desenho de um estado ao IBGE quando alguém abre aquele estado.

### `tests/verificar.js` — a conferência automática

Fica fora da página. Eu uso este arquivo quando altero `js/config.js` ou `js/tse.js` e quero saber se os endereços continuam iguais aos do TSE. Com Node.js instalado, na pasta do projeto:

```bash
node tests/verificar.js
```

O terminal escreve `Endereços e leitura do JSON conferidos.` Se aparecer `FALHOU`, o endereço que eu montei deixou de bater com o exemplo oficial.

### Como um clique percorre os arquivos

A pessoa escolhe Governador e clica em São Paulo.

1. `index.html` recebe o clique no menu e no mapa.
2. `js/mapa.js` pergunta a `js/config.js` o código do cargo e do estado.
3. `js/tse.js` monta o endereço do andamento e o dos votos de São Paulo e lê os dois arquivos do TSE.
4. `js/mapa.js` pede o desenho das cidades ao IBGE, pinta o estado e escreve os números no painel.
5. `css/estilos.css` só cuida de como esse painel aparece ao lado do mapa.

## Dados utilizados e de onde vêm

Nesta seção eu registro de onde vêm os dados do mapa que eu fiz. Tudo que o mapa mostra vem de dois lugares públicos: o IBGE desenha o território, e o TSE publica a apuração.

O projeto utiliza como base a [página técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados) e o [catálogo ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json). Neles estão as informações sobre os códigos das eleições, dos cargos, dos nomes dos arquivos e do limite de consultas.

Um endpoint é só um endereço fixo na internet. Ao colar no navegador, chega um arquivo.

Os Tribunais Regionais Eleitorais (os TRE de cada estado) organizam a votação local. O mapa pronto do tribunal está em [resultados.tse.jus.br](https://resultados.tse.jus.br/oficial/app/index.html). Na página que eu fiz, o texto da tela explica o uso. Os endereços ficam nesta seção.

### Contornos do mapa

O desenho das fronteiras não vem do TSE. Vem do IBGE, no formato GeoJSON. GeoJSON é um texto que descreve o contorno de cada lugar.

Eu baixei o Brasil inteiro uma vez e guardei em `data/brasil-estados.geojson`. Assim o país aparece mesmo que o IBGE demore. Para baixar de novo, abra este endereço e salve o resultado com esse nome de arquivo:

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

O programador repete o acesso no próprio computador, nesta ordem. Cada passo diz o endereço e o que a tela precisa mostrar.

1. Abra a [página técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados) e o [catálogo ele-c.json](https://resultados.tse.jus.br/oficial/comum/config/ele-c.json). No catálogo, pressione Ctrl+F e procure `6257`, `6259`, `6258` e `6260`. Os quatro números precisam estar no texto. O projeto utiliza esses dois endereços como base. Neles estão os códigos das eleições e dos arquivos.
2. Abra o [contorno dos 27 estados](https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF). A tela mostra um texto com `{ }`. Salve esse texto como `data/brasil-estados.geojson`.
3. Abra o [andamento de presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-e006257-ab.json) e os [votos de presidente](https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json). As duas telas precisam ser texto com `{ }`. No primeiro, Ctrl+F em `pstn`. No segundo, Ctrl+F em `nmu` e em `vap`.
4. Copie esta pasta, ou recrie os arquivos `index.html`, `css/estilos.css` e a pasta `js/`. Os endereços ficam montados em `js/tse.js`. Os códigos ficam em `js/config.js`.
5. Na pasta do projeto, abra o PowerShell, rode `python -m http.server 8080` e, no navegador, abra `http://localhost:8080`.
6. Clique num estado, por exemplo o Acre. A página pede as cidades ao IBGE e o andamento daquele estado ao TSE. O painel troca o título para o nome do estado e o link **Abrir o arquivo original do TSE** passa a conter a sigla `ac`.

Se um endereço estiver errado, o TSE pode pausar o acesso por alguns minutos. Eu uso os exemplos desta seção, com os códigos que estão na página técnica e no catálogo.

## Painel local com Streamlit

O dashboard só funciona localmente. Eu ligo o programa neste computador e a tela aparece no navegador, no endereço que o terminal mostra, em geral `http://localhost:8501`. Outra pessoa, em outro computador, não abre essa tela pelo link do GitHub. O GitHub só guarda os arquivos, para eu baixar o projeto e rodar de novo aqui.

A tela repete as escolhas do mapa: turno, cargo, cor, estado e cidade. Os números saem dos mesmos endereços do TSE. O mapa publicado para qualquer pessoa continua sendo a página em HTML.

A pasta é `dashboard`, no mesmo nível de `js`, `css` e `data`.

### Como abrir o painel

O mapa e o painel são dois programas. O mapa, com `python -m http.server 8080`, abre em `http://localhost:8080`. O painel abre em outra porta.

Na primeira vez, na pasta do projeto, eu crio um ambiente virtual e instalo as bibliotecas. O ambiente virtual é uma pasta separada, chamada `.venv`, para estas bibliotecas não se misturarem com outros programas do computador.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r dashboard\requirements.txt
```

Cada vez que vou abrir o painel, eu ativo o ambiente virtual. Ativar significa pedir ao terminal para usar o Python dessa pasta `.venv`, onde o Streamlit está instalado. O comando muda conforme o terminal. Os três abaixo valem neste computador, com a janela já aberta na pasta do projeto.

No PowerShell, que é a janela azul padrão do Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Se o PowerShell recusar o arquivo e falar em política de execução, eu libero só esta janela e ativo de novo:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

No Prompt de Comando, a janela preta do `cmd`:

```bat
.venv\Scripts\activate.bat
```

No Git Bash, o terminal que imita o Linux dentro do Windows:

```bash
source .venv/Scripts/activate
```

Quando a ativação funciona, o começo da linha do terminal passa a mostrar `(.venv)`. Exemplo no PowerShell: `(.venv) PS E:\GitHub_Projetos\TRE_Votacao_2026>`. A partir daí os comandos `python` e `streamlit` são os desse ambiente. O comando para sair, `deactivate`, é o mesmo nos três terminais.

Com o `(.venv)` visível, eu abro o painel:

```powershell
streamlit run dashboard\app.py
```

O terminal escreve um endereço. Em geral é `http://localhost:8501`. Eu colo esse endereço no navegador. A tela do painel aparece. Para encerrar o painel, eu volto ao terminal e pressiono Ctrl+C. O ambiente virtual continua ativo nessa janela. Para sair dele, eu digito `deactivate` e pressiono Enter. O `(.venv)` some do começo da linha.

Se a porta 8501 já estiver ocupada, o terminal mostra outro número. Eu uso o endereço que o terminal escreveu.

### O que a tela mostra

A tela segue o arranjo da página. Em cima ficam os menus. No meio, o mapa ocupa a área larga e o painel fica à direita.

No mapa do Brasil, cada estado recebe uma cor. O desenho é um contorno leve dos 27 estados, tirado de `data/brasil-estados.geojson`, sem o mapa-múndi. Ao abrir um estado, o painel pede ao IBGE só os municípios daquele estado e enquadra o mapa nele. Ao escolher uma cidade, como Alto do Rodrigues no Rio Grande do Norte, a janela aproxima o contorno dessa cidade. O painel da direita mostra, nesta ordem:

1. No modo percentual, a faixa do bege ao verde. No modo de liderança, o painel começa direto no nome do lugar.
2. O nome do lugar (Brasil, estado ou cidade).
3. A busca da cidade, logo abaixo desse nome, quando um estado está aberto. A lista traz só as cidades daquele estado.
4. O cargo e o turno.
5. Seções contadas, percentual, eleitores computados e eleitores no lugar.
6. A lista de candidatos.
7. O link que abre o arquivo original do TSE.

A frase no fim da tela diz a data e a hora gravadas no arquivo do TSE.

### O que cada controle faz

- **Turno.** Escolhe 1º turno ou 2º turno. No 1º turno, presidente usa a eleição `6257` e os cargos estaduais usam a `6259`. No 2º turno, os códigos são `6258` e `6260`. Ao trocar o turno, o percentual some da tela e a leitura nova traz o número do arquivo daquele turno.
- **Cargo.** Escolhe Presidente, Governador, Senador, Deputado federal, Deputado estadual ou Deputado distrital. O número do cargo entra no nome do arquivo de votos. Deputado estadual não existe no Distrito Federal. Deputado distrital só existe no Distrito Federal. Fora isso, o painel avisa e deixa a lista vazia.
- **Colorir por.** Tem duas opções, as mesmas da página. **Quem lidera no estado** pinta de vermelho ou de azul, pelo partido de quem tem mais votos naquele estado. **Percentual apurado** pinta do bege ao verde, pela parte das seções já contadas. Em deputado federal, estadual e distrital o mapa fica só no percentual, porque a lista é grande. Os nomes desses cargos aparecem ao abrir o estado.
- **Ir para.** Escolhe Brasil ou um estado. O mapa e o painel passam a mostrar esse lugar.
- **Ver o Brasil.** Volta ao país. A busca de cidade se apaga. O percentual do painel passa a ser o do Brasil.
- **Atualizar agora.** Pede os arquivos de novo, sem esperar os 30 segundos.
- **Buscar cidade neste estado.** Só aparece com um estado aberto. A lista traz as cidades daquele estado. Ao escolher uma, o painel troca para a linha daquela cidade. No Brasil, o campo fica desligado.
- **Clique no mapa.** No Brasil, um clique num estado abre esse estado e mostra os municípios dele. Com o estado aberto, um clique num município escolhe essa cidade e aproxima o mapa, do mesmo jeito que **Buscar cidade neste estado**.
- **Leitura de 30 segundos.** Com a tela aberta, o painel pede de novo o arquivo do lugar que está aberto, a cada 30 segundos. A lista de quem lidera em cada estado fica guardada por 3 minutos, para não baixar o país inteiro a cada passagem. O TSE guarda cada arquivo por cerca de 20 a 60 segundos, então pedir mais rápido não traz voto novo. Se o arquivo do turno ainda não existe, a leitura automática para, para não repetir um endereço vazio. **Atualizar agora**, ou uma troca de turno ou cargo, tenta de novo.

### De onde vem cada número do painel

O painel copia o número do arquivo. Ele não soma um lugar com outro. Ao mudar o lugar, o número anterior sai da tela. O número novo é o da linha daquele lugar.

| O que aparece | De qual arquivo sai | Qual linha |
|---|---|---|
| Percentual, seções e eleitores do Brasil | Andamento, arquivo que termina em `-ab.json` | A linha `br` |
| Percentual, seções e eleitores de um estado | Andamento daquele estado, por exemplo `ac-e006259-ab.json` para governador no Acre | A linha da sigla, por exemplo `ac` |
| Percentual, seções e eleitores de uma cidade | O mesmo andamento do estado | A linha do código da cidade, com 5 dígitos |
| Nome, votos e percentual de cada candidato | Votos, arquivo que termina em `-u.json` | O candidato, pelos campos `nmu` (nome), `vap` (votos) e `pvap` (fatia dos votos) |
| Cor do mapa no modo percentual | O andamento do Brasil, uma linha por estado | O `pstn` daquele estado |
| Cor do mapa no modo liderança | Um arquivo de votos por estado | Quem tem o maior `vap` naquele estado |

O percentual ao lado do nome do candidato é a fatia dos votos daquela pessoa. O **Percentual** do alto do painel é outra conta: a parte das seções já contadas. Governador e deputados do mesmo lugar usam o mesmo percentual de seções, porque o TSE publica um arquivo de andamento para a eleição estadual inteira. A lista de nomes muda com o cargo. O percentual de seções, nesse caso, permanece o daquele lugar.

Presidente no Brasil lê `br-e006257-ab.json` no 1º turno. Governador num estado lê o arquivo `6259` daquele estado. Deputado no estado ou na cidade também lê o `6259`, porque o nome do arquivo de andamento não traz o cargo. A cidade usa o código de 5 dígitos. Se essa linha não existir, o campo fica vazio. O painel não recoloca o número do estado nem o do Brasil no lugar dela.

A lista mostra até 8 candidatos que já têm voto. Em Deputado estadual, mostra os 24 mais votados. Quem tem mais votos aparece primeiro.

### O que cada arquivo da pasta dashboard faz

A pasta `dashboard` tem três arquivos. Nenhum deles é a página do GitHub Pages. O comando `streamlit run dashboard/app.py` abre o primeiro. Esse arquivo chama o segundo quando precisa de um número do TSE. O terceiro é a lista do que o `pip` instala antes da primeira abertura.

A pasta `.venv` fica na raiz do projeto, ao lado de `dashboard`. Ela guarda as bibliotecas depois da instalação. Ela não entra no GitHub.

#### `dashboard/app.py` — a tela que o Streamlit abre

O objetivo deste arquivo é a tela inteira do painel: menus, mapa e lista da direita. É o único arquivo que o comando do Streamlit executa. Ele importa `leitura_tse.py` com o nome `tse` e usa essas funções para montar endereços e traduzir o JSON.

O começo guarda duas pastas. `RAIZ` é a pasta do projeto, um nível acima de `dashboard`. `GEOJSON_ESTADOS` aponta para `data/brasil-estados.geojson`. A página do TSE oficial fica no link do rodapé.

`iniciar_estado` cria a memória da tela na primeira abertura. Essa memória se chama `session_state` e dura enquanto o navegador está nessa página. Ela guarda o turno (`1`), o cargo (`presidente`), o modo de cor (`Quem lidera no estado`), o lugar (vazio significa Brasil), a cidade, um contador chamado `geracao` e uma pausa. O contador sobe quando eu troco o turno, o cargo ou aperto **Atualizar agora**. Subir o contador faz o painel ignorar a cópia antiga e pedir o arquivo de novo.

Cada menu tem uma reação:

- Trocar turno ou cargo zera a pausa e aumenta `geracao`.
- Trocar o estado em **Ir para** apaga a cidade escolhida, para o percentual da cidade anterior não ficar na tela.
- **Ver o Brasil** apaga estado e cidade.
- **Atualizar agora** aumenta `geracao` e esvazia a memória dos arquivos já baixados.

`tela` é o miolo que se repete. O Streamlit marca essa função com `run_every` de 30 segundos. A cada 30 segundos ela lê de novo só o lugar aberto: o andamento do Brasil ou do estado, e os votos daquele lugar. Os menus de cima ficam quietos nessa repetição.

Dentro de `tela`, a ordem é esta:

1. `ler_lugar` pede o andamento. No Brasil, o arquivo é o do país. Com um estado aberto, pede também o andamento daquele estado. `apuracao_do_lugar`, em `leitura_tse.py`, devolve uma linha só: `br`, a sigla do estado ou o código de 5 dígitos da cidade.
2. Se o TSE responde 404, a tela mostra que aquele turno ainda não foi publicado e a repetição de 30 segundos para. **Atualizar agora** ou uma troca de turno ou cargo tenta outra vez.
3. Se a cor é **Quem lidera no estado** e o cargo é presidente, governador ou senador, `lideres_dos_estados` baixa o arquivo de votos de cada estado. São no máximo 2 downloads ao mesmo tempo. O resultado fica guardado por 3 minutos. Deputado federal, estadual e distrital pulam essa etapa, porque a lista é grande e o mapa usa o percentual de seções.
4. `ler_votos_do_painel` baixa os votos do lugar aberto. Presidente no Brasil usa o arquivo nacional. Os outros cargos, com o Brasil aberto, mostram um aviso: os votos desses cargos saem por estado. Ao abrir o estado, a lista troca para os candidatos daquele arquivo.
5. O mapa fica na coluna larga. O painel fica na coluna da direita.

O desenho do mapa passa por três funções, para a tela não carregar os quase 5 mil pontos do arquivo original:

1. `desenho_estados` lê `data/brasil-estados.geojson`. Se o arquivo não estiver na pasta, pede o contorno mínimo ao IBGE.
2. `contornos_leves` fica só com a borda externa de cada estado e apaga os pontos que não mudam a forma. O resultado tem 27 estados e cerca de 780 pontos, e fica na memória enquanto o painel está aberto.
3. `figura_mapa` entrega esses contornos ao Plotly. Cada estado é uma forma preenchida, na longitude e na latitude do Brasil. Não há mapa-múndi por baixo. A cor vem de `linhas_do_brasil`: vermelho ou azul de quem lidera, ou a mistura de bege e verde do percentual de seções. O estado que está aberto permanece colorido. Os outros ficam cinza. Um clique devolve a sigla daquele estado e a tela abre o lugar, como o menu **Ir para**.
4. Com um estado aberto, `contornos_municipios` pede ao IBGE o contorno mínimo dos municípios daquele estado e guarda essa cópia por 6 horas. A janela do mapa passa a caber nesse estado. Se uma cidade está escolhida, a janela cabe no contorno dela. Um clique num município grava o código dessa cidade.

O painel da direita é HTML montado em `escrever_painel`, com as cores da página (`#f4f0e6` no fundo e `#fffdf8` no cartão). A ordem é a da página:

1. `html_legenda`. No modo percentual, a faixa do bege ao verde. No modo de liderança, essa faixa não aparece. A cor do estado continua no mapa. O nome da pessoa fica na lista de candidatos do lugar aberto.
2. O nome do lugar.
3. A busca da cidade, no painel da direita, logo abaixo desse nome. Só aparece com um estado aberto. `tabela_cidades` devolve as cidades daquela sigla, por exemplo só as do Rio Grande do Norte quando o lugar é `RN`. A tabela fica guardada por 6 horas.
4. O cargo, o turno e `html_numeros`: seções contadas, percentual (`pstn`), eleitores computados e eleitores no lugar. O valor é copiado da linha daquele lugar. Ao mudar a escolha, o número anterior sai.
5. `html_candidatos`: até 8 nomes com voto, ou 24 em deputado estadual, do mais votado para o menos votado. O quadrado do número usa a cor do partido daquela pessoa.
6. O link do arquivo original do TSE.

#### `dashboard/leitura_tse.py` — os códigos e a leitura do TSE

O objetivo deste arquivo é falar com o TSE sem desenhar nada. Os códigos são os mesmos de `js/config.js` e `js/tse.js`. Se um código muda na página, ele muda aqui também. `app.py` só recebe números e nomes já traduzidos.

O arquivo começa com tabelas fixas:

- `ORIGEM` é `https://resultados.tse.jus.br/oficial`. `CICLO` é `ele2026`.
- `TURNOS` liga o 1º turno às eleições `6257` (federal) e `6259` (estadual), e o 2º turno às `6258` e `6260`.
- `CARGOS` lista presidente (cargo 1), governador (3), senador (5), deputado federal (6), deputado estadual (7) e deputado distrital (8). Cada um diz se a disputa é majoritária ou proporcional e quantos nomes a lista mostra (8, ou 24 no deputado estadual). Deputado estadual não vale no Distrito Federal. Deputado distrital só vale no Distrito Federal. `cargo_vale_no_lugar` aplica essa regra.
- `ESTADOS` tem a sigla, o nome e o código do IBGE dos 27 estados. Esse código do IBGE é o que liga o estado ao desenho do mapa.
- `PARTIDOS_ESQUERDA` é a lista que pinta de vermelho: PDT 12, PCdoB 65, PSOL 50, PSB 40, PT 13, PTB 14 e PV 43. `cor_do_bloco` olha a sigla do próprio candidato. Se a sigla vier vazia, usa os dois primeiros dígitos do número. A coligação não entra na cor. Os outros partidos ficam azuis (`#1d4e89`). O vermelho é `#b91c1c`. O bege vazio é `#e8dcc4` e o verde cheio é `#0b6b3a`.

As funções de endereço montam o caminho que o TSE documentou. `_montar` junta origem, ciclo, código da eleição, a pasta `dados` ou `config`, a pasta do lugar e o nome do arquivo.

- `endereco_andamento` monta o arquivo que termina em `-ab.json`. Exemplo do Brasil no 1º turno para presidente: `br-e006257-ab.json`. O nome não traz o cargo. Governador e deputados do mesmo estado compartilham o andamento da eleição `6259`.
- `endereco_votos` monta o arquivo que termina em `-u.json` e traz o cargo com quatro dígitos. Presidente no Brasil: `br-c0001-e006257-u.json`. Uma cidade entra com o código de 5 dígitos depois da sigla.
- `endereco_cidades` aponta para `mun-e006257-cm.json`, sempre do 1º turno. Esse arquivo só serve para a busca da cidade. Ele liga o código de 5 dígitos do TSE ao nome e ao código do IBGE.

`baixar` pede o endereço com a biblioteca requests. Espera no máximo 25 segundos. Se a rede falha, devolve status `0`. Se o TSE responde outro código, devolve esse código. Se o texto não é JSON, também trata como falha. Quando dá certo, devolve o JSON já convertido em dicionário.

A tradução do JSON fica em três funções:

- `ler_andamento` percorre a lista `abr`. Cada item é um lugar, no campo `cdabr`. `br` e as siglas ficam em letras minúsculas. Código de cidade ganha zeros até 5 dígitos. De cada lugar saem `pstn` (percentual de seções), `st` e `ts` (seções contadas e total), `est` e `te` (eleitores computados e total) e a data e a hora.
- `apuracao_do_lugar` devolve só a linha pedida. Brasil usa a chave `br`. Cidade usa o código de 5 dígitos. Estado usa a sigla. Se a linha não existe, o retorno é vazio. O painel não recoloca o número do estado nem o do Brasil no lugar dela.
- `ler_votos` percorre cargo, grupo, partido e candidato. De cada pessoa saem `n` (número), `nmu` (nome), `vap` (votos), `pvap` ou `pvapn` (fatia dos votos), a sigla do partido e o vice, quando o TSE manda o campo `vs`. A lista fica ordenada do maior `vap` para o menor. Empate no voto usa o número do candidato.
- `ler_cidades` agrupa as cidades pela sigla do estado e ordena pelo nome.
- `numero` converte o texto brasileiro do TSE. `1.234,5` vira o número `1234.5`, para a tela poder ordenar e formatar.

#### `dashboard/requirements.txt` — as bibliotecas do painel

O objetivo deste arquivo é dizer ao `pip` o que instalar dentro de `.venv`. O comando está em [Como abrir o painel](#como-abrir-o-painel):

```powershell
.\.venv\Scripts\python.exe -m pip install -r dashboard\requirements.txt
```

Cada linha é uma biblioteca e a versão mínima. O sinal `>=` significa “esta versão ou uma mais nova”. O arquivo pede três nomes. Outras pastas aparecem dentro de `.venv` porque o Streamlit precisa delas para funcionar. Eu não as uso direto no painel, então elas não estão nesta lista.

**Streamlit (`streamlit>=1.39`).** É o programa que transforma `app.py` numa página no navegador. Eu não escrevo HTML de servidor nem JavaScript para os menus. Eu chamo funções do Streamlit e ele monta a página, abre uma porta neste computador (em geral `8501`) e recarrega a tela quando o arquivo muda.

No painel, o Streamlit faz o seguinte:

- `set_page_config` abre a página larga, com o título “Mapa da apuração 2026”.
- `session_state` guarda turno, cargo, cor, estado, cidade e o contador da atualização.
- `selectbox` e `button` são os menus de cima e a busca da cidade.
- `columns` divide o mapa e o painel.
- `plotly_chart` coloca o desenho do Plotly na coluna do mapa e devolve o clique.
- `cache_data` guarda uma cópia do que já foi lido. O andamento e os votos do lugar aberto duram 30 segundos. Quem lidera nos estados dura 3 minutos. A tabela de cidades dura 6 horas. O contorno leve dos estados dura enquanto o painel está aberto. Sem essa cópia, cada passagem da tela baixaria o país inteiro de novo e o computador travaria.
- `fragment` com `run_every` de 30 segundos repete só a função `tela`. Os menus não são reconstruídos nessa passagem.
- `spinner`, `caption`, `error` e `markdown` mostram a espera, o horário do arquivo, a falha de leitura e o HTML do painel.

A versão mínima `1.39` é a que já tem o fragmento com repetição automática. Neste computador a instalação ficou na linha 1.65.

**requests (`requests>=2.32`).** É a biblioteca que faz o pedido HTTP. No painel, um pedido é uma frase só: “me entregue este endereço”. `leitura_tse.py` chama `requests.get` com o endereço montado, um tempo limite de 25 segundos e o identificador `painel-apuracao-2026`. A resposta chega como texto. `resposta.json()` transforma esse texto na estrutura que `ler_andamento` e `ler_votos` leem.

Eu uso o requests porque o Python puro também consegue pedir um endereço, mas com mais código para tempo limite, erro de rede e leitura do JSON. O requests devolve o código HTTP (`200` quando o arquivo existe, `404` quando o turno ainda não foi publicado) e deixa o painel decidir o aviso. A versão `2.32` é uma linha estável dessa biblioteca. A instalação deste computador ficou na 2.34.

**Plotly (`plotly>=5.24`).** É a biblioteca que desenha o mapa dentro da página do Streamlit. O painel usa o módulo `plotly.graph_objects`. Cada estado vira um traço do tipo dispersão (`Scatter`) com a área preenchida. Os eixos são a longitude e a latitude, no retângulo que cobre o Brasil, com a mesma escala nos dois. A barra de ferramentas do Plotly fica escondida.

Eu uso essa forma preenchida, e não o mapa-múndi que o Plotly também oferece, porque o mapa-múndi carregava o desenho completo do mundo junto com os 5 mil pontos do GeoJSON e a tela travava. O arquivo `brasil-estados.geojson` continua na pasta `data`. O Plotly recebe só o contorno já reduzido por `contornos_leves`. A versão mínima `5.24` traz esse desenho de área. A instalação deste computador ficou na linha 7.

O que o `requirements.txt` não lista também importa. `json`, `pathlib`, `html`, `datetime` e `concurrent.futures` já vêm com o Python. Eles leem o GeoJSON, acham a pasta do projeto, escapam o texto da tela, contam os 30 segundos e baixam dois estados ao mesmo tempo. `unicodedata`, em `leitura_tse.py`, tira o acento da sigla do partido antes de comparar com a lista vermelha.

### O caminho de uma escolha

Exemplo: 1º turno, Presidente, Brasil, cor por quem lidera.

1. `app.py` lê o turno e o cargo.
2. `leitura_tse.py` monta o andamento `br-e006257-ab.json` e os votos `br-c0001-e006257-u.json`.
3. O painel copia a linha `br` do andamento. O **Percentual** é o `pstn` dessa linha.
4. A lista mostra os candidatos do arquivo de votos, do mais votado para o menos votado.
5. Para pintar o Brasil, o painel pede o arquivo de votos de cada estado, 2 por vez, guarda essa leitura por 3 minutos e pinta o estado com a cor do partido de quem está na frente.

Se eu mudo **Ir para** para Acre, o percentual do Brasil sai. O painel lê `ac-e006257-ab.json` e usa a linha `ac`. Os votos passam a ser os do Acre. Se eu busco uma cidade, o painel usa a linha daquela cidade no andamento do Acre e o arquivo de votos daquela cidade. Ao voltar com **Ver o Brasil**, entra de novo só a linha `br`.

Quem lidera, em cada estado, é a pessoa com mais votos naquele arquivo. Se ninguém tem voto, o estado fica bege. No modo **Percentual apurado**, o bege é pouco contado e o verde é tudo contado. Quando a apuração já está perto de 100% em todo o país, o mapa fica verde por inteiro. A diferença entre os candidatos fica na lista e, no outro modo de cor, no vermelho e no azul.

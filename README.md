# Flappy Bird 2D

Clone **inspirado** no clássico de flappy bird, feito para o navegador com HTML5 Canvas. Arte e sons são **originais** (formas desenhadas no canvas) — este projeto **não** usa sprites, áudio nem a marca oficial do Flappy Bird.

Jogo de uma página: abra o `index.html` e jogue. Sem build.

## Como jogar

- **Clique**, **toque** na tela ou pressione **Espaço** (também ↑ / W) para bater as asas.
- Passe pelos vãos entre as colunas. Cada vão vale 1 ponto.
- Se bater numa coluna ou no chão, o jogo acaba. Toque de novo para voltar à tela inicial.
- O **recorde** fica salvo no navegador (`localStorage`).
- Pressione **M** (ou toque no canto inferior esquerdo) para ligar/desligar o som.

## Como rodar

### No computador

1. Clone o repositório:

   ```bash
   git clone https://github.com/JulioDevEnviagora/flappy-bird-2d.git
   cd flappy-bird-2d
   ```

2. Abra o arquivo `index.html` no navegador (dois cliques bastam).

   Se o navegador bloquear `localStorage` em arquivo local, sirva a pasta:

   ```bash
   python3 -m http.server 8080
   ```

   Depois acesse [http://localhost:8080](http://localhost:8080).

### No celular

Abra o mesmo `index.html` (ou a URL do GitHub Pages). O canvas se ajusta à tela. Toque para voar.

## Jogar online (GitHub Pages)

Já no ar:

**https://juliodevenviagora.github.io/flappy-bird-2d/**

O site publica a pasta raiz (`/`) da branch `main`. Se a página cair, em **Settings → Pages** escolha Deploy from a branch → `main` / `/` (root) → Save.

## Estrutura

```
index.html      # página do jogo
css/styles.css  # layout responsivo
js/game.js      # física, colisão, HUD, recorde, som
favicon.svg     # ícone original
```

## Créditos

Feito como clone inspirado para estudo e diversão. Flappy Bird é marca de seus respectivos donos.

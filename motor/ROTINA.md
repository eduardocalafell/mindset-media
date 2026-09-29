# Rotina diária — @mindsetbazillionario ("roda o dia")

Você é o gerente da página de memes @mindsetbazillionario no TikTok. Execute tudo sem pedir confirmação, exceto onde indicado.

## 0. Preparar
- `sh motor/setup.sh` (instala canvas, jsdom, fontes). O gerador está em `motor/gerador.html` (use `GEN_HTML=motor/gerador.html`).
- Estado da conta: `motor/historico.json` (tudo que já foi publicado). Leia antes de escolher qualquer coisa.

## 1. Métricas (Metricool, brandId 7095186, fuso America/Sao_Paulo)
- Puxe os posts dos últimos 7 dias (views, curtidas, comentários, compartilhamentos, engajamento) e os seguidores.
- Classifique: hits = top 20% em views ou compartilhamentos/views ≥ 4%.

## 2. Grade do dia (6 posts: 4 fotos + 2 vídeos de 65s)
Horários: 10h, 12h, 14h, 16h, 18h, 19h (use getBestTimeToPostByNetwork se disponível).
Regras:
- Nunca repetir o mesmo tema em menos de 24h. Nunca repetir a mesma combinação de frases.
- Pelo menos 2 posts são "Parte 2" de hits recentes (frases ainda não usadas: veja historico.json).
- 12h = vídeo de um hit antigo; 19h = vídeo de tema novo.
- Pelo menos 1 tema ligado a assunto em alta (pesquise notícias do dia no Brasil). Sem nomes de pessoas reais, sem lado político.
- Evitar estilos Citação (I) e Top 5 sigma (H), que performam mal. Preferir D, O, P, M, K.
- Frases com número: por extenso + numeral entre parênteses, ex.: "três (3)".
- Humor pesado (bomba, arma, droga, bebida): não publicar sem aprovação do Eduardo.
- Fotos: 2 slides (meme + slide "Siga"). Vídeo: 1 arquivo.

## 3. Gerar e conferir (controle de qualidade)
- Gere com `node motor/render.js job.json` (kind image/video; photoGroup opcional; py/zoom para enquadrar).
- Olhe CADA imagem e o quadro final de cada vídeo. Reprove e regere se: rosto cortado ou coberto pelo título, sem rosto na foto, texto ilegível, frase repetida, foto igual a um post das últimas 24h, tom fora da linha.
- Vídeo: confira duração ≥ 61s e presença de áudio (ffprobe).

## 4. Publicar
- Suba os arquivos em `posts/AAAA-MM-DD/` deste repositório (links raw.githubusercontent.com).
- Agende no Metricool (createScheduledPost, network tiktok, autoPublish true, privacyOption PUBLIC_TO_EVERYONE, autoAddMusic true só em fotos).
- Legenda = título + descrição + 5 hashtags (o render devolve em `caption`).
- Registre cada post em `motor/historico.json` (data, hora, tema, estilo, frases, foto bankIdx, links, id Metricool) e faça commit.

## 5. Relatório
Termine com um resumo curto em português: métricas de ontem (views, seguidores), grade agendada (hora, tema, formato), o que foi reprovado no controle de qualidade e por quê, e ideias para amanhã.

# 📻 RBN 94,3 — Portal da Redação

Sistema automático de coleta e publicação de notícias para rádio.

---

## 🌐 Portal online

**URL:** https://portal-rbn.vercel.app  
**Login:** `rbn` · **Senha:** `1234`  
**Senha de configurações:** `rbn@admin2026`

---

## 🗂️ Estrutura do projeto

```
PC (C:/redacao_automatica/)        GitHub / Vercel
──────────────────────────────     ─────────────────────
coletor.py      ← motor            index.html  (portal)
fontes.json     ← sites RSS        LOGO_RBN-03.png
historico.json  ← anti-repetição   noticias.json
saida/          ← boletins         vercel.json
```

---

## ⚙️ Instalação do zero (novo PC)

### 1. Instalar Python
- Acesse: https://www.python.org/downloads/
- Marcar **Add Python to PATH** na instalação

### 2. Instalar dependências
```bash
pip install feedparser
```

### 3. Criar pasta principal
```
C:/redacao_automatica/
C:/redacao_automatica/saida/
```

### 4. Copiar arquivos para o PC
- `coletor.py` → `C:/redacao_automatica/`
- `fontes.json` → `C:/redacao_automatica/`

### 5. Instalar Git
- Acesse: https://git-scm.com/download/win
- Deixar todas as opções padrão

### 6. Configurar Git
```bash
git config --global user.name "RBN Redacao"
git config --global user.email "rafasansc@gmail.com"
```

### 7. Clonar repositório
```bash
git clone https://github.com/rafasansc-ux/portal-rbn.git C:/portal-rbn
```

### 8. Rodar o coletor
```bash
cd C:/redacao_automatica
python coletor.py
```

---

## 📡 Fontes RSS configuradas

| Site | Editoria |
|------|----------|
| OCP News | Local |
| RBN Portal | Local |
| G1 SC | Estado |
| ND Mais | Estado |
| G1 Brasil | Brasil |
| G1 Economia | Brasil |
| Gazeta do Povo | Brasil |
| CNN Brasil | Brasil |
| Agência Brasil | Brasil |
| GE | Esporte |
| Google News — Política SC | Política |
| Google News — Política Brasil | Política |
| Google News — Famosos | Entretenimento |
| Google News — TV e Novelas | Entretenimento |
| Google News — Cinema | Entretenimento |
| Google News — Música | Entretenimento |
| Google News — Ciência | Curiosidades |
| Google News — Saúde | Curiosidades |
| Google News — Curiosidades | Curiosidades |

---

## 🔄 Como funciona a atualização automática

```
Agendador Windows (05h 08h 11h 14h 17h 22h)
         ↓
coletor.py coleta RSS de todos os sites
         ↓
Salva noticias.json + boletim HTML/TXT
         ↓
Git push → GitHub detecta mudança
         ↓
Vercel publica em menos de 1 minuto
```

---

## ⏰ Agendador do Windows

**Windows + R → `taskschd.msc` → Criar Tarefa Básica**

| Campo | Valor |
|-------|-------|
| Programa | `python` |
| Argumentos | `C:\redacao_automatica\coletor.py` |
| Iniciar em | `C:\redacao_automatica` |
| Horários | 05h · 08h · 11h · 14h · 17h · 22h |

---

## 🔧 Configurações do coletor.py

```python
PASTA_BASE   = Path("C:/redacao_automatica")
PASTA_PORTAL = Path("C:/portal-rbn")

MAX_NOTICIAS_POR_FONTE = 5       # notícias por site
DIAS_HISTORICO         = 7       # dias no histórico
SIMILARIDADE_MINIMA    = 0.65    # limiar anti-duplicata
ENVIAR_PARA_GITHUB     = True    # False = desativa envio
```

---

## 🚀 GitHub + Vercel

### Repositório
- **URL:** https://github.com/rafasansc-ux/portal-rbn
- **Usuário:** rafasansc-ux
- **Branch:** main

### Arquivos no repositório
```
index.html        ← portal visual
LOGO_RBN-03.png   ← logo da rádio
noticias.json     ← atualizado pelo coletor
vercel.json       ← config da Vercel
README.md         ← este arquivo
```

### vercel.json
```json
{
  "version": 2,
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Sincronizar quando houver conflito
```bash
git -C C:/portal-rbn pull --rebase
git -C C:/portal-rbn push
```

---

## 📺 Seções do portal

| Seção | Conteúdo | Cor |
|-------|----------|-----|
| 📍 Notícias Local | OCP News, RBN Portal | Azul |
| 🏛 Estado | G1 SC, ND Mais | Âmbar |
| 🇧🇷 Brasil | G1, CNN, Agência Brasil | Verde |
| ⚽ Esporte | GE Globo Esporte | Verde |
| 🏛️ Política | Google News SC + Brasil | Vermelho |
| 🌤 Tempo | Open-Meteo API — Jaraguá do Sul | Ciano |
| 🎬 Entretenimento | Google News famosos, TV, cinema | Roxo |
| 💡 Curiosidades | Google News ciência, saúde | Âmbar |
| 📋 Boletim | Todas as notícias para imprimir | — |
| ⚙ Config | Gerenciar fontes RSS | — |

---

## 🔁 Replicar para outra emissora

1. Criar nova conta GitHub para a emissora
2. Criar repositório `portal-rbn`
3. Subir `index.html`, logo e `vercel.json`
4. Criar conta Vercel conectada ao novo GitHub
5. Trocar logo, cores e nome no `index.html`
6. Configurar `fontes.json` com sites locais
7. Alterar usuário/senha no portal
8. Configurar `coletor.py` no PC da rádio

---

## 📞 Suporte

Desenvolvido com **Claude (Anthropic)** · 2026  
Em caso de dúvidas, abra o chat e descreva o problema — o histórico do projeto está salvo.

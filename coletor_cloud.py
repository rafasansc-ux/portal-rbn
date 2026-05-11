"""
coletor_cloud.py — RBN 94,3
Versão para GitHub Actions — roda na nuvem automaticamente

Diferenças do coletor.py local:
- Usa caminhos relativos (funciona no servidor do GitHub)
- Não faz git push (o workflow.yml cuida disso)
- Salva noticias.json e historico.json na raiz do repositório
"""

import feedparser
import json
import re
import html
from datetime import datetime, timedelta, timezone
from pathlib import Path
from html import escape

# ══════════════════════════════════════════════════
# CONFIGURAÇÕES
# ══════════════════════════════════════════════════

# Caminhos relativos — funciona em qualquer sistema
PASTA_BASE = Path(".")
ARQUIVO_FONTES    = PASTA_BASE / "fontes.json"
ARQUIVO_HISTORICO = PASTA_BASE / "historico.json"
ARQUIVO_NOTICIAS  = PASTA_BASE / "noticias.json"

MAX_NOTICIAS_POR_FONTE = 5
DIAS_HISTORICO         = 7
SIMILARIDADE_MINIMA    = 0.65

ORDEM_EDITORIAL = ["Local", "Estado", "Brasil", "Politica", "Esporte", "Entretenimento", "Curiosidades"]

# ══════════════════════════════════════════════════
# CARREGAR FONTES
# ══════════════════════════════════════════════════

with open(ARQUIVO_FONTES, "r", encoding="utf-8") as f:
    fontes = json.load(f)

# Carregar histórico
if ARQUIVO_HISTORICO.exists():
    with open(ARQUIVO_HISTORICO, "r", encoding="utf-8") as f:
        historico_raw = json.load(f)
else:
    historico_raw = []

# Limpar histórico antigo
limite_data = datetime.now(timezone.utc) - timedelta(hours=3) - timedelta(days=DIAS_HISTORICO)
historico = [
    item for item in historico_raw
    if datetime.fromisoformat(item.get("data", "2000-01-01")) > limite_data
]
titulos_historico = [item["titulo"] for item in historico]

print(f"Histórico: {len(titulos_historico)} títulos dos últimos {DIAS_HISTORICO} dias")
print("-" * 60)

# ══════════════════════════════════════════════════
# FUNÇÕES
# ══════════════════════════════════════════════════

def limpar_html(texto):
    texto = re.sub(r"<.*?>", "", texto)
    texto = html.unescape(texto)
    texto = texto.replace("\n", " ").replace("\r", " ")
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto

def resumir_texto(texto, limite=450):
    if not texto:
        return ""
    if len(texto) <= limite:
        return texto
    texto_cortado = texto[:limite].strip()
    if "." in texto_cortado:
        texto_cortado = texto_cortado.rsplit(".", 1)[0].strip()
        if texto_cortado:
            return texto_cortado + "."
    return texto_cortado.rsplit(" ", 1)[0].strip()

def titulo_parecido(t1, t2):
    t1 = t1.lower()
    t2 = t2.lower()
    palavras1 = set(t1.split())
    palavras2 = set(t2.split())
    if not palavras1 or not palavras2:
        return False
    intersecao = palavras1.intersection(palavras2)
    similaridade = len(intersecao) / max(len(palavras1), len(palavras2))
    return similaridade > SIMILARIDADE_MINIMA

def ja_no_historico(titulo):
    for titulo_antigo in titulos_historico:
        if titulo_parecido(titulo_antigo, titulo):
            return True
    return False

# ══════════════════════════════════════════════════
# COLETA
# ══════════════════════════════════════════════════

noticias_por_editoria = {ed: {} for ed in ORDEM_EDITORIAL}
novos_titulos = []

for fonte in fontes:
    nome_fonte = fonte["nome"]
    editoria   = fonte["editoria"]
    rss        = fonte["rss"]
    ativo      = fonte.get("ativo", True)

    if not ativo:
        print(f"[IGNORADO] {nome_fonte}")
        continue

    if editoria not in noticias_por_editoria:
        print(f"[IGNORADO] {nome_fonte} — editoria '{editoria}' desconhecida")
        continue

    print(f"Lendo {nome_fonte}...", end=" ")

    try:
        feed = feedparser.parse(rss)
    except Exception as e:
        print(f"ERRO: {e}")
        continue

    noticias_por_editoria[editoria][nome_fonte] = []
    coletadas = 0

    for item in feed.entries:
        if coletadas >= MAX_NOTICIAS_POR_FONTE:
            break

        titulo = getattr(item, "title", "").strip()
        link   = getattr(item, "link",  "").strip()
        resumo = getattr(item, "summary", "").strip()

        if not titulo or not link:
            continue

        if ja_no_historico(titulo):
            continue
        if any(titulo_parecido(t, titulo) for t in novos_titulos):
            continue

        novos_titulos.append(titulo)

        resumo_limpo = limpar_html(resumo)
        resumo_final = resumir_texto(resumo_limpo)

        noticias_por_editoria[editoria][nome_fonte].append({
            "titulo":   titulo,
            "resumo":   resumo_final,
            "link":     link,
            "fonte":    nome_fonte,
            "editoria": editoria,
        })
        coletadas += 1

    print(f"{coletadas} notícias")

# ══════════════════════════════════════════════════
# SALVAR HISTÓRICO
# ══════════════════════════════════════════════════

agora_iso = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
for titulo in novos_titulos:
    historico.append({"titulo": titulo, "data": agora_iso})

with open(ARQUIVO_HISTORICO, "w", encoding="utf-8") as f:
    json.dump(historico, f, ensure_ascii=False, indent=2)

print(f"\nHistórico: {len(historico)} títulos salvos")

# ══════════════════════════════════════════════════
# SALVAR NOTICIAS.JSON
# ══════════════════════════════════════════════════

agora          = datetime.now(timezone.utc) - timedelta(hours=3)  # UTC-3 Brasília
data_formatada = agora.strftime("%d/%m/%Y")
hora_formatada = agora.strftime("%Hh%M")

total_noticias = sum(
    len(ns)
    for ed in noticias_por_editoria.values()
    for ns in ed.values()
)

dados_portal = {
    "gerado_em": agora.isoformat(),
    "data":      data_formatada,
    "hora":      hora_formatada,
    "total":     total_noticias,
    "editorias": []
}

for editoria in ORDEM_EDITORIAL:
    fontes_ed = noticias_por_editoria.get(editoria, {})
    fontes_com_dados = {k: v for k, v in fontes_ed.items() if v}
    if not fontes_com_dados:
        continue
    dados_portal["editorias"].append({
        "nome":   editoria,
        "fontes": [
            {"nome": nome, "noticias": lista}
            for nome, lista in fontes_com_dados.items()
        ]
    })

with open(ARQUIVO_NOTICIAS, "w", encoding="utf-8") as f:
    json.dump(dados_portal, f, ensure_ascii=False, indent=2)

print(f"\n✅ noticias.json salvo com {total_noticias} notícias")
print(f"   Data: {data_formatada} {hora_formatada}")

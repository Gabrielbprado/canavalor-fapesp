#!/usr/bin/env python3
"""
Gera as imagens sintéticas de demonstração do CanaValor, com ground truth.

A cena reproduz exatamente uma armação do método manual de referência —
quadro de 3,33 x 3,00 m = 10 m², 4 repetições em pontos aleatórios — vista de
cima, após a passagem da colhedora.

Cada imagem sai acompanhada de um JSON com a contagem e a massa REAL por
classe, além das caixas de cada fragmento. É esse ground truth que permite ao
protótipo exibir o erro da estimativa contra a meta do projeto (erro absoluto
médio da massa por parcela <= 15%).

Uso:  python3 scripts/gerar_amostras.py
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# --------------------------------------------------------------------------
# Geometria da cena
# --------------------------------------------------------------------------
PX_POR_CM = 5.0                    # escala conhecida e redonda: 0,2 cm por pixel
CENA_LARGURA_CM = 333.0            # lado maior da armação
CENA_ALTURA_CM = 300.0             # lado menor da armação
LARGURA = int(CENA_LARGURA_CM * PX_POR_CM)   # 1665 px
ALTURA = int(CENA_ALTURA_CM * PX_POR_CM)     # 1500 px
AREA_M2 = (CENA_LARGURA_CM / 100) * (CENA_ALTURA_CM / 100)  # 9,99 m²

PRODUTIVIDADE_T_HA = 74.4          # UNICA, Centro-Sul 2025/26

# --------------------------------------------------------------------------
# Perfis das classes — espelham src/lib/dominio.ts
# --------------------------------------------------------------------------
# `d_nom` é o diâmetro nominal do fragmento e `k_geom` o fator que corrige o
# cilindro ideal para a forma real (a ponta agrega folhas; a lasca é estilhaço
# espesso). São parâmetros da VERDADE, não do estimador.
CLASSES = {
    "inteira": dict(comp=(150, 290), larg=(2.8, 4.0), d_nom=3.4, k_geom=1.00,
                    cor=(198, 168, 96), cor_var=22, gomos=True, afilamento=0.78),
    "tolete":  dict(comp=(20, 40),   larg=(2.6, 3.9), d_nom=3.2, k_geom=1.00,
                    cor=(206, 178, 104), cor_var=24, gomos=True),
    "toco":    dict(comp=(8, 18),    larg=(3.2, 5.2), d_nom=4.5, k_geom=1.10,
                    cor=(150, 118, 74), cor_var=20, gomos=False),
    "ponta":   dict(comp=(38, 72),   larg=(1.6, 3.0), d_nom=2.2, k_geom=2.20,
                    cor=(126, 141, 78), cor_var=20, gomos=True, afilamento=0.34),
    "lasca":   dict(comp=(3, 12),    larg=(0.8, 2.4), d_nom=1.5, k_geom=1.30,
                    cor=(214, 192, 128), cor_var=28, gomos=False, afilamento=0.55),
}

# Densidade real do colmo úmido, sorteada por fragmento (g/cm³).
RHO_MEDIA, RHO_DESVIO = 1.02, 0.07

# Composição da massa perdida por classe (soma 1,0)
COMPOSICAO = {"inteira": 0.26, "tolete": 0.38, "toco": 0.16, "ponta": 0.15, "lasca": 0.05}

CENARIOS = [
    dict(id="baixa",   rotulo="Severidade baixa",   perda_pct=1.8, seed=11),
    dict(id="media",   rotulo="Severidade média",   perda_pct=3.4, seed=23),
    dict(id="alta",    rotulo="Severidade alta",    perda_pct=5.6, seed=37),
    dict(id="critica", rotulo="Severidade crítica", perda_pct=8.2, seed=53),
]


@dataclass
class Fragmento:
    classe: str
    x_cm: float
    y_cm: float
    comprimento_cm: float
    largura_cm: float
    angulo_graus: float
    massa_kg: float
    rho_g_cm3: float
    diametro_cm: float


# --------------------------------------------------------------------------
# Fundo: solo com textura fractal, sulcos de plantio e palha
# --------------------------------------------------------------------------
def ruido_fractal(h: int, w: int, rng: np.random.Generator, oitavas: int = 5) -> np.ndarray:
    """Soma de ruídos em escalas sucessivas, normalizada em [0, 1]."""
    acc = np.zeros((h, w), dtype=np.float32)
    amplitude = 1.0
    for i in range(oitavas):
        lado = max(2, 2 ** (i + 2))
        base = rng.random((lado, lado)).astype(np.float32)
        camada = np.array(
            Image.fromarray((base * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC),
            dtype=np.float32,
        ) / 255.0
        acc += camada * amplitude
        amplitude *= 0.5
    acc -= acc.min()
    return acc / max(acc.max(), 1e-6)


def desenhar_solo(rng: np.random.Generator) -> Image.Image:
    textura = ruido_fractal(ALTURA, LARGURA, rng)

    # Solo argiloso escuro, com variação de umidade dada pela textura
    seco = np.array([104, 78, 56], dtype=np.float32)
    umido = np.array([58, 42, 31], dtype=np.float32)
    campo = umido[None, None, :] + (seco - umido)[None, None, :] * textura[:, :, None]

    # Sulcos das linhas de plantio, a cada 150 cm, na horizontal
    ys = np.arange(ALTURA, dtype=np.float32)
    periodo = 150.0 * PX_POR_CM
    sulco = np.sin(2 * math.pi * (ys / periodo) + rng.random() * 6.28)
    campo *= (1.0 + 0.11 * sulco)[:, None, None]

    # Granulação fina do solo
    campo += rng.normal(0, 6.5, size=campo.shape).astype(np.float32)

    img = Image.fromarray(np.clip(campo, 0, 255).astype(np.uint8), "RGB")

    # Palha remanescente: traços finos e claros, espalhados
    palha = Image.new("RGBA", (LARGURA, ALTURA), (0, 0, 0, 0))
    dp = ImageDraw.Draw(palha)
    for _ in range(rng.integers(850, 1300)):
        x, y = rng.random() * LARGURA, rng.random() * ALTURA
        comp = rng.uniform(8, 46) * PX_POR_CM / 5
        ang = rng.random() * math.pi
        tom = int(rng.integers(120, 186))
        dp.line(
            [(x, y), (x + comp * math.cos(ang), y + comp * math.sin(ang))],
            fill=(tom, int(tom * 0.86), int(tom * 0.58), int(rng.integers(45, 115))),
            width=int(rng.integers(1, 3)),
        )
    return Image.alpha_composite(img.convert("RGBA"), palha)


# --------------------------------------------------------------------------
# Fragmentos: cápsula com sombreamento cilíndrico, gomos e sombra projetada
# --------------------------------------------------------------------------
def desenhar_fragmento(f: Fragmento, rng: np.random.Generator) -> Image.Image:
    perfil = CLASSES[f.classe]
    comp_px = max(4, int(f.comprimento_cm * PX_POR_CM))
    larg_px = max(3, int(f.largura_cm * PX_POR_CM))

    base = np.array(perfil["cor"], dtype=np.float32)
    base = base + rng.normal(0, perfil["cor_var"], 3).astype(np.float32)

    # Sombreamento cilíndrico: brilho cai do eixo para a borda
    v = np.linspace(-1, 1, larg_px, dtype=np.float32)
    perfil_cil = np.sqrt(np.clip(1 - v * v, 0, 1))
    brilho = 0.62 + 0.55 * perfil_cil                       # eixo mais claro

    # Gradiente longitudinal suave, simulando iluminação oblíqua
    u = np.linspace(0, 1, comp_px, dtype=np.float32)
    brilho_long = 0.92 + 0.16 * u

    campo = base[None, None, :] * brilho[:, None, None] * brilho_long[None, :, None]

    # Gomos: anéis transversais mais escuros a cada ~15 cm
    if perfil["gomos"] and f.comprimento_cm > 14:
        passo = int(rng.uniform(12, 19) * PX_POR_CM)
        for gx in range(passo, comp_px, passo):
            largura_no = max(1, int(PX_POR_CM * 0.7))
            campo[:, max(0, gx - largura_no):gx + largura_no, :] *= 0.74

    if f.classe == "lasca":  # fibra exposta, mais irregular
        campo *= (1 + rng.normal(0, 0.09, campo.shape[:2]))[:, :, None]

    campo += rng.normal(0, 5.0, campo.shape).astype(np.float32)
    corpo = Image.fromarray(np.clip(campo, 0, 255).astype(np.uint8), "RGB")

    # Máscara do contorno. A ponta afila ao longo do comprimento — sem isso ela
    # sai como uma fita de largura constante, que não se parece com nada em campo.
    mascara = Image.new("L", (comp_px, larg_px), 0)
    dm = ImageDraw.Draw(mascara)
    afilamento = perfil.get("afilamento", 1.0)

    if afilamento >= 0.99:
        dm.rounded_rectangle([0, 0, comp_px - 1, larg_px - 1], radius=larg_px // 2, fill=255)
    else:
        meio = larg_px / 2
        passos = max(8, comp_px // 6)
        contorno_sup, contorno_inf = [], []
        for k in range(passos + 1):
            u = k / passos
            # largura decresce suavemente da base ao ápice
            fator = 1.0 - (1.0 - afilamento) * (u ** 0.85)
            metade = max(0.6, meio * fator)
            x = u * (comp_px - 1)
            contorno_sup.append((x, meio - metade))
            contorno_inf.append((x, meio + metade))
        dm.polygon(contorno_sup + contorno_inf[::-1], fill=255)

    peca = Image.new("RGBA", (comp_px, larg_px), (0, 0, 0, 0))
    peca.paste(corpo, (0, 0), mascara)

    # Curvatura: um colmo de dois metros caído no solo tem flecha. É também o
    # caso que o estimador de comprimento por modelo de fibra existe para tratar.
    if f.comprimento_cm > 60:
        flecha = int(larg_px * rng.uniform(0.8, 2.6))
        if flecha > 1:
            curvo = Image.new("RGBA", (comp_px, larg_px + 2 * flecha), (0, 0, 0, 0))
            for x in range(comp_px):
                u = x / max(1, comp_px - 1)
                desvio = int(flecha * math.sin(math.pi * u))
                faixa = peca.crop((x, 0, x + 1, larg_px))
                curvo.paste(faixa, (x, flecha + desvio - flecha // 2))
            peca = curvo

    if f.classe == "ponta":
        peca = desenhar_folhas(peca, f, rng)

    return peca.rotate(-f.angulo_graus, expand=True, resample=Image.BICUBIC)


def desenhar_folhas(peca: Image.Image, f: Fragmento, rng: np.random.Generator) -> Image.Image:
    """
    Lâminas foliares na ponta.

    Uma ponta de cana não é uma haste lisa: é o ápice com o feixe de folhas
    ainda preso. Sem elas, a peça sintética se parece com uma fita verde e
    denuncia a cena. As folhas também explicam por que a massa da ponta não
    fecha com o volume de um cilindro puro — o fator de forma da classe.
    """
    comp_px = int(f.comprimento_cm * PX_POR_CM)
    larg_px = int(f.largura_cm * PX_POR_CM)
    margem = int(comp_px * 0.5)

    tela = Image.new("RGBA", (peca.width + margem, peca.height + 2 * margem), (0, 0, 0, 0))
    tela.alpha_composite(peca, (0, margem))
    d = ImageDraw.Draw(tela)

    base_y = margem + peca.height // 2
    for _ in range(rng.integers(3, 6)):
        # As folhas partem do terço apical e divergem, com leve curvatura
        origem_x = int(comp_px * rng.uniform(0.55, 0.95))
        comprimento = comp_px * rng.uniform(0.28, 0.55)
        angulo = rng.uniform(-0.85, 0.85)
        curva = rng.uniform(-0.35, 0.35)
        largura_folha = max(2, int(larg_px * rng.uniform(0.28, 0.5)))

        pontos_sup, pontos_inf = [], []
        passos = 14
        for k in range(passos + 1):
            u = k / passos
            x = origem_x + comprimento * u * math.cos(angulo + curva * u)
            y = base_y + comprimento * u * math.sin(angulo + curva * u)
            meia = largura_folha * (1 - u * 0.92) / 2
            pontos_sup.append((x, y - meia))
            pontos_inf.append((x, y + meia))

        tom = int(rng.integers(96, 152))
        d.polygon(
            pontos_sup + pontos_inf[::-1],
            fill=(int(tom * 0.78), tom, int(tom * 0.52), int(rng.integers(200, 245))),
        )
    return tela


def compor(fundo: Image.Image, fragmentos: list[Fragmento], rng) -> Image.Image:
    cena = fundo.copy()
    camada_sombra = Image.new("RGBA", cena.size, (0, 0, 0, 0))

    pecas = []
    for f in fragmentos:
        peca = desenhar_fragmento(f, rng)
        cx = int(f.x_cm * PX_POR_CM - peca.width / 2)
        cy = int(f.y_cm * PX_POR_CM - peca.height / 2)
        pecas.append((f, peca, cx, cy))

        sombra = Image.new("RGBA", peca.size, (0, 0, 0, 0))
        sombra.paste((14, 10, 8, 128), (0, 0), peca.split()[3])
        camada_sombra.alpha_composite(sombra, (cx + 7, cy + 9))

    cena = Image.alpha_composite(cena, camada_sombra.filter(ImageFilter.GaussianBlur(5)))
    for _f, peca, cx, cy in pecas:
        cena.alpha_composite(peca, (cx, cy))
    return cena


# A escala NÃO é desenhada sobre a imagem: uma régua pintada na cena vira um
# fragmento claro e alongado, que o pipeline detecta como toco. A interface
# exibe a barra de escala como sobreposição, a partir do metadado px_por_cm.


# --------------------------------------------------------------------------
# Amostragem dos fragmentos até atingir a massa alvo de cada classe
# --------------------------------------------------------------------------
def massa_verdadeira(perfil: dict, comp_cm: float, rng: np.random.Generator):
    """
    Massa REAL do fragmento, por volume de cilindro com densidade e diâmetro
    sorteados individualmente:

        m = rho x pi x (d/2)^2 x L x k_geom

    Deliberadamente diferente do modelo que o estimador de visão usa (densidade
    superficial sobre a área projetada). Se ambos fossem o mesmo modelo, o erro
    medido tenderia a zero por construção e a validação não significaria nada.
    """
    rho = max(0.75, rng.normal(RHO_MEDIA, RHO_DESVIO))
    diam = max(0.4, rng.normal(perfil["d_nom"], perfil["d_nom"] * 0.09))
    volume_cm3 = math.pi * (diam / 2) ** 2 * comp_cm * perfil["k_geom"]
    return rho * volume_cm3 / 1000, rho, diam


def amostrar(perda_pct: float, rng: np.random.Generator) -> list[Fragmento]:
    """
    Sorteia fragmentos até a massa alvo de cada classe.

    A última peça de cada classe entra por arredondamento estocástico — com
    probabilidade igual à fração do alvo que ainda resta. Isso evita o viés de
    sempre incluir (ou sempre descartar) a peça que ultrapassa o alvo, o que
    importa muito aqui, onde uma cana inteira sozinha pode pesar mais do que
    toda a cota da sua classe.
    """
    massa_colhida_kg = PRODUTIVIDADE_T_HA * 1000 * (AREA_M2 / 10_000)
    massa_perdida_kg = massa_colhida_kg * perda_pct / 100

    fragmentos: list[Fragmento] = []
    for classe, fracao in COMPOSICAO.items():
        perfil = CLASSES[classe]
        alvo = massa_perdida_kg * fracao
        acumulado = 0.0

        for _ in range(4000):
            restante = alvo - acumulado
            if restante <= 0:
                break

            comp = rng.uniform(*perfil["comp"])
            larg = rng.uniform(*perfil["larg"])
            massa, rho, diam = massa_verdadeira(perfil, comp, rng)

            if massa > restante and rng.random() > restante / massa:
                break

            margem = comp / 2 + 4
            fragmentos.append(
                Fragmento(
                    classe=classe,
                    x_cm=rng.uniform(margem, CENA_LARGURA_CM - margem),
                    y_cm=rng.uniform(margem, CENA_ALTURA_CM - margem),
                    comprimento_cm=round(comp, 2),
                    largura_cm=round(larg, 2),
                    angulo_graus=round(rng.uniform(0, 180), 1),
                    massa_kg=round(massa, 5),
                    rho_g_cm3=round(rho, 4),
                    diametro_cm=round(diam, 3),
                )
            )
            acumulado += massa

    rng.shuffle(fragmentos)  # ordem de desenho embaralhada, para sobreposição natural
    return fragmentos


def amostrar_calibrado(
    perda_pct: float, seed: int, tentativas: int = 600
) -> tuple[list[Fragmento], np.random.Generator]:
    """
    Repete a amostragem com sementes derivadas e fica com a cena cuja perda
    efetiva mais se aproxima do alvo. Determinístico: a mesma `seed` produz
    sempre a mesma cena.
    """
    massa_alvo = PRODUTIVIDADE_T_HA * 1000 * (AREA_M2 / 10_000) * perda_pct / 100

    melhor: list[Fragmento] = []
    melhor_seed = seed
    melhor_desvio = float("inf")

    for i in range(tentativas):
        candidatos = amostrar(perda_pct, np.random.default_rng(seed * 1000 + i))
        desvio = abs(sum(f.massa_kg for f in candidatos) - massa_alvo) / massa_alvo
        if desvio < melhor_desvio:
            melhor, melhor_desvio, melhor_seed = candidatos, desvio, seed * 1000 + i
        if desvio < 0.005:
            break

    # rng dedicado à renderização, independente do que foi consumido na busca
    return melhor, np.random.default_rng(melhor_seed + 7_000_000)


def ground_truth(cenario: dict, fragmentos: list[Fragmento]) -> dict:
    por_classe = {}
    for c in CLASSES:
        do_tipo = [f for f in fragmentos if f.classe == c]
        por_classe[c] = {
            "contagem": len(do_tipo),
            "massa_kg": round(sum(f.massa_kg for f in do_tipo), 4),
        }

    massa_total = sum(f.massa_kg for f in fragmentos)
    massa_colhida = PRODUTIVIDADE_T_HA * 1000 * (AREA_M2 / 10_000)

    return {
        "id": cenario["id"],
        "rotulo": cenario["rotulo"],
        "arquivo": f"talhao-{cenario['id']}.png",
        "cena": {
            "largura_px": LARGURA,
            "altura_px": ALTURA,
            "px_por_cm": PX_POR_CM,
            "cm_por_px": round(1 / PX_POR_CM, 6),
            "largura_cm": CENA_LARGURA_CM,
            "altura_cm": CENA_ALTURA_CM,
            "area_m2": round(AREA_M2, 4),
            "nota": "Cena equivalente a uma armação do método manual (3,33 x 3,00 m).",
        },
        "referencia": {
            "produtividade_t_ha": PRODUTIVIDADE_T_HA,
            "perda_pct_alvo": cenario["perda_pct"],
            "massa_colhida_equivalente_kg": round(massa_colhida, 4),
        },
        "modelo_verdade": {
            "formula": "m = rho x pi x (d/2)^2 x L x k_geom",
            "rho_media_g_cm3": RHO_MEDIA,
            "rho_desvio": RHO_DESVIO,
            "nota": (
                "Independente do modelo do estimador (densidade superficial sobre "
                "area projetada). O erro medido pelo prototipo e, portanto, real."
            ),
        },
        "real": {
            "por_classe": por_classe,
            "massa_total_kg": round(massa_total, 4),
            "contagem_total": len(fragmentos),
            "perda_kg_ha": round(massa_total / AREA_M2 * 10_000, 2),
            "perda_pct_efetiva": round(massa_total / massa_colhida * 100, 4),
        },
        "fragmentos": [asdict(f) for f in fragmentos],
    }


def main() -> None:
    destino = Path(__file__).resolve().parent.parent / "public" / "samples"
    destino.mkdir(parents=True, exist_ok=True)

    indice = []
    for cenario in CENARIOS:
        fragmentos, rng = amostrar_calibrado(cenario["perda_pct"], cenario["seed"])

        cena = compor(desenhar_solo(rng), fragmentos, rng)
        cena.convert("RGB").save(destino / f"talhao-{cenario['id']}.png", optimize=True)

        gt = ground_truth(cenario, fragmentos)
        (destino / f"talhao-{cenario['id']}.gt.json").write_text(
            json.dumps(gt, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        indice.append({k: gt[k] for k in ("id", "rotulo", "arquivo")} |
                      {"perda_pct": gt["real"]["perda_pct_efetiva"],
                       "massa_kg": gt["real"]["massa_total_kg"],
                       "fragmentos": gt["real"]["contagem_total"]})

        print(f"  {cenario['id']:8s}  {len(fragmentos):3d} fragmentos  "
              f"{gt['real']['massa_total_kg']:6.2f} kg  "
              f"{gt['real']['perda_pct_efetiva']:5.2f}%  "
              f"{gt['real']['perda_kg_ha']:8.1f} kg/ha")

    (destino / "index.json").write_text(
        json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nGerado em {destino} ({LARGURA}x{ALTURA} px, {PX_POR_CM} px/cm)")


if __name__ == "__main__":
    main()

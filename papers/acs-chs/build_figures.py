#!/usr/bin/env python3
"""Build Figure 1 (architecture) and Figure 6 (workflow comparison) for ACS CHS paper."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np


def build_architecture_diagram():
    """Figure 1: Three-tier architecture with adapters and data flow."""
    fig, ax = plt.subplots(figsize=(7.5, 5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    # Colors
    C_BROWSER = "#4A90D9"
    C_SERVER = "#1B3A5C"
    C_CACHE = "#6B8E23"
    C_EXT = "#D4763A"
    C_LLM = "#8B5CF6"
    C_ADAPTER = "#E8E8E8"
    C_ARROW = "#666666"
    FONT = "sans-serif"

    # === TIER 1: Browser (left) ===
    rect = FancyBboxPatch((2, 30), 18, 38, boxstyle="round,pad=1.5",
                          facecolor=C_BROWSER, edgecolor="none", alpha=0.9)
    ax.add_patch(rect)
    ax.text(11, 60, "Browser UI", ha="center", va="center",
            fontsize=8, fontweight="bold", color="white", fontfamily=FONT)
    ax.text(11, 55, "Next.js", ha="center", va="center",
            fontsize=6, color="#B8D4F0", fontfamily=FONT)
    tabs = ["MSDS", "Regulatory", "Patents", "Pharma", "AI Report"]
    for i, tab in enumerate(tabs):
        y = 50 - i * 3.5
        ax.text(11, y, tab, ha="center", va="center",
                fontsize=5, color="#D0E4F7", fontfamily=FONT)

    # Arrow browser -> server
    ax.annotate("", xy=(26, 50), xytext=(21, 50),
                arrowprops=dict(arrowstyle="->,head_width=0.25,head_length=0.15",
                                color=C_ARROW, lw=1))
    ax.text(23.5, 52.5, "REST API", ha="center", va="center",
            fontsize=4.5, color=C_ARROW, fontfamily=FONT, style="italic")

    # === TIER 2: Server (center) ===
    # Server box
    rect = FancyBboxPatch((26, 25), 30, 50, boxstyle="round,pad=1.5",
                          facecolor=C_SERVER, edgecolor="none")
    ax.add_patch(rect)
    ax.text(41, 71, "FastAPI Server", ha="center", va="center",
            fontsize=8, fontweight="bold", color="white", fontfamily=FONT)
    ax.text(41, 67, "Query Orchestration", ha="center", va="center",
            fontsize=6, color="#A0C4E8", fontfamily=FONT)

    # Adapter boxes inside server
    adapters = [
        ("KOSHA\nAdapter", 30, 57),
        ("KIPRIS\nAdapter", 30, 47),
        ("MFDS\nAdapter", 30, 37),
        ("KISCHEM/NCIS\nAdapter", 43, 57),
        ("OpenFDA\nAdapter", 43, 47),
        ("PubMed\nAdapter", 43, 37),
    ]
    for label, x, y in adapters:
        rect = FancyBboxPatch((x, y - 3.5), 11, 7, boxstyle="round,pad=0.8",
                              facecolor="#2A5080", edgecolor="#4A90D9", linewidth=0.5)
        ax.add_patch(rect)
        ax.text(x + 5.5, y, label, ha="center", va="center",
                fontsize=4.2, color="white", fontfamily=FONT, linespacing=0.85)

    # Retry/Fallback label
    ax.text(41, 30, "Retry + Fallback Layer", ha="center", va="center",
            fontsize=5.5, color="#A0C4E8", fontfamily=FONT, style="italic")

    # === TIER 3: External Sources (right) ===
    sources = [
        ("KOSHA API", C_EXT),
        ("KIPRIS API", C_EXT),
        ("MFDS API", C_EXT),
        ("KISCHEM", C_EXT),
        ("NCIS", C_EXT),
        ("OpenFDA", C_EXT),
        ("PubMed", C_EXT),
    ]
    start_y = 70
    for i, (name, color) in enumerate(sources):
        y = start_y - i * 6.5
        rect = FancyBboxPatch((64, y - 2.5), 16, 5, boxstyle="round,pad=1",
                              facecolor=color, edgecolor="none", alpha=0.85)
        ax.add_patch(rect)
        ax.text(72, y, name, ha="center", va="center",
                fontsize=5, fontweight="bold", color="white", fontfamily=FONT)

    # Arrow server -> external
    ax.annotate("", xy=(63, 50), xytext=(57, 50),
                arrowprops=dict(arrowstyle="<->,head_width=0.2,head_length=0.12",
                                color=C_ARROW, lw=0.8))
    ax.text(60, 53, "XML/JSON", ha="center", va="center",
            fontsize=4.5, color=C_ARROW, fontfamily=FONT, style="italic")

    # === Bottom: Cache + LLM ===
    # Cache
    rect = FancyBboxPatch((26, 8), 14, 12, boxstyle="round,pad=1.2",
                          facecolor=C_CACHE, edgecolor="none", alpha=0.85)
    ax.add_patch(rect)
    ax.text(33, 16, "Local Cache", ha="center", va="center",
            fontsize=6, fontweight="bold", color="white", fontfamily=FONT)
    ax.text(33, 12, "SQLite + MSDS", ha="center", va="center",
            fontsize=5, color="#D4E8A0", fontfamily=FONT)

    # Arrow server <-> cache
    ax.annotate("", xy=(37, 24), xytext=(37, 21),
                arrowprops=dict(arrowstyle="<->,head_width=0.2,head_length=0.12",
                                color=C_ARROW, lw=0.8))

    # LLM
    rect = FancyBboxPatch((44, 8), 14, 12, boxstyle="round,pad=1.2",
                          facecolor=C_LLM, edgecolor="none", alpha=0.85)
    ax.add_patch(rect)
    ax.text(51, 16, "LLM (Ollama)", ha="center", va="center",
            fontsize=6, fontweight="bold", color="white", fontfamily=FONT)
    ax.text(51, 12, "Safety Synthesis", ha="center", va="center",
            fontsize=5, color="#D4C4F0", fontfamily=FONT)

    # Arrow server <-> LLM
    ax.annotate("", xy=(49, 24), xytext=(49, 21),
                arrowprops=dict(arrowstyle="<->,head_width=0.2,head_length=0.12",
                                color=C_ARROW, lw=0.8))

    # === Tier Labels ===
    ax.text(11, 93, "Presentation", ha="center", va="center",
            fontsize=7, fontweight="bold", color="#333333", fontfamily=FONT)
    ax.text(41, 93, "Application", ha="center", va="center",
            fontsize=7, fontweight="bold", color="#333333", fontfamily=FONT)
    ax.text(72, 93, "External Data", ha="center", va="center",
            fontsize=7, fontweight="bold", color="#333333", fontfamily=FONT)

    # Tier separators (subtle dashed lines)
    ax.axvline(x=23, color="#CCCCCC", linestyle="--", linewidth=0.5, ymin=0.05, ymax=0.88)
    ax.axvline(x=60, color="#CCCCCC", linestyle="--", linewidth=0.5, ymin=0.05, ymax=0.88)

    # Caption
    ax.text(50, 2, "Figure 1. Three-tier architecture of the ChemIP platform.",
            ha="center", va="center", fontsize=6, color="#666666",
            fontfamily=FONT, style="italic")

    plt.subplots_adjust(left=0.02, right=0.98, top=0.95, bottom=0.02)
    fig.savefig("papers/acs-chs/figures/fig1_architecture.png", dpi=300,
                bbox_inches="tight", pad_inches=0.05, facecolor="white")
    plt.close()
    print("DONE: fig1_architecture.png")


def build_workflow_comparison():
    """Figure 6: Before/After workflow comparison."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.5, 4.5), dpi=300)
    fig.patch.set_facecolor("white")

    FONT = "sans-serif"
    C_OLD = "#CC4444"
    C_NEW = "#2E7D32"
    C_PORTAL = "#D4763A"
    C_STEP = "#4A90D9"
    C_CHEMIP = "#1B3A5C"
    C_ARROW = "#666666"

    # === LEFT: Conventional Workflow ===
    ax1.set_xlim(0, 100)
    ax1.set_ylim(0, 100)
    ax1.axis("off")

    ax1.text(50, 96, "Conventional Workflow", ha="center", va="center",
             fontsize=9, fontweight="bold", color=C_OLD, fontfamily=FONT)
    ax1.text(50, 91, "~150 min per substance", ha="center", va="center",
             fontsize=7, color="#888888", fontfamily=FONT)

    steps = [
        ("1. Login KOSHA portal", "Search MSDS, download"),
        ("2. Login KISCHEM portal", "Lookup classification"),
        ("3. Login NCIS portal", "Check toxic/restricted status"),
        ("4. Login KIPRIS portal", "Search patents"),
        ("5. Login MFDS portal", "Cross-check drug status"),
        ("6. Compile results", "Manual document assembly"),
    ]

    for i, (step, detail) in enumerate(steps):
        y = 82 - i * 13
        rect = FancyBboxPatch((5, y - 4.5), 90, 10, boxstyle="round,pad=1.2",
                              facecolor="#FFF0F0", edgecolor=C_OLD, linewidth=0.8)
        ax1.add_patch(rect)
        ax1.text(10, y + 1, step, ha="left", va="center",
                 fontsize=5.5, fontweight="bold", color="#333333", fontfamily=FONT)
        ax1.text(10, y - 2.5, detail, ha="left", va="center",
                 fontsize=5, color="#666666", fontfamily=FONT)

        # Arrow down
        if i < len(steps) - 1:
            ax1.annotate("", xy=(50, y - 5.5), xytext=(50, y - 8),
                         arrowprops=dict(arrowstyle="->,head_width=0.2",
                                         color="#CCCCCC", lw=0.7))

    # Red X markers for pain points
    ax1.text(88, 83, "Auth", ha="center", va="center",
             fontsize=4.5, color=C_OLD, fontfamily=FONT, fontweight="bold")
    ax1.text(88, 70, "Auth", ha="center", va="center",
             fontsize=4.5, color=C_OLD, fontfamily=FONT, fontweight="bold")
    ax1.text(88, 57, "Auth", ha="center", va="center",
             fontsize=4.5, color=C_OLD, fontfamily=FONT, fontweight="bold")
    ax1.text(88, 44, "Auth", ha="center", va="center",
             fontsize=4.5, color=C_OLD, fontfamily=FONT, fontweight="bold")
    ax1.text(88, 31, "Auth", ha="center", va="center",
             fontsize=4.5, color=C_OLD, fontfamily=FONT, fontweight="bold")

    # === RIGHT: ChemIP Workflow ===
    ax2.set_xlim(0, 100)
    ax2.set_ylim(0, 100)
    ax2.axis("off")

    ax2.text(50, 96, "ChemIP Workflow", ha="center", va="center",
             fontsize=9, fontweight="bold", color=C_NEW, fontfamily=FONT)
    ax2.text(50, 91, "~35 min per substance", ha="center", va="center",
             fontsize=7, color="#888888", fontfamily=FONT)

    # Single query box
    rect = FancyBboxPatch((10, 72), 80, 14, boxstyle="round,pad=1.5",
                          facecolor=C_CHEMIP, edgecolor="none")
    ax2.add_patch(rect)
    ax2.text(50, 81, "Single Query", ha="center", va="center",
             fontsize=8, fontweight="bold", color="white", fontfamily=FONT)
    ax2.text(50, 76, "Chemical name / CAS number", ha="center", va="center",
             fontsize=6, color="#A0C4E8", fontfamily=FONT)

    # Arrow down
    ax2.annotate("", xy=(50, 71), xytext=(50, 67),
                 arrowprops=dict(arrowstyle="->,head_width=0.3",
                                 color=C_ARROW, lw=1))

    # ChemIP orchestration
    rect = FancyBboxPatch((10, 48), 80, 18, boxstyle="round,pad=1.5",
                          facecolor="#E8F5E9", edgecolor=C_NEW, linewidth=1)
    ax2.add_patch(rect)
    ax2.text(50, 62, "ChemIP Orchestration", ha="center", va="center",
             fontsize=7, fontweight="bold", color=C_NEW, fontfamily=FONT)

    results_left = ["KOSHA MSDS", "KISCHEM/NCIS", "KIPRIS Patents"]
    results_right = ["MFDS/OpenFDA", "PubMed", "Safety Guides"]
    for i, label in enumerate(results_left):
        ax2.text(30, 57 - i * 3.5, label, ha="center", va="center",
                 fontsize=5, color="#444444", fontfamily=FONT)
    for i, label in enumerate(results_right):
        ax2.text(70, 57 - i * 3.5, label, ha="center", va="center",
                 fontsize=5, color="#444444", fontfamily=FONT)

    # Arrow down
    ax2.annotate("", xy=(50, 47), xytext=(50, 43),
                 arrowprops=dict(arrowstyle="->,head_width=0.3",
                                 color=C_ARROW, lw=1))

    # Results
    results = [
        "MSDS + GHS hazards",
        "Regulatory classification",
        "Patent landscape",
        "Drug cross-reference",
        "AI safety synthesis",
    ]
    rect = FancyBboxPatch((10, 16), 80, 26, boxstyle="round,pad=1.5",
                          facecolor="#F0FFF0", edgecolor=C_NEW, linewidth=1)
    ax2.add_patch(rect)
    ax2.text(50, 39, "Unified Results", ha="center", va="center",
             fontsize=7, fontweight="bold", color=C_NEW, fontfamily=FONT)
    for i, r in enumerate(results):
        ax2.text(50, 34 - i * 3.5, r, ha="center", va="center",
                 fontsize=5.5, color="#444444", fontfamily=FONT)

    # Time comparison bar at bottom
    ax2.text(50, 8, "76% time reduction", ha="center", va="center",
             fontsize=8, fontweight="bold", color=C_NEW, fontfamily=FONT)
    ax2.text(50, 4, "(preliminary estimate)", ha="center", va="center",
             fontsize=5, color="#888888", fontfamily=FONT, style="italic")

    # Caption
    fig.text(0.5, 0.01,
             "Figure 6. Comparison of conventional multi-portal workflow (left) "
             "and ChemIP single-query workflow (right).",
             ha="center", va="center", fontsize=6, color="#666666",
             fontfamily=FONT, style="italic")

    plt.subplots_adjust(left=0.02, right=0.98, top=0.95, bottom=0.05, wspace=0.08)
    fig.savefig("papers/acs-chs/figures/fig6_workflow_comparison.png", dpi=300,
                bbox_inches="tight", pad_inches=0.05, facecolor="white")
    plt.close()
    print("DONE: fig6_workflow_comparison.png")


if __name__ == "__main__":
    build_architecture_diagram()
    build_workflow_comparison()

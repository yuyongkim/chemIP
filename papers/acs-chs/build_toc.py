#!/usr/bin/env python3
"""Build TOC graphic for ACS CHS submission. 8.47cm x 4.76cm @ 300dpi."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

# ACS TOC size: 8.47 cm x 4.76 cm
W_CM, H_CM = 8.47, 4.76
DPI = 300
W_IN, H_IN = W_CM / 2.54, H_CM / 2.54

fig, ax = plt.subplots(figsize=(W_IN, H_IN), dpi=DPI)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis("off")
fig.patch.set_facecolor("white")

# Colors
C_SOURCE = "#4A90D9"
C_CENTER = "#1B3A5C"
C_OUTPUT = "#2E7D32"
C_TEXT_W = "white"
C_TEXT_D = "#1B3A5C"
C_ARROW = "#888888"

# --- Left: Data Sources ---
sources = [
    ("KOSHA", "MSDS"),
    ("KISCHEM\nNCIS", "Regulatory"),
    ("KIPRIS", "Patents"),
    ("MFDS\nOpenFDA", "Pharma"),
]

box_h = 14
gap = 4.5
total_h = len(sources) * box_h + (len(sources) - 1) * gap
start_y = 50 + total_h / 2

for i, (name, label) in enumerate(sources):
    y = start_y - i * (box_h + gap) - box_h / 2
    rect = FancyBboxPatch(
        (2, y - box_h / 2), 22, box_h,
        boxstyle="round,pad=1.5",
        facecolor=C_SOURCE, edgecolor="none", alpha=0.9
    )
    ax.add_patch(rect)
    ax.text(13, y + 1.5, name, ha="center", va="center",
            fontsize=4.5, fontweight="bold", color=C_TEXT_W,
            fontfamily="sans-serif", linespacing=0.9)
    ax.text(13, y - 4, label, ha="center", va="center",
            fontsize=3.2, color="#D0E4F7", fontfamily="sans-serif")
    # Arrow
    ax.annotate("", xy=(30, y), xytext=(25, y),
                arrowprops=dict(arrowstyle="->,head_width=0.15,head_length=0.1",
                                color=C_ARROW, lw=0.6))

# --- Center: ChemIP ---
center_x, center_y = 42, 50
center_w, center_h = 20, 28
rect = FancyBboxPatch(
    (center_x - center_w / 2, center_y - center_h / 2), center_w, center_h,
    boxstyle="round,pad=2",
    facecolor=C_CENTER, edgecolor="none"
)
ax.add_patch(rect)
ax.text(center_x, center_y + 6, "ChemIP", ha="center", va="center",
        fontsize=6.5, fontweight="bold", color=C_TEXT_W, fontfamily="sans-serif")
ax.text(center_x, center_y - 1, "Adapter-based", ha="center", va="center",
        fontsize=3.2, color="#A0C4E8", fontfamily="sans-serif")
ax.text(center_x, center_y - 5.5, "Orchestration", ha="center", va="center",
        fontsize=3.2, color="#A0C4E8", fontfamily="sans-serif")
ax.text(center_x, center_y - 10, "Graceful fallback", ha="center", va="center",
        fontsize=3.2, color="#A0C4E8", fontfamily="sans-serif")

# Arrow center -> output
ax.annotate("", xy=(58, center_y), xytext=(53, center_y),
            arrowprops=dict(arrowstyle="->,head_width=0.2,head_length=0.12",
                            color=C_ARROW, lw=0.8))

# --- Right: Output ---
out_x, out_y = 78, 50
out_w, out_h = 38, 40
rect = FancyBboxPatch(
    (out_x - out_w / 2, out_y - out_h / 2), out_w, out_h,
    boxstyle="round,pad=2",
    facecolor="white", edgecolor=C_OUTPUT, linewidth=1.2
)
ax.add_patch(rect)
ax.text(out_x, out_y + 15, "Single-Query", ha="center", va="center",
        fontsize=5, fontweight="bold", color=C_OUTPUT, fontfamily="sans-serif")
ax.text(out_x, out_y + 10, "Safety Workflow", ha="center", va="center",
        fontsize=5, fontweight="bold", color=C_OUTPUT, fontfamily="sans-serif")

outputs = [
    "MSDS + GHS hazards",
    "Regulatory classification",
    "Patent landscape",
    "Drug cross-reference",
    "AI safety synthesis",
]
for i, text in enumerate(outputs):
    y = out_y + 3 - i * 5.5
    ax.text(out_x, y, text, ha="center", va="center",
            fontsize=3.3, color="#444444", fontfamily="sans-serif")

# --- Footer ---
ax.text(50, 2, "Open-source  |  Self-hosted  |  AGPL-3.0  |  github.com/yuyongkim/chemIP",
        ha="center", va="center", fontsize=2.8, color="#999999", fontfamily="sans-serif")

plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
fig.savefig("papers/acs-chs/toc_graphic.png", dpi=DPI, bbox_inches="tight",
            pad_inches=0.02, facecolor="white")
print("DONE: toc_graphic.png")

# Verify size
from PIL import Image
img = Image.open("papers/acs-chs/toc_graphic.png")
print(f"Size: {img.size[0]}x{img.size[1]}px, DPI: {img.info.get('dpi', 'N/A')}")

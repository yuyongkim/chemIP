"""Build Supporting Information HTML (printable to PDF via browser)."""
import markdown
import base64
import os
from pathlib import Path

HERE = Path(__file__).parent
MD_FILE = HERE / "SI_ChemIP.md"
OUT_HTML = HERE / "SI_ChemIP.html"

def img_to_data_uri(img_path: Path) -> str:
    with open(img_path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = img_path.suffix.lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}.get(ext, "image/png")
    return f"data:{mime};base64,{data}"

def main():
    md_text = MD_FILE.read_text(encoding="utf-8")

    # Replace image references with base64 data URIs
    for img_file in HERE.glob("*.png"):
        ref = f"({img_file.name})"
        uri = img_to_data_uri(img_file)
        md_text = md_text.replace(ref, f"({uri})")

    html_body = markdown.markdown(md_text, extensions=["tables", "fenced_code"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Supporting Information — ChemIP</title>
<style>
@page {{
  size: letter;
  margin: 1in;
}}
body {{
  font-family: "Times New Roman", Georgia, serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 7.5in;
  margin: 0 auto;
  padding: 0.5in;
}}
h1 {{
  font-size: 16pt;
  text-align: center;
  border-bottom: none;
  margin-bottom: 0.2em;
}}
h1 + p, h1 + h2 {{ margin-top: 0.3em; }}
h2 {{
  font-size: 13pt;
  margin-top: 1.5em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.2em;
}}
h3 {{
  font-size: 11.5pt;
  margin-top: 1.2em;
}}
table {{
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
  font-size: 10pt;
}}
th, td {{
  border: 1px solid #bbb;
  padding: 5px 8px;
  text-align: left;
}}
th {{
  background: #f0f0f0;
  font-weight: bold;
}}
code {{
  font-family: "Courier New", monospace;
  font-size: 9.5pt;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 3px;
}}
pre {{
  background: #f5f5f5;
  padding: 10px 14px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 9pt;
  line-height: 1.5;
}}
pre code {{
  background: none;
  padding: 0;
}}
img {{
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 0.5em 0;
}}
hr {{
  border: none;
  border-top: 1px solid #ccc;
  margin: 1.5em 0;
}}
em {{ font-style: italic; }}
strong {{ font-weight: bold; }}
/* Print styles */
@media print {{
  body {{ padding: 0; }}
  h2 {{ page-break-before: auto; }}
  img {{ page-break-inside: avoid; max-height: 5in; }}
  table {{ page-break-inside: avoid; }}
  pre {{ page-break-inside: avoid; }}
}}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"Generated: {OUT_HTML}")
    print(f"Open in browser and Print > Save as PDF")

if __name__ == "__main__":
    main()

#!/bin/sh
# Prepara o motor: dependências e fontes (Oswald, Inter, Noto Emoji)
set -e
cd "$(dirname "$0")"
npm i canvas jsdom >/dev/null 2>&1
pip install fonttools numpy --break-system-packages -q 2>/dev/null || pip install fonttools numpy -q
mkdir -p fonts && cd fonts
if [ -f Oswald-700.ttf ] && [ -f Inter-500.ttf ] && [ -f NotoEmoji-500.ttf ]; then echo "fontes ja presentes"; exit 0; fi
for u in "ofl/oswald/Oswald%5Bwght%5D.ttf" "ofl/inter/Inter%5Bopsz,wght%5D.ttf" "ofl/inter/Inter-Italic%5Bopsz,wght%5D.ttf" "ofl/notoemoji/NotoEmoji%5Bwght%5D.ttf"; do
  curl -sSfL -o "$(basename "$u" | sed 's/%5B.*//').ttf" "https://raw.githubusercontent.com/google/fonts/main/$u"; done
python3 - << 'PY'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
for fam,src,ws in [("Oswald","Oswald.ttf",[400,500,600,700]),("Inter","Inter.ttf",[400,500,700])]:
    for w in ws:
        f=TTFont(src);loc={"wght":w}
        if "opsz" in [a.axisTag for a in f["fvar"].axes]: loc["opsz"]=14
        instancer.instantiateVariableFont(f,loc).save(f"{fam}-{w}.ttf")
instancer.instantiateVariableFont(TTFont("Inter-Italic.ttf"),{"wght":500,"opsz":14}).save("Inter-500-italic.ttf")
instancer.instantiateVariableFont(TTFont("NotoEmoji.ttf"),{"wght":500}).save("NotoEmoji-500.ttf")
PY
echo "motor pronto"

"""Genera le varianti dell'icona app dal master full-bleed.

Uso:
    python3 scripts/build-app-icons.py <master.png>

Il master deve essere quadrato, a piena pagina (nessun angolo arrotondato
disegnato dentro: quelli li applicano iOS e Android) e con il bus centrato.
Richiede pillow e numpy.

Le varianti a piena pagina usano il master cosi' com'e': nessun rimontaggio,
nessun artefatto. Solo la variante maskable, dove il bus deve rimpicciolirsi
per stare nel cerchio di sicurezza Android, richiede di separare bus e
sfondo: il bus si estrae con alpha antialiasato risolvendo per ogni pixel
p = a*BLU + (1-a)*GIALLO, e lo sfondo si ricostruisce con un polinomio di
terzo grado adattato ai soli pixel non-bus, che resta liscio ovunque.
"""

import os
import sys

import numpy as np
from PIL import Image, ImageDraw

SRC = sys.argv[1] if len(sys.argv) > 1 else 'master-icon.png'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets-webp')

src = Image.open(SRC).convert('RGB')
W, H = src.size
arr = np.asarray(src, dtype=np.float64)

flat = arr.reshape(-1, 3)
BLUE = np.median(flat[flat[:, 2] > flat[:, 0]], axis=0)
YELLOW = np.median(flat[flat[:, 0] > 200], axis=0)

axis = BLUE - YELLOW
alpha = np.clip(((arr - YELLOW) @ axis) / (axis @ axis), 0.0, 1.0)

# Nelle zone gialle l'alpha non e' esattamente zero ma qualche punto
# percentuale. Composto sul riquadro del bus quel velo blu disegna un
# rettangolo visibile: sotto soglia va azzerato, sopra si riscala per non
# perdere l'antialiasing dei bordi.
FLOOR = 0.08
alpha = np.clip((alpha - FLOOR) / (1.0 - FLOOR), 0.0, 1.0)

# Sfondo: polinomio di terzo grado in x,y adattato ai pixel non-bus.
yy, xx = np.mgrid[0:H, 0:W]
nx, ny = xx / W - 0.5, yy / H - 0.5
terms = [np.ones_like(nx), nx, ny, nx * nx, nx * ny, ny * ny,
         nx ** 3, nx * nx * ny, nx * ny * ny, ny ** 3]
basis = np.stack([t.ravel() for t in terms], axis=1)

bgmask = (alpha < 0.02).ravel()
coef = np.linalg.lstsq(basis[bgmask], flat[bgmask], rcond=None)[0]
bg_arr = np.clip((basis @ coef).reshape(H, W, 3), 0, 255)
residual = np.abs(flat[bgmask] - basis[bgmask] @ coef).max()
print('scarto massimo del fit sullo sfondo: %.1f livelli' % residual)

bg = Image.fromarray(np.uint8(bg_arr))
bus = Image.fromarray(
    np.dstack([np.broadcast_to(np.uint8(BLUE), (H, W, 3)), np.uint8(alpha * 255)]), 'RGBA'
)

ys, xs = np.where(alpha > 0.5)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
print('bus: %.1f%% del lato' % (100 * (box[2] - box[0]) / W))


def full(size):
    """Master intatto: e' gia' full-bleed e centrato."""
    return src.resize((size, size), Image.LANCZOS).convert('RGBA')


def shrunk(size, bus_scale):
    """Bus rimpicciolito sul gradiente ricostruito."""
    canvas = bg.resize((size, size), Image.LANCZOS).convert('RGBA')
    crop = bus.crop(box)
    tw = int(round(size * bus_scale))
    th = int(round(tw * crop.height / crop.width))
    crop = crop.resize((tw, th), Image.LANCZOS)
    canvas.alpha_composite(crop, ((size - tw) // 2, (size - th) // 2))
    return canvas


def rounded(img, radius_ratio=0.22):
    size = img.size[0]
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * radius_ratio), fill=255
    )
    out = img.copy()
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    return out


# Nel master il bus occupa il 65% del lato: gli angoli inferiori arrivano a
# raggio 40,6%, appena oltre il cerchio di sicurezza Android (40%). Nella
# variante maskable scende al 58% e ci sta con margine.
def mark(size=256, color=(235, 245, 255), opacity=185, fill=0.965):
    """Il bus da mettere dentro le card blu: sagoma sola, niente sfondo.

    Riusa lo stesso alpha del master, quindi il disegno e' identico a quello
    dell'icona; i finestrini restano vuoti perche' nel master sono gialli come
    lo sfondo, e sul blu della card si vede attraverso.
    """
    crop = bus.crop(box)
    w = int(round(size * fill))
    h = int(round(w * crop.height / crop.width))
    crop = crop.resize((w, h), Image.LANCZOS)

    tinted = Image.new('RGBA', crop.size, (*color, 0))
    tinted.putalpha(crop.getchannel('A').point(lambda v: int(v * opacity / 255)))

    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(tinted, ((size - w) // 2, (size - h) // 2))
    return canvas


mark().save(f'{OUT}/bus-front-mark.webp', 'WEBP', quality=95, method=6)
rounded(full(512)).save(f'{OUT}/bus-front-icon.webp', 'WEBP', quality=95, method=6)
shrunk(512, 0.58).convert('RGB').save(f'{OUT}/bus-icon-maskable.png', optimize=True)
full(180).convert('RGB').save(f'{OUT}/apple-touch-icon.png', optimize=True)
rounded(full(64)).save(f'{OUT}/favicon-64.png', optimize=True)

for name in ['bus-front-mark.webp', 'bus-front-icon.webp', 'bus-icon-maskable.png', 'apple-touch-icon.png', 'favicon-64.png']:
    im = Image.open(f'{OUT}/{name}')
    print(name, im.size, im.mode, '%.1f kB' % (os.path.getsize(f'{OUT}/{name}') / 1024))

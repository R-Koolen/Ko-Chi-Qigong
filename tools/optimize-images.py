"""Ko-Chi Qigong: convert new images to WebP before using them on the site.

    python tools/optimize-images.py assets/nieuwe-foto.jpg            photo  -> WebP quality 80, max 1600 px wide
    python tools/optimize-images.py assets/nieuwe-foto.jpg --max 1000  photo shown small -> smaller file
    python tools/optimize-images.py assets/insp/nb-nieuw.png          flyer (.png) -> WebP lossless (pixel-identical)

Writes <name>.webp next to the original; then point the HTML (or inspiratie-data.js) at the .webp
and delete the original. Rule of thumb for --max: twice the widest size the image is shown at
(sharp on phones/retina), never more than the original. The aspect ratio is kept exactly.
Needs Pillow:  pip install pillow
"""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+')
ap.add_argument('--max', type=int, default=1600, help='max width in px for photos (default 1600)')
args = ap.parse_args()

for f in map(Path, args.files):
    im = ImageOps.exif_transpose(Image.open(f))  # apply phone rotation before it is lost
    out = f.with_suffix('.webp')
    icc = im.info.get('icc_profile')
    if f.suffix.lower() == '.png':
        im.save(out, 'WEBP', lossless=True, method=6, icc_profile=icc)
    else:
        im = im.convert('RGB')
        W, H = im.size
        if W > args.max:
            step = W // math.gcd(W, H)  # keep the exact aspect ratio if possible
            w = max(step, args.max // step * step) if step <= args.max else args.max
            im = im.resize((w, round(w * H / W)), Image.LANCZOS)
        im.save(out, 'WEBP', quality=80, method=6, icc_profile=icc)
    print(f'{f} ({f.stat().st_size // 1024} KB) -> {out} ({out.stat().st_size // 1024} KB, {im.size[0]}x{im.size[1]})')

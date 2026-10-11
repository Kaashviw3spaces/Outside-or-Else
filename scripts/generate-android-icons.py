"""Deterministic density generation from supplied artwork; never redraw the cat."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/outside-or-else-logo.png'
if not SOURCE.exists():
    # The supplied file is a JPEG with a double extension. Convert losslessly
    # from its decoded pixels, retaining the original file as provenance.
    supplied = ROOT / 'assets/outside-or-else-logo.png.jpg'
    Image.open(supplied).convert('RGB').save(SOURCE)
image = Image.open(SOURCE).convert('RGBA')
# Remove only the photographed white surround/shadow; this rectangle contains
# the complete supplied blue tile and all visible cat artwork.
tile = image.crop((190, 190, 770, 770))
tile_mask = Image.new('L', tile.size)
ImageDraw.Draw(tile_mask).rounded_rectangle((0, 0, 579, 579), radius=100, fill=255)
tile.putalpha(tile_mask)
background = tile.getpixel((290, 100))[:3]
res = ROOT / 'android/app/src/main/res'
out = ROOT / 'artifacts/checkpoint-9d1'
out.mkdir(parents=True, exist_ok=True)
previews = []
for density, scale in [('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)]:
    folder = res / ('mipmap-' + density)
    folder.mkdir(exist_ok=True)
    size = round(48 * scale)
    legacy = Image.new('RGBA', (size, size), background + (255,))
    # Keep the entire square artwork inside even a circular legacy mask.
    side = round(size * .70)
    legacy.alpha_composite(tile.resize((side, side), Image.Resampling.LANCZOS), ((size-side)//2, (size-side)//2))
    legacy.convert('RGB').save(folder / 'ic_launcher.png')
    mask = Image.new('L', (size, size))
    ImageDraw.Draw(mask).ellipse((0, 0, size-1, size-1), fill=255)
    legacy.putalpha(mask)
    legacy.save(folder / 'ic_launcher_round.png')
    size = round(108 * scale)
    foreground = Image.new('RGBA', (size, size))
    # 46dp square has a 65.05dp diagonal: all supplied artwork is inside
    # Android's guaranteed central 66dp safe circle, including the bottom eyes.
    side = round(46 * scale)
    foreground.alpha_composite(tile.resize((side, side), Image.Resampling.LANCZOS), ((size-side)//2, (size-side)//2))
    foreground.save(folder / 'ic_launcher_foreground.png')
    if density == 'xxxhdpi':
        for shape in ['circle', 'squircle', 'rounded-square']:
            full = Image.new('RGBA', (size, size), background + (255,))
            full.alpha_composite(foreground)
            visible = full.crop((72, 72, 360, 360))
            mask = Image.new('L', visible.size)
            draw = ImageDraw.Draw(mask)
            if shape == 'circle': draw.ellipse((0, 0, 287, 287), fill=255)
            else: draw.rounded_rectangle((0, 0, 287, 287), radius=100 if shape == 'squircle' else 55, fill=255)
            visible.putalpha(mask)
            visible.save(out / ('icon-' + shape + '.png'))
            previews.append(visible)
color = '#%02X%02X%02X' % background
(res / 'values/ic_launcher_background.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">' + color + '</color></resources>\n')
# Remove template drawables so no blue/white placeholder can win resolution.
for name in ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml']:
    (res / name).unlink(missing_ok=True)
sheet = Image.new('RGB', (288 * 3, 288), '#eee')
for i, preview in enumerate(previews): sheet.paste(preview, (i * 288, 0), preview)
sheet.save(out / 'icon-mask-preview.png')
(out / 'icon-generation.json').write_text(json.dumps({'source': str(SOURCE.relative_to(ROOT)), 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'crop': [190,190,770,770], 'background': color, 'foregroundDp': 108, 'artworkDp': 46, 'safeCircleDp': 66, 'densities': ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']}, indent=2))
print('PASS: supplied cat artwork generated at all five densities; adaptive foreground inside 66dp safe circle.')

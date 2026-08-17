#!/usr/bin/env python3
"""
Generate every launcher asset from one source logo.

    python3 scripts/generate-app-icons.py path/to/finmatrix-logo.png

Why a script rather than copying the logo into all four slots: the four assets
are not the same picture at different sizes.

  icon.png           1024x1024, opaque. The full logo. Stores strip alpha, so a
                     transparent icon renders on an unpredictable background.

  adaptive-icon.png  1024x1024, transparent, MARK ONLY, centred at ~62%.
                     Android masks the foreground to a circle/squircle and only
                     the middle ~66% is guaranteed visible; the rest is eaten by
                     the mask and the parallax animation. Feeding it the full
                     logo crops the wordmark off entirely and clips the mark, so
                     the script trims the wordmark and pads the mark into the
                     safe zone.

  splash.png         The full logo, letterboxed on the splash background. This
                     is the one place the wordmark is actually legible.

  favicon.png        48x48. At that size a wordmark is a grey smudge, so it gets
                     the mark, same as the adaptive icon.

The wordmark crop is a fraction of the height rather than pixel coordinates, so
it survives the logo being re-exported at another size.
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is required:  pip install Pillow')

ASSETS = Path(__file__).resolve().parent.parent / 'assets' / 'images'

# Fraction of the source height occupied by the wordmark at the bottom. The
# logo is a square mark above "FinMatrix / Cloud Accounting & Finance"; the text
# block is roughly the bottom third.
WORDMARK_BAND = 0.36
# Share of the adaptive-icon canvas the mark may occupy. Android's guaranteed
# safe zone is the central 66%; 62% leaves a little breathing room.
SAFE_ZONE = 0.62


def flatten(img: Image.Image, background=(255, 255, 255)) -> Image.Image:
    """Composite onto an opaque background — icons must not carry alpha."""
    img = img.convert('RGBA')
    canvas = Image.new('RGB', img.size, background)
    canvas.paste(img, mask=img.split()[3])
    return canvas


def crop_mark(img: Image.Image) -> Image.Image:
    """The logo mark with the wordmark band removed, cropped square."""
    w, h = img.size
    mark = img.crop((0, 0, w, int(h * (1 - WORDMARK_BAND))))
    side = min(mark.size)
    left = (mark.width - side) // 2
    top = (mark.height - side) // 2
    return mark.crop((left, top, left + side, top + side))


def adaptive_foreground(img: Image.Image, size: int = 1024) -> Image.Image:
    """Mark centred inside the safe zone on a transparent canvas."""
    mark = crop_mark(img).convert('RGBA')
    inner = int(size * SAFE_ZONE)
    mark = mark.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(mark, ((size - inner) // 2, (size - inner) // 2), mark)
    return canvas


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    if not src.exists():
        sys.exit(f'No such file: {src}')

    logo = Image.open(src)
    ASSETS.mkdir(parents=True, exist_ok=True)

    flatten(logo).resize((1024, 1024), Image.LANCZOS).save(ASSETS / 'icon.png')
    adaptive_foreground(logo).save(ASSETS / 'adaptive-icon.png')
    flatten(logo).resize((1024, 1024), Image.LANCZOS).save(ASSETS / 'splash.png')
    flatten(crop_mark(logo)).resize((48, 48), Image.LANCZOS).save(ASSETS / 'favicon.png')

    for name in ('icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png'):
        f = ASSETS / name
        with Image.open(f) as out:
            print(f'  {name:20s} {out.size[0]}x{out.size[1]:<5} {out.mode:5s} {f.stat().st_size:>7,} bytes')

    print(
        '\nNative Android icons are generated at prebuild time, so run:\n'
        '  npx expo prebuild --platform android --clean\n'
        'then rebuild. Without it the installed app keeps its old launcher icon.'
    )


if __name__ == '__main__':
    main()

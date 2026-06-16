from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "outputs" / "focusflow_ppt_assets"
W, H = 1280, 720

KEYWORDS = [
    ("FOCUSFLOW", "HCI RESEARCH"),
    ("ABSTRACT", "CONTRIBUTION"),
    ("CONTEXT", "ATTENTION"),
    ("QUESTIONS", "RQ 01 02 03"),
    ("LOOP", "SENSE INFER ACT"),
    ("SIGNALS", "FEATURE VECTOR"),
    ("ARCHITECTURE", "MODULES"),
    ("STATE", "NORMAL DISTRACT"),
    ("STRATEGY", "LOW INTERRUPTION"),
    ("INTERFACE", "READING SURFACE"),
    ("ENGINEERING", "MAINTAINABLE"),
    ("EVALUATION", "MEASURE PROVE"),
    ("ETHICS", "PRIVACY CONTROL"),
    ("REFLECT", "THANK YOU"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\seguisb.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for item in candidates:
        p = Path(item)
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


def grain(base, dark=False):
    px = base.load()
    for _ in range(65000):
        x = random.randrange(W)
        y = random.randrange(H)
        delta = random.randint(-5, 6) if not dark else random.randint(-8, 8)
        r, g, b = px[x, y][:3]
        px[x, y] = (
            max(0, min(255, r + delta)),
            max(0, min(255, g + delta)),
            max(0, min(255, b + delta)),
        )
    overlay = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    d = ImageDraw.Draw(overlay)
    for _ in range(950):
        x = random.randrange(W)
        y = random.randrange(H)
        a = random.randint(5, 13) if not dark else random.randint(4, 10)
        color = (26, 44, 69, a) if not dark else (210, 230, 240, a)
        d.ellipse((x, y, x + random.randint(1, 2), y + random.randint(1, 2)), fill=color)
    return Image.alpha_composite(base.convert("RGBA"), overlay)


def soft_word_layer(primary: str, secondary: str, dark=False):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    big = font(148 if len(primary) < 8 else 118, True)
    small = font(38, True)
    main_color = (44, 74, 105, 28) if not dark else (213, 232, 235, 30)
    sub_color = (12, 57, 86, 35) if not dark else (20, 184, 166, 44)
    d.text((-24, 126), primary, font=big, fill=main_color)
    d.text((86, 548), secondary, font=small, fill=sub_color)
    d.text((1164, 80), primary[:3], font=font(28, True), fill=sub_color, anchor="ra")
    d.text((48, 640), "FOCUS / STATE / FEEDBACK", font=font(17), fill=(20, 45, 65, 42) if not dark else (230, 240, 245, 38))
    layer = layer.filter(ImageFilter.GaussianBlur(0.65))
    return layer


def attention_field(dark=False):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    stroke = (34, 82, 112, 36) if not dark else (195, 230, 230, 35)
    accent = (231, 96, 78, 92) if not dark else (255, 137, 112, 100)
    d.ellipse((760, 118, 1188, 548), outline=stroke, width=2)
    d.ellipse((820, 172, 1135, 494), outline=(stroke[0], stroke[1], stroke[2], 22), width=1)
    d.line((885, 268, 1048, 234), fill=accent, width=3)
    d.line((930, 430, 1090, 392), fill=(18, 118, 110, 90), width=3)
    for x, y, c in [(885, 268, accent), (1048, 234, accent), (930, 430, (18, 118, 110, 110)), (1090, 392, (18, 118, 110, 110))]:
        d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=c)
    return layer.filter(ImageFilter.GaussianBlur(0.25))


def make_bg(index: int, dark=False):
    random.seed(1700 + index)
    if dark:
        base = Image.new("RGBA", (W, H), (17, 25, 39, 255))
        wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(wash)
        d.rectangle((0, 0, W, H), fill=(10, 18, 30, 120))
    else:
        base = Image.new("RGBA", (W, H), (245, 247, 244, 255))
        wash = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(wash)
        d.rectangle((0, 0, W, H), fill=(248, 247, 241, 120))
        d.ellipse((-260, -220, 720, 420), fill=(222, 237, 238, 95))
        d.ellipse((700, 250, 1530, 900), fill=(232, 238, 246, 115))
    primary, secondary = KEYWORDS[index - 1]
    img = Image.alpha_composite(base, wash)
    img = Image.alpha_composite(img, soft_word_layer(primary, secondary, dark))
    img = Image.alpha_composite(img, attention_field(dark))
    img = grain(img, dark)
    return img.convert("RGB")


def main():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(1, 15):
        make_bg(i, dark=i in (1, 14)).save(ASSET_DIR / f"bg-{i:02d}.png", quality=95)
    print(ASSET_DIR)


if __name__ == "__main__":
    main()

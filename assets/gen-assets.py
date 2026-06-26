"""Generate PWA icons + og.png for HEIC Tools. Run once: python3 gen-assets.py"""
from PIL import Image, ImageDraw, ImageFont
import os

BLUE = "#3370ff"
WHITE = "#ffffff"
DARK_BG = "#0b0f14"
LIGHT_GRAY = "#bcc7d4"
DIR = os.path.dirname(os.path.abspath(__file__))

def _font(size, draw=None):
    """Try system fonts; fall back to default."""
    for name in [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SF-Pro-Display-Bold.otf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(name, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def icon(size, path):
    """Rounded-square icon with an arrow-swap motif."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background
    r = size // 6
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BLUE)

    # Arrow pair motif: ← →
    margin = size // 3
    cx, cy = size // 2, size // 2
    stroke = max(3, size // 48)
    arrow_len = size // 5

    # Left arrow
    lx = cx - size // 7
    draw.line([(lx - arrow_len, cy), (lx + arrow_len, cy)], fill=WHITE, width=stroke)
    draw.line([(lx - arrow_len, cy), (lx - arrow_len + stroke * 2, cy - stroke * 2)], fill=WHITE, width=stroke)
    draw.line([(lx - arrow_len, cy), (lx - arrow_len + stroke * 2, cy + stroke * 2)], fill=WHITE, width=stroke)

    # Right arrow
    rx = cx + size // 7
    draw.line([(rx - arrow_len, cy), (rx + arrow_len, cy)], fill=WHITE, width=stroke)
    draw.line([(rx + arrow_len, cy), (rx + arrow_len - stroke * 2, cy - stroke * 2)], fill=WHITE, width=stroke)
    draw.line([(rx + arrow_len, cy), (rx + arrow_len - stroke * 2, cy + stroke * 2)], fill=WHITE, width=stroke)

    img.save(path)
    print(f"  {path} ({size}×{size})")


def og_image(path):
    """1200×630 social share image."""
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)

    # Accent bar at top
    draw.rectangle([0, 0, W, 8], fill=BLUE)

    # Large brand wordmark
    font_title = _font(96, draw)
    font_sub = _font(36, draw)
    font_badge = _font(28, draw)

    title = "HEIC·Tools"
    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 160), title, fill=WHITE, font=font_title)

    sub = "Free, Private, In-Browser HEIC Conversion"
    bbox2 = draw.textbbox((0, 0), sub, font=font_sub)
    sw = bbox2[2] - bbox2[0]
    draw.text(((W - sw) // 2, 300), sub, fill=LIGHT_GRAY, font=font_sub)

    # Badge row
    badges = ["No Upload", "Unlimited", "Batch", "No Signup"]
    badge_y = 420
    gap = 16
    total_bw = sum(
        draw.textbbox((0, 0), b, font=font_badge)[2] - draw.textbbox((0, 0), b, font=font_badge)[0] + 48
        for b in badges
    ) + gap * (len(badges) - 1)
    bx = (W - total_bw) // 2
    for b in badges:
        bbox_b = draw.textbbox((0, 0), b, font=font_badge)
        bw = bbox_b[2] - bbox_b[0]
        draw.rounded_rectangle([bx, badge_y, bx + bw + 48, badge_y + 52], radius=26,
                               fill=None, outline=LIGHT_GRAY, width=2)
        draw.text((bx + 24, badge_y + 8), b, fill=LIGHT_GRAY, font=font_badge)
        bx += bw + 48 + gap

    # Bottom accent
    draw.rectangle([0, H - 8, W, H], fill=BLUE)

    img = img.convert("RGB")
    img.save(path, quality=95)
    print(f"  {path} ({W}×{H})")


if __name__ == "__main__":
    print("Generating HEIC Tools assets…")
    icon(192, os.path.join(DIR, "icon-192.png"))
    icon(512, os.path.join(DIR, "icon-512.png"))
    og_image(os.path.join(DIR, "og.png"))
    print("Done.")

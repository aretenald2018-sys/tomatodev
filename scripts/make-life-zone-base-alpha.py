from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "home" / "life-zone" / "base-room.png"
OUT = ROOT / "assets" / "home" / "life-zone" / "base-room-alpha.png"
OUTLINE_COLOR = (88, 48, 28, 255)
OUTLINE_RGB = (88, 48, 28)


def is_outer_background(pixel):
    r, g, b = pixel[:3]
    return r <= 34 and g <= 38 and b <= 52 and (b - r) >= 6 and (b - g) >= 3


def is_outer_fringe(pixel):
    r, g, b = pixel[:3]
    if r > 58 or g > 58 or b > 70:
        return False
    # Preserve intentionally brown edge pixels; remove navy/black shadow residue.
    if r > b + 8 and r >= g:
        return False
    return True


def transparent_neighbor_count(alpha, x, y, width, height):
    total = 0
    for yy in range(max(0, y - 1), min(height, y + 2)):
        for xx in range(max(0, x - 1), min(width, x + 2)):
            if xx == x and yy == y:
                continue
            if alpha[yy * width + xx] == 0:
                total += 1
    return total


def clean_outer_fringe(image):
    pixels = image.load()
    width, height = image.size
    alpha = bytearray(pixels[x, y][3] for y in range(height) for x in range(width))
    to_clear = []

    for y in range(height):
        for x in range(width):
            if alpha[y * width + x] == 0:
                continue
            if not is_outer_fringe(pixels[x, y]):
                continue
            if transparent_neighbor_count(alpha, x, y, width, height) >= 2:
                to_clear.append((x, y))

    for x, y in to_clear:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
    return len(to_clear)


def add_refined_outline(image):
    alpha = image.getchannel("A").point(lambda a: 255 if a else 0)
    # Use a lightly opened mask for the outline only. This keeps the room art
    # intact while preventing one-pixel edge noise from becoming a dark stroke.
    outline_base = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    soft_outer = outline_base.filter(ImageFilter.MaxFilter(5))
    soft_ring = ImageChops.subtract(soft_outer, outline_base).filter(ImageFilter.GaussianBlur(0.55))
    crisp_outer = outline_base.filter(ImageFilter.MaxFilter(3))
    crisp_ring = ImageChops.subtract(crisp_outer, outline_base).filter(ImageFilter.GaussianBlur(0.25))

    soft = Image.new("RGBA", image.size, (*OUTLINE_RGB, 0))
    soft.putalpha(soft_ring.point(lambda a: min(155, int(a * 0.62))))
    crisp = Image.new("RGBA", image.size, (*OUTLINE_RGB, 0))
    crisp.putalpha(crisp_ring.point(lambda a: min(230, int(a * 0.9))))

    outlined = Image.new("RGBA", image.size, (0, 0, 0, 0))
    outlined.alpha_composite(soft)
    outlined.alpha_composite(crisp)
    outlined.alpha_composite(image)
    return outlined


def main():
    image = Image.open(SOURCE).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    visited = bytearray(width * height)
    queue = deque()

    def push(x, y):
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        idx = y * width + x
        if visited[idx]:
            return
        if not is_outer_background(pixels[x, y]):
            return
        visited[idx] = 1
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    removed = 0
    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        removed += 1
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    cleaned = clean_outer_fringe(image)
    outlined = add_refined_outline(image)
    outlined.save(OUT)
    print(f"Wrote {OUT} with {removed} transparent outer pixels, {cleaned} fringe pixels cleaned")


if __name__ == "__main__":
    main()

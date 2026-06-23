from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITE_DIR = ROOT / "assets" / "home" / "life-zone" / "sprites"
SOURCE = SPRITE_DIR / "source" / "slot-poses-alpha.png"

POSES = [
    ("workout-lat", 0, 0),
    ("workout-bench", 1, 0),
    ("workout-squat", 2, 0),
    ("diet-left", 0, 1),
    ("diet-center", 1, 1),
    ("diet-right", 2, 1),
    ("office-upper", 0, 2),
    ("office-center", 1, 2),
    ("office-lower", 2, 2),
]

ACTORS = {
    "jups": ((130, 24, 36), (255, 82, 92)),
    "moonjung-tomato": ((26, 72, 158), (82, 166, 255)),
    "lee-jaeheon": ((24, 110, 62), (90, 218, 126)),
}


def alpha_bbox(image, min_alpha=18):
    pixels = image.load()
    min_x, min_y = image.width, image.height
    max_x, max_y = -1, -1
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] > min_alpha:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x < min_x or max_y < min_y:
        return None
    return min_x, min_y, max_x + 1, max_y + 1


def pad_bbox(bbox, padding, width, height):
    left, top, right, bottom = bbox
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def is_tank_pixel(r, g, b, a):
    if a < 32:
        return False
    return r > 115 and b > 105 and g < 125 and (r - g) > 55 and (b - g) > 45


def recolor_tank(image, dark, light):
    out = image.copy()
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if not is_tank_pixel(r, g, b, a):
                continue
            value = max(r, b)
            t = max(0.0, min(1.0, (value - 95) / 160))
            nr = round(dark[0] + (light[0] - dark[0]) * t)
            ng = round(dark[1] + (light[1] - dark[1]) * t)
            nb = round(dark[2] + (light[2] - dark[2]) * t)
            pixels[x, y] = (nr, ng, nb, a)
    return out


def make_checkerboard(size, tile=12):
    image = Image.new("RGBA", size, (255, 255, 255, 255))
    pixels = image.load()
    for y in range(size[1]):
        for x in range(size[0]):
            if ((x // tile) + (y // tile)) % 2:
                pixels[x, y] = (226, 226, 226, 255)
    return image


def write_contact_sheet():
    poses = [pose for pose, _, _ in POSES]
    actors = list(ACTORS.keys())
    cell = (180, 170)
    sheet = Image.new("RGBA", (cell[0] * len(poses), cell[1] * len(actors)), (245, 245, 245, 255))
    checker = make_checkerboard(cell)

    for row, actor in enumerate(actors):
        for col, pose in enumerate(poses):
            sprite = Image.open(SPRITE_DIR / f"{actor}-{pose}.png").convert("RGBA")
            sprite.thumbnail((cell[0] - 20, cell[1] - 20), Image.Resampling.LANCZOS)
            x = col * cell[0] + (cell[0] - sprite.width) // 2
            y = row * cell[1] + (cell[1] - sprite.height) // 2
            sheet.alpha_composite(checker, (col * cell[0], row * cell[1]))
            sheet.alpha_composite(sprite, (x, y))

    sheet.save(SPRITE_DIR / "source" / "sprite-contact-sheet.png")


def main():
    image = Image.open(SOURCE).convert("RGBA")
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)

    cell_width = image.width // 3
    cell_height = image.height // 3
    pose_crops = {}
    for pose, col, row in POSES:
        left = col * cell_width
        top = row * cell_height
        right = image.width if col == 2 else (col + 1) * cell_width
        bottom = image.height if row == 2 else (row + 1) * cell_height
        region = image.crop((left, top, right, bottom))
        bbox = alpha_bbox(region)
        if bbox is None:
            raise RuntimeError(f"No sprite pixels found for {pose}")
        crop = region.crop(pad_bbox(bbox, 24, region.width, region.height))
        pose_crops[pose] = crop
        crop.save(SPRITE_DIR / "source" / f"{pose}-magenta.png")

    for actor, (dark, light) in ACTORS.items():
        for pose, crop in pose_crops.items():
            recolored = recolor_tank(crop, dark, light)
            recolored.save(SPRITE_DIR / f"{actor}-{pose}.png")

    write_contact_sheet()
    print(f"Wrote {len(ACTORS) * len(POSES)} recolored sprites to {SPRITE_DIR}")


if __name__ == "__main__":
    main()

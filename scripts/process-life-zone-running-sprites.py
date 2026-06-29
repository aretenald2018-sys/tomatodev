from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROWS = (
    "jups",
    "moonjung-tomato",
    "lee-jaeheon",
)


def remove_magenta_key(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_key = (
                (r > 210 and b > 190 and g < 110)
                or (r > 135 and b > 135 and g < 120 and abs(r - b) < 90)
            )
            if is_key:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            # Despill antialiased magenta without changing skin or clothes.
            if r > 80 and b > 80 and g < min(r, b) * 0.65 and abs(r - b) < 110:
                pixels[x, y] = (max(g, int(r * 0.35)), g, max(g, int(b * 0.35)), a)
    return image


def fit_cell(cell: Image.Image, target_width: int = 128, target_height: int = 192) -> Image.Image:
    alpha = cell.getchannel("A")
    bbox = alpha.getbbox()
    out = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    if not bbox:
        return out

    subject = cell.crop(bbox)
    src_width, src_height = subject.size
    scale = min(82 / src_width, 130 / src_height)
    next_size = (
        max(1, int(round(src_width * scale))),
        max(1, int(round(src_height * scale))),
    )
    subject = subject.resize(next_size, Image.Resampling.LANCZOS)

    # Keep every frame anchored to the same foot contact point.
    x = (target_width - next_size[0]) // 2
    y = 180 - next_size[1]
    out.alpha_composite(subject, (x, y))
    pixels = out.load()
    width, height = out.size
    for yy in range(height):
        for xx in range(width):
            r, g, b, a = pixels[xx, yy]
            if a < 24:
                pixels[xx, yy] = (0, 0, 0, 0)
            elif r > 120 and b > 120 and g < 130 and abs(r - b) < 100:
                pixels[xx, yy] = (0, 0, 0, 0)
    return out


def process_sheet(source: Path, out_dir: Path, preview: Path | None = None) -> None:
    image = remove_magenta_key(Image.open(source))
    width, height = image.size
    sheets: list[Image.Image] = []

    for row, name in enumerate(ROWS):
        frames: list[Image.Image] = []
        for col in range(2):
            cell = image.crop(
                (
                    col * width // 2,
                    row * height // 3,
                    (col + 1) * width // 2,
                    (row + 1) * height // 3,
                )
            )
            frames.append(fit_cell(cell))

        sheet = Image.new("RGBA", (256, 192), (0, 0, 0, 0))
        sheet.alpha_composite(frames[0], (0, 0))
        sheet.alpha_composite(frames[1], (128, 0))
        sheet.save(out_dir / f"{name}-running-track.png")
        sheets.append(sheet)

    if preview:
        preview.parent.mkdir(parents=True, exist_ok=True)
        preview_image = Image.new("RGBA", (256, 576), (255, 0, 255, 255))
        for index, sheet in enumerate(sheets):
            preview_image.alpha_composite(sheet, (0, index * 192))
        preview_image.save(preview)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    process_sheet(args.source, args.out_dir, args.preview)


if __name__ == "__main__":
    main()

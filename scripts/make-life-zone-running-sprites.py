from pathlib import Path

from PIL import Image, ImageDraw


SPRITE_DIR = Path("assets/home/life-zone/sprites")
FRAME_W = 128
FRAME_H = 192
SKIN = "#f1b782"
SKIN_LIGHT = "#ffd08f"
SKIN_DARK = "#c87546"
SHORTS = "#17191f"
SHOE = "#161a22"
SOLE = "#ffffff"
OUTLINE = "#161a22"

CHARACTERS = [
    {
        "prefix": "jups",
        "output": "jups-running-track.png",
        "shirt": "#ff525c",
        "trim": "#ffe15a",
        "source": "jups-office-center.png",
    },
    {
        "prefix": "moonjung-tomato",
        "output": "moonjung-tomato-running-track.png",
        "shirt": "#52a6ff",
        "trim": "#ffffff",
        "source": "moonjung-tomato-office-center.png",
    },
    {
        "prefix": "lee-jaeheon",
        "output": "lee-jaeheon-running-track.png",
        "shirt": "#5ada7e",
        "trim": "#1f2937",
        "source": "lee-jaeheon-office-center.png",
    },
]


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


def crop_existing_head(source_name):
    source = Image.open(SPRITE_DIR / source_name).convert("RGBA")
    # The office-center pose gives the existing side/back head without food or gym gear.
    head = source.crop((42, 0, 128, 108))
    bbox = alpha_bbox(head)
    if not bbox:
        raise RuntimeError(f"Head crop is empty: {source_name}")
    head = head.crop(bbox)
    target_w = 70
    target_h = round(head.height * (target_w / head.width))
    return head.resize((target_w, target_h), Image.Resampling.LANCZOS)


def thick_line(draw, points, fill, width):
    draw.line(points, fill=fill, width=width, joint="curve")


def draw_shoe(draw, x, y, flip=False):
    if flip:
        draw.polygon([(x + 18, y), (x + 2, y + 2), (x, y + 10), (x + 22, y + 11), (x + 30, y + 6)], fill=OUTLINE)
        draw.rectangle((x + 4, y + 8, x + 24, y + 11), fill=SOLE)
    else:
        draw.polygon([(x, y), (x + 18, y + 2), (x + 30, y + 8), (x + 27, y + 14), (x + 3, y + 12)], fill=OUTLINE)
        draw.rectangle((x + 4, y + 10, x + 25, y + 13), fill=SOLE)


def draw_limb(draw, points, skin=True, width=12):
    thick_line(draw, points, OUTLINE, width + 4)
    thick_line(draw, points, SKIN if skin else SHORTS, width)


def draw_frame(head, shirt, trim, stride):
    img = Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    lean = -4 if stride == 0 else 3

    head_x = 40 + lean
    head_y = 16
    img.alpha_composite(head, (head_x, head_y))

    neck = (70 + lean, 76)
    hip = (66 + lean, 128)
    shoulder_l = (52 + lean, 86)
    shoulder_r = (82 + lean, 88)

    if stride == 0:
        back_arm = [shoulder_r, (97 + lean, 101), (105 + lean, 120)]
        front_arm = [shoulder_l, (35 + lean, 101), (27 + lean, 122)]
        back_leg_top = [(72 + lean, 128), (92 + lean, 148), (103 + lean, 172)]
        front_leg_top = [(60 + lean, 128), (42 + lean, 146), (31 + lean, 176)]
        back_shoe = (96 + lean, 168, False)
        front_shoe = (19 + lean, 171, True)
    else:
        back_arm = [shoulder_l, (36 + lean, 100), (26 + lean, 118)]
        front_arm = [shoulder_r, (98 + lean, 103), (109 + lean, 123)]
        back_leg_top = [(59 + lean, 128), (39 + lean, 145), (25 + lean, 169)]
        front_leg_top = [(73 + lean, 128), (93 + lean, 146), (108 + lean, 174)]
        back_shoe = (14 + lean, 165, True)
        front_shoe = (100 + lean, 171, False)

    draw_limb(draw, back_arm, skin=True, width=11)
    draw_limb(draw, back_leg_top, skin=False, width=13)
    draw_shoe(draw, *back_shoe)

    draw.polygon(
        [
            (neck[0] - 18, neck[1] + 5),
            (neck[0] + 18, neck[1] + 7),
            (hip[0] + 16, hip[1] - 1),
            (hip[0] - 17, hip[1] - 2),
        ],
        fill=OUTLINE,
    )
    draw.polygon(
        [
            (neck[0] - 13, neck[1] + 8),
            (neck[0] + 13, neck[1] + 10),
            (hip[0] + 11, hip[1] - 7),
            (hip[0] - 12, hip[1] - 8),
        ],
        fill=shirt,
    )
    draw.line([(neck[0] - 11, neck[1] + 10), (neck[0] + 11, neck[1] + 11)], fill=trim, width=4)
    draw.polygon([(hip[0] - 17, hip[1] - 2), (hip[0] + 17, hip[1] - 1), (hip[0] + 14, hip[1] + 14), (hip[0] - 15, hip[1] + 13)], fill=OUTLINE)
    draw.polygon([(hip[0] - 11, hip[1] + 1), (hip[0] + 11, hip[1] + 2), (hip[0] + 9, hip[1] + 11), (hip[0] - 10, hip[1] + 10)], fill=SHORTS)

    draw_limb(draw, front_leg_top, skin=False, width=13)
    if stride == 0:
        thick_line(draw, [(40 + lean, 145), (35 + lean, 164), (31 + lean, 176)], SKIN_DARK, 8)
        thick_line(draw, [(91 + lean, 148), (98 + lean, 163), (103 + lean, 172)], SKIN, 8)
    else:
        thick_line(draw, [(38 + lean, 145), (29 + lean, 160), (25 + lean, 169)], SKIN_DARK, 8)
        thick_line(draw, [(94 + lean, 146), (103 + lean, 164), (108 + lean, 174)], SKIN, 8)
    draw_shoe(draw, *front_shoe)

    draw_limb(draw, front_arm, skin=True, width=11)
    draw.ellipse((front_arm[-1][0] - 5, front_arm[-1][1] - 4, front_arm[-1][0] + 6, front_arm[-1][1] + 7), fill=SKIN_LIGHT)
    draw.ellipse((back_arm[-1][0] - 5, back_arm[-1][1] - 4, back_arm[-1][0] + 6, back_arm[-1][1] + 7), fill=SKIN_DARK)
    return img


def main():
    for character in CHARACTERS:
        head = crop_existing_head(character["source"])
        sheet = Image.new("RGBA", (FRAME_W * 2, FRAME_H), (0, 0, 0, 0))
        sheet.alpha_composite(draw_frame(head, character["shirt"], character["trim"], 0), (0, 0))
        sheet.alpha_composite(draw_frame(head, character["shirt"], character["trim"], 1), (FRAME_W, 0))
        sheet.save(SPRITE_DIR / character["output"])
        print(f"{character['output']} from {character['source']} {sheet.size[0]}x{sheet.size[1]}")


if __name__ == "__main__":
    main()

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets" / "home" / "life-zone"
SPRITE_ROOT = ASSET_ROOT / "sprites"


def assert_png(path):
    if not path.exists():
        raise AssertionError(f"Missing PNG: {path}")
    return Image.open(path)


def main():
    manifest_path = ASSET_ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    base_src = manifest["baseRoom"]["src"].replace("./assets/home/life-zone/", "")
    base = assert_png(ASSET_ROOT / base_src)
    expected_size = (manifest["baseRoom"]["width"], manifest["baseRoom"]["height"])
    if base.size != expected_size:
        raise AssertionError(f"Base size mismatch: {base.size} != {expected_size}")
    if base.mode != "RGBA":
        raise AssertionError(f"Base image must be RGBA: {base.filename}")
    if base.getextrema()[3][0] != 0:
        raise AssertionError(f"Base image has no transparent outer pixels: {base.filename}")
    base_pixels = base.get_flattened_data() if hasattr(base, "get_flattened_data") else base.getdata()
    outline_pixels = sum(
        1
        for r, g, b, a in base_pixels
        if a >= 40 and abs(r - 88) <= 4 and abs(g - 48) <= 4 and abs(b - 28) <= 4
    )
    if outline_pixels < 1000:
        raise AssertionError(f"Base refined outline looks too weak: {outline_pixels} pixels")

    sprites = sorted(SPRITE_ROOT.glob("*.png"))
    if len(sprites) != 27:
        raise AssertionError(f"Expected 27 actor sprites, found {len(sprites)}")

    for actor in manifest["actors"]:
        for state_slots in manifest["stateSlots"].values():
            for slot in state_slots:
                sprite = assert_png(SPRITE_ROOT / f"{actor['spritePrefix']}-{slot['pose']}.png")
                if sprite.mode != "RGBA":
                    raise AssertionError(f"Sprite is not RGBA: {sprite.filename}")
                alpha_min, alpha_max = sprite.getextrema()[3]
                if alpha_min != 0 or alpha_max == 0:
                    raise AssertionError(f"Sprite alpha looks wrong: {sprite.filename}")

    html = (ROOT / "docs" / "pixel-life-zone-mockup.html").read_text(encoding="utf-8")
    required_refs = [
        "../assets/home/life-zone/base-room-expanded-alpha.png",
        "../assets/home/life-zone/sprites/"
    ]
    for ref in required_refs:
        if ref not in html:
            raise AssertionError(f"HTML missing asset reference: {ref}")

    print(f"validated base={base.size[0]}x{base.size[1]}, sprites={len(sprites)}")


if __name__ == "__main__":
    main()

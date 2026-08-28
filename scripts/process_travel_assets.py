from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageOps


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / "images" / "旅行地图"
OUTPUT = PROJECT / "public" / "assets" / "travel"

CITY_SLUGS = {
    "东莞市": "dongguan",
    "汕头市": "shantou",
    "潮州市": "chaozhou",
    "珠海市": "zhuhai",
    "香港": "hongkong",
    "澳门": "macau",
}


def save_webp(source: Path, destination: Path, max_edge: int = 1600, quality: int = 82) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    save_webp(SOURCE / "中国地图.jpg", OUTPUT / "china-map.webp", 1800, 88)
    save_webp(SOURCE / "广东省.png", OUTPUT / "guangdong-map.webp", 1500, 90)

    with Image.open(SOURCE / "各地图标.png") as landmark_sheet:
        landmark_sheet = landmark_sheet.convert("RGB")
        crops = {
            "hong-kong-icon.webp": (940, 545, 1225, 865),
            "macau-icon.webp": (1240, 535, 1535, 880),
        }
        for name, box in crops.items():
            crop = landmark_sheet.crop(box)
            crop.thumbnail((330, 330), Image.Resampling.LANCZOS)
            crop.save(OUTPUT / name, "WEBP", quality=88, method=6)

    photo_root = SOURCE / "广东省旅行照片"
    for city_name, slug in CITY_SLUGS.items():
        city_dir = photo_root / city_name
        photos = sorted(
            path for path in city_dir.iterdir()
            if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        for index, photo in enumerate(photos, start=1):
            save_webp(photo, OUTPUT / "guangdong" / slug / f"{index:02d}.webp")


if __name__ == "__main__":
    main()

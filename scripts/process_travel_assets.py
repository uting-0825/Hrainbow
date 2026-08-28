from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageOps


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / "images" / "旅行地图"
OUTPUT = PROJECT / "public" / "assets" / "travel"

PHOTO_GROUPS = {
    ("广东省旅行照片", "东莞市"): ("guangdong", "dongguan"),
    ("广东省旅行照片", "汕头市"): ("guangdong", "shantou"),
    ("广东省旅行照片", "潮州市"): ("guangdong", "chaozhou"),
    ("广东省旅行照片", "珠海市"): ("guangdong", "zhuhai"),
    ("广东省旅行照片", "香港"): ("guangdong", "hongkong"),
    ("广东省旅行照片", "澳门"): ("guangdong", "macau"),
    ("江苏省旅行照片", ""): ("jiangsu", "nanjing"),
    ("江西省旅行照片", "南昌市"): ("jiangxi", "nanchang"),
    ("江西省旅行照片", "九江市"): ("jiangxi", "jiujiang"),
    ("江西省旅行照片", "景德镇市"): ("jiangxi", "jingdezhen"),
    ("福建省旅行照片", ""): ("fujian", "footprints"),
    ("贵州省旅行图片", ""): ("guizhou", "footprints"),
}


def save_webp(source: Path, destination: Path, max_edge: int = 1600, quality: int = 82) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    save_webp(SOURCE / "中国地图.jpg", OUTPUT / "china-map.webp", 1800, 88)
    for source_name, output_name in {
        "广东省.png": "guangdong-map.webp",
        "江西省.png": "jiangxi-map.webp",
        "福建省.png": "fujian-map.webp",
        "贵州省.png": "guizhou-map.webp",
        "南京.jpg": "jiangsu-map.webp",
    }.items():
        save_webp(SOURCE / source_name, OUTPUT / output_name, 1600, 88)

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

    for (collection, folder), (province_slug, place_slug) in PHOTO_GROUPS.items():
        city_dir = SOURCE / collection / folder if folder else SOURCE / collection
        photos = sorted(
            path for path in city_dir.iterdir()
            if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        for index, photo in enumerate(photos, start=1):
            save_webp(photo, OUTPUT / province_slug / place_slug / f"{index:02d}.webp")


if __name__ == "__main__":
    main()

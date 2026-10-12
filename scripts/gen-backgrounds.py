#!/usr/bin/env python3
"""博客背景图生成器：调用 WHITEBG_IMAGE_* 生水墨壁纸，写入 public/images/background/。

前置：source <inktide-assets>/.env.image
用法：
  python3 scripts/gen-backgrounds.py --probe          # 只探尺寸支持，不写文件
  python3 scripts/gen-backgrounds.py mist bamboo      # 生成指定几张
  python3 scripts/gen-backgrounds.py --all            # 全部
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import struct
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "images" / "background"

# 与 src/config/skins.ts 的水墨皮肤同源：宣纸底、墨色字、朱砂点缀
PAPER = "#e8e2d5"
INK = "#45465e"
CINNABAR = "#ab1d22"
INDIGO = "#354e6b"

STYLE = (
    "traditional Chinese ink-wash painting (shuimo), on warm xuan paper texture, "
    f"extremely light and airy, low contrast, desaturated, dominant paper tone {PAPER}, "
    f"ink tones limited to {INK} and {INDIGO}, at most a single small {CINNABAR} accent, "
    "generous empty space, soft wet-on-wet ink bleed, no harsh outlines, "
    "wide horizontal composition with the center left almost entirely empty for UI overlays, "
    "no text, no calligraphy, no seal stamp, no watermark, no frame, no border"
)

# 每张 = 一个明确的取景意图；主体一律靠边，中间留给卡片与正文
WALLPAPERS: dict[str, str] = {
    "mist": (
        "a nearly blank xuan paper field with only the faintest drifting ink mist and a few "
        "translucent wash clouds along the lower third, almost no subject at all, "
        "the feeling of an empty sheet of paper before the brush touches it"
    ),
    "ridges": (
        "layered distant mountain ridges rendered as three or four pale ink washes stacked in "
        "the lower third, receding into fog, nearest ridge slightly darker, "
        "the upper two thirds pure empty paper sky"
    ),
    "bamboo": (
        "a few slender bamboo stalks and leaves in pale ink entering from the right edge and "
        "reaching up, soft and unfocused like a shadow on paper, "
        "the left two thirds completely empty"
    ),
    "pine-moon": (
        "one faint pale ink moon high in the upper left, a sparse gnarled pine branch in dark ink "
        "crossing the lower right corner, a thin band of mist between them, "
        "the middle of the image left empty"
    ),
    "rain": (
        "abstract wet ink bleeding into paper, diagonal rain streaks and soft ink blooms "
        "concentrated in the corners and along the bottom, washed and diffuse, "
        "no landscape, no objects, the center kept clean"
    ),
}

SIZES_TO_TRY = ["3840x2160", "2048x1152", "1536x1024"]


def png_size(data: bytes) -> tuple[int, int] | None:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def generate(prompt: str, size: str) -> bytes:
    base = os.environ["WHITEBG_IMAGE_BASE_URL"].rstrip("/")
    body = json.dumps(
        {
            "model": os.environ.get("WHITEBG_IMAGE_MODEL", "gpt-image-2.5-flare"),
            "prompt": prompt,
            "size": size,
            "n": 1,
        }
    ).encode()
    req = Request(
        f"{base}/v1/images/generations",
        data=body,
        headers={
            "Authorization": f"Bearer {os.environ['WHITEBG_IMAGE_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=300) as resp:
        payload = json.loads(resp.read())
    b64 = payload["data"][0].get("b64_json") or ""
    if not b64:
        raise RuntimeError(f"返回无 b64_json：{json.dumps(payload)[:300]}")
    return base64.b64decode(b64)


def probe() -> int:
    for size in SIZES_TO_TRY:
        try:
            data = generate("a blank sheet of paper", size)
        except Exception as exc:  # noqa: BLE001 - 探针要如实报告每种尺寸的结果
            print(f"{size}: 失败 {exc}")
            continue
        print(f"{size}: 实得 {png_size(data)}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("names", nargs="*", help=f"要生成的图名，可选：{', '.join(sorted(WALLPAPERS))}")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--size", default=SIZES_TO_TRY[0])
    args = parser.parse_args()

    if not os.environ.get("WHITEBG_IMAGE_API_KEY"):
        print("缺 WHITEBG_IMAGE_* 环境变量，先 source .env.image")
        return 1
    if args.probe:
        return probe()

    names = sorted(WALLPAPERS) if args.all else args.names
    unknown = [n for n in names if n not in WALLPAPERS]
    if unknown:
        parser.error(f"未知图名 {unknown}，可选：{', '.join(sorted(WALLPAPERS))}")
    if not names:
        parser.error("指定要生成的图名，或用 --all")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        prompt = f"{WALLPAPERS[name]}. {STYLE}"
        started = time.time()
        print(f"[{name}] 生成中（{args.size}）……")
        try:
            data = generate(prompt, args.size)
        except Exception as exc:  # noqa: BLE001 - 逐张报告，单张失败不中断整批
            print(f"[{name}] 失败：{exc}")
            continue
        out = OUT_DIR / f"{name}.png"
        out.write_bytes(data)
        print(f"[{name}] 写出 {out.relative_to(ROOT)} 尺寸 {png_size(data)} 用时 {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

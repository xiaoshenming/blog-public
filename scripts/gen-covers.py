#!/usr/bin/env python3
"""文章封面图生成器：调用 WHITEBG_IMAGE_* 生水墨风封面。

PNG 母版写入 assets-source/pictures/，再经 cwebp 压缩、以 sha256 命名写入
public/images/pictures/，返回可直接填进 config.json 的 cover 路径。

前置：source <inktide-assets>/.env.image
用法：
  python3 scripts/gen-covers.py                # 生成全部
  python3 scripts/gen-covers.py fire           # 只生成指定几张
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import struct
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets-source" / "pictures"
OUT_DIR = ROOT / "public" / "images" / "pictures"

# 与 src/config/skins.ts 的水墨皮肤同源
PAPER = "#e8e2d5"
INK = "#45465e"
CINNABAR = "#ab1d22"
INDIGO = "#354e6b"

STYLE = (
    "traditional Chinese ink-wash painting (shuimo), on warm xuan paper texture, "
    f"dominant paper tone {PAPER}, ink tones limited to {INK} and {INDIGO}, "
    f"at most one small {CINNABAR} accent, soft wet-on-wet ink bleed, no harsh outlines, "
    "wide horizontal composition with the subject slightly off-center and generous empty paper, "
    "low contrast, restrained and quiet, "
    "no text, no calligraphy, no letters, no seal stamp, no watermark, no frame, no border"
)

# 每张 = 一篇文章的封面意图
COVERS: dict[str, str] = {
    "four-languages": (
        "four slender ink streams entering from the four edges of a wide xuan paper sheet "
        "and flowing toward one another, blending where they meet near the center: "
        "one stream deep ink black, one indigo blue-grey, one pale diluted grey, "
        "and one carrying a single thin cinnabar thread; wet-on-wet bleeding at the meeting point, "
        "like four languages quietly finding one another, "
        "the rest of the paper left almost entirely empty"
    ),
    "fire": (
        "a single tall flame rising from the lower center of a wide xuan paper sheet, "
        "painted entirely in ink-wash technique: the outer flame is dark ink smoke twisting upward, "
        "the inner core is one vivid cinnabar red brushstroke, "
        "tiny ink dots scattered above like rising embers, a faint grey wash at the base, "
        "the surrounding paper almost completely empty, quiet and restrained, "
        "the feeling of a held breath that refuses to let go"
    ),
}

SIZE = "2048x1152"


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


def to_webp(png_path: Path) -> Path:
    digest = hashlib.sha256(png_path.read_bytes()).hexdigest()
    webp_path = OUT_DIR / f"{digest}.webp"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["cwebp", "-q", "82", "-m", "6", "-quiet", str(png_path), "-o", str(webp_path)],
        check=True,
    )
    return webp_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("names", nargs="*", help=f"可选：{', '.join(sorted(COVERS))}")
    args = parser.parse_args()

    if not os.environ.get("WHITEBG_IMAGE_API_KEY"):
        print("缺 WHITEBG_IMAGE_* 环境变量，先 source .env.image")
        return 1

    names = args.names or sorted(COVERS)
    unknown = [n for n in names if n not in COVERS]
    if unknown:
        parser.error(f"未知图名 {unknown}，可选：{', '.join(sorted(COVERS))}")

    SRC_DIR.mkdir(parents=True, exist_ok=True)
    for name in names:
        prompt = f"{COVERS[name]}. {STYLE}"
        started = time.time()
        print(f"[{name}] 生成中（{SIZE}）……")
        try:
            data = generate(prompt, SIZE)
        except Exception as exc:  # noqa: BLE001 - 逐张报告，单张失败不中断整批
            print(f"[{name}] 失败：{exc}")
            continue
        png_path = SRC_DIR / f"{name}.png"
        png_path.write_bytes(data)
        webp_path = to_webp(png_path)
        rel = webp_path.relative_to(ROOT)
        print(f"[{name}] PNG {png_size(data)} → /{rel} ({webp_path.stat().st_size // 1024}K, 用时 {time.time() - started:.0f}s)")
        print(f"        cover 路径：/images/pictures/{webp_path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

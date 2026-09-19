#!/usr/bin/env python3
"""
从 assets/brand/icon-source.jpg 生成 tally 的全套应用图标。

源图是一张写实插画（笔记本 + 钢笔），本身是 914x847 的 JPEG —— 非正方形、
没有透明通道，尺寸也不够。这里负责把它裁切、补齐、缩放成各平台需要的样子。

关键约束：
  · iOS 图标会被系统裁成圆角，内容铺满即可
  · Android 自适应图标只显示中心 66% 的「安全区」，
    所以插画必须缩进去，否则书页和笔尖会被裁掉
  · 主题图标（monochrome）需要剪影，用亮度阈值从插画里提取暗部

输出（写入 assets/）：
  icon.png                     1024  通用图标（iOS / 旧版 Android）
  android-icon-background.png  1024  自适应背景层：白底 + 居中插画
  android-icon-foreground.png  1024  自适应前景层：透明（插画已在背景层）
  android-icon-monochrome.png  1024  主题图标：高对比剪影
  splash-icon.png              1024  启动图
  favicon.png                    48  Web 图标

用法：python3 scripts/generate-icons.py
"""

import os
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
SOURCE = os.path.join(ASSETS, "brand", "icon-source.jpg")

SIZE = 1024
COVER_ANDROID = 0.62   # 控制在 Android 安全区内，避免被裁
COVER_SPLASH = 0.70

WHITE = (255, 255, 255, 255)


def load_source():
    """读源图并居中裁成正方形，避免后续缩放变形"""
    img = Image.open(SOURCE).convert("RGBA")
    side = min(img.width, img.height)
    return ImageOps.fit(img, (side, side), Image.LANCZOS)


def edge_color(img):
    """取四角平均色，用于给非正方形画面补边"""
    w, h = img.size
    pad = 24
    corners = [
        img.crop((0, 0, pad, pad)),
        img.crop((w - pad, 0, w, pad)),
        img.crop((0, h - pad, pad, h)),
        img.crop((w - pad, h - pad, w, h)),
    ]
    total = [0, 0, 0]
    count = 0
    for corner in corners:
        for pixel in corner.getdata():
            total[0] += pixel[0]
            total[1] += pixel[1]
            total[2] += pixel[2]
            count += 1
    return (total[0] // count, total[1] // count, total[2] // count, 255)


def place(img, size, coverage, bg):
    """把 img 按 coverage 居中放进 size×size 的画布"""
    canvas = Image.new("RGBA", (size, size), bg)
    target = round(size * coverage)
    w, h = img.size
    k = target / max(w, h)
    resized = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    canvas.paste(resized, ((size - resized.width) // 2, (size - resized.height) // 2), resized)
    return canvas


def make_monochrome(img, size, coverage):
    """提取暗部作为剪影：系统会用主题色重新填充这些像素"""
    # 阈值取得低一些：只留钢笔这类深色主体，滤掉书页上的浅灰横线
    mask = img.convert("L").filter(ImageFilter.GaussianBlur(2)).point(
        lambda v: 255 if v < 145 else 0
    )
    # 开运算（先腐蚀再膨胀）：抹掉书页上的细线，保留钢笔和书本轮廓
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5))

    target = round(size * coverage)
    w, h = img.size
    k = target / max(w, h)
    new_size = (max(1, round(w * k)), max(1, round(h * k)))
    mask = mask.resize(new_size, Image.LANCZOS)

    layer = Image.new("RGBA", new_size, WHITE)
    layer.putalpha(mask)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(layer, ((size - new_size[0]) // 2, (size - new_size[1]) // 2), layer)
    return canvas


def save(img, name):
    path = os.path.join(ASSETS, name)
    # 插画是照片级的，optimize 能省下不少体积
    img.save(path, optimize=True)
    kb = os.path.getsize(path) / 1024
    print(f"  ✓ {name}  {img.width}x{img.height}  {kb:.0f}KB")


def main():
    if not os.path.exists(SOURCE):
        raise SystemExit(f"找不到源图：{SOURCE}")

    print("基于 icon-source.jpg 生成图标...")
    src = load_source()
    bg = edge_color(src)
    print(f"  源图裁切为 {src.width}x{src.height}，补边色 rgb{bg[:3]}")

    # 1. 通用图标：铺满画面，非正方形部分用底色补齐
    save(place(src, SIZE, 1.0, bg), "icon.png")

    # 2. Android 自适应图标
    #    插画缩进安全区并放在背景层，前景层留空 —— 这样圆形/方形裁剪都不会切到内容
    save(place(src, SIZE, COVER_ANDROID, WHITE), "android-icon-background.png")
    save(Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)), "android-icon-foreground.png")
    save(make_monochrome(src, SIZE, COVER_ANDROID), "android-icon-monochrome.png")

    # 3. 启动图
    save(place(src, SIZE, COVER_SPLASH, WHITE), "splash-icon.png")

    # 4. Web favicon
    save(place(src, 48, 1.0, bg), "favicon.png")

    print("完成。")


if __name__ == "__main__":
    main()

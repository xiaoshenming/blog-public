# 自托管字体

每个子目录是一款按 `unicode-range` 切块后的 webfont：一个 `result.css` 加若干 `.woff2` 分块。浏览器只会下载页面上实际出现的字符所在的块，所以即便整套中文字体有十几 MB，单页通常只需几百 KB。

站点可选字体在 `src/config/fonts.ts` 注册，当前使用哪一款存在 `src/config/site-content.json` 的 `font` 字段，可在首页配置弹窗的「字体」tab 里切换。

## huiwenmincho — 汇文明朝体（修正版）

- 来源：<https://github.com/bosswnx/huiwenmincho-improved>，release `20241203`，`Huiwenmincho-improved.otf`
- 授权：CC0-1.0（公有领域）
- 切块：`cn-font-split`，`font-family: "Huiwenmincho Improved"`，`font-display: swap`

## 新增一款字体

1. 准备 ttf / otf / woff2 源文件（注意授权允许网页嵌入与再分发）。
2. 切块到 `public/fonts/<id>/`：

   ```bash
   pnpm font:split -i ./YourFont.ttf -o public/fonts/<id> --css.fontFamily "Your Font"
   ```

3. 在 `src/config/fonts.ts` 的 `FONT_OPTIONS` 里加一项，`cssHref` 指向 `/fonts/<id>/result.css`，`family` 以上面的 fontFamily 开头并补上合适的系统回退字体。

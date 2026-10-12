import { SKIN_PRESETS } from '@/skins'
import { FONT_OPTIONS } from '@/config/fonts'
import { BACKGROUND_VAR, FONT_STORAGE_KEY, SKIN_STORAGE_KEY, styleVars, themeVars } from '@/lib/skin'

/**
 * 引导脚本：在首次绘制前落地访客偏好，否则选了水墨的访客会先看到一帧站长默认皮肤再跳变。
 *
 * 单独成文件而非留在 lib/skin.ts：它服务的是「React 加载之前的浏览器」这个
 * 完全不同的执行环境，约束也另成一套 —— 脚本必须自包含（不能引用任何模块）、
 * 体积敏感（每份 HTML 都带一份）、要防注入（内容内联在 <script> 里）。
 * lib/skin.ts 那边是运行时路径（读 storage、解析、写 DOM），两者只共享令牌表。
 *
 * 注入点在 src/app/layout.tsx 的 <Head>，参数全是模块常量，故那边只在模块级算一次。
 */
export function buildPreferenceBootstrap(
	siteSkinId: string,
	siteFontId: string,
	siteBackgroundImageId: string | null | undefined,
	backgroundImages: ReadonlyArray<{ id: string; url: string }>
): string {
	const skins: Record<string, { v: Record<string, string>; df: string; b?: string }> = {}
	for (const skin of SKIN_PRESETS) {
		skins[skin.id] = {
			v: { ...themeVars(skin.theme), ...styleVars(skin.card, skin.button) },
			df: skin.defaultFont,
			...(skin.backgroundImageId ? { b: skin.backgroundImageId } : {})
		}
	}

	const fonts: Record<string, { f: string; h?: string }> = {}
	for (const font of FONT_OPTIONS) {
		fonts[font.id] = font.cssHref ? { f: font.family, h: font.cssHref } : { f: font.family }
	}

	/* 脚本只会查两个背景图 id：访客皮肤的关联图、站长当前图。其余不进 HTML ——
	   这段 JSON 每份文档都要带一份，全量序列化是白付的字节。 */
	const neededImageIds = new Set<string>()
	if (siteBackgroundImageId) neededImageIds.add(siteBackgroundImageId)
	for (const skin of SKIN_PRESETS) if (skin.backgroundImageId) neededImageIds.add(skin.backgroundImageId)

	const images: Record<string, string> = {}
	for (const image of backgroundImages) {
		if (image.id && image.url && neededImageIds.has(image.id)) images[image.id] = image.url
	}

	/* `<` 转义成 <：这段 JSON 内联在 <script> 里，背景图 url 来自站长可导入的配置，
	   不转义的话一个 `</script>` 就能提前闭合标签。 */
	const data = JSON.stringify({ skins, fonts, images, siteSkinId, siteFontId, siteBgId: siteBackgroundImageId || '' }).replace(
		/</g,
		'\\u003c'
	)

	/* 下面这段是浏览器里跑的纯 JS，压缩过的键名与上面序列化的结构一一对应：
	   v = 该皮肤的全部 CSS 变量（配色 + 卡片 + 按钮，压平成一个表）
	   df = 皮肤推荐字体, b = 皮肤关联背景图 id
	   f = font-family, h = 字体样式表, images = 背景图 id→url, siteBgId = 站长当前背景图 id
	   核心分支：只有访客确实覆盖了皮肤（vsid 非空）才写预设变量 ——
	   否则会把 SSR 注入的站长自定义配色顶掉，首屏闪一帧预设色再改回来。 */
	return `(function(){try{
var d=${data},r=document.documentElement;
var vs=localStorage.getItem(${JSON.stringify(SKIN_STORAGE_KEY)});
var vf=localStorage.getItem(${JSON.stringify(FONT_STORAGE_KEY)});
var vsid=(vs&&d.skins[vs])?vs:null;
var sid=vsid||d.siteSkinId;
var s=d.skins[sid]||d.skins[d.siteSkinId];
r.setAttribute('data-skin',sid);
if(vsid&&s){for(var k in s.v)r.style.setProperty(k,s.v[k]);}
var bid=(vsid&&s&&s.b)?s.b:d.siteBgId;
var burl=bid?d.images[bid]:null;
r.style.setProperty(${JSON.stringify(BACKGROUND_VAR)},burl?'url("'+burl+'")':'none');
var fid=(vf&&d.fonts[vf]?vf:null)||(vsid&&s?s.df:null)||d.siteFontId;
var fo=d.fonts[fid]||d.fonts[d.siteFontId];
if(fo){if(fo.h&&!document.querySelector('link[data-font-css][href="'+fo.h+'"]')){
var l=document.createElement('link');l.rel='stylesheet';l.href=fo.h;l.setAttribute('data-font-css','');
document.head.appendChild(l);}
r.style.setProperty('--font-sans',fo.f);}
}catch(e){}})();`
}

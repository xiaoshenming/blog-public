# Record of launching the four-language blog: Letting a local 1.8B small model act as the translator

This blog is only in Chinese, which is not good.

So, while I had time, I quickly added English, Japanese, and Korean. Throughout the process, the translation work was mainly handled by a local 1.8B translation small model, with me only responsible for proofreading and fixing bugs. This article provides a complete review: how the architecture was chosen, how the translation pipeline was set up, and several pitfalls that only occur after actual launch.

## Let’s start with the conclusion

- 全站 UI 文案 464 条 × 3 语种，访客侧和管理侧全覆盖（写作后台、站点配置弹窗这些也算）
- 13 篇文章全文 × 3 语种 = 39 篇译文，外加关于页、友链、项目、图片、句子的数据变体
- 共 5 个提交、319 个文件变更
- 左下角语言菜单切换，选择持久化，`<html lang>` 跟着变

The effect is clear; just switch to a language and click around to see it.

## Why not use next-intl?

I carefully considered mature solutions like next-intl before starting, but ultimately gave up because our blog’s structure is very unique: the article text is stored in a GitHub repository (`public/blogs/<slug>/index.md`), fetched and rendered at runtime, essentially making GitHub the database. This client-side rendering + static data file architecture makes adding locale routing purely unnecessary.

The last option was the lightest: building a custom dictionary, React Context, and localStorage persistence, fully isomorphic with the existing font switching mechanism in the site. There are only three core files:

- `config.ts`: language code registry, display name, `htmlLang` mapping
- `translate.ts`: two-level dictionary lookup; automatically falls back to Chinese if a key is missing, never shows a blank screen
- `locales.ts`: registration entry point for each language dictionary

A crucial trade-off: the English mode does not modify the URL, there is no `/en/` route, which hurts SEO. I don’t mind this for a personal blog, but think carefully before building a commercial site.

For content files, follow the “variant suffix” convention: `index.en.md`, `index.ja.json`, `list.ko.json`... During runtime, the current language version is loaded first; if the file doesn’t exist, the Chinese original is used. So at any time, only a part of the translation is uploaded, yet the site remains complete.

## Who is the translator?

Created a OpenAI-compatible reasoning service locally, with two models integrated:

- Main model: **Hy-MT2-1.8B**, a specialized translation model for Tencent's Hunyuan, quantized at 4 bits. A small specialized model for translation, fast and reliable
- Backup model: **Qwen3.8-27B**, used when individual languages or single articles don’t meet expectations, then re-run with it

The prompt design refers to the immersive translation plugin: only output the translation, the number of paragraphs must be consistent, and multiple paragraphs are separated by `%%`. The last rule is crucial—split the article into segments with blank lines, combine adjacent paragraphs into batches (up to 4 paragraphs per batch), and process all batches in one request, then split them back with `%%` for proper arrangement. The larger the batch, the more likely there will be missing or misplaced segments; the default 4-segment structure in immersive translation makes sense, but if exceeded, segments will be lost.

There are six files in total for the pipeline script, with two entry points:

- `i18n:dict`: Translate UI dictionaries (zh domain files → en/ja/ko domain files)
- `i18n:content`: Translate content (markdown articles, config files, various JSON indices)

The fence code blocks are completely skipped, frontmatter is not translated, and if translation fails, it automatically falls back to segment-by-segment translation. If a single segment also fails, the Chinese version is preserved—the structure remains consistent, and the worst case is just that sentence not being translated.

There is also a design feature that solves all subsequent issues: **incremental semantics, rerun without overwriting**. Existing translations in the dictionary files (non-Chinese content) are retained as they are, with only new keys being translated; content files use `--skip-existing`, and existing translations are directly skipped. Only in this way can the cycle of “modify a text → run once → proofread a sentence” work, otherwise every rerun would overwrite the manual proofreading, and no one can fix that.

By the way, a technical detail: the string literals output by the generator follow the prettier style in the repository (default single quotes; only switch to double quotes when content contains single quotes), re-run with zero diff, and no formatting noise appears in git.

## Multi-agent division of labor

For tasks like text extraction, the volume is large but the pattern is fixed, making multi-agent parallelism ideal. 4 agents are assigned on the visitor side to transform different domains (blogs, music, content collections, toolkits), 4 on the management side (writing backend, configuration popups, management toolbar, dialogs and toast), and 2 audit agents to check data integrity and locale perception omissions.

Strengthen standards before starting: split the dictionary into files by business domain, key naming rules, the en directory cannot be modified (reserved for translation pipelines), and reference implementations are done first (I modify 4 files as a sample first). This way, agents won’t conflict with each other, and the output can be used directly.

## Pitfalls encountered after the launch

### 1. Monday is translated as "One"

The Chinese weekday list `['一','二','三',...]` is fed to the model, and the English version returns:

> One / Two / Three / 4 / 5 / 6 / Day

The first three are interpreted as capitalized numbers, the middle three are honestly translated as Arabic numerals, and the last "日" is correctly translated. The Japanese version is even more peculiar, retaining the original order of one, two, three – after all, in Japanese they can indeed be used as numbers.

The correction method is simple: manual rewriting. Mon/Tue/Wed, 月火水木金土日, 월화수목금토일. The lesson is that **short tags without context are the main enemy of translators**: days of the week, units ("Hour/Minute" is translated as Hour/Minute in singular), buttons ("Conversion" is translated as Converting in the present tense), these all require manual handling.

### 2. Fragments embedded in sentences cannot be translated.

There is a usage guide on the Wuthering Waves card analysis page: "Click F12, then the Network panel on the right" – F12 and Network are the <span> highlighted in JSX, and the entire sentence is split into separate segments stored in a dictionary. When translating fragments like this, there is no context, and Korean is even worse: particles stick to the previous word, and the broken structure cannot be reassembled.

The approach is to abandon word-by-word matching and rewrite the entire sentence structure according to the slots, creating one version for each language that aligns with their own word order. This is the first lesson in international copywriting design: **Give the complete sentence to the translator, don’t break it into fragments.**

### 3. Terminology drift

The tags for 13 articles are translated independently, with two versions of "Liuxiandong" being translated as "background", "pretext" as "background", "agent" as "agent", and the Korean version of "Wuthering Waves" using the incorrect character in the official name (명조). Finally, the script is written to correct each term against the Chinese original, aligning the terminology lists across the three languages.

The correct approach is to provide a glossary before translation, or ensure consistency by checking alignment after translation. Never expect the model to unify proper nouns on its own.

### 4. `useState(props)`：Cards do not switch language automatically

The most subtle one. There is a line like this in the Suni bloger card component:

```ts
const [localBlogger, setLocalBlogger] = useState(blogger)
```

The state is only copied once during initialization of props. After switching language, the list data changes, but the key remains the same, the component does not re-attach, and the language inside the card is still the same as when it first appeared on the page. The phenomenon at that time was very strange: in React fiber, the props were already in Japanese, yet the screen displayed Chinese, and the console was clear.

One line of fix: adding `key={locale}` to the list forces reconstruction. Lesson: **State initialized from props naturally does not respond to prop changes**; global contexts like language and theme are the easiest to encounter this issue.

### 5. Multilingual support is not just translation; it is data consistency.

Three consecutive pitfalls all occur on the "writing" side:

- The editing and saving process: if you use the "merged view of the current language," saving once in Japanese mode results in Japanese titles being written into the Chinese `index.json` — the data source is contaminated by the translation.
- Deleting articles only removes the Chinese index, leaving orphan entries in English, Japanese, and Korean indexes; accessing those languages results in a 404 error — this is the real cause of users reporting "frontend errors sometimes".
- In Japanese, 7 articles are classified as "要約," but in the classification list they are called "まとめ," showing two different translations for the same meaning; the grouping doesn’t match at all.

**Translation: "Display" can be resolved, but "write" cannot. Any link written into the data source must be firmly attached to the source language.**

### Bonus: Language button flies out of the screen

The new language button in the lower left corner uses the `card.base` style—this is used for freely dragging cards on the homepage, with `position: absolute` already applied. The button is absolutely positioned within a zero-width container, with the content compressed and wrapped to a height of 86px, with the lower part visible on the screen. The fix is to explicitly use `position: static` to regain the document flow.

Before reusing the shared style, check what hidden constraints it brings.

## Is the quality actually good?

To be honest, there are two levels:

**Article text: Surprisingly good.** The markdown structure, image paths, and inline code are all preserved, the sentences flow well, and even the Korean honorific style remains consistent. The 1.8B small model can't write articles, but it can easily read them.

UI short sentence: Needs human proofreading. Approximately 10% of 464 items have flaws, but they are mostly in predictable categories (days, units, tenses, terms). Just go through them according to the checklist.

The manual proofreading work has been minimized due to pipeline design: no incremental coverage, zero format diff, and the proofread results remain safe—even after running ten thousand times, they won’t be overwritten.

## How long does it take to add a new language?

After all parameters are parameterized, only three steps remain:

```ts
// 1. Register the language code and display name
const LOCALES = ['zh', 'en', 'ja', 'ko', 'fr']
```

```bash
# 2. Run the translation pipeline, fully automatic for local models
TRANSLATE_TARGET=fr pnpm i18n:dict
TRANSLATE_TARGET=fr pnpm i18n:content
```

3. Add a date format, for manual proofreading of high-risk items (weekdays, units, tutorial outlines)

Machine time is twenty minutes, manual time is half an hour. In the future, there’s no need to worry about translation when writing new articles; just use pnpm i18n:content --skip-existing to incrementally translate missing language versions.

## End part

The initial requirement was simply: "The blog is only in Chinese, which is not good." What was achieved in the end was a sustainable multi-language system: translation pipelines, alignment checklist, three-step integration for new languages, and automatic auto-fill for new articles.

By the way, the English, Japanese, and Korean versions of this article are also created using this pipeline—the article itself serves as evidence. Give it a try in different languages.

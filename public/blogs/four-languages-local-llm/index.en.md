# Shipping a Four-Language Blog with a Local 1.8B Translation Model

This blog is only in Chinese, which is not good.

So, while I had time, I quickly added English, Japanese, and Korean content. Throughout the process, the translation work was mainly handled by a local 1.8B small translation model, with me only responsible for proofreading and fixing bugs. This article provides a comprehensive review: how the architecture was chosen, how the translation pipeline was set up, and several pitfalls that only occur after actual launch.

## Let’s start with the conclusion

- 全站 UI copy: 464 items × 3 languages, covering both visitor and admin sides (including the writing backend and site configuration popups)  
- 13 full articles × 3 languages = 39 translations, plus variations of data for pages, friendship links, projects, images, and sentences  
- A total of 5 submissions and 319 file changes  
- Swapping the language in the bottom-left menu, choosing persistence, causes `<html lang>` to update accordingly

How it works—just switch to a language and click around to see the effect.

## Why not use next-intl

I carefully considered mature solutions like next-intl before trying it, but ultimately decided not to use it because our blog’s structure is very unique: the article text is stored in a GitHub repository (`public/blogs/<slug>/index.md`), fetched and rendered at runtime, which essentially makes GitHub the database. This client-side rendering + static data file architecture makes implementing locale routing purely unnecessary.

The final choice was the lightest solution: building a custom dictionary, React Context, and localStorage persistence, which is fully isomorphic with the existing font switching mechanism in the site. There are only three core files:

- `config.ts`: language code registry, display name, and `htmlLang` mapping
- `translate.ts`: two-level dictionary lookup; automatically falls back to Chinese when a key is missing, avoiding blank screens
- `locales.ts`: the registration entry point for each language dictionary

A crucial trade-off: the English mode does not change the URL, there is no `/en/` route, which hurts SEO. I don’t mind this for a personal blog, but consider carefully if you’re building a commercial site.

For content files, use the “variant suffix” convention: `index.en.md`, `index.ja.json`, `list.ko.json`... During execution, the current language version is loaded first; if the file doesn’t exist, it falls back to the Chinese original text. So even if only part of the translation is uploaded at any time, the site remains complete.

Who is the translator?

Created a OpenAI-compatible reasoning service locally, with two models integrated:

- Main model: **Hy-MT2-1.8B**, a specialized translation model for Tencent’s Hundun, with 4-bit quantization. This is a small specialized model for translation, which is fast and reliable
- Backup model: Qwen3.8-27B, used when certain languages or individual articles don’t meet expectations

The prompt design refers to the immersive translation plugin: only output the translation, the number of paragraphs must be consistent, and multiple paragraphs are separated by `%%`. The last rule is crucial—split the article into segments with blank lines, combine adjacent paragraphs into batches (up to 4 paragraphs per batch), and process all batches in one request, then split them back with `%%` for proper arrangement. The larger the batch, the more likely there will be missing or misplaced segments; the default 4-segment structure in immersive translation makes sense, but if exceeded, segments will be lost.

There are six files in total for the pipeline script, with two entry points:

- `i18n:dict`: UI dictionary (zh domain files → en/ja/ko domain files)
- `i18n:content`: Content translation (markdown articles, config files, various JSON indexes)

The围栏 code blocks are completely skipped, frontmatter is not translated, and if translation fails, it automatically falls back to segment-by-segment translation. If a segment still fails, the Chinese version is preserved—the structure remains consistent, and the worst case is just that one sentence not being translated.

There is also a design feature that solves all subsequent issues: **incremental semantics, no overwriting during rerunning**. Existing translations in the dictionary files (non-Chinese content) are retained as they are, with only new keys being translated; content files use `--skip-existing`, so existing translations are directly skipped. Only in this way can the cycle of “modify a text → run once → proofread a sentence” work, otherwise every rerun would erase manual proofreading, and no one can fix that.

By the way, a technical detail: the string literals output by the generator follow the prettier style in the repository (default single quotes; only switch to double quotes when content contains single quotes), re-run with zero diff, and no formatting noise appears in git.

## Multi-agent division of labor

For content extraction tasks, the volume is large but the pattern is fixed, making multi-agent parallel processing ideal. 4 agents are assigned on the visitor side to transform different domains (blogs, music, content collections, toolkits), 4 on the management side (writing backend, configuration popups, management toolbar, dialog boxes and toast), and the last 2 are audit agents, one checking data integrity and the other checking for missing locale awareness.

Strengthen guidelines before starting: split the dictionary into files by business domain, key naming rules, and the en directory must not be modified (reserved for translation pipelines), with reference implementations first (I modify 4 files as a sample first). This ensures no conflicts between agents and the output is directly usable.

## Pitfalls encountered after launch

### 1. Monday is translated as "One"

When passing the Chinese weekday list `['一','二','三',...]` to the model, the English version returns:

> One / Two / Three / 4 / 5 / 6 / Day

The first three are interpreted as capitalized numbers, the middle three are honestly translated as Arabic numerals, and the last “日” is correctly translated. The Japanese version is even more peculiar, preserving the original order of one, two, three — after all, in Japanese they can indeed be used as numbers.

The correction method is simple: manual rewriting. Mon/Tue/Wed, 월화수목금토일, 월화수목금토일. The lesson is that **short tags without context are the main enemy of translators**: days of the week, units (“Hour/Minute/Second” are translated as singular Hour/Minute/Second), buttons (“Conversion” is translated as Converting in the present tense), such cases require manual handling.

### 2. Fragments embedded in sentences cannot be translated

There is a usage tutorial on the Wuthering Waves card analysis page: “Click F12, then the Network panel on the right” — F12 and Network are `<span>` tags highlighted in JSX, and the entire sentence is split into separate segments stored in a dictionary. When translating such fragments, there is no context, and Korean is even worse: particles stick to the previous word, and the broken structure cannot be reassembled.

The approach is to abandon word-for-word matching and rewrite the entire sentence structure according to the slots, creating one version for each language that aligns with their own word order. This is the first lesson in international copywriting design: **give the complete sentence to the translator, don’t break it into fragments.**

### 3. Terminology Drift

The tags on 13 articles are translated independently, with two versions of "Liuxiandong" being translated as "background", "pretext" as "background", "agent" as "agent", and the Korean version of "Wuthering Waves" using the incorrect character for its official name (명조). Finally, the script is used to correct each term against the Chinese original, aligning the terminology lists across the three languages.

The correct approach is to provide a glossary before translation, or ensure consistency by checking alignment after translation. Never expect a model to unify proper nouns on its own.

### 4. `useState(props)`：Cards do not switch language

The most subtle one. In the Suni bloger card component, there is this line:

```ts
const [localBlogger, setLocalBlogger] = useState(blogger)
```

The state is only copied once from props during initialization. After switching language, the list data changes, but the key remains the same, the component does not re-initialize, and the cards still use the language from the first page load. The phenomenon was very strange: in React fiber, the props were already in Japanese, yet the screen still showed Chinese, and the console was clear.

One line of code fix: adding `key={locale}` to the list forces reconstruction. Lesson: **State initialized from props naturally does not respond to prop changes**; global contexts like language and theme are the easiest areas to encounter this issue.

### 5. Multilingual support is not just translation, but also data consistency

Three consecutive pitfalls all occur on the "writing" side:

- If the editing and saving process uses the "merged view of the current language," saving once in Japanese mode results in Japanese titles being written into the Chinese `index.json` — the data source is contaminated by the translation
- Deleting articles only removes the Chinese index, leaving orphan entries in English, Japanese, and Korean indices. Opening those languages shows a 404 error — this is the real cause of users reporting "frontend errors" occasionally
- In Japanese, the categories of 7 articles are labeled "要約," but the category list uses "まとめ," which has a different meaning. The grouping doesn’t match properly

Translate to English:

**Translation: "Display" can be solved, but "writing" cannot. Any link written into the data source must be firmly attached to the source language.**

### Secret: Language button flying off the screen

The newly created language button in the lower left corner reuses the `card.base` style—this is used for freely dragging cards on the homepage, with `position: absolute` already applied. The button is positioned absolutely within a zero-width container, and the content is compressed and wrapped to a height of 86px, with the lower part visible on the screen. The fix is to explicitly use `position: static` to return it to the document flow.

Before reusing the shared style, check what hidden constraints it has.

## Is the quality actually good?

To be honest, there are two levels:

**Article text: Surprisingly good.** The markdown structure, image paths, and inline code are all preserved, the sentences are coherent, and the Korean polite tone remains consistent. The 1.8B small model can’t write articles, but it can easily read articles.

**UI short sentences: Needs manual proofreading.** About 10% of the 464 items have issues, but they are all concentrated in predictable categories (days, units, tenses, terms). Just go through them according to the checklist.

The manual proofreading work has been minimized due to pipeline design: no incremental coverage, zero format diff, and the proofread results remain safe—even after running ten thousand times, they won’t be overwritten.

## How long does it take to add a new language?

After all parameters are parameterized, there are only three steps left:

```ts
// 1. Register the language code and display name
const LOCALES = ['zh', 'en', 'ja', 'ko', 'fr']
```

```bash
# 2. Run the translation pipeline, fully automated for local models
TRANSLATE_TARGET=fr pnpm i18n:dict
TRANSLATE_TARGET=fr pnpm i18n:content
```

3. Add a date format feature to allow manual proofreading of high-risk items (weekdays, units, tutorial outlines)

The machine takes twenty minutes, and manual editing takes half an hour. In the future, there’s no need to worry about translation when writing new articles; just use `pnpm i18n:content --skip-existing` to incrementally translate missing language versions.

## Conclusion

The initial requirement was simply: "The blog is only in Chinese, which is not good." What was achieved in the end was a sustainable multilingual system: translation pipeline, alignment checklist, three-step integration for new languages, and automatic auto-fill for new articles.

By the way, the English, Japanese, and Korean versions of this article are also created using this pipeline—the article itself serves as evidence. Give it a try in different languages.

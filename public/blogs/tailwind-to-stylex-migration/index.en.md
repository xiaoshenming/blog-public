Start with the conclusion: This time, I replaced the entire blog's style system from Tailwind with StyleX. 21 routes, 133 file changes, 19 commits. The main style sheet has reduced from 97.7 KB to 60.3 KB (-38%), and both build and runtime performance are basically unchanged.

**The entire blog looks exactly the same as before the migration.**

Exactly the same is the biggest success of this migration.

## Why remove the well-functioning Tailwind?

Proving my innocence first: Tailwind didn’t do anything to me. It’s very useful; you just add class names and strings to JSX, and in half an hour you can create a page—my blog is all thanks to it.

But I’ve been longing for StyleX for a long time—it’s not an unofficial tool; it’s created by Meta: incubated within Facebook in 2020, open-sourced by the end of 2023, used in production environments on Instagram and WhatsApp for five years. It and Tailwind represent two different philosophies:

- **Tailwind is string art**: `className="flex gap-2 px-4"`, what you see is what you get, but if you make a mistake, no one tells you—the style just silently doesn’t work.
- **StyleX is a TypeScript object**: `stylex.create({ ... })`, if you write the wrong property name or put the wrong value, `tsc` will expose the error immediately.

Three things that impressed me the most:

1. **Type Safety**: For the first time, styles enter the type system, and spelling errors have evolved from “no reaction” to “compilation errors”
2. **Determinism**: Tailwind relies on scanners to guess “which classes are used” — there are many mysteries here (class names created by template strings cannot be scanned, and writing a class name in comments instead leads to errors in the output); StyleX relies on the compiler to know “which styles are referenced”, without guessing, there are no mysteries
3. **Weight**: Only produces atomic classes that are actually referenced, using one class for all values across the site

Of course, there is an even simpler reason: the blog is my experimental field. If I don’t use it in practice, what should I use for company projects?

By the way, let’s talk about the principle of StyleX: it is actually quite simple. You write a TS object, and during compilation, it is broken down into the **finest CSS atomic classes** (one class handles only one property). At runtime, it acts like a lookup table. **There is no runtime style injection** — CSS is generated during the build process, without consuming any JS resources. Zero runtime, atomic classes, type safety — these three combine to create a robust solution.

## Strategy: Coexist first, then separate

More than a hundred files cannot be replaced overnight; I use a "dual pipeline" strategy.

**Phase 1: Two frameworks coexist peacefully.** Install both Tailwind and StyleX, and arrange them using CSS `@layer` for ordering:

```css
@layer theme, base, components, priority1, ..., priority9, utilities;
```

The atomic classes of StyleX are sandwiched in the middle (priority1-9 is its domain), while the old components continue to use Tailwind, and the new components use StyleX—each doing its own thing.

**Phase 2: Move in batches by directory.** 133 files are divided into 7 batches, with one directory per batch. Upon completion of each batch, immediate verification is carried out: type inspection, production build, and browser page-by-page testing.

**Phase 3: Finalize.** On a certain morning after all moves are done, remove 5 dependencies of Tailwind and clear all custom utility classes, then the work is done. After that, it begins the story of the following five pitfalls.

## Pitfall records (selecting five)

### Pitfall 1: The `@stylex;` directive is completely absorbed by Tailwind

The build process of StyleX requires a magic directive: write a line `@stylex;` in CSS.

An odd situation occurred: the configuration was correct and the build was successful, but **not a single atomic class** was present in the output. After 90 minutes of troubleshooting, I dumped the compilation process at the CSS entry point and compared it layer by layer to finally uncover the truth:

Turbopack runs the PostCSS plugin chain **one by one** for each CSS entry point, and when Tailwind processes a file, it recompiles the entire file. During this process, the underlying compiler removes `@stylex;` that it doesn’t recognize as garbage. Whether the directive is written in one’s own file or imported, it cannot escape this.

**Solution**: Place `@stylex;` in a separate small CSS entry point. This file is not touched by Tailwind throughout, and the directive can be handled by the plugins that read it.

# / - / >

### Pit Two: Do not combine the stylex class names from two sources with `cn()`

This is a double confirmation from both experiments and build outputs:

The merging semantics of StyleX are clear—**within the same `stylex.props()` call, the later entry overrides the earlier one**, and the overridden atomic class is removed from the output directly.

But! If you combine the stylex class names from two sources using the `cn()` string, the conflict is resolved based on “dictionary order”—`padding: 12px` will be overwritten by `padding: 24px`, and the order in which you write them has no significance.

**Regulation**: For semantic coverage, `stylex.props()` must be used the same way; `cn()` is only suitable for passing in external classes.

### Pit 3: What to do with group-hover? The marker comes to the rescue

Tailwind has a handy feature `group-hover`: when the parent element is hovered over, the child elements interact with each other. StyleX doesn’t have an ancestor selector, so how can this be applied?

The answer is the marker mechanism of StyleX:



The core rules of compilation are roughly as follows:

```css
/* When hovering over the nearest ancestor with a marker, the overlay appears */
.overlay:where(.marker:hover *) { opacity: 1; }
```

**The semantics are exactly the same as Tailwind’s group-hover**—it only targets the nearest marker ancestor, so hovering over a card in a list won’t accidentally affect other cards at the same level.

There’s also an unexpected discovery: during a detailed audit of the original project, it was found that **several instances of group-hover were actually dead code** (sub-elements for styles were not in the group container at all, so they never worked from the first day of launch). During the migration, a "hover effect autopsy" was done, and all dead code was removed, preserving the original state accurately.

### Trap 4: On the day of removing Tailwind, the foundation also disappeared

This is the most terrifying one.

In addition to the满 screen of utility classes in Tailwind, it also quietly adds a layer of **preflight** to the entire site: `box-sizing: border-box`, inherited link colors, inherited form fonts, `display: block` for images... All are things that you don’t notice, but when removed, problems occur.

# Glossary  
- 留仙洞 → Liuxiandong  
- 鸣潮 → Wuthering Waves  
- 博主/站名 Suni → Suni  
- 汇文明朝体 → Huiwen Mingcho (font name)

The removal went smoothly that night. It was only during the next inspection day that it was discovered: the title of the blog list had turned into a **default blue underline link from the browser**—upon checking further, the `box-sizing` setting for the entire site also quietly returned to `content-box`.

This regression is impossible to detect visually in screenshots (most component styles are explicit), and it was only identified through a **element-by-element comparison calculation of styles** between the old and new versions. The fix involves transplanting the preflight code from Tailwind v4 line by line, replacing only the Tailwind private functions in it.

Lesson: **Before removing anything, ask—what other benefits does it offer beyond its surface functionality?**

### Trap 5: One visible and one hidden, two ghost class names

- **Ming**: The Tailwind scanner takes class names from **comments** seriously and generates CSS on the spot. After migration, this class is completely eliminated—StyleX no longer reads comments.  
- **Dai**: There is a text layer for a special effect component that dynamically assigns class names using `document.createElement` at runtime (not in JSX), so all static scans don’t detect it. After removing Tailwind, these two class names become “undefined empty slots”. Finally, using the “runtime class assignment” method for full library scanning, it becomes visible, and the issue is resolved.

One reports explicitly, the other reports implicitly—the two classic weaknesses of the scanner-based approach are now resolved.

## Report (honest version)

| Metric | Before Migration | After Migration | Change |
|---|---|---|---|
| Main CSS (raw) | 97.7 KB | 60.3 KB | **-38.3%** |
| Transfer size (gzip / brotli) | 17.8 / 14.5 KB | 14.9 / 12.9 KB | -16% / -11% |
| First-page JS | 1246 KB | 1256 KB | +0.8% (nearly unchanged) |
| Build time | ~4s | ~4s | No change |
| Runtime metrics | — | — | No change |

Wait, why has the raw data decreased by 38% while the transmission volume only decreased by 10~16%?

Because **compressors and atoms are in a "substitution relationship" rather than a superposition relationship**:

- The products of Tailwind have a very high repetition rate, and gzip/brotli can remove most redundancy (compression ratio of 6.8 times)
- The atomic tables in StyleX have already been deduplicated during compilation, leaving higher "entropy", so compressors have little to compress (compression ratio of 4.7 times)

Therefore: the -38% reduction in raw data is an honest representation of "improved performance of the style engine", while the -10~16% reduction in transmission is the actual traffic saved by users. These two metrics must be discussed separately—**migration is not a score competition; don’t use raw data to highlight transmission improvements.**

True benefits lie hidden in unseen places: on weak networks and low-end devices, reducing 37 KB of CSS roughly saves several milliseconds in parsing and memory usage; and — **determinism**.

## Behind the scenes: This task is handled by "multi-agent" systems

This migration has an interesting execution method: instead of manually writing 133 files line by line, I served as the "chief commander".

- The migration is broken down into tasks: divided by directory levels, with each level assigned to parallel "migration agent" entities, rules are hardcoded in the tasks (exact values taken from the compilation output, comments cannot contain Tailwind class names to prevent scanner extraction, no self-building allowed...)
- After each delivery, I conduct verification: `tsc` + production build + browser page-by-page testing
- There is also a "auditor" role: specifically tasked with checking the original project, identifying "code that died from the original version" to avoid bringing bugs over as part of the legacy code

The most magical part is the final repository switch. I was still imagining the classic process of “local merge, push, CI”, but it directly switched to **cloud migration**: forcing the new commit history to be pushed as `main` on the remote, and then the local repository is `fetch + reset`ed. When I opened Git Graph, I saw—huh? Why is it still the old history? I almost thought I was being tricked. A single `git fetch` and everything calms down:

- `main` = the new StyleX version (19 commits)
- `archive/tailwind-v4` = all the old history, stored in the same repository as a backup
- Recovery option: one command to roll back

## Is it worth it?

Here’s a honest list for those who want to copy their homework:

**It’s worth it if you**: the style depends heavily on size, the project requires long-term maintenance, you are a heavy user of TypeScript, and you have time (the most important factor).

**It’s better to take it slow if you**: heavily rely on Tailwind’s ecosystem components (like shadcn), the project is nearing delivery, or you just want to build a small site.

It’s worth it for me—not just because it saves 38%, but because I won’t face future ghost problems like “incorrect style with no error”, “class names in comments being accidentally included in output”, or “is this CSS still used by anyone?” Finally, styles have become a **typeable, identifiable, and removable** element.

> 97.7 KB → 60.3 KB.
> 133 files, 19 commits, no visible change to users.
> This might be the best way to refactor.



*P.S. All data from the migration process, details of potential pitfalls, and even the reproduction commands for performance testing are recorded. If you are also considering whether to remove Tailwind, feel free to check the records in the repository—just be prepared to work late, as I spent 90 minutes searching for that issue 😅*

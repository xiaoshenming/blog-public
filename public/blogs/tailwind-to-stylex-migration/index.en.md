Start with the conclusion: This time, I replaced the entire blog's style system from Tailwind with StyleX. 21 routes, 133 file changes, 19 commits. The main style sheet has reduced from 97.7 KB to 60.3 KB (-38%), and both build and runtime performance are basically unchanged.

**The entire blog looks exactly the same as before the migration.**

Exactly the same is the biggest success of this migration.

## Why remove the well-functioning Tailwind?

Proving my innocence first: Tailwind didn’t do anything to me. It’s very useful; you just add class names and strings to JSX, and in half an hour you can create a page—my blog is entirely thanks to it.

But I’ve been longing for StyleX for a long time—it’s not an unofficial tool; it’s created by Meta: incubated within Facebook in 2020, open-sourced by the end of 2023, used in production environments on Instagram and WhatsApp for five years. It and Tailwind represent two different philosophies:

- **Tailwind is string art**: `className="flex gap-2 px-4"`, everything is visible immediately, but if something is wrong, you won’t be told—the style just silently fails to work.
- **StyleX is a TypeScript object**: `stylex.create({ ... })`, if you write the wrong property name or put the wrong value, `tsc` will highlight the error right away.

Three things that impressed me the most:

1. **Type Safety**: This is the first time styles have entered the type system; spelling errors have evolved from “no reaction” to “compilation errors”  
2. **Determinism**: Tailwind relies on scanners to guess “which classes are used” – there are many mysteries here (class names created by template strings cannot be scanned, and writing a class name in comments actually causes it to be included in the output); StyleX relies on the compiler to know “which styles are referenced” – without guessing, there are no mysteries  
3. **Weight**: Only produces atomic classes that are actually referenced, with one value reused across the entire site

Of course, there is an even simpler reason: the blog is my experimental field. If I don’t use it in practice, how about using it for company projects?

By the way, let’s talk about the principle of StyleX: it’s actually quite simple. You write a TS object, and during compilation, it is broken down into the **finest possible CSS atomic classes** (one class handles only one property). At runtime, it’s just a lookup table. **There is no runtime style injection** – CSS is generated during building, saving no JS resources at all. Zero runtime, atomic classes, type safety – these three elements combine to create the solution.

## Strategy: First coexist, then separate

More than a hundred files cannot be replaced overnight; I use a "dual pipeline" strategy.

**Phase 1: Two frameworks coexist peacefully.** Install both Tailwind and StyleX, and arrange them using CSS `@layer` for ordering:

```css
@layer theme, base, components, priority1, ..., priority9, utilities;
```

The atomic classes of StyleX are sandwiched in the middle (priority1-9 is its domain), while the old components continue to use Tailwind, and the new components use StyleX—each doing its own thing.

**Phase 2: Move items in batches according to directories.** 133 files are divided into 7 batches, with one directory per batch. Each batch is inspected on the spot: type verification, production build, and browser page-by-page testing.

**Phase 3: Finalize.** On a certain morning after all moves are completed, delete the 5 dependencies of Tailwind and clear all custom utility classes, then work is done. After that, it begins the story of the five pitfalls below.

## Pitfall records (selecting five)

### Pitfall 1: The `@stylex;` directive is completely absorbed by Tailwind

The build process of StyleX requires a magic directive: write a line `@stylex;` in CSS.

The strange thing happened: the configuration was correct and the build was successful, but **not a single atomic class** appeared in the output. After 90 minutes of troubleshooting, I dumped the compilation process at the CSS entry point and compared it layer by layer to finally uncover the truth:

Turbopack runs the PostCSS plugin chain **one by one** for each CSS entry point, and when Tailwind processes a file, it "recompiles" the entire file. During this process, the underlying compiler removes `@stylex;` that it doesn’t recognize as garbage. Whether the directive is written in one’s own file or imported, it cannot escape.

**Solution**: Place `@stylex;` in a separate CSS entry file that does not touch Tailwind throughout, allowing the directives to be handled by the plugin that reads it.

### Hole 2: Do not use `cn()` to combine class names from two sources

This is a double confirmation of both experimental and build产物:

The merging semantics of StyleX are clear—**within the same `stylex.props()` call, the later entry overrides the earlier one**, and the overridden atomic class is removed from the output directly.

But! If you use `cn()` to combine class names from two sources, the conflict is resolved based on "dictionary ordering"—`padding: 12px` will be overwritten by `padding: 24px`, and the order in which you write them doesn't matter.

**Iron Rule**: For semantic coverage, `stylex.props()` must be used the same way; `cn()` is only suitable for passing in external classes.

### Section 3: What about group-hover? The marker comes to the rescue

Tailwind has a handy feature `group-hover`: when the parent element is hovered over, the child elements interact with each other. StyleX doesn’t have an ancestor selector, so how can this be applied?

The answer is the marker mechanism of StyleX:

```ts
// 1. Define a marker
export const hoverGroup = stylex.defineMarker()

// 2. Apply the marker to the container (replaces the original 'group' class)
<div {...stylex.props(styles.wrap, hoverGroup)}>

// 3. Use conditional styling for child elements
const styles = stylex.create({
  overlay: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', hoverGroup)]: 1,
    },
  },
})
```

The core rules of the compilation are roughly as follows:

```css
/* When hovering over the nearest marked ancestor, the overlay appears */
.overlay:where(.marker:hover *) { opacity: 1; }
```

**Semantics are identical to Tailwind’s group-hover**—it only targets the nearest marked ancestor, so hovering over a card in a list won’t incorrectly affect other cards on the same level.

There’s also a surprising discovery: during a detailed audit of the original project, it was found that **several instances of group-hover were actually dead code** (sub-elements for styles were not in a group container at all, so they never worked from the first day of launch). During the migration, a "hover effect autopsy" was done, and all the dead code was removed, preserving the original state accurately.

### Trailer 4: On the day of removing Tailwind, the foundation also collapsed.

This is the most dangerous one.

In addition to the满 screen of utility classes, Tailwind also quietly adds a layer of **preflight** to the entire site: `box-sizing: border-box`, inherited link colors, inherited form fonts, `display: block` for images... All are things that you don’t notice, but when removed, problems occur.

The removal went smoothly that night. It was only during the next inspection when it was discovered: the title of the blog list had turned into a **browser default blue underline link**—upon checking further, the `box-sizing` setting for the entire site also quietly returned to `content-box`.

This regression isn’t detectable in a screenshot, as most component styles are explicit, but it was identified through a **element-by-element comparison calculation** of both old and new versions. The fix involves transplanting the preflight code from Tailwind v4 line by line, replacing only the Tailwind private functions.

Lesson: **Before removing anything, ask—what other benefits does it offer beyond its surface functionality?**

### Trap five: Two types of ghost class names—one visible, one hidden.

- **Ming**: The Tailwind scanner takes class names from **comments** seriously and generates CSS on the spot. After migration, this class is completely eliminated—StyleX doesn’t read comments.  
- **An**: The text layer of a special effect component uses `document.createElement` to dynamically assign class names during runtime (not in JSX), so all static scans don’t detect it. After removing Tailwind, these two class names become “undefined empty,” and only the “runtime class assignment” scanning method works for full library scanning, which has been fixed.

One reports falsely, the other reports silently—the two classic weaknesses of the scanner-based approach are now resolved.

## Report (honest version)

| Metric | Before Migration | After Migration | Change |
|---|---|---|---|
| Main CSS (raw) | 97.7 KB | 60.3 KB | **-38.3%** |
| Transfer size (gzip / brotli) | 17.8 / 14.5 KB | 14.9 / 12.9 KB | -16% / -11% |
| First-page JS | 1246 KB | 1256 KB | +0.8% (nearly unchanged) |
| Build time | ~4s | ~4s | No change |
| Runtime metrics | — | — | No change |

Wait, why has the raw reduced by 38% while the transmission reduced by only 10~16%?

Because **compressors and atoms are in a "substitution relationship," not a superposition relationship**:

- Tailwind’s output has a very high repetition rate, and gzip/brotli can remove most redundancy (compression ratio of 6.8 times)
- The atom table in StyleX has already eliminated most duplicates during compilation, leaving higher "entropy," so compressors have little to compress (4.7 times)

Therefore: the -38% reduction in raw is an honest representation of the efficiency gains of the style engine, while the -10~16% reduction in transmission represents the actual traffic saved by users. These two metrics must be discussed separately—**migration is not a score competition; don’t use raw numbers to highlight transmission.**

True benefits lie hidden in unseen places: on weak networks and low-end devices, reducing 37 KB of CSS roughly saves several milliseconds in parsing and memory usage; and — **determinism**.

## Behind the scenes: This task is handled by "multi-agent" systems

This migration has an interesting execution method: instead of manually writing 133 files line by line, I served as the "overall commander".

- The migration is broken down into tasks: divided by directory levels, each level assigned to parallel "migration agent" entities, with rules fixed in the tasks (exact values taken from the compilation output, no Tailwind class names in comments to prevent scanner extraction, no self-building allowed...)
- After each delivery, I verify with `tsc` + production build + page-by-page testing in the browser
- There is also a "auditor" role: specifically tasked with checking the original project, identifying "code that died from the original version" to avoid bringing bugs over as well

The most magical part is the final repository switch. I was still imagining the classic process of “local merge, push, CI,” but it directly switched to **cloud migration**: forcing the new commit history to be pushed as `main` on the remote, and then the local repository is `fetch + reset`. When I opened Git Graph—huh? Why is it still the old history? I almost thought I was being tricked. A single `git fetch` and everything settled down:

- `main` = the new StyleX version (19 commits)
- `archive/tailwind-v4` = all the old history, still in the same repository as a backup
- Relief option: one command for rollback

## Is it worth it?

Here’s a honest checklist for those who want to copy their homework:

** Worth it if you**: the style is volume-sensitive, the project requires long-term maintenance, you are a heavy user of TypeScript, and you have the time (the most important factor).

** Not so much if you**: heavily rely on Tailwind’s ecosystem components library (like shadcn), the project is nearing delivery, or you just want to create a small website.

It’s worth it for me—not just because it saves 38%, but because I won’t encounter future ghost problems such as “incorrect style with no error”, “class names in comments being accidentally included in output”, or “is this CSS still used by anyone?” Style has finally become a ** typed, owned, and removable** citizen.

> 97.7 KB → 60.3 KB.
> 133 files, 19 commits, no visible change to users.
> This might be the best way for refactoring.

---

*P.S. All data from the migration process, details of pitfalls encountered, and even the reproduction commands for performance testing are recorded. If you are also considering whether to remove Tailwind, feel free to check the records in the repository—just be prepared to work late, as I spent 90 minutes searching for that issue 😅*

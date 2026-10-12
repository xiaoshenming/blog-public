# AI writing plagiarism prevention guide: The path from despair to a 8.5% comeback

> This is a heartfelt account of how to transform AI-generated paper text into something "human-like".

## Preface

Here’s how it went. Recently, I used AI to assist with writing papers, and when the detection tool ran, 78% of the content turned red. The feeling was just like being caught cheating on an exam—embarrassed, panicked, and then falling into deep self-doubt.

But we can’t admit defeat! So we embarked on a long journey of reworking the text. After several tough battles, we finally managed to raise the AI score to 8.5%. This article records the entire process, hoping it can help fellow learners facing similar challenges.

---

## Chapter 1: Mindset Development

First, you need to understand a fact: **AI writing leaves traces**. It doesn’t mean that a paper written by AI will definitely pass plagiarism checks, but the “perfect machine-like feel” can indeed be easily identified.

What are the typical characteristics of text written by AI?
- The sentence lengths are too uniform, like a military formation
- The vocabulary is monotonous, with frequent repetitions of words
- The logic is too clear, lacking the "jargon" and "subtle twists" found in human writing
- Overuse of neat structures such as "first, second, last"

So the core idea of paraphrasing is: **break this sense of perfection and add randomness and irregularity to human writing.**

---

## Chapter 2: My Paraphrasing Approach

### 2.1 Preparatory Steps

You need to prepare the following tools:
1. **Detection report**: Export the HTML report from AI detection
2. **Original document**: Your original paper docx file
3. **A capable AI**: I use the Claude Opus model, paired with carefully designed prompt words

### 2.2 Core Prompt Words

These are prompt words I derived from real practice, proven effective:

```markdown
# Role
You are an experienced academic editor and human writing style mimicry expert. Your task is to rewrite the provided academic text to reduce the likelihood of it being detected by AI detection tools, while maintaining the original meaning and technical accuracy.

# Goal
Rewrite the given text into a version with higher Perplexity and Burstiness, making it more similar to naturally written human articles rather than standard algorithm-generated text.

# Constraints
1. Core information remains unchanged: technical parameters, data, core conclusions, and definitions of professional terms must not be modified.
2. Avoid AI characteristics: do not use overly formal parallel sentences or standard "first/second/last" structural sequences, and avoid overly concise and efficient expressions.
3. Maintain academicity: although the AI detection rate needs to be reduced, the rigor of academic papers must be preserved, and it cannot become too informal.

# Techniques (these strategies must be applied)
1. Vocabulary diversity:
   - Replace high-frequency verbs with synonyms (for example: replace "target" with "conduct research on...", replace "achieve" with "implement" or "achieve", replace "rely on" with "depend on" or "utilize")
   - Add appropriate modifiers (such as "related", "specific", "many", "a series")

2. Sentence restructuring:
   - Break long sentences: split complex long sentences into two short sentences, or use commas to add pauses
   - Change sentence order: try to convert some active voices to passive voices, or adjust the position of adverbials
   - Add connecting words: use more natural logical connecting words (such as "thus", "at the same time", "considering", "specifically", "based on") to avoid single sequence words

3. Add "human traces":
   - Add explanatory clauses appropriately, provide brief supplementary explanations for some concepts (even if implied in the original text)
   - Simulate slight redundancy in human writing, such as adding noun suffixes like "work", "operation", "situation" after verbs

4. Rhythm control:
   - Ensure the sentence lengths within paragraphs vary, avoid all sentences being of the same length
```

### 2.3 Practical Workflow

I operate as follows:

**Step 1: Extract AI marker segments**

The inspection report is an HTML file where the CSS class `cl3` is used to mark all text identified as AI-generated. I use BeautifulSoup in Python to extract these segments and convert them into JSON for future use.

**Step 2: Matching the original context**

Just knowing which sentences are problematic isn’t enough; you also need to understand what is said before and after this sentence. AI rewriting requires context to use words accurately. Therefore, I read the original paper docx simultaneously and provide each marked segment with its chapter and surrounding paragraphs.

**Step 3: Grouping and parallel rewriting**

The 78 markers state whatever is said—more or less depending on the context. Changing them one by one would be too exhausting. So I divided these fragments into 4 groups and processed them in parallel using 4 AI agents.

**Step 4: Generate a comparison document**

After the revision, create a comparison document. The left side contains the original text, and the right side is the revised version. This allows me to manually check each part to ensure the meaning remains unchanged, then replace it manually into the paper.

**Step 5: Identify and fix errors**

There is a pit here: the AI might miss some segments. So, make sure to check that the count is correct after completion. If something is missing, run it again separately.

---

## Chapter 3: Summary of Practical Skills

### 3.1 Vocabulary Level

| Original Expression | Alternative Solution |
|---------------------|---------------------|
| Regarding... | Conduct research on... |
| Implement | Realize, achieve, complete |
| Rely on | Depend on, utilize for |
| Ensure | Guarantee, ensure... successfully |
| Improve | Enhance, strengthen, improve |

### 3.2 Sentence Structure

- **Break long sentences**: When faced with a long sentence of four or five sentences without pauses, break it up!
- **Adjust word order**: Change subject-verb-object to passive voice, or move the adverbial phrase to the front
- **Replace connecting words**: Don't always use "first/second/last", try "thus", "at the same time", "based on this", "specifically speaking"

### 3.3 Add human elements

This is the most crucial step! What are the "bad habits" in human writing that AI cannot learn from?

- Occasional nonsense and repetitive explanations
- Adding a sentence mid-sentence
- Inserting unrelated remarks in parentheses or dashes
- Adding seemingly unnecessary nouns after verbs (e.g., "carry out relevant work" instead of "carry out")

### 3.4 Rhythm Control

AI-written articles are like a parade—with neatly aligned sentence lengths. Human-written articles are like a symphony—with varying lengths and dynamics. **Make sure your sentences have uneven lengths**.

---

## Chapter 4: Lessons Learned from My Tears and Blood

1. **Don’t try too hard**: Don’t attempt to modify all fragments at once at the beginning, as it’s prone to errors. Do it in batches.
2. **Check for completeness**: The AI might actually miss some parts! Count the number after each modification.
3. **Manual verification**: Always read the text yourself after editing to ensure the meaning remains unchanged.
4. **Patience**: This process is tedious, but for graduation, endure it.

---

## Chapter 5: Final Results

- After the first round of revision: 62 places at position 78
- After the second round of revision: 8.5% AI rate at position 62

Although it is not yet zero, 8.5% is already a very safe range.

---

## In conclusion

The matter of AI paraphrasing is not difficult, nor is it easy. The key lies in: **transforming the "perfect but dull" style of AI into a "slightly imperfect but authentic" human-like expression.**

I hope my experience can help you. If you have questions, feel free to discuss them in the comments section.

Wish all of you a successful graduation! 🎓
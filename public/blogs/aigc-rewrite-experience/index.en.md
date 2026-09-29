# Complete Guide to AI Text Rewriting: The Road from Despair to a 8.5% Revival

> This is a heartfelt history of how to transform AI-generated paper text into "human-like" quality.

## Preface

Here’s how it went. Recently, I used AI to help write papers, and when the detection tool ran, wow, 78% of the content was highlighted in red. The feeling was just like being caught cheating on an exam—embarrassed, panicked, and then falling into deep self-doubt.

But we can’t give up! So a long process of rephrasing began. After several tough struggles, we finally managed to raise the AI score to 8.5%. This article records the entire process, hoping it can help fellow learners who face similar challenges.

---

## Chapter 1: Mindset Development

First, you need to understand a fact: **AI writing leaves traces**. It doesn’t mean that a paper written by AI will definitely fail detection, but the “perfect machine-like feel” can indeed be easily identified.

What are the typical characteristics of text written by AI?
- Sentence lengths are too uniform, like a military formation
- Vocabulary is monotonous, with frequent repetition of words
- Logic is overly clear, lacking the "jargon" and "subtle twists" found in human writing
- Overuse of neat structures such as "first, second, last"

So the core idea of paraphrasing is: **break this sense of perfection and add randomness and irregularity to human writing.**

---

## Chapter 2: My Paraphrasing Strategy

### 2.1 Preparatory Steps

You need to prepare the following tools:
1. **Detection report**: Export the HTML report from AI detection
2. **Original document**: Your original paper docx file
3. **A capable AI**: I use the Claude Opus model with carefully designed prompt words

### 2.2 Core Prompt Words

These are prompt words I refined from actual use, proven effective:

```markdown
# Role
You are an experienced academic editor and human writing style mimicry expert. Your task is to rewrite the provided academic text to reduce the likelihood of it being detected by AI detection tools, while maintaining the original meaning and technical accuracy.

# Goal
Rewrite the given text into a version with higher Perplexity and Burstiness, making it more similar to a naturally written human article rather than an algorithm-generated standard text.

# Constraints
1. Core information remains unchanged: Do not modify technical parameters, data, core conclusions, or definitions of professional terms.
2. Avoid AI characteristics: Do not use overly formal parallel sentences or standard "first/second/last" structural sequences, and avoid overly concise and efficient expressions.
3. Maintain academic rigor: Although the AI detection rate needs to be reduced, the academic paper must remain rigorous, without becoming too informal.

# Techniques (These strategies must be applied)
1. Vocabulary diversity:
   - Replace high-frequency verbs with synonyms (e.g., change "target" to "explore... regarding", change "achieve" to "implement" or "achieve", change "rely on" to "depend on" or "utilize")
   - Add appropriate modifiers (such as "related", "specific", "many", "a series of")

2. Sentence restructuring:
   - Break long sentences: Split complex long sentences into two short sentences or use commas to add pauses
   - Change sentence order: Try converting some active voices to passive voices or adjusting the position of adverbials
   - Add connecting words: Use more natural logical connecting words (such as "thus", "at the same time", "in particular", "specifically", "based on this") to avoid single sequence words

3. Add "human traces":
   - Add explanatory clauses appropriately, providing brief additional explanations for certain concepts (even if implied in the original text)
   - Simulate slight redundancy in human writing, such as adding noun suffixes like "work", "operation", "situation" after verbs

4. Rhythm control:
   - Ensure the sentence lengths within paragraphs vary, avoiding all sentences being of similar length
```

### 2.3 Practical Workflow

I operate as follows:

**Step 1: Extract AI marker segments**

The inspection report is an HTML file where the CSS class `cl3` is used to mark all text identified as AI-generated. I use BeautifulSoup in Python to extract these segments and convert them into JSON for future use.

**Step 2: Matching the original context**

Just knowing which sentences are problematic isn’t enough; you also need to understand what is said before and after this sentence. AI rewriting requires context to use words accurately. Therefore, I read the original paper docx simultaneously and provide the chapter and surrounding paragraphs for each marked segment.

**Step 3: Grouping and parallel rewriting**

The 78 markers state more or less depending on the context; changing them one by one would be too tedious. Therefore, I divided these segments into 4 groups and processed them concurrently using 4 AI agents.

**Step 4: Generate a comparison document**

After the revision, create a comparison document with the original text on the left and the revised version on the right. This allows me to manually check each part to ensure the meaning remains unchanged, then replace it manually into the paper.

**Step 5: Identify and fix errors**

There is a pitfall: the AI might miss some segments. So, make sure to check that the count is correct after completion. If something is missing, run it again separately.

---

## Chapter 3: Summary of Practical Skills

### 3.1 Vocabulary Level

| Original Expression | Alternative Solution |
|---------------------|---------------------|
| Regarding... | Conduct research on... |
| Implement | Realize, achieve, complete |
| Rely on | Depend on, utilize for |
| Ensure | Guarantee, ensure... successfully |
| Improve | Enhance, augment, improve |

### 3.2 Sentence Structure Level

- **Break long sentences**: When faced with a four or five sentence long sentence without pauses, break it up!
- **Adjust word order**: Change subject-verb-object to passive voice, or move the adverbial phrase to the front
- **Replace connecting words**: Avoid always using "first/second/last", try "thus", "at the same time", "based on this", "specifically speaking"

### 3.3 Add human traces

This is the most crucial step! What are the "bad habits" in human writing that AI cannot learn?

- Random filler words and repetitive explanations
- Suddenly adding a sentence mid-sentence
- Inserting unrelated remarks in parentheses or dashes
- Adding seemingly unnecessary nouns after verbs (e.g., "carry out relevant work" instead of "carry out")

### 3.4 Rhythm Control

AI-written articles are like an inspection, with evenly sized sentences. Human-written articles are like a symphony, with varying lengths. **Make sure your sentences have uneven lengths**.

---

## Chapter 4: My Hard-Won Lessons

1. **Don’t overdo it**: Don’t try to modify all segments at once at the beginning, as it’s prone to errors. Do it in batches.
2. **Check for completeness**: AI often fails to include some parts! Count the number after each modification.
3. **Manual verification**: Always read the text yourself after editing to ensure the meaning remains unchanged.
4. **Patience**: This process is tedious, but endure it for graduation.

---

## Chapter 5: Final Results

- After the first round of revision: 62 places out of 78
- After the second round of revision: 8.5% AI rate across 62 places

Although it is not yet zero, 8.5% is already a very safe range.

---

## Final Thoughts

The matter of AI paraphrasing is neither easy nor difficult. The key is to **transform the "perfect but rigid" style of AI into a "slightly imperfect but realistic" style that is more human-like**.

I hope my experience can help you. If you have any questions, feel free to share them in the comments section.

Wishing everyone a successful graduation! 🎓
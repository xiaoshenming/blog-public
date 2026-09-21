## Introduction: An awkward mistake

Today I encountered a very awkward Git operation accident that made me scratch my toes in embarrassment...

I was developing the GitHub OAuth2 login feature. I thought I only needed to submit a few newly created files, but accidentally committed all changes to 180 files to the PR branch. When I saw the commit record being criticized in the group... wow! It feels like the sky is falling!
![](/blogs/my-git-disaster-experience/466a0826fa92843b.png)
```bash
# Should have only had these few file commits
src/consts.ts
src/lib/oauth2-github.ts
src/components/oauth2-login-button.tsx
src/hooks/use-auth.ts
src/app/(home)/config-dialog/site-settings/index.tsx

# But instead, it turned out like this...
modified:   src/app/(home)/config-dialog/index.tsx
modified:   src/app/about/page.tsx
modified:   src/app/blog/page.tsx
modified:   src/app/bloggers/page.tsx
modified:   src/app/pictures/page.tsx
modified:   src/app/projects/page.tsx
modified:   src/app/share/page.tsx
... (and over 170 more files)
```

## Root cause of the mistake: Wrong branch pull

After analysis, I find that the root of the problem is:

**When I pull a clean branch, I pull my own `main` branch, not the latest code from the source!**

This results in a feature branch created on a version that is not the latest, which includes all my previous local changes.

### The correct process should be:

1. Pull the latest `main` branch from the upstream source
2. Create a clean feature branch based on the latest version
3. Only submit files related to OAuth2
4. Create a PR

### My mistake workflow:

1. Create a feature branch from my `main` branch ❌
2. My `main` already contains all previous changes ❌
3. This causes the new branch to include all changes ❌
4. 180 files being committed... 😱

## Emergency rescue: Please save us
First, delete the PR, then follow the instructions below

```bash
# 1. Fetch the latest code from upstream
git fetch upstream

# 2. Create a clean branch based on upstream/main
git checkout -b clean-oauth2-final upstream/main

# 3. Extract only the required files from the chaotic original branch
git checkout --theirs <required file>

# Or a simpler method:
git checkout <original branch> -- <specific file path>
```

By using this method, I successfully extracted only the files containing OAuth2 functionality:

- `src/consts.ts` - OAuth2 configuration
- `src/lib/oauth2-github.ts` - Core logic of OAuth2
- `src/components/oauth2-login-button.tsx` - Login component
- `src/hooks/use-auth.ts` - Authentication state management
- `src/app/(home)/config-dialog/site-settings/index.tsx` - Settings integration

## New understanding of branch management

Tsk, tsk, let's assume this is another learning of git usage...

AI comment:
### 1. Understanding the relationship between fork and upstream

```bash
# Check the remote repository
git remote -v

# You should see something like this:
origin  https://github.com/username/project-name.git (fetch)
origin  https://github.com/username/project-name.git (push)
upstream        https://github.com/originalauthor/project-name.git (fetch)
upstream        https://github.com/originalauthor/project-name.git (push)
```

- `origin`: The repository I forked
- `upstream`: The original author's source repository

**Markdown posts**: Keep Markdown syntax intact (headings, lists, bold/italic, tables, blockquotes), never translate URLs, image paths, code spans (`...`) and fenced code blocks; keep a leading # / - / > marker at line starts.

### 2. Correct workflow for creating branches

```bash
# 1. Ensure the upstream code is up to date
git fetch upstream

# 2. Switch to the upstream main branch
git checkout upstream/main

# 3. Create a new feature branch based on upstream main
git checkout -b feature/new-feature upstream/main

# 4. Continue development...

# 5. Only commit relevant files
git add <relevant files>
git commit -m "feat: Add new feature"

# 6. Push to your repository and create a PR
git push origin feature/new-feature
```

### 3. Creating a deployment test branch

To test the compatibility of merging a PR branch with the main branch, I use the PR branch to merge a new branch with the main branch for deployment on vercel:

```bash
# 1. Create a test branch based on the PR branch and main branch merge
git checkout -b test-merge main
git merge feature/new-feature

# 2. Push the test branch to Vercel for testing deployment
git push origin test-merge
```
## I don’t want to write it, let the AI summarize:
## Experience Summary

### Lessons Learned:

1. **Always create feature branches based on the latest code from the upstream**
   - Do not create feature branches directly on your main branch
   - Regularly synchronize upstream code with your local branch

2. **Be clear about the scope of file changes**
   - Always check `git status` before committing
   - Ensure only relevant files are committed

```

3. **Utilize advanced features of Git effectively**
   - `git checkout` can extract specific files
   - `git cherry-pick` can apply specific commits
   - Don’t hesitate to use Git commands to solve problems

### New workflow:

```bash
# My new workflow
git fetch upstream                    # Sync with upstream
git checkout -b feature/xxx upstream/main  # Create a feature branch
# Develop the feature...
git add src/related files                  # Only add relevant files
git commit -m "Descriptive commit message"        # Commit
git push origin feature/xxx           # Push

# Create a test branch (if needed)
git checkout -b deploy-test main      # Based on main
git merge feature/xxx                 # Merge the feature branch
git push origin deploy-test           # Push for testing deployment
```

## Future developments

Fortunately, everything was resolved in the end:

1. ✅ Created a clean `clean-oauth2-final` branch with only 7 OAuth2-related files
2. ✅ Created `feature/oauth2-auth` branch for the official PR
3. ✅ Created `oauth2-merged` test branch for verifying merge compatibility
4. ✅ All branches have been successfully pushed

## Conclusion

Too lazy to write, completely humbled by myself. Although it was still rejected because `GITHUB_OAUTH2_CLIENT_SECRET` couldn't be exposed, haha. I knew it!



*P.S. If you've also experienced a similar Git failure, feel free to share in the comment section (under development), so I know I’m not alone 😅*
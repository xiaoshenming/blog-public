## Introduction: An awkward breakdown scene

Today I experienced an extremely awkward Git operation accident, so awkward that I was scraping my toes against the ground...

I was developing the GitHub OAuth2 login feature. I originally only wanted to submit a few newly created files, but accidentally committed all changes to 180 files to the PR branch. When I saw the comment about that commit record in the group... wow, it's like the sky has fallen!
![](/blogs/my-git-disaster-experience/466a0826fa92843b.png)
```bash
# Should only have the commits for these few files
src/consts.ts
src/lib/oauth2-github.ts
src/components/oauth2-login-button.tsx
src/hooks/use-auth.ts
src/app/(home)/config-dialog/site-settings/index.tsx

# But instead, it's this horrifying scene...
modified:   src/app/(home)/config-dialog/index.tsx
modified:   src/app/about/page.tsx
modified:   src/app/blog/page.tsx
modified:   src/app/bloggers/page.tsx
modified:   src/app/pictures/page.tsx
modified:   src/app/projects/page.tsx
modified:   src/app/share/page.tsx
... (and over 170 other files)
```

## Root cause of the error: A mistake in branch pull

After analysis, I find that the root of the problem is:

**When I pull a clean branch, I pull my own `main` branch, not the latest code from the source!**

This results in a feature branch created on a version that is not the latest, which includes all my previous local changes.

### The correct process should be:

1. Pull the latest `main` branch from the upstream source
2. Create a clean feature branch based on the latest version
3. Only submit files related to OAuth2
4. Create a PR

### My mistake process:

1. Create a feature branch from your own `main` branch ❌
2. Your `main` already includes all previous changes ❌
3. Resulting in the new branch containing all changes ❌
4. Submission of 180 files... 😱

## Emergency rescue: Please save me
First delete the PR, then do the following

```bash
# 1. Fetch the latest code from upstream
git fetch upstream

# 2. Create a clean branch based on upstream main
git checkout -b clean-oauth2-final upstream/main

# 3. Extract only the necessary files from the original messy branch
git checkout --theirs <required file>

# Or a more direct method:
git checkout <original branch> -- <specific file path>
```

By using this method, I was able to extract only the files containing OAuth2 functionality:

- `src/consts.ts` - OAuth2 configuration  
- `src/lib/oauth2-github.ts` - Core logic of OAuth2  
- `src/components/oauth2-login-button.tsx` - Login component  
- `src/hooks/use-auth.ts` - Authentication state management  
- `src/app/(home)/config-dialog/site-settings/index.tsx` - Settings integration

## New understanding of branch management

Tsk, let’s just consider it as another learning opportunity of git usage...

AI comment:
### 1. Understanding the relationship between fork and upstream

```bash
# Check the remote repository
git remote -v

# You should see output similar to this:
origin  https://github.com/username/project-name.git (fetch)
origin  https://github.com/username/project-name.git (push)
upstream        https://github.com/originalauthor/project-name.git (fetch)
upstream        https://github.com/originalauthor/project-name.git (push)
```

- `origin`: The repository I forked
- `upstream`: The original author’s source repository

### 2. Correct branch creation process

```bash
# 1. Ensure the upstream code is up-to-date
git fetch upstream

# 2. Switch to the upstream main branch
git checkout upstream/main

# 3. Create a new feature branch based on upstream main
git checkout -b feature/new-feature upstream/main

# 4. Proceed with development...

# 5. Only commit relevant files
git add <relevant files>
git commit -m "feat: Add new feature"

# 6. Push to your repository and create a PR
git push origin feature/new-feature
```

### 3. Creating the deployment test branch

To test the compatibility of merging the PR branch with the main branch, I use the PR branch to merge a new branch with the main branch for deployment on vercel:

```bash
# 1. Create a test branch based on the merge of PR and main branches
git checkout -b test-merge main
git merge feature/new-feature

# 2. Push the test branch for Vercel deployment testing
git push origin test-merge
```
## I don’t want to write it out, let me ask an AI to summarize:
## Experience summary

### Lessons learned

1. **Always create feature branches based on the latest upstream code**
  - Do not create feature branches on your own main branch
  - Regularly synchronize upstream code with your local repository

2. **Pin down exactly which files changed**
   - 提交前一定要检查 `git status`
   - 确保只提交相关文件

3. **Make good use of Git's advanced features**
   - `git checkout` 可以提取特定文件
   - `git cherry-pick` 可以应用特定提交
   - 不要害怕用 Git 命令解决问题

### New workflow:

```bash
# My new workflow
git fetch upstream                    # Sync with upstream
git checkout -b feature/xxx upstream/main  # Create a feature branch
# Develop the feature...
git add src/related files                  # Only add relevant files
git commit -m "Descriptive commit message"        # Commit
git push origin feature/xxx           # Push to remote

# Create a test branch (if needed)
git checkout -b deploy-test main      # Based on main
git merge feature/xxx                 # Merge the feature branch
git push origin deploy-test           # Push for testing deployment
```

## Future developments

Thankfully, everything was resolved in the end:

1. ✅ A clean `clean-oauth2-final` branch has been created, containing only 7 OAuth2-related files
2. ✅ A `feature/oauth2-auth` branch has been created for the official PR
3. ✅ A `oauth2-merged` test branch has been created for verifying merge compatibility
4. ✅ All branches have been successfully pushed

## Conclusion

Too lazy to write any more — I embarrassed myself. In the end it was still rejected because I could not expose GITHUB_OAUTH2_CLIENT_SECRET
and got passed over. Hahaha. I knew it!

---

*P.S. If you've also experienced a similar Git failure, feel free to share in the comment section (under development), so I know I’m not alone 😅*
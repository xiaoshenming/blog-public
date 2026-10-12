## 시작: 당황스러운 실패 현장

오늘 저는 매우 당황스러운 Git 작업 실수를 했어요. 너무 당황해서 발가락이 땅에 닿을 정도였어요...

저는 GitHub OAuth2 로그인 기능을 개발하고 있었어요. 원래 새로 만들어진 몇 개의 파일만 제출하고 싶었는데, 실수로 180개 파일의 모든 변경 사항을 PR 브랜치에 제출했어요. 그때 그 제출 기록에 대한 말이 나오는 것을 그룹에서 봤을 때... 와우! 하늘이 무너질 것 같았어요!
![](/blogs/my-git-disaster-experience/466a0826fa92843b.png)
```bash
# 원래는 이 몇 개의 파일만 제출해야 했는데
src/consts.ts
src/lib/oauth2-github.ts
src/components/oauth2-login-button.tsx
src/hooks/use-auth.ts
src/app/(home)/config-dialog/site-settings/index.tsx

# 그런데 결과는 이런 끔찍한 상황이었어요...
modified:   src/app/(home)/config-dialog/index.tsx
modified:   src/app/about/page.tsx
modified:   src/app/blog/page.tsx
modified:   src/app/bloggers/page.tsx
modified:   src/app/pictures/page.tsx
modified:   src/app/projects/page.tsx
modified:   src/app/share/page.tsx
... (170개 이상의 파일)
```

## 실패의 원인: 브랜치 다운로드 실수

분석을 해보니, 문제의 근원은 다음과 같습니다:

**저가 깨끗한 브랜치를 가져올 때, 원래의 최신 코드가 아닌 제 자신의 `main` 브랜치를 가져오고 있어요!**

이로 인해 최신 버전이 아닌 기능 브랜치가 생성되었고, 이 브랜치에는 이전에 제가 본지에 있는 모든 변경 사항이 포함되어 있습니다.

### 올바른 프로세스는 다음과 같아야 합니다:

1. 원본의 상위 부분에서 최신 `main` 브랜치를 가져오기
2. 최신 내용을 기반으로 깨끗한 기능 브랜치를 만들기
3. OAuth2 관련 파일만 커밍하기
4. PR을 만들기

### 내 실수 과정:

1. 자신의 `main` 브랜치에서 기능 브랜치를 만들기 ❌
2. 자신의 `main`에 기존의 여러 변경 사항이 포함되어 있음 ❌
3. 그로 인해 새로운 브랜치에 모든 변경 사항이 포함됨 ❌
4. 180개 파일의 커밍... 😱

## 긴급 구조: 제발 구해줘요
먼저 pr을 삭제하고, 그 다음은 다음과 같음

```bash
# 1. 최신 코드를 상위 소스에서 가져오기
git fetch upstream

# 2. 상위 main 브랜치를 기반으로 깨끗한 새로운 브랜치를 만들기
git checkout -b clean-oauth2-final upstream/main

# 3. 원래의 혼란스러운 브랜치에서 필요한 파일만 추출하기
git checkout --theirs <필요한 파일>

# 또는 더 간단한 방법:
git checkout <원래 브랜치> -- <구체적인 파일 경로>
```

이 방법을 통해 OAuth2 기능만 포함된 파일을 성공적으로 추출했습니다:

- `src/consts.ts` - OAuth2 설정
- `src/lib/oauth2-github.ts` - OAuth2 핵심 로직
- `src/components/oauth2-login-button.tsx` - 로그인 컴포넌트
- `src/hooks/use-auth.ts` - 인증 상태 관리
- `src/app/(home)/config-dialog/site-settings/index.tsx` - 설정 연동

## 브랜치 관리에 대한 새로운 인식

좋아, git 사용법을 다시 배운 것으로 간주하자..。

AI 발언:
### 1. fork과 upstream의 관계를 이해했다.

```bash
# 원격 저장소 확인
git remote -v

# 이와 유사한 출력이 보일 것이다:
origin  https://github.com/사용자명/프로젝트명.git (fetch)
origin  https://github.com/사용자명/프로젝트명.git (push)
upstream        https://github.com/원작자명/프로젝트명.git (fetch)
upstream        https://github.com/원작자명/프로젝트명.git (push)
```

- `origin`: 내가 fork한 저장소
- `upstream`: 원작자의 원본 저장소

### 2. 올바른 브랜치 생성 프로세스

```bash
# 1. 업스트림 코드가 최신인지 확인하세요
git fetch upstream

# 2. 업스트림의 main 브랜치로 전환하세요
git checkout upstream/main

# 3. 업스트림 main 브랜치를 기반으로 새로운 기능 브랜치를 생성하세요
git checkout -b feature/new-feature upstream/main

# 4. 개발을 진행하세요...

# 5. 관련 파일만 커밍하세요
git add <관련 파일>
git commit -m "feat: 새로운 기능 추가"

# 6. 자신의 저장소에 배포한 후 PR을 생성하세요
git push origin feature/new-feature
```

### 3. 테스트 브랜치 배포 생성

PR 브랜치와 main 브랜치의 병합 호환성을 테스트하기 위해, PR 브랜치와 main 브랜치를 병합하여 vercel에 배포하는 새로운 브랜치를 생성합니다:

```bash
# 1. PR 브랜치와 main 브랜치의 병합을 기반으로 테스트 브랜치를 생성합니다
git checkout -b test-merge main
git merge feature/new-feature

# 2. Vercel 배포를 위한 테스트용 테스트 브랜치를 푸시합니다
git push origin test-merge
```
## 편하게 쓰지 않고, AI가 요약해 주세요:
## 경험 요약

### 배우는 점 요약

1. **항상 상위 레이어의 최신 코드를 기반으로 기능 브랜치를 생성합니다**
   - 자신의 main 브랜치 위에 기능 브랜치를 생성하지 마세요
   - 정기적으로 상위 레이어의 코드를 로컬에 동기화하세요

2. **파일 변경 범위 명확히 하기**  
   - 제출하기 전에 반드시 `git status`를 확인하세요  
   - 관련 파일만 제출되도록 확인하세요

3. **Git의 고급 기능을 활용하기**
   - `git checkout`를 사용하여 특정 파일을 추출할 수 있습니다
   - `git cherry-pick`를 사용하여 특정 커밍을 적용할 수 있습니다
   - Git 명령어를 사용하여 문제를 해결하는 것을 두려워하지 마세요

### 새로운 작업 흐름:

```bash
# 내 새로운 작업 흐름
git fetch upstream                    # 업스트림과 동기화
git checkout -b feature/xxx upstream/main  # 기능 브랜치를 생성합니다
# 기능을 개발합니다...
git add src/관련 파일                  # 관련 파일만 추가합니다
git commit -m "설명적인 커밍 정보"        # 커밍을 합니다
git push origin feature/xxx           # 배포용으로 푼니다

# 테스트 브랜치를 생성합니다 (필요한 경우)
git checkout -b deploy-test main      # main 기반으로
git merge feature/xxx                 # 기능 브랜치를 병합합니다
git push origin deploy-test           # 테스트 배포용으로 푼니다
```

## 추후 발전 방향

다행히도 결국 모든 문제가 해결되었습니다:

1. ✅ `clean-oauth2-final` 브랜치를 생성하여 OAuth2 관련 파일 7개만 포함되도록 했습니다
2. ✅ 공식 PR용으로 `feature/oauth2-auth` 브랜치를 생성했습니다
3. ✅ 병합된 호환성을 확인하기 위한 `oauth2-merged` 테스트 브랜치를 생성했습니다
4. ✅ 모든 브랜치가 성공적으로 배포되었습니다

## 결론

더 쓰기는 귀찮아졌다. 내 어리석음에 어이가 없었다. 결국 마지막에는 GITHUB_OAUTH2_CLIENT_SECRET을 노출할 수 없다는 이유로
탈락하고 말았다. 하하하, 그럴 줄 알았어!

---

*（추신. 비슷한 Git 실패 경험이 있다면 댓글란에 공유해 주세요. 그렇게 하면 나 혼자만이 아니라는 걸 알 수 있을 거예요 😅）*
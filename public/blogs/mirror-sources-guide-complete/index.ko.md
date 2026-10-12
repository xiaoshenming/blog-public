# 이미지 소스에 대해 말하지 않을 수 없는 것들

## 서문

(기적적인 네트워크 환경에서) 개발자로서 `pip install`, `docker pull`, `conda install`, `nvm install`, `npm/pnpm/yarn/cnpm install` 등이 익숙할 것입니다. 항상 이상한 방식으로 멈추는 것 같은데, 이러한 문제는 대부분 현재 네트워크가 어떤 이미지 소스에 의해 차단된 때문입니다!

## 이미지 소스란 무엇인가요?

마이그레이션 소스(Mirror Source)는 원본 소프트웨어 저장소의 내용을 전체적으로 국내 서버에 복사하여 생성된 "마이그래피"를 말합니다. 마이그레이션 소스에 접속할 때, 실제로는 국내 서버에 접속하는 것이며, 이로 인해 다운로드 속도와 안정성이 크게 향상됩니다.

흔한 마이그레이션 소스에는 다음이 포함됩니다:
- **패키지 관리자 마이그레이션 소스**: pip, conda, npm, yum 등
- **시스템 마이그레이션 소스**: Ubuntu, CentOS, Debian 등 Linux 배포판
- **컨테이너 마이그레이션 소스**: Docker Hub, GitHub Container Registry 등
- **개발 도구 마이그레이션 소스**: Maven, Gradle 등

## Conda 마이그레이션 소스 설정

### 공식 소스 다운로드 주소 (권장! 최신 버전이 포함됨!)

Anaconda 공식 저장소 주소: `https://repo.anaconda.com/archive/`
국내 일부 대학 이미지 저장소가 구버전인 것을 피하세요 (정말 골칙한 상황입니다)
nvm 국내 공식 저장소 주소: `https://nvm.uihtm.com/doc/download-nvm.html`
### 설정 단계

#### 1. Conda를 초기화하세요

conda를 아직 초기화하지 않았다면, 먼저 다음 명령을 실행해야 합니다:

```bash
conda init
```

#### 2. 국내 이미지 소스 추가

칭화대학교 이미지 소스 예시:

```bash
# 주요 이미지 소스 추가
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/pro
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge

# 검색 시 이미지 소스를 우선적으로 사용하도록 설정
conda config --set channel_priority strict
```

#### 3. 설정 확인

현재 설정된 이미지 소스 확인하기:

```bash
conda config --show channels
```

#### 4. 설정 제거 (재설정 필요 시)

기본 설정으로 복원해야 하는 경우:

```bash
conda config --remove-key channels
```

### 자주 사용하는 Conda 이미지 소스

| 이미지 소스 | 주소 | 특징 |
|------------|------|------|
| 청대대학교 | https://mirrors.tuna.tsinghua.edu.cn/anaconda/ | 속도가 빠르고 업데이트가 신속함 |
| 중국과학기술대학 | https://mirrors.ustc.edu.cn/anaconda/ | 안정적이고 신뢰할 수 있음 |
| 알리바이유 | https://mirrors.aliyun.com/anaconda/ | 기업급 서비스 |
| 화웨이클라우드 | https://mirrors.huaweicloud.com/anaconda/ | 새로운 이미지 소스 |

## Linux 시스템 이미지 소스 설정

### 일회전 소스 변경 스크립트

Linux 시스템의 경우, 일회전 소스 변경 스크립트를 사용하여 빠르게 설정할 수 있습니다:

```bash
bash <(curl -sSL https://linuxmirrors.cn/main.sh)
```

## Docker 이미지 소스 설정

### 한 번에 설정 스크립트

```bash
bash <(curl -sSL https://linuxmirrors.cn/docker.sh)
```

### pip 이미지 소스

```bash
# 临时使用
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple package_name

# 永久配置
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 代理使用
pip install --proxy=http://127.0.0.1:7897 -r requirements.txt
最推荐的用法，系统代理跟TUN模式有时候可能都有问题，但是标准用法绝对稳定。
```
---

## 一、npm 镜像源配置

### 1. 타오바오 이미지 설정 (영구 적용)

```bash
npm config set registry https://registry.npmmirror.com
```

### 2. 설정이 정상적으로 작동하는지 확인하기

```bash
npm config get registry
# 출력 결과：https://registry.npmmirror.com
```

### 3. 임시 사용 (단일 명령)

```bash
npm install --registry https://registry.npmmirror.com
```

### 4. 공식 출처를 복원하세요 (필요한 경우)

```bash
npm config delete registry
# 또는 공식 소스로 다시 설정
npm config set registry https://registry.npm.org
```

---

## 二、NVM 镜像配置（加速 Node.js 下载）

NVM은 기본적으로 `https://nodejs.org/dist`에서 Node.js를 다운로드하며, 국내에서 접근이 느립니다. 이미지 설정을 통해 다운로드 속도를 향상시킬 수 있습니다.

---

### 🖥️ Windows（[nvm-windows](https://github.com/coreybutler/nvm-windows)]를 사용）

1. **PowerShell 또는 CMD**를 열어
2. 환경 변수를 설정합니다 (영구적):

```powershell
# Node.js 이미지를 설정합니다
[Environment]::SetEnvironmentVariable("NVM_NODEJS_ORG_MIRROR", "https://npmmirror.com/mirrors/node", "User")

# 선택 사항: npm 이미지를 설정합니다 (nvm install 후 자동으로 구성됩니다)
[Environment]::SetEnvironmentVariable("NVM_NPM_MIRROR", "https://npmmirror.com/mirrors/npm", "User")
```

3. 터미널을 재시작한 후 테스트해 보세요:

```bash
nvm install latest
```

> 이미지 주소 설명:
> - Node.js 이미지: `https://npmmirror.com/mirrors/node`
> - npm 이미지: `https://npmmirror.com/mirrors/npm`

---

### 🐧 Linux / 🍏 macOS（[nvm-sh/nvm](https://github.com/nvm-sh/nvm)]를 사용）

1. 쉘 설정 파일을 편집하세요 (예: `~/.bashrc`, `~/.zshrc` 등):

```bash
nano ~/.zshrc   # 또는 ~/.bashrc
```

2. 파일 끝에 다음 환경 변수를 추가하세요:

```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
export NVM_NPM_MIRROR=https://npmmirror.com/mirrors/npm
```

3. 설정 저장 및 적용:

```bash
source ~/.zshrc   # 또는 source ~/.bashrc
```

4. 설치 테스트:

```bash
nvm install --lts
```

---

### Maven 이미지 소스

~/.m2/settings.xml에 다음을 추가하세요:

```xml
<mirrors>
  <mirror>
    <id>aliyunmaven</id>
    <mirrorOf>*</mirrorOf>
    <name>阿里云 공용 저장소</name>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

## 그래픽 카드 드라이버 관련 명령

개발 환경을 설정할 때 그래픽 카드 드라이버를 확인하는 것도 중요합니다:

```bash
# 그래픽 카드 하드웨어 정보 확인
lspci | grep -i nvidia

# NVIDIA 드라이버 상태 확인
nvidia-smi

# 드라이버 버전 확인
nvidia-smi --query-gpu=driver_version --format=csv
```

---

## 🐉 ArchLinux 에이전트 설정 (2026년 최신 방안)

> 이 방안은 정말 유용하다고 생각합니다! 특히 Clash Verge와 함께 사용하면 로컨аль 노드 모드를 직접 활성화하여 기기 내 모든 애플리케이션이 자동으로 프록시를 사용하게 되어 설정도 생략할 수 있습니다.

### 핵심 개념

프로토콜을 하나하나 설치하여 사용하는 것보다 시스템 레벨에서 프로토콜을 통합하는 것이 더 좋습니다. 제 방안은 다음과 같습니다:

- **프로토콜 클라이언트**: Clash Verge (오픈소스 무료, 인터페이스가 아름답음)
- **프로토콜 모드**: 단지 「로컨트리 연결 허용」을 활성화하고 TUN 모드는 비활성화
- **프로토콜 주소**: `http://127.0.0.1:7897`
- **글로벌 프로토콜**: `alias` 별칭과 명령어 접두사를 사용하여 어떤 명령어든 한 번에 프로토콜을 사용할 수 있음

### 1단계: Clash Verge 설치

```bash
# Arch 사용자는 yay 또는 pacman을 사용할 수 있습니다.
yay -S clash-verge

# 또는 AppImage를 다운로드할 수도 있습니다.
wget https://github.com/zzzgydi/clash-verge/releases/latest/download/Clash-Verge-linux-x64.tar.gz
tar -xzf Clash-Verge-linux-x64.tar.gz
./Clash-Verge-linux-x64/clash-verge
```

### 2단계: Clash Verge 설정하기

1. Clash Verge를 열어주세요
2. 항공사 섹션 구독 링크를 불러주세요
3. **핵심 설정**: '설정'→'네트워크'에서 '로컬 네트워크 연결 허용'을 선택하세요
4. TUN 모드는 필요하지 않으며, 일반 HTTP 프록터 모드만으로 충분합니다
5. 프록터 주소를 기록해주세요: `http://127.0.0.1:7897`

### 3단계: 터미널 프록시 별명 설정 (추천!)

~/.zshrc 또는 ~/.bashrc를 편집하여 매우 유용한 별명을 추가하세요:

```bash
# 대리명: px = proxy
alias px='http_proxy=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897'
```

저장 후 `source ~/.zshrc`를 실행하면 적용됩니다.

### 4단계: 즐겁게 사용하기

지금은 어떤 명령어 앞에 `px ` 프레스그래프를 추가하기만 하면 이 명령어가 자동으로 프록시를 사용하게 됩니다.

```bash
# npm 패키지 설치
px npm install express

# GitHub 저장소 복사
px git clone https://github.com/some/repo.git

# pip 설치
px pip install torch

# docker pull
px docker pull nginx:latest

# curl 테스트
px curl https://google.com

# 심지어 네트워크 요청이 포함된 스크립트 실행에도 사용할 수 있습니다
px python my_script.py
```

### 왜 이 방식을 추천하는가?

1. **간단하고 직관적**: 각 애플리케이션마다 별도로 설정할 필요 없이, 하나의 별명으로 모든 것을 처리할 수 있습니다
2. **제어 가능성 높음**: 당신이 프록시를 사용하려는 명령만 실행되며, 다른 작업에는 영향을 주지 않습니다
3. **호환성이 좋음**: TUN 모드는 때때로 문제가 생길 수 있지만, 이 별명 방식은 거의 발생하지 않습니다
4. **언제든지 끌 수 있음**: `px` 접두사가 없으면 원하는 대로 사용할 수 있습니다
5. **한 번 설정으로 영원함**: 한 번 설정하면 앞으로 매일 편리하게 사용할 수 있습니다

### 고급 사용법

`px`를 매번 사용하는 것이 번거롭다고 느낀다면 더 세부적인 설정도 가능합니다:

```bash
# 방식1: 더 짧은 별칭
alias p='px'

# 방식2: 특정 도구를 위한 영구적 프록시 설정 (선택 사항)
# npm
npm config set proxy http://127.0.0.1:7897
npm config set https-proxy http://127.0.0.1:7897

# git
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

# pip
pip config set global.proxy http://127.0.0.1:7897
```

### 자주 묻는 질문

**Q: 프록시가 작동하지 않나요?**
A: Clash Verge가 켜져 있는지, "로커 네트워크 연결 허용"이 선택되어 있는지, 포트가 7897인지 확인하세요.

**Q：일부 명령어는 여전히 시간 초과가 발생하나요?**
A：일부 공항은 동시성에 제한이 있으니 동시성을 낮추거나 노드를 변경해 보세요

**Q：TUN 모드와 이런 별칭 방식의 차이가 무엇인가요?**
A：TUN은 전역 프록시로 모든 트래픽이 프록시를 통해 이동합니다; 별칭 방식은 더 유연하여 원하는 대로 사용하거나 사용하지 않을 수 있습니다. 저는 별칭 방식을 더 선호합니다. 문제가 생겼을 때 해결하기 쉽습니다.

---

# 이미지 사이트 추천 목록

## 🏢 기업 사이트
| 이름 | 주소 |
|------|------|
| 넷이스 | https://mirrors.163.com |
| 소호 | http://mirrors.sohu.com |
| 알리바이 | https://mirrors.aliyun.com |
| 수도 유니크 테크놀로지 주식회사 | http://mirrors.yun-idc.com |
| 화웨이 클라우드 | https://mirrors.huaweicloud.com |
| 텐센트 클라우드 | https://mirrors.cloud.tencent.com |
| 핀앤파인 클라우드 | https://mirrors.pinganyun.com |
| 오픈소스社/Azure 중국 | http://mirror.azure.cn |
| OpenTuna/AWS 중국 | https://opentuna.cn |

## 🎓 교육 사이트
| 이름 | 주소 |
|------|------|
| 중국 과학기술대학 | https://mirrors.ustc.edu.cn |
| 칭화대학교 | https://mirrors.tuna.tsinghua.edu.cn |
| 베이징 외국어대학 | http://mirrors.bfsu.edu.cn |
| 베이징 교통대학 | https://mirror.bjtu.edu.cn |
| 베이징기술대학 | http://mirror.bit.edu.cn/web |
| 랑안대학 | http://mirror.lzu.edu.cn |
| 상하이 교통대학 | http://ftp.sjtu.edu.cn |
| 다롄 동우정보과학대학 | http://mirrors.neusoft.edu.cn |
| 저장대학 | http://mirrors.zju.edu.cn |
| 청충대학 | http://mirrors.cqu.edu.cn |
| 남양 기술과학대학 | http://mirror.nyist.edu.cn |
| 중국과학원 고에너지 물리 연구소 | http://mirror.ihep.ac.cn |
| 서북 농학과 과학기술대학 | https://mirrors.nwafu.edu.cn |
| 호남과학기술대학 | http://mirror.hust.edu.cn |
| 다롄기술과학대학 | http://mirror.dlut.edu.cn |
| 산동 여자대학 | http://mirrors.sdwu.edu.cn |
| 시안 교통대학 | https://mirrors.xjtu.edu.cn |
| 상하이 교통대학SJTUG | https://mirrors.sjtug.sjtu.edu.cn |
| 난커우 통신대학 | http://mirrors.njupt.edu.cn |
| 난커우대학 | http://mirrors.nju.edu.cn |
| 동지대학 | https://mirrors.tongji.edu.cn |
| 화북 농학과 대학 | https://mirrors.scau.edu.cn |
| 동관 기술과학대학 | https://mirrors.dgut.edu.cn |
| 청충 통신대학 | http://mirrors.cqupt.edu.cn |
| 윈난대학 | http://mirrors.ynuosa.org/index |
| 하얼하이 산업대학 | https://mirrors.hit.edu.cn |
| 남방 과학기술대학 | https://mirrors.sustech.edu.cn |

## 📦 기타 전용 이미지들
| 유형 | 이름 | 주소 |
|------|------|------|
| 종합 | 창치오 비트콤 소프트테크 코퍼레이션(공윤 PubYun) | http://centos.bitcomm.cn |
| Python | 도반 pypi | http://pypi.doubanio.com |
| Python | v2ex의 pypi | http://pypi.v2ex.com |
| NPM | 타오바오 NPM | https://npm.taobao.org |
| Ruby | Ruby China의 RubyGems | https://gems.ruby-china.com |
| Maven | 타오바오 TAEMaven 저장소 이미지 | http://mvnrepo.tae.taobao.com/content/groups/public |
| Maven | 알리클라우드 Maven 저장소 이미지 | http://maven.aliyun.com/nexus/content/groups/public |
| Maven | 알리클라우드 Jcenter 저장소 이미지 | http://maven.aliyun.com/nexus/content/repositories/jcenter |
| 종합 | LinuxEye | http://mirrors.linuxeye.com |
| 종합 | 모바일 클라우드 이미지 사이트 | http://mirrors.bclinux.org |
| 종합 | Cloud-Stack 이미지 사이트 | http://mirrors.cloudstack-china.com |
| 종합 | cn99(창치오 비트콤 소속) | http://mirrors.cn99.com |
| 런셩 | 런셩 오픈소스 커뮌 | http://mirrors.loongnix.org |
| 교육 | 영리 교육 | https://mirrors.e-ducation.cn |
| JDK | injdk.cn의 각 버전 JDK 이미지 | https://www.injdk.cn |
| Go | 바이두 Go Module 저장소 에이전트 | http://goproxy.baidu.com |

## 🏆 추천 사용 (종합 성능이 우수)
1. **칭화둥 대학교 이미지 사이트** - https://mirrors.tuna.tsinghua.edu.cn
2. **중국과학기술대학교 이미지 사이트** - https://mirrors.ustc.edu.cn
3. **알리클라우드 이미지 사이트** - https://mirrors.aliyun.com
4. **텐센트 클라우드 이미지 사이트** - https://mirrors.cloud.tencent.com

## 💡 사용 권장 사항
- **개발 환경**: 칭화둥 대학교 또는 중국과학기술대학교 이미지를 추천합니다. 업데이트가 빠르고 지원 범위가 넓습니다.
- **생산 환경**: 알리클라우드, 텐센트 클라우드와 같은 기업급 이미지를 사용하는 것이 안정성 면에서 더 유리합니다.
- **특정 언어**: 개발 언어에 따라 전용 이미지를 선택해야 합니다(예: NPM은 타오바오를, Ruby는 Ruby China를 사용합니다).
- **지리적 위치**: 자신이 있는 지역에 가까운 이미지 사이트를 선택하면 속도가 더 빠릅니다.
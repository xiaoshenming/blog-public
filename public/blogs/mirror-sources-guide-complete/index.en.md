# Things I have to talk about with image sources

## Preface

As a developer in the (fascinating network environment), you are familiar with `pip install`, `docker pull`, `conda install`, `nvm install`, and `npm/pnpm/yarn/cnpm install`, right? These often cause unexplained freezes, and these issues are largely due to the current network being blocked by an image source!

## What is an image source?

The Mirror Source refers to a "mirror" formed by fully copying the content of the original software repository to domestic servers. When we access the Mirror Source, we are actually accessing domestic servers, which significantly improves download speed and stability.

Common Mirror Sources include:
- **Package Manager Mirror Sources**: pip, conda, npm, yum, etc.
- **System Mirror Sources**: Ubuntu, CentOS, Debian, and other Linux distributions
- **Container Mirror Sources**: Docker Hub, GitHub Container Registry, etc.
- **Development Tool Mirror Sources**: Maven, Gradle, etc.

## Conda Mirror Source Configuration

### Official Source Download Links (highly recommended! at least the latest!)

Anaconda官方源地址：`https://repo.anaconda.com/archive/`
Avoids the ancient versions still served by some domestic university mirrors (ask me how I know).
Official nvm mirror for mainland China: `https://nvm.uihtm.com/doc/download-nvm.html`
### 配置步骤

#### 1. Initialize Conda

If you haven't initialized conda yet, you need to run:

```bash
conda init
```

#### 2. Add domestic mirror sources

Taking Tsinghua University mirror source as an example:

```bash
# Add the main mirror source
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/pro
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge

# Set the mirror source as the priority for search queries
conda config --set channel_priority strict
```

#### 3. Verify the configuration

View the currently configured image source:

```bash
conda config --show channels
```

#### 4. Clean up the configuration (if needed to reset)

If you need to revert to the default configuration:

```bash
conda config --remove-key channels
```

### Common Conda Mirror Sources

| Mirror Source | URL | Features |
|---------------|------|----------|
| Tsinghua University | https://mirrors.tuna.tsinghua.edu.cn/anaconda/ | Fast, timely updates |
| USTC | https://mirrors.ustc.edu.cn/anaconda/ | Stable and reliable |
| Alibaba Cloud | https://mirrors.aliyun.com/anaconda/ | Enterprise-level services |
| Huawei Cloud | https://mirrors.huaweicloud.com/anaconda/ | Emerging mirror source |

## Linux System Mirror Source Configuration

### Script for one-click source switching

For Linux systems, we can use the one-click source switching script to configure quickly:

```bash
bash <(curl -sSL https://linuxmirrors.cn/main.sh)
```

## Docker image source configuration

### One-click configuration script

```bash
bash <(curl -sSL https://linuxmirrors.cn/docker.sh)
```

### pip image source

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

## I. Configuration of npm mirror sources

### 1. Set up Taobao mirror (permanent effect)

```bash
npm config set registry https://registry.npmmirror.com
```

### 2. Verify that the configuration is effective

```bash
npm config get registry
# Output: https://registry.npmmirror.com
```

### 3. Temporary use (single command)

```bash
npm install --registry https://registry.npmmirror.com
```

### 4. Translate to English (output translation only):

```bash
npm config delete registry
# or explicitly set back to the official source
npm config set registry https://registry.npm.org
```

---

## II. NVM Image Configuration (Accelerating Node.js Download)

By default, NVM downloads Node.js from `https://nodejs.org/dist`, which is slow to access in China. The image can be configured for faster downloads.

---

### 🖥️ Windows (using [nvm-windows](https://github.com/coreybutler/nvm-windows)))

1. Open **PowerShell or CMD**
2. Set environment variables (permanent):

```powershell
# Set the Node.js mirror
[Environment]::SetEnvironmentVariable("NVM_NODEJS_ORG_MIRROR", "https://npmmirror.com/mirrors/node", "User")

# Optional: Set the npm mirror (automatically configured after nvm install)
[Environment]::SetEnvironmentVariable("NVM_NPM_MIRROR", "https://npmmirror.com/mirrors/npm", "User")
```

3. Restart the terminal, then test:

```bash
nvm install latest
```

> Image address instructions:
> - Node.js image: `https://npmmirror.com/mirrors/node`
> - npm image: `https://npmmirror.com/mirrors/npm`

---

### 🐧 Linux / 🍏 macOS (using [nvm-sh/nvm](https://github.com/nvm-sh/nvm)])

1. Edit your shell configuration file (such as `~/.bashrc`, `~/.zshrc`, etc.):

```bash
nano ~/.zshrc   # or ~/.bashrc
```

2. Add the following environment variables at the end of the file:

```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
export NVM_NPM_MIRROR=https://npmmirror.com/mirrors/npm
```

3. Save and apply the configuration:

```bash
source ~/.zshrc   # or source ~/.bashrc
```

4. Test the installation:

```bash
nvm install --lts
```

---

### Maven image repository

Add to `~/.m2/settings.xml`:

```xml
<mirrors>
  <mirror>
    <id>aliyunmaven</id>
    <mirrorOf>*</mirrorOf>
    <name>Aliyun Public Repository</name>
    <url>https://maven.aliyun.com/repository/public</url>
  </mirror>
</mirrors>
```

## GPU driver-related commands

When configuring the development environment, checking GPU drivers is also important:

```bash
# Check GPU hardware information
lspci | grep -i nvidia

# Check NVIDIA driver status
nvidia-smi

# View driver version
nvidia-smi --query-gpu=driver_version --format=csv
```

---

## 🐉 ArchLinux Proxy Configuration (Latest Solution 2026)

> This is a solution I find extremely useful! Especially when used with Clash Verge, enabling LAN mode directly allows all local applications to use the proxy automatically, eliminating the need for configuration.

### The core idea is...

Instead of configuring proxies one by one, it’s better to use a unified proxy at the system level. My proposal is:

- **Proxy client**: Clash Verge (open source, free, with a beautiful interface)
- **Proxy mode**: Only enable “Allow LAN connections”, do not use TUN mode
- **Proxy address**: `http://127.0.0.1:7897`
- **Global proxy**: Use `alias` alias + command prefix to make any command use the proxy with one click

### Step one: Install Clash Verge

```bash
# Arch users can directly use yay or pacman
yay -S clash-verge

# Or download the AppImage
wget https://github.com/zzzgydi/clash-verge/releases/latest/download/Clash-Verge-linux-x64.tar.gz
tar -xzf Clash-Verge-linux-x64.tar.gz
./Clash-Verge-linux-x64/clash-verge
```

### Step 2: Configure Clash Verge

1. Open Clash Verge
2. Import your airport subscription link
3. **Key setting**: In "Settings" → "Network", check "Allow local network connection"
4. There is no need to enable TUN mode; the standard HTTP proxy mode is sufficient
5. Note the proxy address: `http://127.0.0.1:7897`

### Step 3: Configure terminal proxy alias (recommended!)

Edit `~/.zshrc` or `~/.bashrc` to add a very useful alias:

```bash
# Proxy alias: px = proxy
alias px='http_proxy=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897'
```

Save the file and run `source ~/.zshrc` to apply the changes.

### Step four: Use with pleasure

Now, simply add the `px ` prefix before any command, and this command will automatically use the proxy:

```bash
# Installing npm package
px npm install express

# Cloning a GitHub repository
px git clone https://github.com/some/repo.git

# Installing with pip
px pip install torch

# Pulling with docker
px docker pull nginx:latest

# Testing with curl
px curl https://google.com

# It can even be used to run scripts with network requests
px python my_script.py
```

### Why this method is recommended?

1. **Simple and effective**: No need to configure separately for each application; one alias covers everything
2. **Strong control**: Only commands you want to use proxies will be executed, without affecting other operations
3. **Good compatibility**: TUN mode sometimes causes issues, but this alias method rarely does
4. **Easy to disable**: Just remove the `px` prefix, and you can use it as you like
5. **One-time setup, lifetime benefit**: Configure once, enjoy every day

### Advanced usage

If you find writing `px` every time troublesome, you can configure it further:

```bash
# Method 1: Shorter alias
alias p='px'

# Method 2: Set permanent proxy for specific tools (optional)
# npm
npm config set proxy http://127.0.0.1:7897
npm config set https-proxy http://127.0.0.1:7897

# git
git config --global http.proxy http://127.0.0.1:7897
git config --global https.proxy http://127.0.0.1:7897

# pip
pip config set global.proxy http://127.0.0.1:7897
```

### Common Questions

**Q: No response from the proxy?**
A: Check if Clash Verge is enabled, if the "Allow local network connection" option is selected, and if the port is 7897

**Q: Are some commands still time-out?**  
A: Some airports have limitations on concurrency. Try reducing concurrency or switching to a different node.

**Q: What is the difference between TUN mode and this alias method?**  
A: TUN is a global proxy, where all traffic passes through the proxy. The alias method is more flexible; you can use it when you want or not when you don’t. I prefer the alias method as it makes troubleshooting easier.

---

# List of recommended mirror sites

## 🏢 Corporate Site
| Name | Address |
|------|------|
| NetEase | https://mirrors.163.com |
| Sohu | http://mirrors.sohu.com |
| Alibaba Cloud | https://mirrors.aliyun.com |
| Beijing Yun IDC Technology Co., Ltd. | http://mirrors.yun-idc.com |
| Huawei Cloud | https://mirrors.huaweicloud.com |
| Tencent Cloud | https://mirrors.cloud.tencent.com |
| PingAn Cloud | https://mirrors.pinganyun.com |
| OpenSource Society/Azure China | http://mirror.azure.cn |
| OpenTuna/AWS China | https://opentuna.cn |

## 🎓 Education Site
| Name | Address |
|------|------|
| University of Science and Technology of China | https://mirrors.ustc.edu.cn |
| Tsinghua University | https://mirrors.tuna.tsinghua.edu.cn |
| Beijing Foreign Studies University | http://mirrors.bfsu.edu.cn |
| Beijing Jiaotong University | https://mirror.bjtu.edu.cn |
| Beijing Institute of Technology | http://mirror.bit.edu.cn/web |
| Lanzhou University | http://mirror.lzu.edu.cn |
| Shanghai Jiao Tong University | http://ftp.sjtu.edu.cn |
| Dalian Neusoft College | http://mirrors.neusoft.edu.cn |
| Zhejiang University | http://mirrors.zju.edu.cn |
| Chongqing University | http://mirrors.cqu.edu.cn |
| Nanyang Institute of Technology | http://mirror.nyist.edu.cn |
| Institute of High Energy Physics, Chinese Academy of Sciences | http://mirror.ihep.ac.cn |
| Northwest A&F University | https://mirrors.nwafu.edu.cn |
| Huazhong University of Science and Technology | http://mirror.hust.edu.cn |
| Dalian University of Technology | http://mirror.dlut.edu.cn |
| Shandong Women's University | http://mirrors.sdwu.edu.cn |
| Xi'an Jiaotong University | https://mirrors.xjtu.edu.cn |
| Shanghai Jiao Tong University SJTUG | https://mirrors.sjtug.sjtu.edu.cn |
| Nanjing University of Posts and Telecommunications | http://mirrors.njupt.edu.cn |
| Nanjing University | http://mirrors.nju.edu.cn |
| Tongji University | https://mirrors.tongji.edu.cn |
| South China Agricultural University | https://mirrors.scau.edu.cn |
| Dongguan University of Technology | https://mirrors.dgut.edu.cn |
| Chongqing University of Posts and Telecommunications | http://mirrors.cqupt.edu.cn |
| Yunnan University | http://mirrors.ynuosa.org/index |
| Harbin Institute of Technology | https://mirrors.hit.edu.cn |
| Southern University of Science and Technology | https://mirrors.sustech.edu.cn |

## 📦 Other specialized mirrors  
| Type | Name | Address |
|------|------|------|
| General | Changzhou Bitcomm Software Technology Co., Ltd (PubYun) | http://centos.bitcomm.cn |
| Python | Douban pypi | http://pypi.doubanio.com |
| Python | v2ex pypi | http://pypi.v2ex.com |
| NPM | Taobao NPM | https://npm.taobao.org |
| Ruby | RubyGems Ruby China | https://gems.ruby-china.com |
| Maven | Taobao TAEMaven repository mirror | http://mvnrepo.tae.taobao.com/content/groups/public |
| Maven | Aliyun Maven repository mirror | http://maven.aliyun.com/nexus/content/groups/public |
| Maven | Aliyun Jcenter repository mirror | http://maven.aliyun.com/nexus/content/repositories/jcenter |
| General | LinuxEye | http://mirrors.linuxeye.com |
| General | Mobile Cloud mirror site | http://mirrors.bclinux.org |
| General | Cloud-Stack mirror site | http://mirrors.cloudstack-china.com |
| General | cn99 (under Changzhou Bitcomm) | http://mirrors.cn99.com |
| Loongix | Loongix open source community | http://mirrors.loongnix.org |
| Education | E-ducation | https://mirrors.e-ducation.cn |
| JDK | Versions of JDK mirrors on injdk.cn | https://www.injdk.cn |
| Go | Baidu Go Module repository proxy | http://goproxy.baidu.com |

## 🏆 Recommended (better overall performance)  
1. **Tsinghua University mirror site** - https://mirrors.tuna.tsinghua.edu.cn  
2. **USTC mirror site** - https://mirrors.ustc.edu.cn  
3. **Aliyun mirror site** - https://mirrors.aliyun.com  
4. **Tencent Cloud mirror site** - https://mirrors.cloud.tencent.com

## 💡 Usage suggestions  
- **Development environment**: It is recommended to use Tsinghua or USTC mirrors as they update frequently and cover a wide range of resources  
- **Production environment**: It is recommended to use enterprise-level mirrors like Aliyun or Tencent Cloud as they offer higher stability  
- **Specific languages**: Choose specialized mirrors based on the development language (e.g., NPM uses Taobao, Ruby uses Ruby China)  
- **Geographic location**: Select a mirror site closer to your location for faster speeds
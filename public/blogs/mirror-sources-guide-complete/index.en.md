# Things I have to talk about with image sources

## Preface

As a developer in the (fascinating network environment), you are probably familiar with `pip install`, `docker pull`, `conda install`, `nvm install`, `npm/pnpm/yarn/cnpm install`. Are these always inexplicably stuck? Many of these issues are due to the current network being blocked by an image source!

## What is an image source?

The Mirror Source refers to a "mirror" formed by fully copying the content of the original software repository to domestic servers. When we access the Mirror Source, we are actually accessing domestic servers, which significantly improves download speed and stability.

Common Mirror Sources include:
- **Package Manager Mirror Sources**: pip, conda, npm, yum, etc.
- **System Mirror Sources**: Ubuntu, CentOS, Debian, and other Linux distributions
- **Container Mirror Sources**: Docker Hub, GitHub Container Registry, etc.
- **Development Tool Mirror Sources**: Maven, Gradle, etc.

## Conda Mirror Source Configuration

### Official Download Addresses (recommended! at least the latest!)

Anaconda official source address: `https://repo.anaconda.com/archive/`  
Avoid using ancient versions from some domestic university mirror sources (it's just a hassle)  
nvm domestic official source address: `https://nvm.uihtm.com/doc/download-nvm.html`  
### Configuration steps

#### 1. Initialize Conda

If you haven't initialized conda yet, you need to run:

```bash
conda init
```

#### 2. Add domestic mirror sources

Taking Tsinghua University mirror source as an example:

```bash
# Add the main mirror sources
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/pro
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge

# Set strict priority for search using mirror sources
conda config --set channel_priority strict
```

#### 3. Verify the configuration

View the currently configured image source:

```bash
conda config --show channels
```

#### 4. Clean up the configuration (if needed to reset)

If you want to revert to the default configuration:



### Common Conda Image Sources

| Image Source | URL | Features |
|--------------|------|----------|
| Tsinghua University | https://mirrors.tuna.tsinghua.edu.cn/anaconda/ | Fast, timely updates |
| USTC | https://mirrors.ustc.edu.cn/anaconda/ | Stable and reliable |
| Alibaba Cloud | https://mirrors.aliyun.com/anaconda/ | Enterprise-level service |
| Huawei Cloud | https://mirrors.huaweicloud.com/anaconda/ | Emerging image source |

## Configuration of Linux System Image Sources

### One-Click Source Switch Script

For Linux systems, we can use a one-Click Source Switch script to configure quickly:

```bash
bash <(curl -sSL https://linuxmirrors.cn/main.sh)
```

## Docker Image Source Configuration

### One-click configuration script

```bash
bash <(curl -sSL https://linuxmirrors.cn/docker.sh)
```

### pip image source

```bash
# Temporary use
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple package_name

# Permanent configuration
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# Using proxy
pip install --proxy=http://127.0.0.1:7897 -r requirements.txt
This is the recommended method; system proxy and TUN mode may sometimes cause issues, but the standard method is definitely stable.
```

## 1. Configuration of npm Mirror Sources

### 1. Set up Taobao mirror (permanent effect)

```bash
npm config set registry https://registry.npmmirror.com
```

### 2. Verify that the configuration is effective

```bash
npm config get registry
# Output: https://registry.npmmirror.com
```

### 3. Temporary usage (single command)

```bash
npm install --registry https://registry.npmmirror.com
```

### 4. Restore the official source (if needed)

```bash
npm config set registry registry.npmmirror.com
```

```bash
npm config delete registry
# or explicitly set back to the official source
npm config set registry https://registry.npm.org
```

---

## II. NVM Image Configuration (Accelerating Node.js Download)

By default, NVM downloads Node.js from `https://nodejs.org/dist`, which has slow access in China. You can configure an image to accelerate the download.

---

### 🖥️ Windows (using [nvm-windows](https://github.com/coreybutler/nvm-windows))

1. Open **PowerShell or CMD**
2. Set environment variables (permanent):

```powershell
# Set Node.js mirror
[Environment]::SetEnvironmentVariable("NVM_NODEJS_ORG_MIRROR", "https://npmmirror.com/mirrors/node", "User")

# Optional: Set npm mirror (automatically configured after nvm install)
[Environment]::SetEnvironmentVariable("NVM_NPM_MIRROR", "https://npmmirror.com/mirrors/npm", "User")
```

3. **Restart the terminal**, then test:

```bash
nvm install latest
```

> Image address description:
> - Node.js image: `https://npmmirror.com/mirrors/node`
> - npm image: `https://npmmirror.com/mirrors/npm`

---

### 🐧 Linux / 🍏 macOS (using [nvm-sh/nvm](https://github.com/nvm-sh/nvm))

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

### Maven Mirror Sources

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

When configuring the development environment, checking the GPU driver is also important:

```bash
# Check GPU hardware information
lspci | grep -i nvidia

# Check NVIDIA driver status
nvidia-smi

# View driver version
nvidia-smi --query-gpu=driver_version --format=csv
```



## 🐉 ArchLinux Proxy Configuration (Latest Solution 2026)

> I think this is a super useful solution! Especially when used with Clash Verge, enabling LAN mode directly allows all applications on this machine to use the proxy automatically, eliminating the need for configuration.

### Core Concept

Instead of configuring proxies one by one, it’s better to use a unified proxy at the system level. My proposal is:

- **Proxy client**: Clash Verge (open source, free, with a beautiful interface)
- **Proxy mode**: Only enable “Allow LAN connections”, do not use TUN mode
- **Proxy address**: `http://127.0.0.1:7897`
- **Global proxy**: Use `alias` alias + command prefix to make any command use the proxy with one click

### Step 1: Install Clash Verge

```bash
# For Arch users, you can use yay or pacman directly
yay -S clash-verge

# Or download the AppImage
wget https://github.com/zzzgydi/clash-verge/releases/latest/download/Clash-Verge-linux-x64.tar.gz
tar -xzf Clash-Verge-linux-x64.tar.gz
./Clash-Verge-linux-x64/clash-verge
```

### Step 2: Configure Clash Verge

1. Open Clash Verge
2. Import your airport subscription link
3. **Key setting**: In “Settings” → “Network”, check “Allow LAN connections”
4. No need to enable TUN mode; the standard HTTP proxy mode is sufficient
5. Note down the proxy address: `http://127.0.0.1:7897`

### Step 3: Configure Terminal Proxy Alias (Recommended!)

Edit `~/.zshrc` or `~/.bashrc` to add a very useful alias:

```bash
# Proxy alias: px = proxy
alias px='http_proxy=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897'
```

Save the file and run `source ~/.zshrc` to apply it.

### Step four: Use happily

Now, simply add the `px ` prefix before any command, and this command will automatically use the proxy:

```bash
# Install an npm package
px npm install express

# Clone a GitHub repository
px git clone https://github.com/some/repo.git

# Install with pip
px pip install torch

# Pull a container image
px docker pull nginx:latest

# Test with curl
px curl https://google.com

# It can even be used to run scripts with network requests
px python my_script.py
```

### Why this approach is recommended?

1. **Simple and straightforward**: No need to configure separately for each application; one alias covers everything
2. **High control**: Only commands you want to use proxy will be executed, without affecting other operations
3. **Good compatibility**: TUN mode sometimes causes issues, but this alias method causes almost none
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
**A: Some airports have limitations on concurrency. Try reducing concurrency or switching to a different node.**

**Q: What is the difference between TUN mode and this alias method?**  
**A: TUN is a global proxy, where all traffic passes through the proxy. The alias method is more flexible—you can use it when you want or not when you don’t. I prefer the alias method as it makes troubleshooting easier.**

---

# List of recommended mirror sites

## 🏢 Corporate Sites
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

## 🎓 Educational Sites
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

## 📦 Other Specialized Mirrors
| Type | Name | Address |
|------|------|------|
| General | Changzhou Bitcomm Software Technology Co.,Ltd (Public Yun) | http://centos.bitcomm.cn |
| Python | Douban pypi | http://pypi.doubanio.com |
| Python | v2ex pypi | http://pypi.v2ex.com |
| NPM | Taobao NPM | https://npm.taobao.org |
| Ruby | Ruby China's RubyGems | https://gems.ruby-china.com |
| Maven | Taobao TAEMaven Repository Mirror | http://mvnrepo.tae.taobao.com/content/groups/public |
| Maven | Alibaba Cloud Maven Repository Mirror | http://maven.aliyun.com/nexus/content/groups/public |
| Maven | Alibaba Cloud Jcenter Repository Mirror | http://maven.aliyun.com/nexus/content/repositories/jcenter |
| General | LinuxEye | http://mirrors.linuxeye.com |
| General | Mobile Cloud Mirror Site | http://mirrors.bclinux.org |
| General | Cloud-Stack Mirror Site | http://mirrors.cloudstack-china.com |
| General | cn99 (under Changzhou Bitcomm) | http://mirrors.cn99.com |
| Loongix | Loongix Open Source Community | http://mirrors.loongnix.org |
| Education | E-ducation.cn | https://mirrors.e-ducation.cn |
| JDK | Various versions of JDK mirrors on injdk.cn | https://www.injdk.cn |
| Go | Baidu Go Module Repository Proxy | http://goproxy.baidu.com |

## 🏆 Recommended (Good overall performance)
1. **Tsinghua University Mirror Site** - https://mirrors.tuna.tsinghua.edu.cn
2. **USTC Mirror Site** - https://mirrors.ustc.edu.cn
3. **Alibaba Cloud Mirror Site** - https://mirrors.aliyun.com
4. **Tencent Cloud Mirror Site** - https://mirrors.cloud.tencent.com

## 💡 Usage Recommendations
- **Development Environment**: It is recommended to use Tsinghua or USTC mirrors as they update frequently and cover a wide range of resources
- **Production Environment**: It is recommended to use enterprise-level mirrors like Alibaba Cloud and Tencent Cloud as they offer higher stability
- **Specific Languages**: Choose specialized mirrors based on the development language (e.g., NPM uses Taobao, Ruby uses Ruby China)
- **Geographic Location**: Select a mirror site closer to your location for faster performance
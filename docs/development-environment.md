# Web3 开发环境搭建指南

本文档介绍 Web3 和 Solidity 开发所需的环境配置。

## 目录

- [必需工具](#必需工具)
- [Hardhat 开发框架](#hardhat-开发框架)
- [Foundry 开发框架](#foundry-开发框架)
- [IDE 配置](#ide-配置)
- [常用命令](#常用命令)
- [环境验证](#环境验证)

---

## 必需工具

### Node.js & npm

**安装方式：**

#### Windows
1. 访问 [nodejs.org](https://nodejs.org/)
2. 下载 LTS 版本（推荐 18.x 或 20.x）
3. 运行安装程序，按默认选项安装

#### macOS
```bash
# 使用 Homebrew
brew install node

# 或使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Linux (Ubuntu/Debian)
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 nvm（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**验证安装：**
```bash
node --version  # 应该显示 v18.x.x 或更高
npm --version   # 应该显示 9.x.x 或更高
```

### Git

**安装方式：**

#### Windows
1. 访问 [git-scm.com](https://git-scm.com/download/win)
2. 下载并安装

#### macOS
```bash
# macOS 通常自带 Git，或使用 Homebrew
brew install git
```

#### Linux
```bash
sudo apt-get install git  # Ubuntu/Debian
sudo yum install git      # CentOS/RHEL
```

**验证安装：**
```bash
git --version
```

---

## Hardhat 开发框架

Hardhat 是以太坊智能合约开发的流行框架。

### 安装

```bash
# 全局安装（推荐）
npm install --global hardhat-shorthand

# 或者在项目中安装
npm install --save-dev hardhat
```

### 创建 Hardhat 项目

```bash
# 创建新目录
mkdir my-hardhat-project
cd my-hardhat-project

# 初始化项目
npx hardhat init

# 选择以下选项：
# - Create a JavaScript project
# - Install project dependencies
```

### 项目结构

```
my-hardhat-project/
├── contracts/           # Solidity 合约源码
├── scripts/             # 部署脚本
├── test/                # 测试文件
├── hardhat.config.js    # Hardhat 配置
└── package.json         # 项目依赖
```

### 安装 OpenZeppelin 合约库

```bash
npm install @openzeppelin/contracts
```

### 常用命令

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 启动本地节点
npx hardhat node

# 部署合约到本地网络
npx hardhat run scripts/deploy.js --network localhost

# 清理编译文件
npx hardhat clean

# 在 Hardhat 控制台测试
npx hardhat console --network localhost
```

---

## Foundry 开发框架

Foundry 是用 Rust 编写的现代化 Solidity 开发工具链，速度极快。

### 安装

#### macOS/Linux
```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash

# 设置环境变量
source ~/.bashrc  # 或 source ~/.zshrc

# 安装 foundryup
foundryup

# 安装完成
forge --version
cast --version
anvil --version
chisel --version
```

#### Windows (WSL)
Foundry 在 Windows 上需要通过 WSL 安装，步骤同 macOS/Linux。

### 创建 Foundry 项目

```bash
# 初始化新项目
forge init my-foundry-project
cd my-foundry-project

# 项目结构
# my-foundry-project/
# ├── src/           # Solidity 合约源码
# ├── test/          # 测试文件
# ├── script/        # 部署脚本
# └── foundry.toml   # Foundry 配置
```

### 安装 OpenZeppelin 合约库

```bash
# 安装作为 Git 子模块
forge install OpenZeppelin/openzeppelin-contracts

# 配置 remappings
echo "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/" > remappings.txt
```

### 常用命令

```bash
# 编译合约
forge build

# 运行测试
forge test

# 运行测试并显示 Gas 报告
forge test --gas-report

# 格式化代码
forge fmt

# 检查代码
forge check

# 启动本地节点
anvil

# 部署合约
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 验证合约
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain-id <CHAIN_ID>
```

---

## IDE 配置

### VS Code（推荐）

#### 安装 VS Code
访问 [code.visualstudio.com](https://code.visualstudio.com/) 下载安装。

#### 必装扩展

1. **Solidity** (by Juan Blanco)
   - 语法高亮
   - 代码补全
   - 类型检查

2. **Hardhat for Visual Studio Code**
   - Hardhat 项目集成
   - 快速运行测试和编译

3. **Foundry Solidity Toolkit**
   - Foundry 项目支持
   - 测试运行和调试

#### 配置 settings.json

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.20",
  "solidity.packageDefaultDependenciesContractsDirectory": "contracts",
  "solidity.packageDefaultDependenciesDirectory": "node_modules",
  "solidity.remappings": [
    "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/"
  ]
}
```

### Remix IDE（在线）

**网址**: [remix.ethereum.org](https://remix.ethereum.org/)

**优点**：
- 无需安装，浏览器即可使用
- 内置编译器和调试器
- 支持多种插件
- 适合快速原型和学习

**使用方法**：
1. 打开 Remix IDE
2. 创建新文件 `.sol`
3. 编写 Solidity 代码
4. 选择编译器版本并编译
5. 部署到测试网络

---

## 常用命令速查

### Hardhat

```bash
npx hardhat compile          # 编译合约
npx hardhat test             # 运行测试
npx hardhat node             # 启动本地节点
npx hardhat run <script>     # 运行脚本
npx hardhat clean            # 清理编译文件
npx hardhat console          # 进入控制台
```

### Foundry

```bash
forge build                  # 编译合约
forge test                   # 运行测试
forge test -vv               # 详细输出
forge test --gas-report      # Gas 报告
forge fmt                    # 格式化代码
forge check                  # 检查代码
anvil                        # 启动本地节点
cast <subcommand>            # 与合约交互
chisel                       # 交互式 Shell
```

### Git

```bash
git clone <url>              # 克隆仓库
git add .                    # 添加所有更改
git commit -m "msg"          # 提交更改
git push                     # 推送到远程
git pull                     # 拉取更新
git branch                   # 查看分支
git checkout -b <branch>     # 创建并切换分支
```

---

## 环境验证

完成安装后，运行以下命令验证环境：

```bash
# Node.js
node --version   # 应该 ≥ 16.x

# npm
npm --version    # 应该 ≥ 8.x

# Git
git --version

# Hardhat
npx hardhat --version

# Foundry（如果安装了）
forge --version
cast --version
```

### 创建测试项目验证

```bash
# 使用 Hardhat
npx hardhat test

# 使用 Foundry
forge init test-project
cd test-project
forge build
forge test
```

---

## 网络配置

### 本地测试网

**Hardhat 内置网络：**
- 自动生成，无需配置
- 每次重启节点会重置
- 适合开发和测试

**Foundry Anvil：**
```bash
anvil                    # 启动本地节点
anvil -f https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY  # Fork 主网
```

### 公共测试网

**Goerli 测试网（已弃用）：**
- 以前常用的以太坊测试网
- 已停止维护

**Sepolia 测试网（推荐）：**
- 当前的以太坊测试网
- 获取 ETH: https://sepoliafaucet.com/

**配置 Hardhat：**
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  networks: {
    sepolia: {
      url: "https://eth-sepolia.alchemyapi.io/v2/YOUR_API_KEY",
      accounts: [PRIVATE_KEY] // 注意：不要在生产环境硬编码私钥
    }
  }
};
```

### 获取测试 ETH

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucet](https://sepoliafaucet.com/)
- [Infura Faucet](https://www.infura.io/faucet/sepolia)

---

## 常见问题

### Q: Hardhat 编译报错怎么办？
```bash
# 清理缓存重新编译
npx hardhat clean
npx hardhat compile
```

### Q: Foundry 安装失败？
```bash
# 确保安装了依赖
# Ubuntu/Debian
sudo apt-get install -y curl git

# macOS
xcode-select --install
```

### Q: OpenZeppelin 导入错误？
```bash
# Hardhat
npm install @openzeppelin/contracts

# Foundry
forge install OpenZeppelin/openzeppelin-contracts
```

### Q: 测试网络没有 ETH？
访问水龙头获取免费的测试 ETH：
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

---

## 下一步

环境配置完成后，你可以：

1. 学习 [Solidity 基础语法](../solidity/basics/)
2. 查看 [课程大纲](../CURRICULUM.md)
3. 尝试第一个 [Hello World 合约](../solidity/basics/)

---

## 参考资源

- [Hardhat 官方文档](https://hardhat.org/docs)
- [Foundry 官方文档](https://book.getfoundry.sh/)
- [Solidity 官方文档](https://docs.soliditylang.org/)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts/)
- [Ethereum 开发者指南](https://ethereum.org/en/developers/)

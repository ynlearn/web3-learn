# 🚀 DeFi 实战课程 - 快速开始

## 📦 安装步骤

### 1. 安装依赖

```bash
# 进入 defi 目录
cd web3/defi

# 安装 Node.js 依赖
npm install
```

### 2. 编译合约

```bash
# 编译所有合约
npm run compile

# 或使用 hardhat 直接编译
npx hardhat compile
```

### 3. 运行测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定课程的测试
npx hardhat test test/lesson_17_dex_amm.test.js
npx hardhat test test/lesson_18_lending.test.js
npx hardhat test test/lesson_19_yield_aggregator.test.js
npx hardhat test test/lesson_20_dao_governance.test.js
```

### 4. 查看 Gas 报告

```bash
# 运行测试并显示 Gas 报告
REPORT_GAS=true npx hardhat test
```

### 5. 生成测试覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 报告将生成在 coverage/ 目录
```

## 📚 课程结构

```
web3/
├── defi/                           # DeFi 实战课程目录
│   ├── lesson_16_token_standards.sol   # 代币标准合约实现
│   ├── lesson_17_dex_amm.sol           # AMM 合约实现
│   ├── lesson_18_lending.sol           # 借贷协议合约
│   ├── lesson_19_yield_aggregator.sol  # 收益聚合器合约
│   ├── lesson_20_dao_governance.sol    # DAO 治理合约
│   ├── TestToken.sol                   # 测试代币合约
│   ├── mock_contracts.sol              # 模拟合约
│   ├── README_lesson_16.md             # 代币标准教学文档
│   ├── README_lesson_17.md             # AMM 教学文档
│   ├── README_lesson_18.md             # 借贷协议教学文档
│   ├── README_lesson_19.md             # 收益聚合器教学文档
│   ├── README_lesson_20.md             # DAO 治理教学文档
│   ├── INSTALLATION.md                 # 本文件 - 安装说明
│   └── README_Stage4.md                # 第四阶段总结
│
└── test/                          # 测试文件目录（根目录）
    ├── lesson_16_token_standards.test.js   # 代币标准测试
    ├── lesson_17_dex_amm.test.js           # AMM 测试
    ├── lesson_18_lending.test.js           # 借贷协议测试
    ├── lesson_19_yield_aggregator.test.js  # 收益聚合器测试
    └── lesson_20_dao_governance.test.js    # DAO 治理测试
```

## 🎯 学习路径

### 推荐学习顺序

1. **Lesson 17: DEX 原理 - AMM**
   - 理解恒定乘积公式
   - 学习流动性提供机制
   - 掌握滑点保护

2. **Lesson 18: 借贷协议**
   - 理解抵押和清算
   - 学习利息计算
   - 掌握风险管理

3. **Lesson 19: 收益聚合器**
   - 理解自动复投
   - 学习策略模式
   - 掌握费用优化

4. **Lesson 20: DAO 治理系统**
   - 理解提案生命周期
   - 学习投票机制
   - 掌握时间锁保护

## 🛠️ 常用命令

### 开发命令

```bash
# 清理编译缓存
npm run clean

# 启动本地节点
npm run node

# 在另一个终端连接到本地节点
npx hardhat console --network localhost
```

### 测试命令

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/lesson_17_dex_amm.test.js

# 运行特定测试用例
npx hardhat test --grep "应该成功存款"

# 显示详细输出
npx hardhat test --verbose
```

### 部署命令（需要配置 .env）

```bash
# 部署到 Goerli 测试网
npx hardhat run scripts/deploy.js --network goerli

# 部署到 Sepolia 测试网
npx hardhat run scripts/deploy.js --network sepolia
```

## 📝 学习建议

### 1. 理论学习
- 先阅读 README 文档理解概念
- 再阅读合约代码学习实现
- 最后运行测试验证理解

### 2. 实践操作
- 修改合约参数观察效果
- 添加新的测试用例
- 尝试优化 Gas 成本

### 3. 深入研究
- 阅读真实项目代码（Uniswap、Aave、Compound）
- 分析安全漏洞案例
- 参与开源项目讨论

## 🔍 调试技巧

### 1. 使用 Hardhat Console

```bash
# 启动控制台
npx hardhat console

# 在控制台中
const Token = await ethers.getContractFactory("TestToken");
const token = await Token.deploy("Test", "TST");
await token.balanceOf("0x...");
```

### 2. 查看事件日志

```javascript
// 在测试中
const tx = await contract.someFunction();
const receipt = await tx.wait();
console.log(receipt.logs);
```

### 3. 使用 Hardhat Network Helpers

```javascript
// 时间操作
await time.increase(3600); // 增加 1 小时
await time.advanceBlockTo(12345);

// 区块操作
await ethers.provider.send("hardhat_mine", ["0x10"]); // 挖掘 16 个区块
```

## ⚠️ 常见问题

### 1. 编译错误

```bash
# 清理缓存重新编译
npx hardhat clean
npx hardhat compile
```

### 2. 测试超时

```javascript
// 在 hardhat.config.js 中增加超时时间
mocha: {
  timeout: 100000,
}
```

### 3. Gas 报告不显示

```bash
# 设置环境变量
export REPORT_GAS=true
npm test
```

## 📖 参考资源

### 官方文档
- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [Ethers.js 文档](https://docs.ethers.org/)

### 在线资源
- [Remix IDE](https://remix.ethereum.org/) - 在线编译和测试
- [Tenderly](https://tenderly.co/) - 交易调试和分析
- [Etherscan](https://etherscan.io/) - 区块浏览器

## 🎓 进阶学习

### 1. 真实项目分析
```bash
# 克隆知名项目
git clone https://github.com/Uniswap/v2-core.git
git clone https://github.com/aave/aave-v3-core.git
git clone https://github.com/compound-finance/compound-protocol.git
```

### 2. 安全审计
- [ConsenSys Diligence](https://consensys.github.io/diligence/)
- [OpenZeppelin 安全博客](https://blog.openzeppelin.com/)
- [智能合约安全最佳实践](https://github.com/sigp/solidity-security-blog)

### 3. 参与社区
- [Solidity Discord](https://discord.gg/ETPw5cDh4A)
- [Hardhat Discord](https://discord.gg/GHpAYbRSPs)
- [OpenZeppelin Forum](https://forum.openzeppelin.com/)

## ✅ 课程完成检查清单

### Lesson 16: 代币标准
- [ ] 理解 ERC20/ERC721/ERC1155 标准
- [ ] 掌握代币实现方法
- [ ] 通过测试 `test/lesson_16_token_standards.test.js`

### Lesson 17: DEX 原理 - AMM
- [ ] 理解恒定乘积公式
- [ ] 掌握 LP 代币机制
- [ ] 实现滑点保护
- [ ] 通过测试 `test/lesson_17_dex_amm.test.js`

### Lesson 18: 借贷协议
- [ ] 理解抵押和清算机制
- [ ] 掌握利息计算
- [ ] 实现风险管理
- [ ] 通过测试 `test/lesson_18_lending.test.js`

### Lesson 19: 收益聚合器
- [ ] 理解自动复投机制
- [ ] 掌握策略模式
- [ ] 实现费用优化
- [ ] 通过测试 `test/lesson_19_yield_aggregator.test.js`

### Lesson 20: DAO 治理系统
- [ ] 理解提案生命周期
- [ ] 掌握投票机制
- [ ] 实现时间锁保护
- [ ] 通过测试 `test/lesson_20_dao_governance.test.js`

## 🎉 开始学习

现在你已经准备好开始 DeFi 实战课程了！

从 Lesson 17 开始，逐步学习每个课程的理论和实践。记住：
- 📖 先理解原理
- 💻 再实现代码
- 🧪 最后测试验证

**祝你学习顺利！** 🚀

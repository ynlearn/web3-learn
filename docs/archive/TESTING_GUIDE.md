# Solidity 课程测试运行指南

## 🧪 测试环境搭建

### 前置要求
- Node.js >= 16.x
- npm 或 yarn
- Git

### 快速开始

```bash
# 1. 进入项目目录
cd web3/solidity

# 2. 安装依赖
npm install --save-dev hardhat @nomiclabs/hardhat-waffle ethers chai

# 3. 初始化 Hardhat (如果还没有 hardhat.config.js)
npx hardhat init

# 4. 编译合约
npx hardhat compile

# 5. 运行测试
npx hardhat test
```

## 📋 测试运行清单

### 第一阶段测试

```bash
# Lesson 01: Hello World
npx hardhat test basics/lesson_01_hello_world.test.js

# Lesson 02: 数据类型
npx hardhat test basics/lesson_02_data_types.test.js

# Lesson 03: 函数
npx hardhat test basics/lesson_03_functions.test.js

# Lesson 04: 控制结构
npx hardhat test basics/lesson_04_control_structures.test.js

# Lesson 05: 面向对象
npx hardhat test basics/lesson_05_object_oriented.test.js
```

### 第二阶段测试

```bash
# Lesson 06: 状态管理
npx hardhat test contracts/lesson_06_state_management.test.js

# Lesson 07: 继承与多态
npx hardhat test contracts/lesson_07_inheritance_polymorphism.test.js

# Lesson 08: 错误处理
npx hardhat test contracts/lesson_08_error_handling.test.js

# Lesson 09: 事件与日志
npx hardhat test contracts/lesson_09_events.test.js

# Lesson 10: 安全机制
npx hardhat test contracts/lesson_10_security.test.js
```

### 运行所有测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定目录的测试
npx hardhat test basics/

# 显示详细输出
npx hardhat test --verbose

# 显示 Gas 报告
npx hardhat test --reporter gas
```

## 🔧 配置文件

### hardhat.config.js

```javascript
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  paths: {
    sources: "./",
    tests: "./",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: "YOUR_API_KEY"
  }
};
```

### package.json

```json
{
  "name": "solidity-teaching",
  "version": "1.0.0",
  "description": "Solidity 智能合约教学课程",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "test:basics": "hardhat test basics/",
    "test:contracts": "hardhat test contracts/",
    "test:patterns": "hardhat test patterns/",
    "test:gas": "hardhat test --reporter gas",
    "node": "hardhat node",
    "deploy": "hardhat run scripts/deploy.js"
  },
  "devDependencies": {
    "@nomiclabs/hardhat-ethers": "^2.2.0",
    "@nomiclabs/hardhat-waffle": "^2.0.3",
    "chai": "^4.3.7",
    "ethereum-waffle": "^4.0.10",
    "ethers": "^5.7.2",
    "hardhat": "^2.16.0",
    "hardhat-gas-reporter": "^1.0.9"
  }
}
```

## 📊 测试覆盖率

### 安装覆盖率工具

```bash
npm install --save-dev solidity-coverage
```

### 配置 hardhat.config.js

```javascript
require("solidity-coverage");

module.exports = {
  // ... 其他配置
};
```

### 运行覆盖率测试

```bash
npx hardhat coverage
```

### 查看覆盖率报告

测试完成后会生成 `coverage/index.html`，在浏览器中打开查看详细报告。

## 🎯 测试最佳实践

### 1. 测试结构

```javascript
describe("Lesson XX: 主题名称", function () {
    let contract;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();
        const Contract = await ethers.getContractFactory("ContractName");
        contract = await Contract.deploy();
        await contract.deployed();
    });

    describe("正常流程测试", function () {
        it("应该成功执行基本操作", async function () {
            // 测试代码
        });
    });

    describe("边界条件测试", function () {
        it("应该正确处理零值", async function () {
            // 测试代码
        });
    });

    describe("错误处理测试", function () {
        it("应该拒绝无效输入", async function () {
            await expect(
                contract.someFunction(0)
            ).to.be.revertedWith("Invalid input");
        });
    });

    describe("Gas 优化测试", function () {
        it("应该合理使用 Gas", async function () {
            const tx = await contract.someFunction();
            const receipt = await tx.wait();
            console.log("Gas used:", receipt.gasUsed.toString());
        });
    });
});
```

### 2. 常用测试命令

```javascript
// 部署合约
const Contract = await ethers.getContractFactory("ContractName");
const contract = await Contract.deploy();
await contract.deployed();

// 获取签名者
const [owner, user1, user2] = await ethers.getSigners();

// 调用函数
await contract.someFunction(param1, param2);

// 查看状态
const value = await contract.someValue();

// 发送交易
await contract.connect(user1).someFunction(param);

// 期望事件
await expect(contract.someFunction())
    .to.emit(contract, "EventName")
    .withArgs(arg1, arg2);

// 期望回滚
await expect(contract.someFunction())
    .to.be.revertedWith("Error message");

// 期望自定义错误
await expect(contract.someFunction())
    .to.be.revertedWithCustomError(contract, "CustomError");

// 获取余额
const balance = await ethers.provider.getBalance(address);

// 时间操作
await ethers.provider.send("evm_increaseTime", [3600]);
await ethers.provider.send("evm_mine");

// 挖掘指定区块
await network.provider.send("hardhat_mine", ["0x100"]);
```

### 3. 调试技巧

```bash
# 启用详细日志
npx hardhat test --verbose

# 只运行匹配的测试
npx hardhat test --grep "测试名称"

# 显示 Gas 报告
REPORTER=gas npx hardhat test

# 保留构建文件用于调试
npx hardhat compile --force

# 清理缓存
npx hardhat clean
```

## 🔍 常见问题解决

### 问题 1: 编译错误

```
Error: Compilation failed
```

**解决方案**:
- 检查 Solidity 版本是否匹配
- 确认所有导入路径正确
- 运行 `npx hardhat clean && npx hardhat compile`

### 问题 2: 测试超时

```
Error: Timeout of 5000ms exceeded
```

**解决方案**:
- 在测试中增加超时时间
```javascript
it("测试名称", async function () {
    this.timeout(10000); // 10 秒
    // 测试代码
});
```

### 问题 3: Gas 不足

```
Error: sender doesn't have enough funds
```

**解决方案**:
```javascript
// 增加账户余额
await owner.sendTransaction({
    to: user1.address,
    value: ethers.utils.parseEther("10.0")
});
```

### 问题 4: 合约地址问题

```
Error: cannot estimate gas
```

**解决方案**:
```javascript
// 等待交易确认
const tx = await contract.someFunction();
await tx.wait();
```

## 📈 性能基准

### 预期测试时间

- 第一阶段测试: ~30 秒
- 第二阶段测试: ~45 秒
- 第三阶段测试: ~60 秒
- 完整测试套件: ~3-5 分钟

### Gas 消耗参考

- 简单转账: ~50,000 Gas
- 复杂计算: ~100,000 Gas
- 批量操作: ~200,000+ Gas

## 🚀 CI/CD 集成

### GitHub Actions 配置

创建 `.github/workflows/test.yml`:

```yaml
name: Solidity Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install dependencies
      run: npm ci

    - name: Compile contracts
      run: npx hardhat compile

    - name: Run tests
      run: npx hardhat test

    - name: Generate coverage
      run: npx hardhat coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

## 📚 学习建议

### 测试驱动学习

1. **先看测试**: 理解合约应该如何工作
2. **运行测试**: 验证基本功能
3. **修改代码**: 尝试实现新功能
4. **编写测试**: 为新功能添加测试

### 调试技巧

1. **使用 console.log**:
```solidity
import "hardhat/console.sol";

contract MyContract {
    function debug() public {
        console.log("Debug info:", someValue);
    }
}
```

2. **逐步测试**: 一次测试一个功能点
3. **断言验证**: 使用 assert 验证假设
4. **事件监听**: 通过事件追踪执行流程

## 🎓 推荐阅读

- [Hardhat 测试指南](https://hardhat.org/tutorial/testing-contracts)
- [Ethers.js 文档](https://docs.ethers.io/v5/)
- [Chai 断言库](https://www.chaijs.com/)
- [Solidity 测试最佳实践](https://consensys.github.io/smart-contract-best-practices/testing/)

---

**记住**: 好的测试是高质量代码的保证! 🧪✅

**Happy Testing!** 🚀

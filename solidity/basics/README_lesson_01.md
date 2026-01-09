# Lesson 01: Hello World - 第一个智能合约

## 📚 课程概述

欢迎来到 Solidity 世界！这节课将从零开始，带你编写第一个智能合约，理解 Solidity 的基本结构。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解 Solidity 合约的基本结构
- ✅ 掌握 SPDX 许可证标识
- ✅ 使用 Pragma 版本声明
- ✅ 定义状态变量和函数
- ✅ 编写 NatSpec 格式的注释
- ✅ 使用构造函数初始化合约
- ✅ 定义和触发事件

## 📝 合约结构解析

### 1. SPDX 许可证标识

```solidity
// SPDX-License-Identifier: MIT
```

**为什么需要？**
- 明确代码的开源许可协议
- MIT 是最宽松的许可，适合学习和商业使用
- 其他常见许可：GPL, Apache-2.0, UNLICENSED

**幽默比喻**：就像你给作品贴上"可自由使用"或"严禁转载"的标签，SPDX 告诉别人你的代码可以用在什么场景。

### 2. Pragma 版本声明

```solidity
pragma solidity ^0.8.20;
```

**版本规则说明**：
- `^0.8.20`：兼容 0.8.20 到 0.9.0（不含）的所有版本
- `>=0.8.0 <0.9.0`：明确的版本范围
- `0.8.20`：精确版本，不推荐

**为什么重要？**
- Solidity 仍在快速演进，新版本修复漏洞、添加功能
- 不同版本可能有语法不兼容
- 0.8.x 内置溢出检查，更安全

**生活类比**：就像你声明"这个菜谱适用于 iPhone 13 及以上型号"，老款手机可能不支持某些功能。

### 3. 合约定义

```solidity
contract HelloWorld {
    // 合约内容
}
```

**Contract 类比**：
- 类似 JavaScript 的 Class
- Java 的 Class
- Python 的 Class

**关键区别**：
- 一旦部署，代码不可修改
- 所有数据存储在区块链上
- 每次函数调用都需要支付 Gas

### 4. NatSpec 注释格式

```solidity
/// @title HelloWorld
/// @dev 内部开发注释
/// @notice 用户可见的说明
/// @param paramName 参数说明
/// @return 返回值说明
```

**三种注释类型**：

| 类型 | 语法 | 用途 |
|------|------|------|
| 单行注释 | `// 注释内容` | 简短说明 |
| 多行注释 | `/* 注释内容 */` | 较长说明 |
| NatSpec 注释 | `/// @tag 内容` | 文档化注释 |

**NatSpec 标签**：

- `@title` - 合约/函数/事件的标题
- `@author` - 作者信息
- `@notice` - 用户可见的说明（显示在 Etherscan）
- `@dev` - 开发者注释（实现细节）
- `@param` - 参数说明
- `@return` - 返回值说明
- `@inheritdoc` - 继承文档

**最佳实践**：
```solidity
// ❌ 错误：冗余注释
uint256 count = 0; // 将 count 设置为 0

// ✅ 正确：解释意图
uint256 count = 0; // 追踪调用次数，用于防刷机制
```

### 5. 状态变量

```solidity
string public greet = "Hello, Web3 World!";
uint256 private counter = 0;
```

**变量可见性**：

| 可见性 | 描述 | 自动生成 Getter |
|--------|------|-----------------|
| `public` | 任何人可访问 | ✅ 是 |
| `private` | 仅合约内部 | ❌ 否 |
| `internal` | 合约及其子合约 | ❌ 否 |
| `external` | 仅外部调用 | ✅ 是 |

**数据类型**：

- `string` - 字符串
- `bool` - 布尔值
- `uint256` - 无符号整数（256位）
- `int256` - 有符号整数
- `address` - 地址（20字节）
- `bytes32` - 固定字节数组

**幽默类比**：
- `public` 就像客厅，客人可以自由进入
- `private` 就像卧室，只有你可以进
- `internal` 就像家庭内部，你和家人共享
- `external` 就像快递投递口，只从外面操作

### 6. 事件 (Events)

```solidity
event GreetChanged(string oldGreet, string newGreet);
```

**为什么需要事件？**
- 记录链上日志，节省存储成本
- 前端可以监听事件，实现实时更新
- 便于调试和审计

**事件 vs 状态变量**：

| 特性 | 事件 | 状态变量 |
|------|------|----------|
| 存储位置 | 日志（不可在合约内读取） | 存储空间 |
| Gas 成本 | 低 (~375 gas/主题) | 高 (20,000 gas/槽) |
| 可检索性 | 可通过索引检索 | 需要函数调用 |
| 历史记录 | 保留所有历史 | 只保留当前值 |

**生活类比**：
- 状态变量 = 你的银行余额（当前值）
- 事件 = 交易短信通知（历史记录）

### 7. 构造函数

```solidity
constructor(string memory _initialGreet) {
    greet = _initialGreet;
}
```

**特点**：
- 部署时执行一次
- 用于初始化状态变量
- 可以接收参数
- 可以触发事件

**命名规范**：
- 参数前缀 `_`：`_initialGreet`
- 区别于状态变量 `greet`

### 8. 函数定义

```solidity
function setGreet(string memory _newGreet) public {
    greet = _newGreet;
    emit GreetChanged(oldGreet, _newGreet);
}
```

**函数可见性修饰符**：

| 修饰符 | 描述 | Gas 成本 |
|--------|------|----------|
| `public` | 内部和外部都可调用 | 较高 |
| `private` | 仅合约内部 | 较低 |
| `internal` | 合约及继承合约 | 中等 |
| `external` | 仅外部调用 | 最低 |

**函数状态修改符**：

| 修饰符 | 描述 | 不修改状态 |
|--------|------|------------|
| `view` | 只读，不修改状态 | ✅ |
| `pure` | 不读也不写状态 | ✅ |
| `payable` | 可接收 ETH | ❌ |

**Gas 优化技巧**：
```solidity
// ❌ 高 Gas 成本：内部调用 public 函数
function internalCall() public {
    this.someFunction(); // 外部调用
}

// ✅ 低 Gas 成本：直接调用
function internalCall() public {
    someFunction(); // 内部调用
}
```

## 🧪 测试你的合约

### Hardhat 测试环境

**安装 Hardhat**：
```bash
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

**测试文件结构**：
```javascript
describe("合约名", function () {
    beforeEach(async function () {
        // 每个测试前运行
    });

    it("测试描述", async function () {
        // 测试逻辑
        expect(actual).to.equal(expected);
    });
});
```

**常用测试断言**：
```javascript
// 相等性
expect(value).to.equal(expected);
expect(value).to.be.closeTo(expected, 0.001);

// 布尔值
expect(boolValue).to.be.true;
expect(boolValue).to.be.false;

// 事件触发
await expect(contract.function())
    .to.emit(contract, "EventName")
    .withArgs(arg1, arg2);

// 失败断言
await expect(contract.revertFunction())
    .to.be.revertedWith("Error message");
```

## 🚀 运行测试

```bash
# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 测试覆盖率
npx hardhat coverage

# Gas 报告
npx hardhat test --report hardhat-gas-reporter
```

## 📊 本课 Gas 分析

| 函数 | Gas 消耗 | 说明 |
|------|----------|------|
| `setGreet` | ~30,000 | 修改状态变量 |
| `increment` | ~45,000 | 读取+写入+事件 |
| `getGreet` | ~0 (View) | 不消耗 Gas（调用） |
| `getCounter` | ~0 (View) | 不消耗 Gas（调用） |

**View 函数说明**：
- 在链上不消耗 Gas（因为是静态调用）
- 但如果被其他合约调用，会消耗 Gas
- 在交易中调用会消耗 Gas

## 🎓 课后练习

### 基础题（必做）

1. **修改问候语格式**
   - 添加用户名字段
   - 实现 `setGreetWithName(string name, string message)`
   - 格式：`"Hello, Alice! Welcome to Web3!"`

2. **添加时间戳**
   - 记录每次问候语修改的时间
   - 添加 `getLastUpdateTime()` 函数

3. **计数器保护**
   - 添加 `resetCounter()` 权限控制
   - 只有部署者可以重置

### 进阶题（选做）

1. **多语言支持**
   - 添加语言选择器（中文、英文、日文）
   - 根据语言返回不同问候语

2. **历史记录**
   - 使用数组存储历史问候语
   - 实现 `getHistoryCount()` 和 `getGreetingAt(uint index)`

3. **Gas 优化**
   - 尝试优化 `setGreet` 函数的 Gas 消耗
   - 对比优化前后的 Gas 报告

## 🔗 常见问题

### Q1: 为什么 Remix 可以直接运行，Hardhat 需要配置？
**A**: Remix 是在线 IDE，内置了编译器和测试环境。Hardhat 是本地开发框架，需要配置网络、编译器等，但更适合专业开发。

### Q2: `msg.sender` 是什么？
**A**: `msg.sender` 是全局变量，表示当前调用者的地址。就像"谁在按门铃"。

### Q3: 事件一定要定义吗？
**A**: 不是必须的，但强烈推荐。事件是记录历史、前端交互的关键机制。

### Q4: `memory` 和 `calldata` 有什么区别？
**A**: 这是高级主题，下一课会详细讲解。简单来说：
- `memory`：可修改的临时数据
- `calldata`：不可修改的输入数据（更省 Gas）

### Q5: 为什么我的合约部署失败？
**A**: 常见原因：
- 构造函数参数错误
- Gas 不足
- 合约大小超过 24KB
- 编译器版本不匹配

## 📚 延伸阅读

- [Solidity 官方文档 - 合约结构](https://docs.soliditylang.org/en/v0.8.20/structure-of-a-contract.html)
- [NatSpec 规范](https://docs.soliditylang.org/en/v0.8.20/natspec-format.html)
- [Events 文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#events)
- [Hardhat 测试指南](https://hardhat.org/tutorial/testing-contracts)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解 Solidity 合约的基本组成部分
- [ ] 能够编写 NatSpec 格式的注释
- [ ] 掌握状态变量和函数的定义
- [ ] 理解事件的用途和触发方式
- [ ] 能够运行 Hardhat 测试
- [ ] 完成至少一个基础练习题

---

**下一课预告**：数据类型 - 深入了解 Solidity 的值类型、引用类型和数据位置！

**准备好了吗？继续你的 Web3 之旅！** 🚀

# Lesson 08: 错误处理 - Solidity 的安全网

## 📚 课程概述

错误处理是智能合约安全性的关键组成部分。本课将深入学习 Solidity 中的各种错误处理机制，包括 `require`、`revert`、`assert` 和自定义错误，帮助你构建更安全、更高效的智能合约。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 掌握 `require` 语句的使用场景和最佳实践
- ✅ 理解 `revert` 语句的适用场景
- ✅ 了解 `assert` 语句的正确用法
- ✅ 使用自定义错误优化 Gas 消耗
- ✅ 实现完整的错误处理流程
- ✅ 对比不同错误处理方式的 Gas 成本
- ✅ 防范常见的错误处理漏洞

## 🔍 错误处理基础

### 为什么需要错误处理？

**幽默比喻**：
- 错误处理就像交通信号灯
- 红灯停（条件不满足，交易回滚）
- 绿灯行（条件满足，交易继续）
- 黄灯警告（assert 检查内部错误）

**重要性**：
- 保护合约安全
- 防止无效状态
- 提供清晰的错误信息
- 优化 Gas 消耗

## 📋 Require 语句

### 什么是 Require？

- 最常用的错误处理方式
- 验证输入条件和前置条件
- 条件不满足时回滚交易

### 基本语法

```solidity
require(condition, "error message");
```

### 使用场景

**1. 输入验证**：
```solidity
function deposit(uint256 _amount) public {
    require(_amount > 0, "Amount must be greater than 0");
    // 存款逻辑
}
```

**2. 余额检查**：
```solidity
function withdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    // 取款逻辑
}
```

**3. 权限验证**：
```solidity
function adminFunction() public {
    require(msg.sender == owner, "Only owner");
    // 管理员功能
}
```

### 最佳实践

**按成本排序**：
```solidity
function optimizedCheck(uint256 _amount, address _recipient) public {
    // 低成本检查：简单的条件判断
    require(_amount > 0, "Invalid amount");
    require(_recipient != address(0), "Invalid address");

    // 中等成本检查：映射查询
    require(balances[msg.sender] >= _amount, "Insufficient balance");

    // 高成本检查：复杂计算
    require(calculateSomething() > 0, "Calculation failed");

    // 更新状态
    balances[msg.sender] -= _amount;
}
```

**为什么这样做？**
- 如果前面的检查失败，后面的检查不会执行
- 节省 Gas（避免不必要的计算）

## 🔄 Revert 语句

### 什么是 Revert？

- 更灵活的错误处理方式
- 适合复杂条件判断
- 支持自定义错误

### 基本语法

```solidity
if (condition) {
    revert("Error message");
}
```

### 使用场景

**1. 复杂条件**：
```solidity
function transfer(address _to, uint256 _amount) public {
    if (_to == address(0) || _to == msg.sender) {
        revert("Invalid recipient");
    }
    if (_amount == 0 || balances[msg.sender] < _amount) {
        revert("Invalid transfer parameters");
    }
    // 转账逻辑
}
```

**2. 嵌套检查**：
```solidity
function complexOperation(uint256 _value) public {
    bool valid1 = _value > 0;
    bool valid2 = _value < MAX_VALUE;
    bool valid3 = balances[msg.sender] >= _value;

    if (!valid1 || !valid2 || !valid3) {
        revert("Invalid operation");
    }
    // 复杂逻辑
}
```

**3. 自定义错误**：
```solidity
error InsufficientBalance(uint256 requested, uint256 available);

function withdraw(uint256 _amount) public {
    if (balances[msg.sender] < _amount) {
        revert InsufficientBalance(_amount, balances[msg.sender]);
    }
    // 取款逻辑
}
```

### Require vs Revert

| 特性 | Require | Revert |
|------|---------|--------|
| 语法简单度 | ✅ 简单 | ⚠️ 需要写 if |
| 适用场景 | 简单条件 | 复杂条件 |
| Gas 成本 | 相同 | 相同 |
| 可读性 | ✅ 高 | ⚠️ 看情况 |
| 自定义错误 | ❌ 不支持 | ✅ 支持 |

**选择建议**：
- 简单条件 → `require`
- 复杂条件 → `revert`
- 需要详细错误信息 → 自定义错误

## ✅ Assert 语句

### 什么是 Assert？

- 用于检查内部不变量
- 不应该失败（如果失败，说明合约有 bug）
- 主要用于开发和测试

### 基本语法

```solidity
assert(condition);
```

### 使用场景

**1. 内部不变量检查**：
```solidity
function calculateInterest(uint256 _principal, uint256 _rate) public pure returns (uint256) {
    uint256 interest = (_principal * _rate) / 100;
    assert(interest >= 0); // 内部检查
    return interest;
}
```

**2. 数学运算验证**：
```solidity
function safeDivide(uint256 _a, uint256 _b) public pure returns (uint256) {
    require(_b != 0, "Division by zero");
    uint256 result = _a / _b;
    assert(result * _b <= _a); // 验证结果
    return result;
}
```

**3. 状态一致性检查**：
```solidity
function distribute(uint256[] memory _percentages) public pure {
    uint256 total = 0;
    for (uint256 i = 0; i < _percentages.length; i++) {
        total += _percentages[i];
    }
    assert(total == 100); // 总和必须为 100
}
```

### Assert vs Require

| 特性 | Assert | Require |
|------|--------|---------|
| 使用场景 | 内部检查 | 外部输入验证 |
| 错误信息 | 无 | 有 |
| Gas 消耗 | 相同 | 相同 |
| 失败原因 | 合约 bug | 用户输入错误 |

**使用原则**：
- 验证用户输入 → `require`
- 检查内部逻辑 → `assert`

## 🎨 自定义错误

### 什么是自定义错误？

- Solidity 0.8.4+ 引入的新特性
- 比字符串错误信息更节省 Gas
- 可以携带更多错误信息

### 基本语法

```solidity
// 定义错误
error InsufficientBalance(uint256 requested, uint256 available);

// 使用错误
if (balance < amount) {
    revert InsufficientBalance(amount, balance);
}
```

### Gas 优化效果

**传统方式**：
```solidity
require(balance >= amount, "Insufficient balance");
// Gas 消耗：约 50-60（字符串存储）
```

**自定义错误**：
```solidity
error InsufficientBalance(uint256 requested, uint256 available);
if (balance < amount) {
    revert InsufficientBalance(amount, balance);
}
// Gas 消耗：约 20-30（仅 4 字节选择器）
```

**节省**：约 30-40 Gas 每次调用

### 完整示例

```solidity
// 定义自定义错误
error InsufficientBalanceError(uint256 requested, uint256 available);
error OnlyOwnerError(address caller, address owner);
error InvalidValueError(uint256 value);

contract MyContract {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function withdraw(uint256 _amount) public {
        if (_amount == 0) {
            revert InvalidValueError(_amount);
        }

        uint256 balance = balances[msg.sender];
        if (balance < _amount) {
            revert InsufficientBalanceError(_amount, balance);
        }

        balances[msg.sender] = balance - _amount;
    }

    function ownerFunction() public {
        if (msg.sender != owner) {
            revert OnlyOwnerError(msg.sender, owner);
        }
        // 管理员功能
    }
}
```

## 🛡️ 错误处理最佳实践

### Checks-Effects-Interactions 模式

```solidity
function withdraw(uint256 _amount) public {
    // 1. Checks（检查）
    require(_amount > 0, "Invalid amount");
    require(balances[msg.sender] >= _amount, "Insufficient balance");

    // 2. Effects（影响）
    balances[msg.sender] -= _amount;

    // 3. Interactions（交互）
    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success, "Transfer failed");
}
```

**为什么这样设计？**
1. 先检查所有条件
2. 再更新状态
3. 最后与外部合约交互
4. 防止重入攻击

### 多层错误处理

```solidity
function complexFunction(
    uint256 _amount,
    address _recipient,
    uint256 _fee
) public {
    // 第 1 层：基本输入验证
    if (_amount == 0) revert InvalidValueError(_amount);
    if (_recipient == address(0)) revert("Invalid recipient");

    // 第 2 层：业务规则验证
    if (_fee > _amount / 20) revert("Fee too high");
    if (balances[msg.sender] < _amount + _fee) {
        revert InsufficientBalanceError(_amount + _fee, balances[msg.sender]);
    }

    // 第 3 层：状态一致性检查
    uint256 newBalance = balances[_recipient] + _amount;
    assert(newBalance >= balances[_recipient]); // 无溢出

    // 更新状态
    balances[msg.sender] -= _amount + _fee;
    balances[_recipient] += _amount;
}
```

### 错误恢复机制

```solidity
function withdrawWithRecovery(uint256 _amount) public {
    uint256 balance = balances[msg.sender];

    if (balance < _amount) {
        revert InsufficientBalanceError(_amount, balance);
    }

    // 更新状态
    balances[msg.sender] = balance - _amount;

    // 尝试转账
    (bool success, ) = msg.sender.call{value: _amount}("");

    if (!success) {
        // 恢复状态
        balances[msg.sender] = balance;
        revert("Transfer failed, state reverted");
    }
}
```

## 🚨 常见错误处理漏洞

### 1. 错误的检查顺序

```solidity
// ❌ 错误：高成本检查在前
function badOrder(uint256 _amount) public {
    require(calculateExpensiveThing() > 0, "Expensive check failed");
    require(_amount > 0, "Invalid amount");
    // 逻辑
}

// ✅ 正确：低成本检查在前
function goodOrder(uint256 _amount) public {
    require(_amount > 0, "Invalid amount");
    require(calculateExpensiveThing() > 0, "Expensive check failed");
    // 逻辑
}
```

### 2. 缺少错误处理

```solidity
// ❌ 错误：没有检查外部调用结果
function unsafeWithdraw(uint256 _amount) public {
    balances[msg.sender] -= _amount;
    msg.sender.call{value: _amount}(""); // 没有检查返回值
}

// ✅ 正确：检查外部调用结果
function safeWithdraw(uint256 _amount) public {
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    balances[msg.sender] -= _amount;

    (bool success, ) = msg.sender.call{value: _amount}("");
    require(success, "Transfer failed");
}
```

### 3. 过度使用 Assert

```solidity
// ❌ 错误：用 assert 验证用户输入
function badAssert(uint256 _amount) public {
    assert(_amount > 0); // 应该用 require
}

// ✅ 正确：用 require 验证用户输入
function goodRequire(uint256 _amount) public {
    require(_amount > 0, "Amount must be greater than 0");
}
```

## 📊 Gas 优化建议

### 1. 使用自定义错误

**节省 Gas**：每次调用节省约 30-40 Gas

```solidity
// 旧方式
require(balances[msg.sender] >= _amount, "Insufficient balance");

// 新方式
error InsufficientBalance(uint256 requested, uint256 available);
if (balances[msg.sender] < _amount) {
    revert InsufficientBalance(_amount, balances[msg.sender]);
}
```

### 2. 合理组织检查顺序

**原则**：从低到高

```solidity
function optimizedChecks(
    uint256 _amount,
    address _recipient
) public {
    // 1. 简单条件（最便宜）
    require(_amount > 0, "Invalid amount");
    require(_recipient != address(0), "Invalid address");

    // 2. 中等复杂度（映射查询）
    require(balances[msg.sender] >= _amount, "Insufficient balance");

    // 3. 复杂计算（最昂贵）
    require(validateComplexCondition(_amount), "Complex validation");
}
```

### 3. 避免重复检查

```solidity
// ❌ 错误：重复检查
function duplicateChecks(uint256 _amount) public {
    require(_amount > 0, "Invalid amount");
    require(_amount <= MAX_AMOUNT, "Amount too high");
    require(balances[msg.sender] >= _amount, "Insufficient balance");

    // ... 其他代码 ...

    require(balances[msg.sender] >= _amount, "Insufficient balance"); // 重复
}

// ✅ 正确：缓存结果
function singleCheck(uint256 _amount) public {
    require(_amount > 0 && _amount <= MAX_AMOUNT, "Invalid amount");

    uint256 balance = balances[msg.sender];
    require(balance >= _amount, "Insufficient balance");

    // 使用缓存的 balance 变量
}
```

## 🎓 课后练习

### 基础题（必做）

1. **银行存取款**
   - 实现 `deposit()` 函数（使用 require）
   - 实现 `withdraw()` 函数（使用 revert）
   - 实现 `transfer()` 函数（使用自定义错误）

2. **投票系统**
   - 验证投票者资格
   - 检查投票时间
   - 防止重复投票

3. **拍卖合约**
   - 验证出价金额
   - 检查拍卖时间
   - 验证最高出价者

### 进阶题（选做）

1. **多签钱包**
   - 使用自定义错误处理各种失败情况
   - 实现完整的错误恢复机制
   - 优化 Gas 消耗

2. **DeFi 协议**
   - 实现复杂的错误处理逻辑
   - 使用多层验证
   - 添加详细的错误信息

3. **DAO 治理**
   - 验证提案格式
   - 检查投票权重
   - 处理执行失败

## 🔗 常见问题

### Q1: Require 和 Revert 的 Gas 成本一样吗？
**A**:
- 是的，Gas 成本相同
- 但自定义错误可以节省 Gas
- 选择主要看代码可读性

### Q2: 什么时候使用 Assert？
**A**:
- 只用于内部不变量检查
- 验证合约逻辑的正确性
- 不应该用于验证用户输入

### Q3: 自定义错误能节省多少 Gas？
**A**:
- 约节省 30-40 Gas 每次调用
- 在高频函数中累积效果明显
- 建议在所有错误处理中使用

### Q4: 如何提供详细的错误信息？
**A**:
```solidity
error DetailedError(
    uint256 requested,
    uint256 available,
    address account
);

if (balance < amount) {
    revert DetailedError(amount, balance, msg.sender);
}
```

### Q5: 可以同时使用多种错误处理方式吗？
**A**:
- 可以，但建议统一风格
- 简单条件用 require
- 复杂条件用自定义错误
- 内部检查用 assert

## 📚 延伸阅读

- [Solidity 错误处理文档](https://docs.soliditylang.org/en/v0.8.20/control-structures.html#panic-via-assert-and-error-via-require)
- [自定义错误说明](https://blog.soliditylang.org/2021/04/21/custom-errors/)
- [Gas 优化技巧](https://docs.soliditylang.org/en/v0.8.20/gas-optimization.html)
- [安全最佳实践](https://consensys.github.io/smart-contract-best-practices/development-recommendations/general/smart-contract-development-tips/)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解 require 的使用场景
- [ ] 掌握 revert 的正确用法
- [ ] 了解 assert 的适用情况
- [ ] 能够使用自定义错误
- [ ] 理解 Gas 优化技巧
- [ ] 掌握错误处理最佳实践
- [ ] 能够防范常见错误处理漏洞
- [ ] 完成至少一个基础练习题

---

**下一课预告**：事件与日志 - 学习如何记录和监听智能合约事件！

**继续你的 Solidity 之旅！** 🚀

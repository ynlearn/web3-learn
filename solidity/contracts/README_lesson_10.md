# Lesson 10: 安全机制基础 - 智能合约的盾牌

## 📚 课程概述

安全是智能合约开发的生命线。本课将深入学习 Solidity 的基础安全机制,包括访问控制、防重入攻击、暂停机制等,帮助你构建更安全可靠的智能合约。

## 🎯 学习目标

完成本课后,你将能够:

- ✅ 实现访问控制(Ownable, AccessControl)
- ✅ 理解和防范重入攻击
- ✅ 使用暂停机制(Pausable)
- ✅ 实现多签钱包
- ✅ 应用 Checks-Effects-Interactions 模式
- ✅ 设计综合安全措施
- ✅ 识别常见安全漏洞

## 🛡️ 访问控制

### 为什么需要访问控制?

**幽默比喻**:
- 访问控制就像门禁系统
- 不是所有人都能进入机密房间
- 需要特殊权限才能执行某些操作

### Ownable 模式

```solidity
contract Ownable {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function sensitiveFunction() public onlyOwner {
        // 只有所有者能调用
    }
}
```

### 基于角色的访问控制(RBAC)

```solidity
contract AccessControl {
    mapping(bytes32 => mapping(address => bool)) public roles;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant USER_ROLE = keccak256("USER");

    modifier onlyRole(bytes32 role) {
        require(roles[role][msg.sender], "Missing role");
        _;
    }

    function grantRole(bytes32 role, address account) public {
        // 授予角色逻辑
    }
}
```

## 🔄 重入攻击防范

### 什么是重入攻击?

**幽默比喻**:
- 就像递归调用的"套娃"
- 攻击者在函数执行完成前再次调用
- 可以多次取款,每次都成功

### 著名的 DAO 攻击

```solidity
// ❌ 有漏洞的代码
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount);

    // 外部调用 - 重入攻击点
    msg.sender.call{value: amount}("");

    // 状态更新 - 太晚了!
    balances[msg.sender] -= amount;
}

// ✅ 安全的代码
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount);

    // 先更新状态
    balances[msg.sender] -= amount;

    // 后外部调用
    msg.sender.call{value: amount}("");
}
```

### Checks-Effects-Interactions 模式

```solidity
function secureWithdraw(uint256 amount) public noReentrant {
    // 1. Checks(检查条件)
    require(amount > 0, "Invalid amount");
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 2. Effects(更新状态)
    balances[msg.sender] -= amount;

    // 3. Interactions(外部调用)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### ReentrancyGuard

```solidity
contract ReentrancyGuard {
    bool private locked;

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function sensitiveFunction() public noReentrant {
        // 防止重入攻击
    }
}
```

## ⏸️ 暂停机制

### 何时使用暂停机制?

- 发现安全漏洞时
- 需要紧急升级时
- 监管要求时
- 系统维护时

### Pausable 模式

```solidity
contract Pausable is Ownable {
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    function pause() public onlyOwner {
        paused = true;
    }

    function unpause() public onlyOwner {
        paused = false;
    }

    function transfer(address to, uint256 amount) public whenNotPaused {
        // 暂停时不能转账
    }
}
```

## 🔐 多签钱包

### 为什么需要多签?

- 分散风险
- 防止单点故障
- 增加安全性
- 适合组织管理

### 基本实现

```solidity
contract MultiSigWallet {
    mapping(address => bool) public isOwner;
    uint256 public required;
    uint256 public transactionCount;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    function submitTransaction(address to, uint256 value, bytes memory data)
        public returns (uint256)
    {
        uint256 txId = transactionCount;
        transactions[txId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false
        });
        transactionCount++;
        return txId;
    }

    function confirmTransaction(uint256 txId) public {
        confirmations[txId][msg.sender] = true;
    }

    function executeTransaction(uint256 txId) public {
        require(isConfirmed(txId));
        Transaction storage txn = transactions[txId];
        txn.executed = true;
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success);
    }

    function isConfirmed(uint256 txId) public view returns (bool) {
        uint256 count = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[txId][owners[i]]) count++;
        }
        return count >= required;
    }
}
```

## 🏆 综合安全示例

### SecureVault

```solidity
contract SecureVault is Ownable, ReentrancyGuard, Pausable {
    mapping(address => uint256) public deposits;
    uint256 public withdrawalLimit;

    function deposit() public payable whenNotPaused noReentrant {
        require(msg.value > 0);
        deposits[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public whenNotPaused noReentrant {
        require(amount > 0);
        require(amount <= withdrawalLimit);
        require(deposits[msg.sender] >= amount);

        deposits[msg.sender] -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
    }
}
```

## 🚨 常见安全漏洞

### 1. 重入攻击
- **防范**: 使用 ReentrancyGuard + CEI 模式

### 2. 整数溢出/下溢
- **防范**: 使用 Solidity 0.8.x 或 SafeMath

### 3. 未授权访问
- **防范**: 实现适当的访问控制

### 4. 前置交易攻击
- **防范**: 使用提交-揭示模式或批量操作

### 5. 拒绝服务(DoS)
- **防范**: 限制循环、使用拉取支付模式

## 🎓 课后练习

### 基础题(必做)

1. **实现 Ownable 合约**
   - 转移所有权
   - 接受所有权
   - 放弃所有权

2. **实现防重入攻击的银行**
   - 使用 ReentrancyGuard
   - 应用 CEI 模式
   - 测试攻击合约

3. **实现可暂停的代币**
   - 暂停转账
   - 紧急取款
   - 恢复操作

### 进阶题(选做)

1. **多签钱包**
   - 提交交易
   - 确认交易
   - 执行交易
   - 添加/删除所有者

2. **时间锁**
   - 延迟执行
   - 取消交易
   - 时间锁管理

3. **综合安全系统**
   - 组合多种安全措施
   - 实现分层权限
   - 添加监控事件

## 🔗 常见问题

### Q1: 何时使用 Ownable vs AccessControl?
**A**:
- 简单项目 → Ownable
- 复杂权限 → AccessControl
- 需要多角色 → AccessControl

### Q2: CEI 模式为什么重要?
**A**:
- 防止重入攻击
- 确保状态一致性
- 遵循最佳实践

### Q3: 应该暂停哪些功能?
**A**:
- 关键业务功能
- 资金转移操作
- 状态变更函数

### Q4: 多签需要多少个签名?
**A**:
- 至少 2 个
- 通常 3-5 个
- 根据风险等级决定

### Q5: 如何测试安全措施?
**A**:
- 编写攻击合约
- 模拟各种攻击
- 使用测试工具

## 📚 延伸阅读

- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/4.x/access-control)
- [Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Reentrancy Explanation](https://solidity-by-example.org/hacks/re-entrancy/)
- [Security Considerations](https://docs.soliditylang.org/en/v0.8.20/security-considerations.html)

## ✅ 课程检查清单

完成本课前,确保你:
- [ ] 理解访问控制的重要性
- [ ] 掌握 Ownable 模式
- [ ] 了解基于角色的访问控制
- [ ] 理解重入攻击原理
- [ ] 掌握防范重入攻击的方法
- [ ] 能够实现暂停机制
- [ ] 理解多签钱包的工作原理
- [ ] 完成至少一个基础练习题

---

**第二阶段完成!** 🎉

**下一阶段预告**: 设计模式 - 学习工厂、代理、状态机等高级设计模式!

**继续你的 Solidity 之旅!** 🚀

# Lesson 15: 其他常用模式 - 完善你的开发工具箱

## 📚 课程概述

恭喜你走到了设计模式系列的最后一课！本课将介绍智能合约开发中其他常用的设计模式，包括所有权、访问控制、紧急停止、防重入、速率限制等。掌握这些模式，你就能构建更加安全、健壮的智能合约系统。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 掌握所有权转移的安全机制
- ✅ 实现基于角色的访问控制
- ✅ 理解紧急停止模式的应用
- ✅ 防范重入攻击
- ✅ 实现速率限制
- ✅ 构建白名单系统
- ✅ 自动收取手续费
- ✅ 组合多种模式构建健壮合约

## 📝 模式概览

本课涵盖的模式：

| 模式 | 用途 | 复杂度 | 使用频率 |
|------|------|--------|----------|
| Ownable | 所有权管理 | ⭐ | ⭐⭐⭐⭐⭐ |
| AccessControl | 权限管理 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Pausable | 紧急停止 | ⭐ | ⭐⭐⭐⭐⭐ |
| ReentrancyGuard | 防重入 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Whitelist | 白名单 | ⭐ | ⭐⭐⭐⭐ |
| FeeCollector | 费用收取 | ⭐⭐ | ⭐⭐⭐⭐ |
| RateLimiter | 速率限制 | ⭐⭐⭐ | ⭐⭐⭐ |
| Badge | 成就系统 | ⭐⭐ | ⭐⭐ |

## 🔧 模式详解

### 1. 所有权模式（Ownable）

#### 基本实现

```solidity
contract Ownable {
    address public owner;
    address public pendingOwner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
```

#### 为什么需要两步验证？

**❌ 单步转移的风险**：
```solidity
function transferOwnership(address newOwner) external onlyOwner {
    owner = newOwner; // 如果新地址错误，无法挽回！
}
```

**✅ 两步验证的优势**：
1. 确认新地址正确
2. 防止误操作
3. 新所有者必须主动接受

**生活类比**：
- 单步 = 直接把房产证给别人
- 两步 = 先签协议，对方确认后才过户

#### 使用场景

- 合约升级
- 管理员权限转移
- 紧急权限移交

### 2. 访问控制模式（AccessControl）

#### 基于角色的权限

```solidity
contract AccessControl {
    mapping(bytes32 => mapping(address => bool)) private roles;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER");

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Not authorized");
        _;
    }

    function grantRole(bytes32 role, address account) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        roles[role][account] = true;
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return roles[role][account];
    }
}
```

#### vs Ownable 对比

| 特性 | Ownable | AccessControl |
|------|---------|---------------|
| 权限数量 | 1个所有者 | 多个角色 |
| 灵活性 | 低 | 高 |
| 适用场景 | 小型合约 | 大型系统 |
| Gas 成本 | 低 | 稍高 |

#### 角色层级设计

```solidity
// 管理员可以管理所有角色
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

// MODERATOR 可以管理用户，但不能管理 ADMIN
bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR");

// 普通用户
bytes32 public constant USER_ROLE = keccak256("USER");
```

### 3. 紧急停止模式（Pausable）

#### 核心实现

```solidity
contract Pausable {
    bool public paused;

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }
}
```

#### 使用场景

**何时应该暂停？**
- 发现严重漏洞
- 遭受攻击
- 紧急升级准备
- 监管要求
- 异常流量

**哪些功能应该受影响？**
- ✅ 转账、交易、铸造
- ❌ 查询、授权（不修改状态）

#### 最佳实践

```solidity
// ✅ 正确：关键操作受暂停影响
function transfer(address to, uint256 amount) external whenNotPaused {
    // ...
}

// ✅ 正确：查询功能不受影响
function balanceOf(address account) external view returns (uint256) {
    // 不需要 whenNotPaused
}
```

### 4. 防重入模式（ReentrancyGuard）

#### 什么是重入攻击？

**攻击流程**：
```
1. 攻击者调用合约 A 的 withdraw() 函数
2. 合约 A 发送 ETH 给攻击者
3. 攻击者的 receive() fallback 函数被触发
4. 攻击者再次调用合约 A 的 withdraw() 函数
5. 合约 A 还没更新余额，再次发送 ETH！
```

#### 防护机制

```solidity
contract ReentrancyGuard {
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED; // 即使 revert 也会重置
    }

    function withdraw(uint256 amount) external nonReentrant {
        // ...
    }
}
```

#### Checks-Effects-Interactions 模式

**最佳实践**：

```solidity
// ✅ 正确顺序
function withdraw(uint256 amount) external nonReentrant {
    // 1. Checks（检查）
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 2. Effects（效果）- 先更新状态
    balances[msg.sender] -= amount;

    // 3. Interactions（交互）- 后进行外部调用
    payable(msg.sender).transfer(amount);
}

// ❌ 错误顺序
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // 先进行外部调用！危险！
    payable(msg.sender).transfer(amount);

    // 后更新状态
    balances[msg.sender] -= amount;
}
```

### 5. 白名单模式（Whitelist）

#### 基本实现

```solidity
contract Whitelist {
    mapping(address => bool) public isWhitelisted;

    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "Not whitelisted");
        _;
    }

    function addToWhitelist(address account) external {
        isWhitelisted[account] = true;
    }

    function privilegedFunction() external onlyWhitelisted {
        // 只有白名单用户可以调用
    }
}
```

#### 使用场景

- ICO/IDO 白名单预售
- NFT 白名单铸造
- VIP 功能访问
- 测试网早期访问

#### Gas 优化

```solidity
// ❌ 低效：使用数组存储
address[] public whitelistedAddresses;

function isWhitelisted(address account) public view returns (bool) {
    for (uint256 i = 0; i < whitelistedAddresses.length; i++) {
        if (whitelistedAddresses[i] == account) {
            return true;
        }
    }
    return false;
}

// ✅ 高效：使用 mapping
mapping(address => bool) public isWhitelisted;

function isWhitelisted(address account) public view returns (bool) {
    return isWhitelisted[account]; // O(1)
}
```

### 6. 费用收取模式（FeeCollector）

#### 基本实现

```solidity
contract FeeCollector {
    uint256 public feeNumerator; // 分子
    uint256 public constant feeDenominator = 10000; // 分母
    address public feeRecipient;

    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * feeNumerator) / feeDenominator;
    }

    function collectFee(uint256 amount) internal {
        uint256 fee = calculateFee(amount);
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
        }
    }
}
```

#### 在交易中自动收取

```solidity
function buyItem(uint256 itemId) external payable {
    uint256 price = items[itemId].price;
    require(msg.value >= price, "Insufficient payment");

    // 自动收取费用
    collectFee(msg.value);

    // 剩余金额给卖家
    uint256 sellerAmount = msg.value - calculateFee(msg.value);
    payable(items[itemId].seller).transfer(sellerAmount);
}
```

#### 费用率设计

| 费用率 | 基点 | 适用场景 |
|--------|------|----------|
| 0.1% | 10 | 大额交易 |
| 0.5% | 50 | 标准 DEX |
| 1% | 100 | NFT 市场 |
| 2-3% | 200-300 | 高级服务 |
| 5% | 500 | 特殊功能 |

### 7. 速率限制模式（RateLimiter）

#### 基本实现

```solidity
contract RateLimiter {
    struct Limit {
        uint256 maxCalls;
        uint256 window;
        mapping(address => uint256) lastCallTime;
        mapping(address => uint256) callCount;
    }

    mapping(bytes32 => Limit) private limits;

    modifier rateLimit(bytes32 limitId) {
        Limit storage limit = limits[limitId];

        // 重置窗口
        if (block.timestamp >= limit.lastCallTime[msg.sender] + limit.window) {
            limit.callCount[msg.sender] = 0;
            limit.lastCallTime[msg.sender] = block.timestamp;
        }

        require(limit.callCount[msg.sender] < limit.maxCalls, "Rate limit exceeded");

        limit.callCount[msg.sender]++;
        _;
    }
}
```

#### 使用场景

- 限制铸造频率
- 防止刷交易
- API 调用限制
- 投票频率控制

#### 配置建议

```solidity
// 每小时最多 5 次铸造
setLimit(MINT_LIMIT, 5, 1 hours);

// 每天最多 10 次投票
setLimit(VOTE_LIMIT, 10, 1 days);

// 每分钟最多 20 次交易
setLimit(TRADE_LIMIT, 20, 1 minutes);
```

### 8. 徽章模式（Badge）

#### 基本实现

```solidity
contract Badge {
    struct BadgeInfo {
        string name;
        string description;
        string image;
        bool exists;
    }

    mapping(uint256 => BadgeInfo) public badges;
    mapping(uint256 => mapping(address => bool)) public hasBadge;

    function createBadge(
        uint256 badgeId,
        string memory name,
        string memory description
    ) external onlyOwner {
        badges[badgeId] = BadgeInfo(name, description, "", true);
    }

    function awardBadge(uint256 badgeId, address recipient) external onlyOwner {
        hasBadge[badgeId][recipient] = true;
    }
}
```

#### 使用场景

- 早期贡献者徽章
- 活跃用户奖励
- 成就系统
- DAO 治理权限

## 🎨 模式组合实战

### 健壮的代币合约

```solidity
contract RobustToken is
    Pausable,           // 可暂停
    Ownable,            // 所有权管理
    ReentrancyGuard,    // 防重入
    AccessControl       // 基于角色的访问控制
{
    // 组合多种模式的强大功能
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)  // 需要铸造角色
        nonReentrant           // 防重入
        whenNotPaused         // 未暂停
    {
        // ...
    }
}
```

### 完整的 NFT 市场

```solidity
contract NFTMarketplace is
    Ownable,
    Pausable,
    ReentrancyGuard,
    FeeCollector
{
    // 白名单 + 速率限制
    Whitelist public whitelist;
    RateLimiter public rateLimiter;

    function listItem(uint256 tokenId, uint256 price)
        external
        whenNotPaused
        nonReentrant
        rateLimit(LISTING_LIMIT)
    {
        // ...
    }

    function buyItem(uint256 tokenId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        // 自动收取费用
        uint256 fee = calculateFee(msg.value);

        // 转账给卖家
        uint256 sellerAmount = msg.value - fee;
        payable(seller).transfer(sellerAmount);

        // 转账给费用接收者
        payable(feeRecipient).transfer(fee);
    }
}
```

## 🛡️ 安全最佳实践

### 1. 防御性编程

```solidity
// ✅ 检查所有输入
function transfer(address to, uint256 amount) external {
    require(to != address(0), "Zero address");
    require(amount > 0, "Zero amount");
    require(balanceOf[msg.sender] >= amount, "Insufficient balance");
    // ...
}

// ✅ 使用 SafeMath（Solidity 0.8.x 之前）
// ✅ 或依赖 0.8.x 内置溢出检查
```

### 2. 最小权限原则

```solidity
// ❌ 过度授权
function sensitiveFunction() external {
    // 任何人都可以调用
}

// ✅ 最小权限
function sensitiveFunction() external onlyRole(ADMIN_ROLE) whenNotPaused {
    // 只有管理员在未暂停时可以调用
}
```

### 3. 事件记录

```solidity
// ✅ 记录所有重要操作
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

function transfer(address to, uint256 amount) external {
    // ...
    emit Transfer(msg.sender, to, amount);
}
```

### 4. 紧急机制

```solidity
// ✅ 提供多种应急方案
function pause() external onlyOwner { }
function emergencyWithdraw() external onlyOwner whenPaused { }
function rescueTokens(address token) external onlyOwner { }
```

## 🧪 测试建议

### 1. 权限测试

```javascript
it("不应该允许非所有者调用所有者函数", async function () {
    await expect(
        contract.connect(user).ownerOnlyFunction()
    ).to.be.revertedWith("Not owner");
});
```

### 2. 暂停测试

```javascript
it("暂停后应该阻止关键操作", async function () {
    await contract.pause();
    await expect(
        contract.sensitiveOperation()
    ).to.be.revertedWith("Paused");
});
```

### 3. 重入测试

```javascript
it("应该防止重入攻击", async function () {
    // 使用恶意合约测试
    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await Attacker.deploy(contract.address);
    // ...
});
```

## 📊 模式选择指南

| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| 简单合约 | Ownable + Pausable | 简单有效 |
| DeFi 协议 | AccessControl + Timelock + ReentrancyGuard | 高安全性 |
| NFT 项目 | Ownable + Whitelist + Pausable | 平衡安全与便利 |
| DAO | AccessControl + Voting + Timelock | 治理需求 |
| 市场 | ReentrancyGuard + FeeCollector + Pausable | 交易安全 |

## 🎓 课后练习

### 基础题（必做）

1. **多重签名钱包**
   - 使用 AccessControl 实现多签
   - N/M 签名要求
   - 添加时间锁

2. **VIP 系统**
   - 实现 Bronze/Silver/Gold 等级
   - 不同等级不同权限
   - 使用 Badge 模式

3. **防刷交易**
   - 实现速率限制
   - 添加白名单
   - 收取交易费用

### 进阶题（选做）

1. **渐进式权限**
   - 根据持有时间增加权限
   - 动态调整访问级别
   - 实现权重投票

2. **紧急响应系统**
   - 多级暂停机制
   - 自动触发条件
   - 渐进式恢复

3. **组合模式 DApp**
   - 整合至少 5 种模式
   - 实现完整业务逻辑
   - 编写全面测试

## 🔗 常见问题

### Q1: Ownable 和 AccessControl 如何选择？
**A**:
- **Ownable**：简单项目，单一管理员
- **AccessControl**：复杂项目，多角色管理
- 可以同时使用：Owner 拥有 ADMIN_ROLE

### Q2: 暂停功能会增加多少 Gas？
**A**:
- 修饰器检查：~200 gas
- 对于非频繁操作，成本可忽略
- 安全价值远超 Gas 成本

### Q3: 防重入修饰器可以防止所有重入攻击吗？
**A**:
- 只能防止函数级别的重入
- 还需要遵循 Checks-Effects-Interactions
- 避免外部调用改变状态

### Q4: 速率限制的最佳窗口期是多久？
**A**:
- 取决于操作类型
- 铸造：1小时-1天
- 交易：1分钟-1小时
- 投票：1天-7天

### Q5: 如何测试紧急暂停？
**A**:
1. 正常操作验证
2. 暂停后验证阻止
3. 恢复后验证恢复
4. 测试受影响/不受影响功能

## 📚 延伸阅读

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Solidity Security Patterns](https://github.com/ConsenSys/smart-contract-best-practices)
- [Reentrancy Attack Explained](https://quantstamp.com/blog/how-to-secure-your-smart-contracts-from-reentrancy-attacks)

## ✅ 课程总结

恭喜你完成了设计模式的全部课程！现在你：

- ✅ 掌握了工厂模式
- ✅ 理解了代理模式
- ✅ 学会了状态机设计
- ✅ 熟悉了时间锁机制
- ✅ 精通了常用模式组合

### 下一步学习建议

1. **实战项目**
   - 构建完整的 DeFi 协议
   - 开发 NFT 市场
   - 实现 DAO 治理系统

2. **深入学习**
   - Gas 优化技巧
   - 安全审计方法
   - 形式化验证

3. **社区贡献**
   - 开源项目贡献
   - 安全研究
   - 知识分享

---

**恭喜你完成了第三阶段的学习！**

**继续前进，成为 Web3 开发专家！** 🚀🎉

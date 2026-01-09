# Lesson 22: 高级安全主题 - 深入防御策略

## 📚 课程概述

本课深入探讨更复杂的智能合约安全主题,包括闪电贷攻击、价格操纵、签名重放、时间操纵等高级攻击向量及其防护策略。

## 🎯 学习目标

- ✅ 理解闪电贷攻击原理
- ✅ 防范价格操纵攻击
- ✅ 实现安全的签名验证
- ✅ 防止时间操纵攻击
- ✅ 使用时间锁机制
- ✅ 设计综合安全策略

## ⚡ 闪电贷攻击

### 什么是闪电贷?

闪电贷是一种无需抵押的即时借贷,只要在同一笔交易内归还即可。攻击者利用这一点操纵协议状态。

### 攻击流程

```
1. 借入大量资金(闪电贷)
2. 操纵价格(DEX 交易)
3. 利用操纵后的价格借出更多资金
4. 归还闪电贷
5. 保留利润
```

### 防护策略

```solidity
// ✅ 使用时间加权平均价格(TWAP)
uint256 public priceTimestamp;
uint256 public cachedPrice;
uint256 public constant PRICE_UPDATE_DELAY = 1 hours;

function updatePrice() public {
    require(block.timestamp >= priceTimestamp + PRICE_UPDATE_DELAY);
    uint256 newPrice = secureOracle.getLatestPrice();
    
    // 限制价格变化幅度
    uint256 priceChange = (newPrice > cachedPrice) ? 
        (newPrice - cachedPrice) * 100 / cachedPrice :
        (cachedPrice - newPrice) * 100 / cachedPrice;
    require(priceChange <= 10, "Price change too large");
    
    cachedPrice = newPrice;
    priceTimestamp = block.timestamp;
}
```

## 🔐 签名重放攻击

### 攻击原理

攻击者重复使用有效的签名来多次执行操作。

### 防护措施

```solidity
// ✅ 使用 nonce
mapping(address => uint256) public nonces;

// ✅ 包含链 ID
uint256 public chainId = block.chainid;

// ✅ 签名包含所有关键信息
function withdrawWithSignature(
    uint256 _amount,
    uint256 _nonce,
    bytes memory _signature
) public {
    bytes32 messageHash = keccak256(abi.encodePacked(
        address(this),
        chainId,
        _amount,
        _nonce
    ));
    
    address signer = recoverSigner(messageHash, _signature);
    require(nonces[signer] == _nonce, "Invalid nonce");
    
    nonces[signer] = _nonce + 1;
    // 执行取款...
}

// ✅ 记录已使用的签名
mapping(bytes32 => bool) public usedSignatures;
```

## ⏰ 时间操纵攻击

### 攻击向量

- `block.timestamp` - 矿工可操纵
- `block.number` - 可预测

### 解决方案: 承诺-揭示模式

```solidity
contract CommitRevealLottery {
    mapping(address => bytes32) public commits;
    
    // 阶段1: 提交承诺
    function commit(bytes32 _commitHash) public {
        commits[msg.sender] = _commitHash;
    }
    
    // 阶段2: 揭示真实值
    function reveal(uint256 _value, bytes32 _secret) public {
        bytes32 computedHash = keccak256(abi.encodePacked(msg.sender, _value, _secret));
        require(commits[msg.sender] == computedHash, "Invalid reveal");
        // 处理揭示的值...
    }
}
```

## 🔒 时间锁机制

### 时间锁的作用

- 延迟关键操作执行
- 给用户反应时间
- 防止突发攻击

### 实现

```solidity
contract Timelock {
    uint256 public timelock;
    uint256 public constant TIMELOCK_DURATION = 2 days;
    
    function initiateOwnershipTransfer(address _newOwner) public onlyOwner {
        proposedOwner = _newOwner;
        timelock = block.timestamp + TIMELOCK_DURATION;
    }
    
    function acceptOwnership() public {
        require(msg.sender == proposedOwner);
        require(block.timestamp >= timelock, "Timelock not expired");
        owner = proposedOwner;
    }
}
```

## 🛡️ 综合安全策略

### 多层防御

```solidity
contract SecureVault is 
    Ownable, 
    ReentrancyGuard, 
    Pausable 
{
    modifier onlyOwner() { /* ... */ }
    modifier noReentrant() { /* ... */ }
    modifier whenNotPaused() { /* ... */ }
    modifier timelocked() { /* ... */ }
    
    function sensitiveFunction() public 
        onlyOwner 
        noReentrant 
        whenNotPaused 
        timelocked 
    {
        // 多重保护
    }
}
```

## 🎓 课后练习

### 基础题

1. 实现防闪电贷攻击的借贷协议
2. 添加 nonce 的签名验证
3. 实现承诺-揭示模式

### 进阶题

1. 综合安全金库
2. 多签+时间锁组合
3. 紧急暂停机制

## 📚 延伸阅读

- [Flash Loan Attacks Explained](https://blog.openzeppelin.com/flash-loans/)
- [Chainlink Price Feeds](https://docs.chain.link/docs/get-the-latest-price/)
- [EIP-4361: Sign In With Ethereum](https://eips.ethereum.org/EIPS/eip-4361)

## ✅ 课程检查清单

- [ ] 理解闪电贷攻击原理
- [ ] 掌握价格操纵防护
- [ ] 实现安全的签名验证
- [ ] 使用承诺-揭示模式
- [ ] 实施时间锁机制
- [ ] 设计多层防御策略

---

**下一课预告**: Gas 优化进阶 - 深入学习高级 Gas 优化技巧!

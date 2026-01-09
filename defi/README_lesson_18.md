# 📘 Lesson 18: 借贷协议 (Lending Protocol)

## 📚 课程概述

本课程深入讲解 DeFi 借贷协议的核心机制，通过实现一个简化的 Aave/Compound 风格的借贷池合约，你将理解：

- 借贷协议的基本原理和架构
- 抵押率和清算机制
- 利息计算和复利累积
- 存款凭证代币（如 aToken、cToken）
- 清算激励和风险管理

## 🎯 学习目标

完成本课程后，你将能够：

1. ✅ 理解借贷协议的运作机制
2. ✅ 掌握抵押率、清算阈值的计算
3. ✅ 实现利息累积和复利计算
4. ✅ 开发清算机制和罚金系统
5. ✅ 设计存款凭证代币系统
6. ✅ 防范借贷协议的常见安全漏洞
7. ✅ 优化 Gas 成本和用户体验

## 🔑 核心概念

### 1. 借贷协议基本原理

**传统借贷：**
```
借款人 → 银行 → 存款人
         ↓
      利差收益
```
- ❌ 中心化信任
- ❌ 信用评分要求
- ❌ 地理限制

**DeFi 借贷：**
```
借款人 ← 智能合约 → 存款人
         ↓
      协议费用（通常很低）
```
- ✅ 无需许可
- ✅ 过度抵押（无需信用）
- ✅ 全球开放
- ✅ 24/7 运行

### 2. 抵押率（Collateral Factor）

抵押率决定可以借多少资产：

```
最大借款额度 = 存款金额 × 抵押率

例如：
- 存入 1000 USDT
- 抵押率 = 75%
- 可借额度 = 1000 × 75% = 750 USDT
```

**常见抵押率：**
- 稳定币（USDT、USDC）：75-80%
- 主流币（ETH、WBTC）：70-75%
- 波动币（LINK、UNI）：60-65%

### 3. 清算机制

当借款人的健康度下降到危险水平时，触发清算：

**健康度计算：**
```
健康度 = (存款价值 × 抵押率) / 借款价值

例如：
- 存入 1000 USDT（价值 $1000）
- 借款 800 USDT（价值 $800）
- 抵押率 = 75%
- 健康度 = (1000 × 0.75) / 800 = 0.9375 = 93.75%
```

**清算阈值：**
- 通常设置为 80-85%
- 当健康度 < 阈值时，任何人可以清算
- 清算人替借款人还款，获得抵押品 + 罚金

**清算流程：**
```
1. 检查健康度 < 清算阈值
2. 清算人还款（最多清算债务的 50%）
3. 获得抵押品 = 还款金额 × (1 + 清算罚金)
4. 罚金通常为 5-10%

示例：
- 还款：100 USDT
- 罚金：5%
- 获得抵押品：100 × 1.05 = 105 USDT
```

### 4. 利息计算

**复利机制：**

每个区块累积利息：
```
每个区块利息 = 总借款 × 借款利率

借款指数（Borrow Index）：
initialIndex = 1e18
currentIndex = initialIndex × (1 + 总利息 / 总借款)
```

**用户借款余额计算：**
```
用户借款余额 = 本金 × (当前指数 / 用户存款时的指数)

示例：
- 存款时指数 = 1e18
- 当前指数 = 1.05e18（增加了 5%）
- 用户本金 = 1000
- 当前余额 = 1000 × 1.05 / 1 = 1050
```

### 5. 存款凭证代币

存款凭证代币（如 aToken、cToken）代表：

```
1. 存款证明
2. 利息累积
3. 抵押品权益
4. 可转账资产
```

**特点：**
- 1:1 比例铸造（1 存款 = 1 代币）
- 自动复利（代币价值增加）
- 可在其他协议使用（如作为抵押品）

## 📝 合约核心功能

### 1. 存款（Deposit）

```solidity
function deposit(uint256 amount) external returns (uint256) {
    // 1. 转入资产
    asset.transferFrom(msg.sender, address(this), amount);

    // 2. 铸造存款凭证代币
    _mint(msg.sender, amount);

    // 3. 更新账户
    accounts[msg.sender].principal += amount;

    return amount;
}
```

**特点：**
- 即时到账
- 立即开始赚取利息
- 可作为抵押品借款

### 2. 借款（Borrow）

```solidity
function borrow(uint256 amount) external returns (uint256) {
    // 1. 更新借款余额（含利息）
    updateBorrowBalance(msg.sender);

    // 2. 检查借款额度
    uint256 capacity = getBorrowCapacity(msg.sender);
    require(currentBorrow + amount <= capacity, "超出额度");

    // 3. 转出资产
    asset.transfer(msg.sender, amount);

    // 4. 更新总借款
    totalBorrows += amount;

    return amount;
}
```

**借款条件：**
- ✅ 有足够存款作为抵押
- ✅ 借款不超过抵押额度
- ✅ 合约有足够流动性

### 3. 还款（Repay）

```solidity
function repay(uint256 amount) external returns (uint256) {
    // 1. 更新借款余额
    updateBorrowBalance(msg.sender);

    // 2. 计算实际还款（不能超过总债务）
    uint256 actualRepay = min(amount, totalDebt);

    // 3. 转入资产
    asset.transferFrom(msg.sender, address(this), actualRepay);

    // 4. 减少借款
    account.borrowBalance -= actualRepay;

    return actualRepay;
}
```

### 4. 清算（Liquidate）

```solidity
function liquidate(address borrower, uint256 repayAmount)
    external returns (uint256) {

    // 1. 检查清算条件
    uint256 healthFactor = getHealthFactor(borrower);
    require(healthFactor < liquidationThreshold, "未达到清算条件");

    // 2. 计算抵押品（含罚金）
    uint256 collateral = repayAmount * (1 + liquidationBonus);

    // 3. 清算人还款
    repayInternal(borrower, repayAmount);

    // 4. 转移抵押品给清算人
    transferCollateral(borrower, msg.sender, collateral);

    return collateral;
}
```

### 5. 利息累积（Accrue Interest）

```solidity
function accrueInterest() public {
    // 1. 计算经过的区块数
    uint256 blockDelta = block.number - accrualBlockNumber;

    // 2. 计算利息
    uint256 interest = totalBorrows * borrowRatePerBlock * blockDelta;

    // 3. 更新借款指数
    borrowIndex += (interest * RATE_SCALE) / totalBorrows;

    // 4. 更新总借款
    totalBorrows += interest;

    // 5. 更新区块号
    accrualBlockNumber = block.number;
}
```

## 💡 实用技巧

### 计算健康度

```javascript
async function getHealthFactor(user) {
    const [principal, borrowBalance] = await lendingPool.getUserAccount(user);
    const collateralFactor = await lendingPool.collateralFactor();

    const healthFactor = (principal * collateralFactor) / borrowBalance;
    return healthFactor;
}

// 健康度 < 1 = 危险
// 健康度 > 1.5 = 安全
```

### 监控清算风险

```javascript
// 定期检查健康度
setInterval(async () => {
    const healthFactor = await getHealthFactor(userAddress);

    if (healthFactor < 1.2) {
        console.log("⚠️ 警告：健康度接近清算阈值！");
        // 发送通知或自动补充抵押品
    }
}, 60000); // 每分钟检查
```

### 最优借款策略

```javascript
// 保持健康度在 1.3-1.5 之间
const optimalHealthFactor = 1.4;

async function calculateOptimalBorrow(depositAmount) {
    const maxBorrow = depositAmount * 0.75; // 75% 抵押率
    const optimalBorrow = maxBorrow / optimalHealthFactor;

    return optimalBorrow;
}
```

### 清算机器人

```javascript
// 监控可清算账户
async function checkLiquidationOpportunities() {
    const users = await getAllUsers();

    for (const user of users) {
        const healthFactor = await getHealthFactor(user);

        if (healthFactor < liquidationThreshold) {
            console.log(`发现清算机会：${user}`);
            await liquidate(user, repayAmount);
        }
    }
}
```

## ⚠️ 安全注意事项

### 1. 重入攻击防护

```solidity
// ✅ 使用 ReentrancyGuard
function withdraw(uint256 amount) external nonReentrant {
    // 1. 先更新状态
    _burn(msg.sender, amount);

    // 2. 再进行外部调用
    asset.transfer(msg.sender, amount);
}
```

### 2. 利息累积检查

```solidity
// ✅ 每次交互前累积利息
function borrow(uint256 amount) external {
    accrueInterest(); // 确保利息是最新的
    updateBorrowBalance(msg.sender);
    // ...
}
```

### 3. 清算保护

```solidity
// ✅ 限制单次清算数量（最多 50%）
uint256 maxRepay = totalDebt / 2;
uint256 actualRepay = min(repayAmount, maxRepay);

// ✅ 防止清算自己的账户
require(borrower != msg.sender, "不能清算自己");
```

### 4. 溢出检查

```solidity
// ✅ Solidity 0.8+ 内置溢出检查
// ✅ 手动检查关键计算
require(totalBorrows + interest >= totalBorrows, "溢出");
```

### 5. 权限控制

```solidity
// ✅ 使用 Ownable 保护管理员功能
function setCollateralFactor(uint256 _factor) external onlyOwner {
    require(_factor <= 100, "无效的抵押率");
    collateralFactor = _factor;
}
```

## 🧪 测试要点

### 1. 基础功能测试

- ✅ 存款和提款
- ✅ 借款和还款
- ✅ 利息计算
- ✅ 清算机制

### 2. 边界条件测试

- ✅ 零数量输入
- ✅ 超大数量操作
- ✅ 流动性不足
- ✅ 借款额度计算

### 3. 安全测试

- ✅ 重入攻击
- ✅ 溢出攻击
- ✅ 权限绕过
- ✅ 清算操纵

### 4. 利率测试

- ✅ 利息累积准确性
- ✅ 复利计算正确性
- ✅ 利率调整影响

## 📊 Gas 优化建议

1. **使用 uint256**
   ```solidity
   // ✅ 明确使用 uint256
   uint256 public totalBorrows;
   ```

2. **缓存状态变量**
   ```solidity
   // ✅ 缓存到内存
   uint256 _totalBorrows = totalBorrows;
   uint256 _borrowIndex = borrowIndex;
   ```

3. **批量操作**
   ```solidity
   // ✅ 提供批量函数减少交易次数
   function depositAndBorrow(
       uint256 depositAmount,
       uint256 borrowAmount
   ) external {
       deposit(depositAmount);
       borrow(borrowAmount);
   }
   ```

## 🚀 进阶主题

### 1. 利率模型

**分段利率：**
```
低利用率（< 80%）：低利率（2%）
中利用率（80-90%）：中利率（5%）
高利用率（> 90%）：高利率（15%）
```

### 2. 多资产抵押

支持使用多种资产作为抵押品：
```
- ETH 抵押借 USDT
- WBTC 抵押借 USDC
- 混合抵押品池
```

### 3. 借贷分层

- **安全层**：低利率，高抵押率
- **风险层**：高利率，低抵押率
- **隔离借贷**：特定资产独立借贷池

### 4. 流动性挖矿

奖励流动性提供者：
```
- 存款挖矿：获得协议代币奖励
- 借款挖矿：借款也能获得奖励
- 清算挖矿：清算获得额外奖励
```

## 📚 参考资源

- [Aave 协议文档](https://docs.aave.com/)
- [Compound 协议文档](https://compound.finance/docs)
- [借贷协议白皮书](https://compound.finance/documents/Compound.Whitepaper.pdf)

## 🎓 练习题

1. **基础练习**
   - 实现简单的借贷池
   - 测试存款和借款
   - 实现清算功能

2. **进阶练习**
   - 实现分段利率模型
   - 添加多资产支持
   - 实现流动性挖矿

3. **挑战练习**
   - 优化 Gas 成本
   - 实现闪电贷功能
   - 添加预言机价格喂价

## ✅ 总结

借贷协议是 DeFi 的基石，提供了：

1. ✅ **无需许可的借贷**
2. ✅ **自动化的清算机制**
3. ✅ **透明的利息计算**
4. ✅ **灵活的抵押品管理**

掌握借贷协议的设计和实现，为构建更复杂的 DeFi 产品打下基础。

---

**下一步：** 📘 Lesson 19 - 收益聚合器

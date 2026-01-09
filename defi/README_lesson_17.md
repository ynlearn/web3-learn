# 📘 Lesson 17: DEX 原理 - AMM (自动做市商)

## 📚 课程概述

本课程深入讲解去中心化交易所（DEX）的核心技术 - 自动做市商（AMM）。通过实现一个简化的 Uniswap V2 风格的 AMM 合约，你将理解：

- AMM 的核心原理和数学基础
- 恒定乘积公式（x * y = k）
- 流动性提供者（LP）代币机制
- 代币交换的价格计算和滑点
- 手续费机制和收益分配

## 🎯 学习目标

完成本课程后，你将能够：

1. ✅ 理解 AMM vs 订单簿模型的区别
2. ✅ 掌握恒定乘积公式的数学原理
3. ✅ 实现流动性添加和移除功能
4. ✅ 计算代币交换的价格和滑点
5. ✅ 理解 LP 代币的铸造和销毁机制
6. ✅ 实现手续费收取和分配
7. ✅ 防止常见的安全漏洞（重入攻击等）

## 🔑 核心概念

### 1. AMM vs 订单簿

**传统订单簿模型：**
```
买单 (Bids)              卖单 (Asks)
100 USDT 买 1 ETH    ←    105 USDT 卖 1 ETH
99 USDT 买 1 ETH     ←    106 USDT 卖 1 ETH
98 USDT 买 1 ETH     ←    107 USDT 卖 1 ETH
```
- ❌ 需要对手盘才能成交
- ❌ 流动性分散在多个价格点
- ❌ 用户体验复杂

**AMM 模型：**
```
流动性池：
┌─────────────────────────────┐
│  Token0: 1000               │
│  Token1: 2000               │
│  价格: 1 Token0 = 2 Token1  │
└─────────────────────────────┘
```
- ✅ 随时交易，无需对手盘
- ✅ 所有流动性集中在一个池子
- ✅ 用户体验简单

### 2. 恒定乘积公式

核心公式：**x * y = k**

其中：
- x = Token0 储备量
- y = Token1 储备量
- k = 常数（总流动性）

**示例计算：**

初始状态：
- Token0: 1000
- Token1: 2000
- k = 1000 × 2000 = 2,000,000

用户存入 100 Token0，想要换出 Token1：

```
新状态：
- Token0: 1000 + 100 = 1100
- Token1: 2000 - y = ?
- k = 1100 × (2000 - y) = 2,000,000

解得：
2000 - y = 2,000,000 / 1100
y = 2000 - 1818.18
y ≈ 181.82
```

用户得到约 181.82 个 Token1。

**重要特性：**
1. ✅ **无限流动性**：即使储备很少也能交易
2. ✅ **自动定价**：价格由数学公式决定
3. ⚠️ **滑点**：交易量越大，价格越不利
4. ⚠️ **无常损失**：价格偏离会导致流动性提供者损失

### 3. LP 代币机制

LP 代币代表流动性提供者在池子中的份额。

**首次添加流动性：**
```
用户存入：
- 1000 Token0
- 2000 Token1

获得 LP 代币：
liquidity = sqrt(1000 × 2000) - MINIMUM_LIQUIDITY
          = sqrt(2,000,000) - 1000
          ≈ 1412 LP Tokens
```

**后续添加流动性：**
```
当前储备：
- Reserve0 = 1000
- Reserve1 = 2000
- Total Supply = 1412

用户再存入：
- 100 Token0（按比例应该存 200 Token1）

计算 LP 代币：
liquidity = (100 / 1000) × 1412
          = 141.2 LP Tokens
```

### 4. 手续费机制

每次交换收取 **0.3%** 手续费：

```
输入数量：100 Token0
手续费扣除：100 × 0.997 = 99.7 Token0

计算输出：
amountOut = (reserve1 × 99.7) / (reserve0 + 99.7)
         = (2000 × 99.7) / (1000 + 99.7)
         ≈ 181.33 Token1
```

手续费收益：
- 增加池子的 k 值
- 所有 LP 提供者按份额受益
- 移除流动性时获得更多代币

## 📝 合约核心功能

### 1. 添加流动性（Mint）

```solidity
function addLiquidity(
    uint256 amount0Desired,
    uint256 amount1Desired,
    uint256 amount0Min,
    uint256 amount1Min
) returns (uint256 amount0, uint256 amount1, uint256 liquidity)
```

**首次添加：**
- 自由定价
- 锁定 1000 最小流动性（不可赎回）

**后续添加：**
- 必须按当前储备比例
- 自动退还多余代币
- 按比例铸造 LP 代币

### 2. 移除流动性（Burn）

```solidity
function removeLiquidity(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min
) returns (uint256 amount0, uint256 amount1)
```

计算逻辑：
```
amount0 = (liquidity / totalSupply) × reserve0
amount1 = (liquidity / totalSupply) × reserve1
```

### 3. 代币交换（Swap）

```solidity
function swap0For1(uint256 amount0In, uint256 amount1Min)
    returns (uint256 amount1Out)
```

价格计算（含手续费）：
```solidity
uint256 amount0InWithFee = amount0In * 997 / 1000;
amount1Out = (reserve1 * amount0InWithFee) / (reserve0 + amount0InWithFee);
```

### 4. 价格查询

```solidity
function getAmount0Out(uint256 amountIn)
    external view returns (uint256 amountOut)
```

无需实际交换，即可预测输出数量。

## 💡 实用技巧

### 滑点保护

设置最小输出量，避免大额交易的滑点损失：

```javascript
// 计算预期输出
const expectedOut = await pair.getAmount0Out(amountIn);

// 设置 1% 滑点容忍
const minOut = expectedOut * 99n / 100n;

// 执行交换
await pair.swap0For1(amountIn, minOut);
```

### 流动性添加策略

```javascript
// 1. 查询当前比例
const [reserve0, reserve1] = await pair.getReserves();
const ratio = reserve1 * 1e18 / reserve0;

// 2. 计算需要存入的数量
const amount0 = ethers.parseEther("100");
const amount1 = amount0 * ratio / 1e18;

// 3. 添加流动性
await pair.addLiquidity(amount0, amount1, 0, 0);
```

### 无常损失计算

```javascript
// 当前价格
const currentPrice = reserve1 / reserve0;

// 存入时价格
const depositPrice = deposit1 / deposit0;

// 价格变动
const priceChange = currentPrice / depositPrice;

// 无常损失
// IL = 2 * sqrt(priceChange) / (1 + priceChange) - 1
const IL = 2 * Math.sqrt(priceChange) / (1 + priceChange) - 1;

console.log(`无常损失: ${(IL * 100).toFixed(2)}%`);
```

## ⚠️ 安全注意事项

### 1. 重入攻击防护

```solidity
// ✅ 使用 ReentrancyGuard
function removeLiquidity(...) external nonReentrant {
    // 1. 先更新状态
    _update(newReserve0, newReserve1);

    // 2. 再进行外部调用
    token0.transfer(msg.sender, amount0);
}
```

### 2. 输入验证

```solidity
// ✅ 验证输入数量
require(amount0In > 0, "数量必须大于零");
require(amountOut <= reserve1, "流动性不足");

// ✅ 滑点保护
require(amountOut >= amountOutMin, "滑点过大");
```

### 3. 整数溢出防护

```solidity
// ✅ Solidity 0.8+ 内置溢出检查
// ✅ 使用 SafeMath（如果使用 0.7.x 或更早版本）

// ✅ 检查余额
require(balance0 <= type(uint256).max, "溢出");
```

### 4. 权限控制

```solidity
// ✅ 使用 Ownable 保护敏感操作
function emergencyWithdraw() external onlyOwner {
    // 紧急提取所有代币
}
```

## 🧪 测试要点

### 单元测试覆盖

1. **初始化测试**
   - ✅ 首次添加流动性
   - ✅ 代币对验证
   - ✅ 最小流动性锁定

2. **流动性测试**
   - ✅ 按比例添加
   - ✅ 退还多余代币
   - ✅ 移除流动性
   - ✅ LP 代币计算

3. **交换测试**
   - ✅ 价格计算准确性
   - ✅ 手续费收取
   - ✅ 滑点保护
   - ✅ 储备金更新

4. **边界测试**
   - ✅ 零数量输入
   - ✅ 超大数量交换
   - ✅ 流动性不足

5. **安全测试**
   - ✅ 重入攻击防护
   - ✅ 溢出检查
   - ✅ 权限控制

## 📊 Gas 优化建议

1. **使用 uint256 而非 uint**
   ```solidity
   // ✅ 明确使用 uint256
   uint256 public reserve0;

   // ❌ 避免使用 uint
   uint public reserve0;
   ```

2. **缓存状态变量**
   ```solidity
   // ✅ 缓存到内存
   uint256 _reserve0 = reserve0;
   uint256 _reserve1 = reserve1;

   // ❌ 避免重复读取 SLOAD
   uint256 result = reserve0 * reserve1 / reserve0;
   ```

3. **使用 calldata**
   ```solidity
   // ✅ 外部函数使用 calldata
   function addLiquidity(uint256 calldata amount0) external {

   // ❌ 避免使用 memory
   function addLiquidity(uint256 memory amount0) external {
   ```

## 🚀 进阶主题

1. **集中流动性（Uniswap V3）**
   - 允许流动性提供者选择价格区间
   - 提高资本效率
   - 更复杂的管理

2. **多跳路由**
   - 通过中间代币实现间接交换
   - 例如：USDT → USDC → ETH

3. **闪电贷**
   - 无抵押借贷
   - 在同一交易内还款
   - 套利和清算

4. **稳定币优化**
   - Curve 的稳定币互换算法
   - 更低的滑点

## 📚 参考资源

- [Uniswap V2 白皮书](https://uniswap.org/whitepaper.pdf)
- [Uniswap V2 合约代码](https://github.com/Uniswap/v2-core)
- [恒定乘积 AMM 详解](https://docs.uniswap.org/protocol/introduction)

## 🎓 练习题

1. **基础练习**
   - 实现一个简单的 AMM 合约
   - 测试添加/移除流动性
   - 测试代币交换

2. **进阶练习**
   - 添加手续费率可配置功能
   - 实现流动性挖矿奖励
   - 添加价格预言机功能

3. **挑战练习**
   - 实现多跳路由
   - 添加集中流动性功能
   - 实现闪电贷支持

## ✅ 总结

AMM 是 DeFi 的核心创新之一，通过数学公式实现了：

1. ✅ **无需对手盘**的即时交易
2. ✅ **自动定价**的市场机制
3. ✅ **被动收入**的流动性提供
4. ✅ **去中心化**的交易体验

掌握 AMM 原理是理解 DeFi 的关键，为后续学习借贷、衍生品等高级协议打下坚实基础。

---

**下一步：** 📘 Lesson 18 - 借贷协议

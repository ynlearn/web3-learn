# Lesson 13: 状态机模式 - 让智能合约有条理地运转

## 📚 课程概述

状态机模式是智能合约设计中最重要、最常用的模式之一。它通过明确定义状态和状态转换规则，让合约的行为变得可预测、可验证、可审计。本课将深入讲解状态机在智能合约中的应用，包括订单系统、投票治理、众筹平台等实际场景。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解状态机模式的核心概念
- ✅ 掌握枚举（Enum）在状态定义中的使用
- ✅ 实现完整的状态转换逻辑
- ✅ 使用修改器（Modifier）进行状态验证
- ✅ 设计订单、投票、众筹等业务状态机
- ✅ 遵循状态机最佳实践
- ✅ 避免常见的状态机安全漏洞

## 📝 什么是状态机模式？

### 基本概念

**状态机（State Machine）** 是一种行为模型，它包含：

1. **状态（State）**：系统在特定时刻的情况
2. **转换（Transition）**：从一个状态到另一个状态的变化
3. **事件（Event）**：触发状态转换的动作
4. **初始状态**：系统启动时的状态
5. **终态（Final State）**：不能转换到其他状态的状态

### 生活中的状态机

**订单系统**：
```
已创建 → 已付款 → 已发货 → 已送达
   ↓         ↓
已取消    已退款
```

**航班状态**：
```
计划起飞 → 登机中 → 起飞 → 飞行中 → 降落 → 已到达
                  ↓
               延误/取消
```

**幽默比喻**：
- 状态机就像你的人生阶段：学生 → 工作党 → 退休人员
- 每个阶段只能做特定的事情，不能跨越
- 一旦退休，就不能再变回学生（通常情况）

### 为什么智能合约需要状态机？

1. **安全性**：防止非法操作
2. **可预测性**：明确的行为规范
3. **可审计性**：清晰的历史记录
4. **用户体验**：避免意外错误
5. **Gas 优化**：提前检查，减少失败交易

## 🔧 核心实现模式

### 1. 使用枚举定义状态

```solidity
// ✅ 推荐：使用枚举
enum OrderState {
    Created,    // 0
    Paid,       // 1
    Shipped,    // 2
    Delivered,  // 3
    Cancelled   // 4
}

OrderState public state;

// ❌ 不推荐：使用魔法数字
uint256 public state; // 0=Created, 1=Paid, ...
```

**为什么使用枚举？**
- 类型安全
- 自文档化
- 编译时检查
- 更容易重构

### 2. 状态转换验证

```solidity
// ✅ 方法1：在函数内验证
function payOrder() external {
    require(state == OrderState.Created, "Invalid state");
    state = OrderState.Paid;
}

// ✅ 方法2：使用修改器
modifier onlyState(OrderState _requiredState) {
    require(state == _requiredState, "Invalid state");
    _;
}

function payOrder() external onlyState(OrderState.Created) {
    state = OrderState.Paid;
}

// ✅ 方法3：验证转换有效性
modifier validTransition(OrderState _newState) {
    require(_isValidTransition(state, _newState), "Invalid transition");
    _;
}

function _isValidTransition(OrderState _current, OrderState _next)
    internal
    pure
    returns (bool)
{
    return (
        (_current == OrderState.Created && _next == OrderState.Paid) ||
        (_current == OrderState.Paid && _next == OrderState.Shipped) ||
        // ... 其他合法转换
    );
}
```

### 3. 触发状态转换事件

```solidity
event StateChanged(
    OrderState indexed oldState,
    OrderState indexed newState,
    address indexed caller
);

function payOrder() external onlyState(OrderState.Created) {
    OrderState oldState = state;
    state = OrderState.Paid;
    emit StateChanged(oldState, state, msg.sender);
}
```

**为什么需要事件？**
- 前端监听状态变化
- 链下系统同步
- 审计和调试
- Gas 优化（事件比存储便宜）

## 📦 实战案例 1：订单状态机

### 状态设计

```solidity
enum OrderState {
    Created,    // 订单创建
    Paid,       // 已付款，资金锁定在合约
    Shipped,    // 已发货
    Delivered,  // 已送达，资金释放给卖家
    Refunded,   // 已退款
    Cancelled   // 已取消
}
```

### 状态转换规则

```solidity
Created → Paid       (买家付款)
Created → Cancelled  (买家/卖家取消)
Paid → Shipped       (卖家发货)
Shipped → Delivered  (买家确认)
Paid → Refunded      (买家申请退款)
Shipped → Refunded   (买家申请退款)
```

### 关键实现

```solidity
function confirmDelivery(uint256 _orderId) external onlyBuyer(_orderId) {
    Order storage order = orders[_orderId];
    require(order.state == OrderState.Shipped, "Order not shipped");

    OrderState oldState = order.state;
    order.state = OrderState.Delivered;

    // 释放资金给卖家
    payable(order.seller).transfer(order.amount);

    emit OrderStateChanged(_orderId, oldState, order.state);
    emit OrderDelivered(_orderId);
}
```

### Gas 分析

| 操作 | Gas 消耗 | 说明 |
|------|----------|------|
| 创建订单 | ~80,000 | 存储新订单 |
| 支付订单 | ~45,000 | 转账 + 状态更新 |
| 确认收货 | ~30,000 | 转账 + 状态更新 |
| 退款 | ~30,000 | 转账 + 状态更新 |

## 🗳️ 实战案例 2：投票状态机

### 状态设计

```solidity
enum ProposalState {
    Draft,      // 草稿阶段
    Active,     // 投票中
    Passed,     // 通过
    Rejected,   // 拒绝
    Executed,   // 已执行
    Expired     // 已过期
}
```

### 投票逻辑

```solidity
function vote(uint256 _proposalId, bool _support) external {
    Proposal storage proposal = proposals[_proposalId];
    require(proposal.state == ProposalState.Active, "Not active");
    require(block.timestamp < proposal.endTime, "Voting ended");
    require(!proposal.hasVoted[msg.sender], "Already voted");

    proposal.hasVoted[msg.sender] = true;
    uint256 weight = votingPower[msg.sender];

    if (_support) {
        proposal.forVotes += weight;
    } else {
        proposal.againstVotes += weight;
    }

    emit Voted(_proposalId, msg.sender, _support, weight);
}
```

### 结果计算

```solidity
function _calculateResult(uint256 _proposalId) internal {
    Proposal storage proposal = proposals[_proposalId];

    uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
    bool passed = totalVotes >= proposal.quorum &&
                  proposal.forVotes > proposal.againstVotes;

    proposal.state = passed ? ProposalState.Passed : ProposalState.Rejected;

    emit ProposalStateChanged(_proposalId, oldState, proposal.state);
}
```

## 💰 实战案例 3：众筹状态机

### 状态设计

```solidity
enum CampaignState {
    Fundraising,  // 筹款中
    Successful,   // 成功（达到目标）
    Failed,       // 失败（未达到目标）
    Claimed,      // 已领取（创建者提款）
    Refunded      // 已退款（贡献者退款）
}
```

### 自动状态转换

```solidity
function contribute(uint256 _campaignId) external payable {
    Campaign storage campaign = campaigns[_campaignId];
    require(campaign.state == CampaignState.Fundraising, "Not fundraising");

    campaign.contributions[msg.sender] += msg.value;
    campaign.pledged += msg.value;

    emit ContributionMade(_campaignId, msg.sender, msg.value);

    // 自动检查是否达到目标
    if (campaign.pledged >= campaign.goal) {
        campaign.state = CampaignState.Successful;
        emit CampaignStateChanged(_campaignId, oldState, campaign.state);
    }
}
```

### 资金管理

```solidity
// 成功时，创建者领取资金
function claimFunds(uint256 _campaignId) external {
    Campaign storage campaign = campaigns[_campaignId];
    require(campaign.creator == msg.sender, "Not creator");
    require(campaign.state == CampaignState.Successful, "Not successful");

    campaign.state = CampaignState.Claimed;
    uint256 amount = campaign.pledged;
    campaign.pledged = 0;

    payable(campaign.creator).transfer(amount);
}

// 失败时，贡献者退款
function refundContribution(uint256 _campaignId) external {
    Campaign storage campaign = campaigns[_campaignId];
    require(campaign.state == CampaignState.Failed, "Not failed");

    uint256 amount = campaign.contributions[msg.sender];
    campaign.contributions[msg.sender] = 0;

    payable(msg.sender).transfer(amount);
}
```

## 🛡️ 最佳实践

### 1. 明确定义所有状态

```solidity
// ✅ 明确的状态定义
enum State {
    Active,
    Paused,
    Closed
}

// ❌ 模糊的状态定义
uint256 public state; // 0=active, 1=paused, 2=closed???
```

### 2. 验证状态转换

```solidity
// ✅ 验证转换
modifier validStateTransition(State _newState) {
    require(_isValidTransition(state, _newState), "Invalid transition");
    _;
}

// ❌ 不验证转换
function changeState(State _newState) external {
    state = _newState; // 任何转换都允许！危险！
}
```

### 3. 使用修改器进行状态检查

```solidity
// ✅ 清晰的状态检查
modifier onlyState(State _required) {
    require(state == _required, "Invalid state");
    _;
}

function criticalFunction() external onlyState(State.Active) {
    // 只有 Active 状态才能执行
}
```

### 4. 触发状态转换事件

```solidity
// ✅ 完整的事件记录
event StateChanged(
    State indexed oldState,
    State indexed newState,
    address indexed caller,
    uint256 timestamp
);

function changeState(State _newState) external {
    State oldState = state;
    state = _newState;
    emit StateChanged(oldState, state, msg.sender, block.timestamp);
}
```

### 5. 提供状态查询函数

```solidity
// ✅ 便捷的状态查询
function isActive() external view returns (bool) {
    return state == State.Active;
}

function isFinalized() external view returns (bool) {
    return state == State.Closed || state == State.Cancelled;
}
```

### 6. 实现紧急暂停机制

```solidity
// ✅ 暂停机制
function pause() external onlyOwner {
    require(state == State.Active, "Not active");
    state = State.Paused;
    emit StateChanged(state, State.Paused, msg.sender);
}

function resume() external onlyOwner {
    require(state == State.Paused, "Not paused");
    state = State.Active;
    emit StateChanged(state, State.Active, msg.sender);
}
```

### 7. 终态保护

```solidity
// ✅ 终态不能转换
modifier notFinalState() {
    require(state != State.Closed, "Already closed");
    _;
}

function someOperation() external notFinalState {
    // 终态无法执行此操作
}
```

## ⚠️ 常见安全漏洞

### 1. 缺少状态验证

```solidity
// ❌ 危险：没有状态检查
function refund() external {
    payable(msg.sender).transfer(address(this).balance);
}

// ✅ 正确：验证状态
function refund() external onlyState(State.Failed) {
    require(contributions[msg.sender] > 0, "No contribution");
    // ...
}
```

### 2. 状态转换绕过

```solidity
// ❌ 危险：可以直接设置状态
function setState(State _newState) external {
    state = _newState;
}

// ✅ 正确：验证转换
function setState(State _newState) external {
    require(_isValidTransition(state, _newState), "Invalid transition");
    state = _newState;
}
```

### 3. 重入攻击

```solidity
// ❌ 危险：状态更新在转账之后
function claimReward() external {
    payable(msg.sender).transfer(reward);
    claimed[msg.sender] = true; // 状态更新在转账后！
}

// ✅ 正确：先更新状态
function claimReward() external {
    require(!claimed[msg.sender], "Already claimed");
    claimed[msg.sender] = true; // 先更新状态
    payable(msg.sender).transfer(reward);
}
```

### 4. 时间依赖漏洞

```solidity
// ❌ 危险：时间窗口攻击
function finalize() external {
    require(block.timestamp >= endTime, "Not ended");
    // 攻击者可以在精确时间操作
}

// ✅ 正确：添加缓冲期
function finalize() external {
    require(block.timestamp >= endTime + 1 hours, "Not ended");
    // 添加缓冲期
}
```

## 📊 状态机设计模式对比

| 模式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 简单枚举 | 简单直接 | 扩展性差 | 少量状态 |
| 状态转换表 | 灵活可配置 | Gas 较高 | 复杂状态逻辑 |
| 层次状态机 | 结构清晰 | 实现复杂 | 大型系统 |
| 事件驱动 | 响应式 | 难以调试 | 异步流程 |

## 🧪 测试建议

### 1. 测试所有状态转换

```javascript
it("应该允许正确的状态转换", async function () {
    await stateMachine.activate();
    expect(await stateMachine.currentState()).to.equal(1);
});

it("应该拒绝无效的状态转换", async function () {
    await expect(stateMachine.complete()).to.be.revertedWith("Invalid state");
});
```

### 2. 测试终态

```javascript
it("终态不应该转换到其他状态", async function () {
    await stateMachine.activate();
    await stateMachine.complete();
    await expect(stateMachine.activate()).to.be.reverted;
});
```

### 3. 测试权限

```javascript
it("只有授权用户才能改变状态", async function () {
    await expect(stateMachine.connect(user).activate())
        .to.be.revertedWith("Not authorized");
});
```

## 🎓 课后练习

### 基础题（必做）

1. **拍卖状态机**
   - 状态：Created → Bidding → Ended → Claimed
   - 实现出价、结束、领取逻辑
   - 添加取消拍卖功能

2. **抵押品状态机**
   - 状态：Active → Liquidated → Redeemed
   - 实现抵押、清算、赎回
   - 添加部分赎回功能

3. **任务状态机**
   - 状态：Created → Assigned → InProgress → Review → Completed
   - 实现任务分配、提交、审核
   - 添加拒绝和重新分配

### 进阶题（选做）

1. **多层次状态机**
   - 实现嵌套状态（如：Order.Processed → Order.Processed.Shipped）
   - 添加子状态转换规则

2. **并行状态机**
   - 支持多个状态同时存在
   - 实现状态同步机制

3. **状态历史记录**
   - 记录所有状态变化历史
   - 提供历史查询接口
   - 优化 Gas 消耗

## 🔗 常见问题

### Q1: 什么时候使用状态机？
**A**: 当你的合约有明确的流程阶段时，如：
- 订单处理
- 投票治理
- 众筹活动
- 拍卖流程
- 贷款生命周期

### Q2: 状态机会增加很多 Gas 吗？
**A**: 不会。状态检查的 Gas 成本很低（~200 gas），远低于失败交易的浪费。

### Q3: 可以同时有多个状态吗？
**A**: 技术上可以（使用位掩码），但不推荐。推荐使用层次状态机或多个独立状态变量。

### Q4: 如何处理状态回滚？
**A**: 设计时要考虑是否允许回滚。如果允许，明确定义哪些转换可以回滚。

### Q5: 状态机和权限控制有什么区别？
**A**:
- **权限控制**：谁能做什么（who）
- **状态机**：什么时候能做什么（when）
- 两者经常配合使用

## 📚 延伸阅读

- [Solidity Enums](https://docs.soliditylang.org/en/v0.8.20/types.html#enums)
- [State Machine Pattern](https://refactoring.guru/design-patterns/state-pattern)
- [OpenZeppelin Crowdsale](https://docs.openzeppelin.com/contracts/4.x/crowdsales)
- [DAO Voting Patterns](https://forum.makerdao.com/tag/governance)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解状态机的基本概念
- [ ] 能够使用枚举定义状态
- [ ] 掌握状态转换验证方法
- [ ] 理解修改器在状态机中的作用
- [ ] 能够实现订单、投票、众筹状态机
- [ ] 了解状态机安全最佳实践
- [ ] 能够测试所有状态转换路径
- [ ] 完成至少一个练习题

---

**下一课预告**：时间锁模式 - 为关键操作添加时间缓冲，提升协议安全性！

**准备好了吗？继续你的 Web3 之旅！** 🚀

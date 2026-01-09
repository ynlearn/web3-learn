# Lesson 09: 事件与日志 - 智能合约的通讯录

## 📚 课程概述

事件（Events）是智能合约与外部世界通信的主要方式。本课将深入学习 Solidity 事件的定义、索引、Gas 优化和前端监听，帮助你构建可追踪、易调试的智能合约系统。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解事件的作用和应用场景
- ✅ 掌握事件的定义和使用
- ✅ 合理使用 indexed 参数
- ✅ 优化事件的 Gas 成本
- ✅ 实现前端事件监听
- ✅ 记录重要的合约操作
- ✅ 设计高效的事件系统

## 🌟 什么是事件？

### 事件的作用

**幽默比喻**：
- 事件就像区块链的"广播系统"
- 合约通过事件发送通知
- 外部世界可以监听这些通知
- 类似于微信公众号推送消息

### 主要用途

1. **记录操作历史**
   - 转账、存款、取款
   - 权限变更
   - 状态更新

2. **前端监听**
   - 实时更新 UI
   - 显示交易确认
   - 通知用户

3. **链下数据存储**
   - 事件日志永久存储
   - 降低链上存储成本
   - 方便数据查询

4. **调试和监控**
   - 追踪合约行为
   - 分析用户操作
   - 监控异常情况

## 📝 事件定义基础

### 基本语法

```solidity
event EventName(
    type1 indexed param1,
    type2 param2,
    type3 indexed param3
);
```

### 简单示例

```solidity
contract SimpleContract {
    // 定义事件
    event ValueChanged(
        address indexed changer,
        uint256 oldValue,
        uint256 newValue
    );

    uint256 public value;

    function setValue(uint256 _newValue) public {
        uint256 oldValue = value;
        value = _newValue;

        // 触发事件
        emit ValueChanged(msg.sender, oldValue, _newValue);
    }
}
```

## 🎯 Indexed 参数

### 什么是 Indexed？

- 最多 3 个 indexed 参数
- indexed 参数可以被过滤和搜索
- 非 indexed 参数只能获取值

### 使用场景

**1. 按地址过滤**：
```solidity
event Transfer(
    address indexed from,
    address indexed to,
    uint256 value
);

// 查询特定地址的所有转账
// 查询：where from = 0x123... 或 where to = 0x123...
```

**2. 按时间过滤**：
```solidity
event Transaction(
    address indexed user,
    uint256 amount,
    uint256 indexed timestamp
);

// 查询特定时间段的交易
// 查询：where timestamp >= start && timestamp <= end
```

**3. 按ID过滤**：
```solidity
event Minted(
    uint256 indexed tokenId,
    address indexed creator,
    string uri
);

// 查询特定 NFT 的铸造记录
// 查询：where tokenId = 123
```

### Indexed 限制

```solidity
// ✅ 正确：最多 3 个 indexed
event CorrectEvent(
    address indexed param1,
    uint256 indexed param2,
    bytes32 indexed param3,
    string param4  // 第 4 个参数不能 indexed
);

// ❌ 错误：超过 3 个 indexed
event WrongEvent(
    address indexed param1,
    uint256 indexed param2,
    bytes32 indexed param3,
    string indexed param4  // 编译错误
);
```

### Indexed vs Non-Indexed

| 特性 | Indexed | Non-Indexed |
|------|---------|-------------|
| 可过滤 | ✅ | ❌ |
| 可搜索 | ✅ | ❌ |
| Gas 成本 | ⚠️ 较高 | ✅ 较低 |
| 数量限制 | 最多 3 个 | 无限制 |
| 数据类型 | 所有类型 | 所有类型 |

**选择建议**：
- 需要过滤 → indexed
- 不需要过滤 → 普通
- 最多 3 个 indexed

## 💰 Gas 优化

### Indexed 的 Gas 成本

```solidity
// 较高成本（2 个 indexed）
event ExpensiveEvent(
    address indexed from,
    address indexed to,
    uint256 value
);
// Gas: ~1500-2000

// 较低成本（1 个 indexed）
event CheaperEvent(
    address indexed from,
    address to,
    uint256 value
);
// Gas: ~1200-1500

// 最低成本（0 个 indexed）
event CheapestEvent(
    address from,
    address to,
    uint256 value
);
// Gas: ~900-1200
```

### 优化策略

**1. 只索引必要的参数**：
```solidity
// ❌ 过度索引
event OverIndexed(
    address indexed from,
    address indexed to,
    uint256 indexed amount,
    uint256 timestamp
);

// ✅ 合理索引
event WellIndexed(
    address indexed from,  // 经常按发送者过滤
    address indexed to,    // 经常按接收者过滤
    uint256 amount,        // 只需要显示值
    uint256 timestamp
);
```

**2. 批量操作汇总事件**：
```solidity
// ❌ 每次操作都发事件
event Transfer(address indexed from, address indexed to, uint256 value);

function batchTransfer(...) public {
    for (uint i = 0; i < 100; i++) {
        emit Transfer(from, to[i], amount[i]); // 100 次事件
    }
}

// ✅ 一次事件记录批量操作
event BatchTransfer(
    address indexed from,
    address[] to,
    uint256[] amounts,
    uint256 total
);

function batchTransfer(...) public {
    // ... 执行转账 ...
    emit BatchTransfer(from, to, amounts, total); // 1 次事件
}
```

**3. 使用哈希代替大字符串**：
```solidity
// ❌ 直接索引大字符串
event LargeStringIndexed(
    address indexed user,
    string indexed largeString  // Gas 高
);

// ✅ 索引哈希值
event HashIndexed(
    address indexed user,
    bytes32 indexed stringHash,  // Gas 低
    string fullString
);

function logEvent(string memory _data) public {
    emit HashIndexed(
        msg.sender,
        keccak256(bytes(_data)),
        _data
    );
}
```

## 🔍 事件监听

### 使用 Ethers.js

```javascript
const { ethers } = require("ethers");

// 连接到合约
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const contract = new ethers.Contract(address, abi, provider);

// 1. 监听所有事件
contract.on("*", (event) => {
    console.log("New event:", event);
});

// 2. 监听特定事件
contract.on("Transfer", (from, to, value, event) => {
    console.log(`Transfer from ${from} to ${to}: ${value}`);
});

// 3. 过滤特定地址的事件
const filter = contract.filters.Transfer(userAddress);
contract.on(filter, (from, to, value) => {
    console.log(`User's transfer: ${value}`);
});

// 4. 查询历史事件
const events = await contract.queryFilter("Transfer", startBlock, endBlock);
events.forEach(event => {
    console.log(event.args);
});

// 5. 取消监听
contract.removeAllListeners();
```

### 使用 Web3.js

```javascript
const Web3 = require("web3");
const web3 = new Web3("http://localhost:8545");
const contract = new web3.eth.Contract(abi, address);

// 1. 监听事件
contract.events.Transfer()
    .on('data', (event) => {
        console.log(event.returnValues);
    })
    .on('error', console.error);

// 2. 过滤事件
contract.events.Transfer({ filter: { from: userAddress } })
    .on('data', (event) => {
        console.log(event);
    });

// 3. 获取历史事件
contract.getPastEvents('Transfer', {
    fromBlock: 1000,
    toBlock: 'latest'
})
    .then(events => console.log(events));
```

## 🏗️ 事件设计模式

### 1. 标准化事件

```solidity
// ERC20 标准事件
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);

// ERC721 标准事件
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
```

### 2. 状态变更事件

```solidity
event StateChanged(
    bytes32 indexed stateKey,
    bytes32 oldValue,
    bytes32 newValue,
    uint256 timestamp
);

function setState(bytes32 _key, bytes32 _value) public {
    bytes32 oldValue = state[_key];
    state[_key] = _value;

    emit StateChanged(_key, oldValue, _value, block.timestamp);
}
```

### 3. 错误事件

```solidity
event ErrorOccurred(
    address indexed user,
    string reason,
    uint256 errorCode,
    uint256 timestamp
);

function riskyOperation() public {
    try someExternalCall() {
        // 成功
    } catch {
        emit ErrorOccurred(
            msg.sender,
            "External call failed",
            500,
            block.timestamp
        );
        revert("Operation failed");
    }
}
```

### 4. 批量操作事件

```solidity
event BatchOperation(
    address indexed operator,
    uint256 operationCount,
    uint256 totalValue,
    bytes32 operationsHash
);

function batchExecute(bytes[] memory _operations) public {
    uint256 totalValue = 0;

    for (uint256 i = 0; i < _operations.length; i++) {
        // ... 执行操作 ...
        totalValue += /* 操作的值 */;
    }

    emit BatchOperation(
        msg.sender,
        _operations.length,
        totalValue,
        keccak256(abi.encodePacked(_operations))
    );
}
```

## 📊 实战示例

### 银行系统事件

```solidity
contract Bank {
    mapping(address => uint256) public balances;

    event Deposited(
        address indexed account,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );

    event Withdrawn(
        address indexed account,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );

    event Transferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 transactionId,
        uint256 timestamp
    );

    function deposit() external payable {
        require(msg.value > 0, "Invalid amount");

        balances[msg.sender] += msg.value;

        emit Deposited(
            msg.sender,
            msg.value,
            balances[msg.sender],
            block.timestamp
        );
    }

    function withdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);

        emit Withdrawn(
            msg.sender,
            _amount,
            balances[msg.sender],
            block.timestamp
        );
    }

    function transfer(address _to, uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        balances[msg.sender] -= _amount;
        balances[_to] += _amount;

        emit Transferred(
            msg.sender,
            _to,
            _amount,
            keccak256(abi.encodePacked(msg.sender, _to, _amount, block.timestamp)),
            block.timestamp
        );
    }
}
```

### NFT 铸造事件

```solidity
contract NFT {
    struct Token {
        uint256 id;
        address creator;
        string uri;
        uint256 createdAt;
    }

    mapping(uint256 => Token) public tokens;

    event Minted(
        uint256 indexed tokenId,
        address indexed creator,
        string uri,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string oldUri,
        string newUri,
        uint256 timestamp
    );

    event Burned(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 timestamp
    );

    function mint(string memory _uri) external {
        uint256 tokenId = ++totalTokens;

        tokens[tokenId] = Token({
            id: tokenId,
            creator: msg.sender,
            uri: _uri,
            createdAt: block.timestamp
        });

        emit Minted(tokenId, msg.sender, _uri, block.timestamp);
    }
}
```

## 🎓 课后练习

### 基础题（必做）

1. **投票系统事件**
   - 投票事件（Voted）
   - 提案创建事件（ProposalCreated）
   - 提案执行事件（ProposalExecuted）

2. **拍卖系统事件**
   - 出价事件（BidPlaced）
   - 拍卖结束事件（AuctionEnded）
   - 资金转移事件（FundsTransferred）

3. **代币系统事件**
   - 转账事件（Transfer）
   - 授权事件（Approval）
   - 铸造事件（Minted）

### 进阶题（选做）

1. **DeFi 协议事件**
   - 添加流动性事件
   - Swap 事件
   - 价格更新事件

2. **DAO 治理事件**
   - 提案事件
   - 投票事件
   - 执行事件

3. **游戏系统事件**
   - 游戏开始/结束
   - 玩家操作
   - 奖励发放

## 🔗 常见问题

### Q1: 事件和存储有什么区别？
**A**:
- 事件：日志数据，不可在合约内读取，Gas 低
- 存储：状态数据，可在合约内读写，Gas 高

### Q2: 最多可以有几个 indexed 参数？
**A**:
- 最多 3 个 indexed 参数
- 其他参数可以是普通类型
- 总参数数量没有限制

### Q3: 事件数据可以被修改吗？
**A**:
- 不可以，事件一旦记录就不可更改
- 这是区块链的不可变性特性
- 只能追加新事件

### Q4: 如何查询历史事件？
**A**:
```javascript
// 使用 Ethers.js
const events = await contract.queryFilter(
    "Transfer",
    startBlock,
    endBlock
);
```

### Q5: 事件会消耗 Gas 吗？
**A**:
- 会，但比存储便宜很多
- 索引参数会增加 Gas 成本
- 批量操作应该汇总事件

## 📚 延伸阅读

- [Solidity 事件文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#events)
- [事件日志](https://docs.soliditylang.org/en/v0.8.20/contracts.html#indexed-event-parameters)
- [Ethers.js 事件监听](https://docs.ethers.io/v5/concepts/events/)
- [事件最佳实践](https://blog.openzeppelin.com/a-gentle-introduction-to-events/

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解事件的作用和用途
- [ ] 掌握事件的定义语法
- [ ] 了解 indexed 参数的使用
- [ ] 理解 Gas 优化技巧
- [ ] 能够实现前端事件监听
- [ ] 掌握事件设计模式
- [ ] 完成至少一个基础练习题

---

**下一课预告**：安全机制基础 - 学习访问控制、防重入攻击等安全措施！

**继续你的 Solidity 之旅！** 🚀

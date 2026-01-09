# Lesson 03: 函数详解 - Solidity 的引擎

## 📚 课程概述

函数是智能合约的"引擎"，执行所有的逻辑和操作。本课将深入讲解 Solidity 函数的各个方面，帮助你编写高效、安全的函数。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解函数可见性的区别和使用场景
- ✅ 掌握 view、pure、payable 修饰符
- ✅ 处理单个和多个返回值
- ✅ 使用 require、revert、assert 进行参数校验
- ✅ 编写自定义错误以节省 Gas
- ✅ 使用修改器实现代码复用
- ✅ 实现函数重载

## 🔍 函数可见性

### 四种可见性级别

| 可见性 | 可调用范围 | 自动生成 Getter | Gas 成本 | 使用场景 |
|--------|-----------|-----------------|----------|----------|
| **public** | 任何人（内部+外部） | ✅ 是 | 较高 | 对外接口 |
| **private** | 仅当前合约 | ❌ 否 | 最低 | 内部辅助函数 |
| **internal** | 合约及子合约 | ❌ 否 | 中等 | 可继承的内部函数 |
| **external** | 仅外部 | ✅ 是 | 最低 | 对外接口（优化） |

### Public vs External

```solidity
// Public 函数
function publicFunction() public {
    // 内部和外部都可调用
}

// External 函数
function externalFunction() external {
    // 仅外部可调用
}

// 内部调用对比
function internalCall() public {
    publicFunction();        // ✅ 内部调用
    // externalFunction();   // ❌ 编译错误
    this.externalFunction(); // ✅ 通过 this 调用（外部调用）
}
```

**选择指南**：
```solidity
// ✅ 推荐：对外接口使用 external（省 Gas）
function getBalance(address _user) external view returns (uint256) {
    return balances[_user];
}

// ✅ 推荐：需要内部调用的函数使用 public
function internalAndExternal() public {
    // 内部和外部都需要调用
}

// ❌ 避免：不需要内部调用的函数使用 public
function onlyExternalCall() public {
    // 没有内部调用，应该用 external
}
```

**Gas 对比**：
```solidity
// External: ~24,000 gas
function externalCall(uint256[] calldata data) external {
    // ...
}

// Public: ~26,000 gas（内部调用更贵）
function publicCall(uint256[] calldata data) public {
    // ...
}
```

**幽默比喻**：
- `public` 就像家门，家人和客人都能进
- `external` 就像快递箱，只能从外面放东西
- `internal` 就像家庭群聊，只有家人能看到
- `private` 就像你的日记，只有你能看

## 🏷️ 函数修饰符

### View 修饰符

```solidity
function getBalance(address _user) public view returns (uint256) {
    return balances[_user]; // ✅ 读取状态
}

function updateBalance() public view {
    // balances[_user] = 100; // ❌ 编译错误：不能修改状态
}
```

**特点**：
- 承诺不修改状态
- 可以读取状态变量
- 不消耗 Gas（链上调用）
- 如果被其他合约调用，会消耗 Gas

### Pure 修饰符

```solidity
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b; // ✅ 不访问状态
}

function pureWrong() public pure {
    // balances[_user]; // ❌ 编译错误：不能读取状态
}
```

**特点**：
- 不读取也不修改状态
- 只使用输入参数和局部变量
- 最严格的修饰符
- Gas 成本最低

**View vs Pure 选择**：
```solidity
// ✅ Pure: 纯计算
function calculate(uint256 a, uint256 b) public pure returns (uint256) {
    return (a + b) * 2;
}

// ✅ View: 需要读取状态
function getBalance() public view returns (uint256) {
    return balances[msg.sender];
}

// ❌ 错误：读取状态却用 pure
function getBalanceWrong() public pure returns (uint256) {
    return balances[msg.sender]; // 编译错误！
}
```

### Payable 修饰符

```solidity
// 可以接收 ETH 的函数
function deposit() public payable {
    balances[msg.sender] += msg.value;
}

// 普通函数无法接收 ETH
function nonPayable() public {
    // 如果发送 ETH 调用此函数，会回滚
}
```

**关键变量**：
- `msg.value`：发送的 ETH 数量
- `msg.sender`：发送者地址
- `address(this).balance`：合约余额

**实战示例**：
```solidity
function buyItem(uint256 itemId) public payable {
    require(msg.value >= itemPrices[itemId], "Insufficient payment");
    
    // 处理购买逻辑
    items[itemId].owner = msg.sender;
    
    // 找零（如果需要）
    uint256 change = msg.value - itemPrices[itemId];
    if (change > 0) {
        payable(msg.sender).transfer(change);
    }
}
```

## 📤 返回值处理

### 单个返回值

```solidity
function getCounter() public view returns (uint256) {
    return counter;
}
```

### 多个返回值

```solidity
function getUser(address _addr) public view returns (
    string memory name,
    uint256 balance,
    bool verified
) {
    return (users[_addr].name, users[_addr].balance, users[_addr].verified);
}

// 调用时解构
function callGetUser() public view {
    (string memory name, uint256 balance, bool verified) = getUser(addr1);
}
```

### 命名返回值

```solidity
function getStats() public view returns (uint256 totalUsers, uint256 activeUsers) {
    totalUsers = users.length;
    activeUsers = activeCount;
    // 自动返回 totalUsers 和 activeUsers
}

// 提前返回
function getBalance(address _user) public view returns (uint256 balance) {
    if (!isUser[_user]) {
        return 0; // balance 默认为 0
    }
    balance = balances[_user];
}
```

**命名返回值的优势**：
```solidity
// ❌ 不清晰
function calculate(uint256 x, uint256 y) public returns (uint256, uint256) {
    return (x + y, x * y);
}

// ✅ 清晰
function calculate(uint256 x, uint256 y) public returns (uint256 sum, uint256 product) {
    sum = x + y;
    product = x * y;
}
```

## ✅ 参数校验

### Require 语句

```solidity
function transfer(address _to, uint256 _amount) public {
    require(_to != address(0), "Invalid address");
    require(_amount > 0, "Amount must be positive");
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    
    balances[msg.sender] -= _amount;
    balances[_to] += _amount;
}
```

**Require 最佳实践**：
```solidity
// ✅ 推荐：先检查所有条件
function safeTransfer(address _to, uint256 _amount) public {
    require(_to != address(0), "Invalid address");
    require(_amount > 0, "Invalid amount");
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    
    // 所有检查通过后执行操作
    balances[msg.sender] -= _amount;
    balances[_to] += _amount;
}

// ❌ 避免：检查和操作混合
function unsafeTransfer(address _to, uint256 _amount) public {
    require(_to != address(0), "Invalid address");
    balances[msg.sender] -= _amount; // 可能在第二个 require 前执行
    require(_amount > 0, "Invalid amount");
}
```

### Revert 语句

```solidity
function withdraw(uint256 _amount) public {
    if (_amount == 0) {
        revert("Amount cannot be zero");
    }
    if (_amount > balances[msg.sender]) {
        revert("Insufficient balance");
    }
    // ...
}
```

**Revert vs Require**：
```solidity
// Require: 简单条件
require(_amount > 0, "Amount must be positive");

// Revert: 复杂逻辑
if (_amount == 0 || _amount > maxAmount || !isValidUser(msg.sender)) {
    revert("Invalid withdrawal parameters");
}
```

### Assert 语句

```solidity
function criticalOperation(uint256 _value) public {
    uint256 oldValue = counter;
    counter += _value;
    
    // 断言：counter 应该增加
    assert(counter > oldValue);
}
```

**Assert 使用场景**：
- 检查不应该失败的条件
- 验证不变量（Invariants）
- 捕获代码 bug
- 失败通常意味着代码有错误

**三者的区别**：

| 语句 | 用途 | Gas 成本 | 失败原因 |
|------|------|----------|----------|
| `require` | 输入验证和条件检查 | 返还剩余 Gas | 用户输入或外部条件 |
| `revert` | 复杂条件处理 | 返还剩余 Gas | 业务逻辑 |
| `assert` | 内部不变量检查 | 不返还 Gas | 代码 bug |

## 🎯 自定义错误

### 基本语法

```solidity
// 定义自定义错误
error InsufficientBalance(uint256 requested, uint256 available);
error Unauthorized(address caller);
error InvalidValue(uint256 value);

// 使用自定义错误
function withdraw(uint256 _amount) public {
    if (_amount > balances[msg.sender]) {
        revert InsufficientBalance({
            requested: _amount,
            available: balances[msg.sender]
        });
    }
    // ...
}
```

**自定义错误的优势**：
```solidity
// ❌ Require: 高 Gas 成本
require(_amount <= balance, "Insufficient balance");
// Gas: ~24,000

// ✅ 自定义错误: 低 Gas 成本
if (_amount > balance) {
    revert InsufficientBalance(_amount, balance);
}
// Gas: ~22,000（节省 ~2,000 gas）
```

**Gas 优化原理**：
- Require: 需要在字节码中存储错误字符串
- 自定义错误: 只存储 4 字节错误选择器

## 🔄 函数修改器 (Modifiers)

### 基本修改器

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _; // 执行函数体
}

function sensitiveFunction() public onlyOwner {
    // 只有所有者可以执行
}
```

**修改器执行流程**：
```solidity
modifier logBefore() {
    emit Log("Before");
    _; // 执行函数
    emit Log("After");
}

// 调用 sensitiveFunction() 时：
// 1. 执行 logBefore 的第一部分（Before）
// 2. 执行 sensitiveFunction 的函数体
// 3. 执行 logBefore 的剩余部分（After）
```

### 带参数的修改器

```solidity
modifier greaterThan(uint256 _value, uint256 _minimum) {
    require(_value > _minimum, "Value too small");
    _;
}

function setValue(uint256 _value) public greaterThan(_value, 10) {
    counter = _value;
}
```

### 多个修改器

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

modifier notPaused() {
    require(!paused, "Contract is paused");
    _;
}

function criticalAction() public onlyOwner notPaused {
    // 必须是所有者且合约未暂停
}
```

**修改器最佳实践**：
```solidity
// ✅ 推荐：简单的条件检查
modifier onlyAdmin() {
    require(hasRole[ADMIN_ROLE][msg.sender], "Not admin");
    _;
}

// ❌ 避免：复杂逻辑放在修改器中
modifier complexLogic(uint256 value) {
    if (value > 100) {
        // 太复杂了
        for (uint i = 0; i < value; i++) {
            // ...
        }
    }
    _;
}

// ✅ 更好：复杂逻辑放在函数中
function processValue(uint256 value) public {
    if (value > 100) {
        _processLargeValue(value);
    }
}
```

## 🔀 函数重载

### 基本语法

```solidity
function process(uint256 _value) public pure returns (string memory) {
    return "Processing uint";
}

function process(int256 _value) public pure returns (string memory) {
    return "Processing int";
}

function process(string memory _value) public pure returns (string memory) {
    return "Processing string";
}
```

**重载限制**：
- 参数类型必须不同
- 参数数量必须不同
- 返回值类型不能作为区分

**重载注意事项**：
```solidity
// ✅ 正确：参数类型不同
function setValue(uint256 _value) public { }
function setValue(int256 _value) public { }

// ❌ 错误：只有返回值不同
function getValue() public returns (uint256) { }
function getValue() public returns (int256) { } // 编译错误

// ⚠️ 注意：重载歧义
function process(uint8 _value) public { }
function process(uint16 _value) public { }
process(1); // 歧义！编译错误
```

## 💡 函数设计最佳实践

### 1. 函数命名

```solidity
// ✅ 清晰的命名
function getUserBalance(address _user) public view returns (uint256) {
    return balances[_user];
}

// ❌ 不清晰的命名
function get(address _a) public view returns (uint256) {
    return balances[_a];
}
```

### 2. 参数校验

```solidity
// ✅ 完整的校验
function transfer(address _to, uint256 _amount) public {
    require(_to != address(0), "Invalid recipient");
    require(_amount > 0, "Amount must be positive");
    require(balances[msg.sender] >= _amount, "Insufficient balance");
    
    // 执行转账
}

// ❌ 缺少校验
function transfer(address _to, uint256 _amount) public {
    balances[msg.sender] -= _amount; // 可能下溢
    balances[_to] += _amount;
}
```

### 3. 错误处理

```solidity
// ✅ 使用自定义错误（省 Gas）
error InsufficientBalance(uint256 requested, uint256 available);

function withdraw(uint256 _amount) public {
    if (_amount > balances[msg.sender]) {
        revert InsufficientBalance(_amount, balances[msg.sender]);
    }
}

// ❌ 使用 require（浪费 Gas）
function withdraw(uint256 _amount) public {
    require(_amount <= balances[msg.sender], "Insufficient balance");
}
```

### 4. Gas 优化

```solidity
// ✅ External 用于外部调用
function getBalance(address _user) external view returns (uint256) {
    return balances[_user];
}

// ✅ Calldata 用于只读参数
function process(bytes calldata _data) external pure returns (bytes32) {
    return keccak256(_data);
}

// ✅ Short-circuit 评估
require(_amount > 0 && _amount <= maxAmount, "Invalid amount");
```

## 🎓 课后练习

### 基础题（必做）

1. **银行合约**
   - `deposit()` 函数（payable）
   - `withdraw(uint256 amount)` 函数（参数校验）
   - `getBalance()` 函数（view）
   - 使用 onlyOwner 修改器

2. **投票系统**
   - `vote(uint256 candidateId)` 函数
   - 使用 require 检查投票资格
   - 使用自定义错误处理重复投票
   - View 函数获取投票结果

3. **拍卖合约**
   - `bid()` 函数（payable）
   - 参数校验（出价必须高于当前价）
   - 使用修改器检查拍卖状态
   - 实现返回多个值

### 进阶题（选做）

1. **多签钱包**
   - 使用修改器检查多签条件
   - 实现函数重载（不同签名方式）
   - 使用自定义错误
   - 返回复杂结构体

2. **ERC20 代币**
   - 实现 `transfer` 和 `transferFrom`
   - 使用修改器检查权限
   - 完整的参数校验
   - Gas 优化

3. **DAO 治理**
   - `propose()` 函数（复杂校验）
   - `vote()` 函数（状态检查）
   - `execute()` 函数（多重修改器）
   - 使用枚举和自定义错误

## 🔗 常见问题

### Q1: View 函数真的不消耗 Gas 吗？
**A**: 
- 直接调用（ethers.js、web3.js）：不消耗 Gas
- 从其他合约调用：消耗 Gas
- 在交易中调用：消耗 Gas

### Q2: External 和 Public 有什么区别？
**A**: 
- External：只能从外部调用，Gas 更省
- Public：内外都可调用，但外部调用更贵
- 建议：对外接口用 external，需要内部调用用 public

### Q3: 什么时候使用自定义错误？
**A**: 
- 错误会被频繁触发
- 需要传递错误详情
- 关注 Gas 优化

### Q4: 为什么需要 assert？
**A**: 
- Assert 用于检查不应该失败的条件
- 失败通常表示代码有 bug
- 不返还 Gas，所以只用于内部检查

### Q5: 修改器的执行顺序是什么？
**A**: 
```solidity
modifier A { _; } // 1
modifier B { _; } // 2
function foo() public A B { } // 3

// 执行顺序：A(1) → B(2) → 函数体(3) → B(2) → A(1)
```

## 📚 延伸阅读

- [Solidity 函数文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#functions)
- [函数修饰符](https://docs.soliditylang.org/en/v0.8.20/contracts.html#function-modifiers)
- [错误处理](https://docs.soliditylang.org/en/v0.8.20/control-structures.html#error-handling-assert-require-revert-and-exceptions)
- [自定义错误](https://blog.soliditylang.org/2021/04/21/custom-errors/)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解四种函数可见性的区别
- [ ] 掌握 view、pure、payable 的使用场景
- [ ] 能够处理单个和多个返回值
- [ ] 熟练使用 require、revert、assert
- [ ] 能够编写自定义错误
- [ ] 理解修改器的执行流程
- [ ] 掌握函数重载的语法和限制
- [ ] 完成至少一个基础练习题

---

**下一课预告**：控制结构 - 学习 if/else、循环、try/catch 等控制流语句！

**继续你的 Solidity 之旅！** 🚀

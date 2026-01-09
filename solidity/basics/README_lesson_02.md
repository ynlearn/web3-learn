# Lesson 02: 数据类型 - Solidity 的积木

## 📚 课程概述

数据类型是编程语言的基础，就像乐高积木的不同形状。本课将深入讲解 Solidity 的各种数据类型，帮助你选择合适的类型来构建智能合约。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 区分值类型和引用类型
- ✅ 掌握布尔、整数、地址等基本类型
- ✅ 理解数组、字符串、结构体、映射等复合类型
- ✅ 理解 Storage、Memory、Calldata 数据位置
- ✅ 安全地进行类型转换
- ✅ 了解溢出检查机制

## 🏗️ 类型体系概览

```
Solidity 数据类型
├── 值类型 (Value Types)
│   ├── 布尔型 (bool)
│   ├── 整型 (uint/int)
│   ├── 地址型 (address)
│   ├── 定长字节数组 (bytes1-32)
│   ├── 枚举 (enum)
│   └── 函数类型 (function)
└── 引用类型 (Reference Types)
    ├── 数组 (array)
    ├── 字符串 (string)
    ├── 结构体 (struct)
    └── 映射 (mapping)
```

## 🔢 值类型 (Value Types)

### 布尔类型 (bool)

```solidity
bool public isActive = true;
bool public isPaused = false;
```

**特点**：
- 占用 1 字节 Storage
- 默认值：`false`
- 支持运算符：`!`, `&&`, `||`, `==`, `!=`

**实战建议**：
```solidity
// ✅ 推荐：使用短路评估
if (isValidUser && hasPermission) {
    // 如果 isValidUser 为 false，不会评估 hasPermission
}

// ❌ 避免：冗余的布尔表达式
if (isActive == true) { }
// ✅ 更清晰
if (isActive) { }
```

### 整数类型 (Integer)

```solidity
// 无符号整数
uint8  tinyNumber = 255;   // 0 到 2^8 - 1
uint16 smallNumber = 65535; // 0 到 2^16 - 1
uint256 bigNumber = 4200000000000000000; // 0 到 2^256 - 1
uint defaultUint = 100;    // uint 等于 uint256

// 有符号整数
int8  positiveTiny = 127;  // -2^7 到 2^7 - 1
int256 temperature = -25;
```

**整数范围速查表**：

| 类型 | 字节 | 最小值 | 最大值 |
|------|------|--------|--------|
| `uint8` | 1 | 0 | 255 |
| `uint16` | 2 | 0 | 65,535 |
| `uint32` | 4 | 0 | 4,294,967,295 |
| `uint64` | 8 | 0 | 1.84×10^19 |
| `uint128` | 16 | 0 | 3.4×10^38 |
| `uint256` | 32 | 0 | 1.16×10^77 |
| `int8` | 1 | -128 | 127 |
| `int16` | 2 | -32,768 | 32,767 |
| `int256` | 32 | -2^255 | 2^255-1 |

**幽默比喻**：
- `uint8` 就像一个小盒子，只能装 255 个苹果
- `uint256` 就像一个大仓库，可以装下宇宙中所有的苹果

**溢出保护 (Solidity 0.8.x)**：
```solidity
// Solidity 0.8.x 自动检查溢出
uint8 x = 255;
x += 1; // ❌ 编译错误或运行时回滚

// 如果需要禁用检查（不推荐）
unchecked {
    x += 1; // x 变成 0（溢出）
}
```

### 地址类型 (address)

```solidity
address public owner;
address payable public wallet; // 可以接收 ETH

// 地址操作
uint256 balance = owner.balance;       // ETH 余额
bytes32 codeHash = owner.codehash;    // 代码哈希
bool isContract = owner.code.length > 0; // 是否为合约
```

**address vs address payable**：

| 特性 | address | address payable |
|------|---------|-----------------|
| 接收 ETH | ❌ | ✅ |
| send() | ❌ | ✅ |
| transfer() | ❌ | ✅ |
| 转换 | → payable | → address |

**最佳实践**：
```solidity
// ✅ 推荐：明确标记需要接收 ETH 的地址
address payable public treasury;

function deposit() public payable {
    treasury.transfer(msg.value);
}

// ❌ 避免：使用 address 接收 ETH（会失败）
address public wallet;
function depositWrong() public payable {
    // wallet.transfer(msg.value); // 编译错误！
}
```

### 枚举类型 (enum)

```solidity
enum Status { Pending, Active, Inactive, Deleted }
Status public currentStatus = Status.Active;
```

**特点**：
- 底层是 `uint8`
- 默认值：第一个成员（0）
- 适合表示有限的状态集合

**幽默类比**：
- 就像红绿灯：红、黄、绿三个状态
- 比用 0, 1, 2 更清晰

**实战建议**：
```solidity
// ✅ 推荐：使用枚举表示状态
enum OrderStatus { Created, Paid, Shipped, Delivered, Cancelled }

// ❌ 避免：使用魔法数字
uint8 public status = 0; // 0 是什么？？
```

## 📦 引用类型 (Reference Types)

### 数组 (Arrays)

```solidity
// 动态数组
uint256[] public numbers;

// 定长数组（Gas 更优）
uint256[5] public fixedNumbers;

// 初始化数组
uint256[] memory list = new uint256[](3);
list[0] = 10;
list[1] = 20;
list[2] = 30;
```

**数组操作**：
```solidity
// 添加元素
numbers.push(100);

// 获取长度
uint256 length = numbers.length;

// 删除最后一个元素
numbers.pop();

// 获取元素
uint256 value = numbers[0];
```

**Gas 优化提示**：
```solidity
// ❌ 高 Gas：每次 push 都可能扩展存储
uint256[] public largeArray;

// ✅ 低 Gas：预分配空间（如果知道大小）
uint256[] public optimizedArray = new uint256[](1000);
```

### 字符串 (string)

```solidity
string public greeting = "Hello Web3";
string public emptyString = "";
```

**字符串操作限制**：
- 不能直接拼接字符串
- 不能通过索引访问字符
- 不能获取字符串长度（需要转换为 bytes）

**实战技巧**：
```solidity
// 获取字符串长度
uint256 length = bytes(greeting).length;

// 拼接字符串（使用库）
using Strings for uint256;
string memory result = string(abi.encodePacked("Value: ", uint256(100).toString()));
```

### 结构体 (Struct)

```solidity
struct User {
    uint256 id;
    string name;
    bool verified;
    uint256 balance;
}

User public admin = User({
    id: 1,
    name: "Admin",
    verified: true,
    balance: 1000
});
```

**结构体存储**：
```solidity
// Storage 结构体（持久化）
User public admin;

// Memory 结构体（临时）
User memory newUser = User({
    id: 2,
    name: "Alice",
    verified: false,
    balance: 0
});
```

**Gas 优化技巧**：
```solidity
// ⚠️ 注意：Storage 打包
struct OptimizedUser {
    uint128 id;        // 16 字节
    bool verified;     // 1 字节
    uint256 balance;   // 32 字节（新槽）
    // 总共 2 个槽（17+16 和 32）
}
```

### 映射 (Mapping)

```solidity
mapping(address => uint256) public balances;
mapping(string => uint256) public nameToId;
```

**特点**：
- 哈希表实现
- 不可遍历（除非配合数组）
- 默认值：0（或类型的默认值）

**常见模式**：
```solidity
// ✅ 可遍历的映射
mapping(address => uint256) public balances;
address[] public userAddresses;

function addUser(address _user, uint256 _amount) public {
    balances[_user] = _amount;
    userAddresses.push(_user);
}

function getAllUsers() public view returns (address[] memory) {
    return userAddresses;
}
```

## 🗂️ 数据位置 (Data Location)

### 三种数据位置

| 位置 | 描述 | 生命周期 | 修改性 | Gas 成本 |
|------|------|----------|--------|----------|
| **Storage** | 永久存储 | 永久 | 可读写 | 高 |
| **Memory** | 临时存储 | 函数内 | 可读写 | 中 |
| **Calldata** | 只读输入 | 函数内 | 只读 | 低 |

### Storage（永久存储）

```solidity
uint256[] public numbers; // 状态变量，Storage

function updateStorage() public {
    numbers.push(100); // 持久化到区块链
}
```

**特点**：
- 持久化到区块链
- Gas 成本高（20,000 gas/槽）
- 跨函数调用保持数据

### Memory（临时内存）

```solidity
function processInMemory(uint256[] memory _array) public pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < _array.length; i++) {
        sum += _array[i];
    }
    return sum;
}
```

**特点**：
- 函数执行期间存在
- 执行后删除
- Gas 成本中等
- 可以修改

### Calldata（只读数据）

```solidity
function processInCalldata(uint256[] calldata _array) external pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < _array.length; i++) {
        sum += _array[i];
    }
    return sum;
}
```

**特点**：
- 只读，不可修改
- Gas 成本最低
- 只用于外部函数参数

**Gas 对比**：
```solidity
// Memory 版本：~50,000 gas
function sumMemory(uint256[] memory _data) public pure returns (uint256) {
    // ...
}

// Calldata 版本：~45,000 gas（省 10%）
function sumCalldata(uint256[] calldata _data) external pure returns (uint256) {
    // ...
}
```

**选择指南**：
```solidity
// ✅ 外部函数参数用 Calldata（省 Gas）
function externalProcess(uint256[] calldata _data) external {
    // ...
}

// ✅ 内部调用需要修改，用 Memory
function internalProcess(uint256[] memory _data) internal {
    _data[0] = 100; // 可以修改
}

// ✅ 需要持久化，用 Storage
uint256[] public dataArray;
function saveData(uint256 _value) public {
    dataArray.push(_value);
}
```

## 🔄 类型转换

### 显式转换

```solidity
// 整数转换
uint256 a = 100;
int256 b = -50;

int256 c = int256(a); // c = 100 ✅
uint256 d = uint256(b); // d = 很大的正数 ⚠️
```

**安全转换建议**：
```solidity
// ✅ 使用 SafeCast 库（OpenZeppelin）
using SafeCast for int256;

function safeConvert(int256 _value) public pure returns (uint256) {
    return _value.toUint256(); // 失败时自动 revert
}
```

### 地址转换

```solidity
address addr = 0x123...;
address payable payableAddr = payable(addr); // 转换为 payable

uint160 addrAsUint = uint160(addr); // 地址转整数
address uintAsAddr = address(addrAsUint); // 整数转地址
```

## 🛡️ 溢出保护

### Solidity 0.8.x 内置保护

```solidity
// ✅ Solidity 0.8.x 自动检查
uint8 x = 255;
x += 1; // 自动回滚

// ❌ 0.7.x 及更早版本需要 SafeMath
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
using SafeMath for uint256;

x = x.add(1);
```

### 禁用检查（谨慎使用）

```solidity
unchecked {
    // ⚠️ 危险：禁用溢出检查
    x += 1;
}

// 合理用途：已知不会溢出的循环
function sumUnchecked(uint256 n) public pure returns (uint256) {
    uint256 result = 0;
    unchecked {
        for (uint256 i = 0; i < n; ++i) {
            result += i; // 安全，因为我们知道范围
        }
    }
    return result;
}
```

## 📊 类型选择指南

### 何时使用什么类型？

| 场景 | 推荐类型 | 理由 |
|------|----------|------|
| 余额、金额 | `uint256` | 标准做法，避免溢出 |
| 索引、计数 | `uint` | 简化代码 |
| 状态标记 | `bool` 或 `enum` | 更清晰 |
| 时间戳 | `uint256` | Unix 时间戳 |
| 百分比 | `uint16` | 0-10000 表示 0.00%-100.00% |
| 用户地址 | `address` | 标准 20 字节 |
| ETH 接收 | `address payable` | 明确意图 |
| 短数据 | `bytes32` | Gas 更优 |
| 可变数据 | `bytes` | 灵活 |
| 用户信息 | `struct` | 组织复杂数据 |
| 快速查找 | `mapping` | O(1) 复杂度 |

## 🎓 课后练习

### 基础题（必做）

1. **创建投票系统**
   - 使用 `mapping(address => bool)` 记录投票状态
   - 使用 `uint` 计数投票总数
   - 防止重复投票

2. **学生成绩单**
   - 使用 `struct` 存储学生信息
   - 使用 `mapping(address => Student)` 记录
   - 实现添加、查询功能

3. **库存管理**
   - 使用 `enum` 表示商品状态
   - 使用 `mapping(string => uint)` 记录库存
   - 实现增减库存功能

### 进阶题（选做）

1. **多维数组操作**
   - 实现矩阵加法
   - 处理边界条件
   - 优化 Gas 消耗

2. **嵌套结构体**
   ```solidity
   struct Order {
       uint256 id;
       Item[] items;
       Status status;
   }
   struct Item {
       string name;
       uint256 quantity;
   }
   ```
   - 实现订单管理
   - 计算订单总额

3. **Gas 优化挑战**
   - 对比不同数据位置的 Gas 消耗
   - 优化结构体存储布局
   - 打包多个小类型到单个槽

## 🔗 常见问题

### Q1: 为什么不总是使用 `uint256`？
**A**: 有时小整数更省 Gas，特别是当它们可以和其他变量打包到一个槽时。

### Q2: `string` 和 `bytes` 有什么区别？
**A**: 
- `string` 是 UTF-8 编码的文本
- `bytes` 是原始字节数据
- 内部存储相同，但 `bytes` 提供更多操作

### Q3: 为什么 `mapping` 不能遍历？
**A**: 映射只存储键值对，不存储键列表。需要配合数组实现遍历。

### Q4: `memory` 和 `calldata` 都可以用于数组，何时选择哪个？
**A**: 
- 参数不需要修改：`calldata`（更省 Gas）
- 参数需要修改或内部函数：`memory`

### Q5: 如何避免整数除法精度丢失？
**A**: 先乘后除：
```solidity
// ❌ 精度丢失
uint256 result = (100 / 3) * 3; // 99

// ✅ 保留精度
uint256 result = (100 * 1e18) / 3; // 33333333333333333333
```

## 📚 延伸阅读

- [Solidity 类型文档](https://docs.soliditylang.org/en/v0.8.20/types.html)
- [数据位置详解](https://docs.soliditylang.org/en/v0.8.20/introduction-to-smart-contracts.html#storage-memory-and-calldata)
- [溢出检查说明](https://docs.soliditylang.org/en/v0.8.20/control-structures.html#checked-or-unchecked-arithmetic)
- [OpenZeppelin SafeCast](https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeCast)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解值类型和引用类型的区别
- [ ] 能够正确选择整数大小
- [ ] 掌握 `address` 和 `address payable` 的区别
- [ ] 理解 Storage、Memory、Calldata 的使用场景
- [ ] 能够定义和使用结构体
- [ ] 掌握映射的基本操作
- [ ] 了解溢出保护机制
- [ ] 完成至少一个基础练习题

---

**下一课预告**：函数详解 - 深入学习函数修饰符、返回值、参数校验！

**准备好了吗？继续你的 Solidity 之旅！** 🚀

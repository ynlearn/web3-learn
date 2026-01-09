# Lesson 05: 面向对象编程 - Solidity 的家族树

## 📚 课程概述

面向对象编程（OOP）是 Solidity 的核心特性之一。本课将深入学习 Contract、Interface、Library、继承等 OOP 概念，帮助你构建可复用、可维护的智能合约系统。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解抽象合约的概念和使用场景
- ✅ 掌握合约继承的语法和最佳实践
- ✅ 创建和实现接口
- ✅ 编写和使用库（Library）
- ✅ 实现多重继承
- ✅ 使用 super 关键字调用父合约函数
- ✅ 理解函数覆盖和重写的机制

## 🌳 继承基础

### 什么是继承？

**幽默比喻**：
- 继承就像家族树
- 子合约继承父合约的特征
- 可以添加新功能或覆盖现有功能

### 基本继承语法

```solidity
// 父合约
contract Animal {
    string public name;
    
    constructor(string memory _name) {
        name = _name;
    }
    
    function sleep() public pure returns (string memory) {
        return "Zzz...";
    }
}

// 子合约
contract Dog is Animal {
    string public breed;
    
    constructor(string memory _name, string memory _breed) Animal(_name) {
        breed = _breed;
    }
    
    function bark() public pure returns (string memory) {
        return "Woof!";
    }
}
```

### 继承的类型

**单继承**：
```solidity
contract A {}
contract B is A {}
contract C is B {}
// C -> B -> A
```

**多重继承**：
```solidity
contract A {}
contract B {}
contract C is A, B {}
// C 继承 A 和 B
```

## 📋 抽象合约

### 什么是抽象合约？

- 包含至少一个没有实现的函数
- 不能直接部署
- 必须被其他合约继承

### 基本语法

```solidity
abstract contract Animal {
    string public name;
    
    constructor(string memory _name) {
        name = _name;
    }
    
    // 抽象函数：没有实现
    function makeSound() public virtual pure returns (string memory);
    
    // 普通函数：有实现
    function sleep() public pure returns (string memory) {
        return "Zzz...";
    }
}

contract Dog is Animal {
    constructor(string memory _name) Animal(_name) {}
    
    // 必须实现抽象函数
    function makeSound() public override pure returns (string memory) {
        return "Woof!";
    }
}
```

**使用场景**：
- 定义通用接口模板
- 强制子合约实现特定功能
- 代码复用和模块化

## 🔌 接口（Interface）

### 什么是接口？

- 只定义函数签名，不包含实现
- 不能包含状态变量
- 不能继承其他合约
- 所有函数自动是 `external`

### 基本语法

```solidity
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
}

contract Token is IERC20 {
    // 实现接口定义的所有函数
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        // 实现代码
        return true;
    }
}
```

**接口 vs 抽象合约**：

| 特性 | 接口 | 抽象合约 |
|------|------|----------|
| 状态变量 | ❌ | ✅ |
| 构造函数 | ❌ | ✅ |
| 函数实现 | ❌ | ✅ |
| 继承合约 | ❌ | ✅ |
| 使用场景 | 定义标准 | 模板和复用 |

**实战示例**：
```solidity
// 使用接口与外部合约交互
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract MyContract {
    IUniswapV2Router public router;
    
    constructor(address _router) {
        router = IUniswapV2Router(_router);
    }
    
    function swap(address[] memory path, uint256 amount) external {
        router.swapExactTokensForTokens(
            amount,
            0,
            path,
            msg.sender,
            block.timestamp
        );
    }
}
```

## 📚 库（Library）

### 什么是库？

- 用于代码复用
- 使用 `using for` 语法扩展类型
- 部署一次，多个合约使用

### 基本语法

```solidity
library Math {
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a <= b ? a : b;
    }
}

contract Calculator {
    using Math for uint256;
    
    function findMax(uint256 a, uint256 b) public pure returns (uint256) {
        return a.max(b); // 使用库函数
    }
}
```

**Using For 语法**：
```solidity
// 方式 1：为类型添加所有库函数
using Math for uint256;

function calculate() public pure {
    uint256 result = 100.max(200); // 直接调用
}

// 方式 2：只为特定函数添加
using Math for uint256;
using SafeMath for uint256;

function safeCalc(uint256 a, uint256 b) public pure {
    return a.add(b).max(100);
}
```

**常用库**：
- **SafeMath**：安全数学运算（0.8.x 之前必需）
- **Address**：地址操作
- **Strings**：字符串转换
- **Arrays**：数组操作

## 🔀 多重继承

### 基本语法

```solidity
contract Ownable {
    address public owner;
    
    constructor() { owner = msg.sender; }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}

contract Pausable {
    bool public paused;
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }
}

contract Manageable is Ownable, Pausable {
    function setValue(uint256 value) public onlyOwner whenNotPaused {
        // 同时需要两个条件
    }
}
```

### 线性化继承顺序

```solidity
contract A { function foo() public virtual returns (string memory) { return "A"; } }
contract B is A { function foo() public virtual override returns (string memory) { return "B"; } }
contract C is A { function foo() public virtual override returns (string memory) { return "C"; } }
contract D is B, C {
    function foo() public override(B, C) returns (string memory) {
        return super.foo(); // 按 C -> B -> A 顺序调用
    }
}
```

**继承顺序规则**：
1. 最基类 → 最派生类
2. 从右到左解析（`D is B, C` 先解析 C）
3. 父合约必须列在子合约之前

## 🎯 函数覆盖和重写

### Override 关键字

```solidity
contract Base {
    function getValue() public virtual pure returns (uint256) {
        return 100;
    }
}

contract Derived is Base {
    function getValue() public override pure returns (uint256) {
        return 200; // 覆盖父合约实现
    }
}
```

### Virtual 关键字

```solidity
// ✅ 正确：使用 virtual 允许覆盖
function getValue() public virtual pure returns (uint256) {
    return 100;
}

// ❌ 错误：没有 virtual 无法覆盖
function getValue() public pure returns (uint256) {
    return 100;
}
```

### 多重覆盖

```solidity
contract A {
    function foo() public virtual returns (string memory) {
        return "A";
    }
}

contract B is A {
    function foo() public virtual override returns (string memory) {
        return "B";
    }
}

contract C is B {
    function foo() public override returns (string memory) {
        return "C";
    }
}
```

## 🔼 Super 关键字

### 基本用法

```solidity
contract A {
    event Log(string message);
    
    function foo() public virtual {
        emit Log("A.foo called");
    }
}

contract B is A {
    function foo() public virtual override {
        emit Log("B.foo called");
        super.foo(); // 调用 A.foo()
    }
}
```

### 多重继承中的 Super

```solidity
contract A { function foo() public virtual { emit Log("A"); } }
contract B is A { function foo() public virtual override { emit Log("B"); super.foo(); } }
contract C is A { function foo() public virtual override { emit Log("C"); super.foo(); } }
contract D is B, C {
    function foo() public override(B, C) {
        super.foo(); // 调用顺序：C -> B -> A
    }
}
```

## 🏗️ 构造函数继承

### 基本语法

```solidity
contract Parent {
    uint256 public parentValue;
    
    constructor(uint256 _value) {
        parentValue = _value;
    }
}

contract Child is Parent {
    uint256 public childValue;
    
    // 必须在子合约构造函数中初始化父合约
    constructor(uint256 _parentValue, uint256 _childValue) 
        Parent(_parentValue) 
    {
        childValue = _childValue;
    }
}
```

### 多重继承构造函数

```solidity
contract A {
    constructor(uint256 a) {}
}

contract B {
    constructor(string memory b) {}
}

contract C is A, B {
    // 按继承顺序初始化
    constructor(uint256 a, string memory b) 
        A(a) 
        B(b) 
    {}
}
```

## 💡 设计模式

### 模板方法模式

```solidity
abstract contract DataProcessor {
    function process() public {
        beforeProcess();
        doProcess();
        afterProcess();
    }
    
    function beforeProcess() internal virtual {}
    function doProcess() internal virtual;
    function afterProcess() internal virtual {}
}

contract MyProcessor is DataProcessor {
    function doProcess() internal override {
        // 具体处理逻辑
    }
    
    function beforeProcess() internal override {
        // 前置处理
    }
}
```

### 策略模式

```solidity
interface IStrategy {
    function execute(uint256 amount) external returns (uint256);
}

contract ConservativeStrategy is IStrategy {
    function execute(uint256 amount) external pure returns (uint256) {
        return amount + (amount * 5) / 100; // 5% 收益
    }
}

contract AggressiveStrategy is IStrategy {
    function execute(uint256 amount) external pure returns (uint256) {
        return amount + (amount * 20) / 100; // 20% 收益
    }
}
```

## 🎓 课后练习

### 基础题（必做）

1. **动物层级系统**
   - 创建抽象合约 `Animal`
   - 实现 `Dog`、`Cat`、`Bird` 子合约
   - 每个动物有不同的叫声

2. **银行接口**
   - 定义 `IBank` 接口
   - 实现 `CentralBank` 和 `CommercialBank`
   - 实现存款、取款功能

3. **数学工具库**
   - 创建 `MathLib` 库
   - 实现最大值、最小值、平均值
   - 使用 `using for` 语法

### 进阶题（选做）

1. **多签钱包**
   - 抽象合约定义基础功能
   - 实现不同的多签策略
   - 使用接口交互外部合约

2. **NFT 系列**
   - 抽象 NFT 合约
   - 实现 ERC721 和 ERC1155
   - 共享基础功能

3. **DAO 框架**
   - 多重继承实现复合功能
   - 使用库实现投票逻辑
   - 接口标准化提案格式

## 🔗 常见问题

### Q1: 抽象合约和接口有什么区别？
**A**: 
- 抽象合约可以有状态变量和部分实现
- 接口只有函数签名
- 接口更轻量，适合定义标准

### Q2: 什么时候使用库而不是继承？
**A**: 
- 库：通用工具函数，无需状态
- 继承：需要状态变量和复杂逻辑
- 库可以跨合约复用，继承创建层次结构

### Q3: 如何避免继承冲突？
**A**: 
```solidity
// 使用明确的 override
contract D is B, C {
    function foo() public override(B, C) {
        // 明确覆盖 B 和 C 的函数
    }
}
```

### Q4: Super 的调用顺序是什么？
**A**: 
- 按继承顺序（线性化）
- 从右到左（C3 线性化）
- 确保每个父合约只调用一次

### Q5: 可以覆盖构造函数吗？
**A**: 
- 构造函数不能被覆盖
- 但子合约可以调用父合约构造函数
- 必须在子合约构造函数中初始化父合约

## 📚 延伸阅读

- [Solidity 继承文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#inheritance)
- [接口文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#interfaces)
- [库文档](https://docs.soliditylang.org/en/v0.8.20/contracts.html#libraries)
- [C3 线性化](https://docs.soliditylang.org/en/v0.8.20/contracts.html#multiple-inheritance-and-linearization)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解抽象合约的概念和用途
- [ ] 掌握基本的继承语法
- [ ] 能够创建和实现接口
- [ ] 理解库的使用场景
- [ ] 掌握多重继承的语法
- [ ] 理解函数覆盖和重写
- [ ] 掌握 super 关键字的使用
- [ ] 完成至少一个基础练习题

---

**第一阶段（基础语法）完成！** 🎉

**下一阶段预告**：合约进阶 - 深入学习状态管理、继承与多态、错误处理等高级主题！

**继续你的 Solidity 之旅！** 🚀

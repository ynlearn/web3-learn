# Lesson 07: 继承与多态 - Solidity 的家族传承

## 📚 课程概述

继承与多态是面向对象编程的核心特性。本课将深入讲解 Solidity 的继承机制、多重继承、super 关键字、函数重写等高级特性。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 掌握单继承和多重继承
- ✅ 理解 super 关键字的调用顺序
- ✅ 掌握构造函数继承
- ✅ 理解虚拟函数和重写机制
- ✅ 处理钻石继承问题
- ✅ 实现接口继承
- ✅ 应用多重继承实战

## 🌳 继承基础

### 单继承语法

```solidity
contract Animal {
    string public name;
    
    constructor(string memory _name) {
        name = _name;
    }
    
    function makeSound() public virtual pure returns (string memory) {
        return "Some sound";
    }
}

contract Dog is Animal {
    string public breed;
    
    constructor(string memory _name, string memory _breed) Animal(_name) {
        breed = _breed;
    }
    
    function makeSound() public override pure returns (string memory) {
        return "Woof!";
    }
}
```

### 关键关键字

- `is` - 继承关键字
- `virtual` - 允许子合约重写
- `override` - 重写父合约函数
- `super` - 调用父合约函数

## 🔀 多重继承

### 基本语法

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

contract C is A {
    function foo() public virtual override returns (string memory) {
        return "C";
    }
}

contract D is B, C {
    // 必须指定 override(B, C)
    function foo() public override(B, C) returns (string memory) {
        return super.foo(); // 调用 C.foo()
    }
}
```

### 线性化顺序

**继承顺序**：`D is B, C`

**解析顺序**：D → C → B → A

**规则**：
1. 从最基类开始
2. 从右到左解析
3. 每个父合约只出现一次（C3 线性化）

## 🎯 Super 关键字

### 调用顺序

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

contract C is A {
    function foo() public virtual override returns (string memory) {
        return "C";
    }
}

contract D is B, C {
    function foo() public override(B, C) returns (string memory) {
        return super.foo(); // 调用 C.foo()（最右边的父合约）
    }
}
```

### 明确调用父合约

```solidity
contract Derived is Base1, Base2 {
    function func() public override(Base1, Base2) returns (string memory) {
        // 调用特定的父合约
        return Base1.func();
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
    
    // 必须初始化父合约
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

## 💎 钻石继承

### 问题说明

```
    Base
    /   \
  Left  Right
    \   /
    Diamond
```

### 解决方案

```solidity
contract Base {
    function foo() public virtual returns (string memory) {
        return "Base";
    }
}

contract Left is Base {
    function foo() public virtual override returns (string memory) {
        return "Left";
    }
}

contract Right is Base {
    function foo() public virtual override returns (string memory) {
        return "Right";
    }
}

contract Diamond is Left, Right {
    function foo() public override(Left, Right) returns (string memory) {
        return super.foo(); // 调用 Right.foo()
    }
}
```

## 🎓 实战示例

### 多签钱包

```solidity
contract MultisigWallet is Ownable, Pausable {
    // 结合多重继承
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    function submitTransaction(...) 
        public 
        onlyOwner 
        whenNotPaused 
    {
        // 需要同时满足两个条件
    }
}
```

## 🎓 课后练习

### 基础题
1. 创建三级继承层次
2. 实现接口继承
3. 处理构造函数继承

### 进阶题
1. 实现可升级合约模式
2. 创建复杂的权限管理系统
3. 实现插件式架构

## ✅ 课程检查清单

- [ ] 理解单继承和多重继承
- [ ] 掌握 super 关键字
- [ ] 理解线性化顺序
- [ ] 处理钻石继承问题
- [ ] 掌握构造函数继承
- [ ] 实现接口继承
- [ ] 应用多重继承实战

---

**继续你的 Solidity 之旅！** 🚀

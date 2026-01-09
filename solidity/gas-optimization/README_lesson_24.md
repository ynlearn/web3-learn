# Lesson 24: Gas 优化进阶 - 极致性能优化

## 📚 课程概述

本课深入探讨高级 Gas 优化技术,包括内联汇编、内存管理、存储优化、函数调用优化等进阶技巧,帮助你将合约性能推向极致。

**幽默开场**:如果说基础优化是给汽车换更好的轮胎,那么高级优化就是给汽车装上火箭推进器!今天我们要学会如何让智能合约"飞"起来! 🚀

## 🎯 学习目标

- ✅ 掌握内联汇编优化技巧
- ✅ 优化内存和存储使用
- ✅ 使用高级设计模式
- ✅ 优化函数调用
- ✅ 实现 Gas 优化的代币合约
- ✅ 对比优化前后的效果

## 🔧 内联汇编优化

### 何时使用汇编?

**优点**:
- 更精确的控制
- 减少 Gas 消耗
- 访问特殊操作码

**缺点**:
- 可读性降低
- 安全风险增加
- 调试困难

### 示例: 优化签名恢复

```solidity
// ❌ 标准: 约 2000-3000 Gas
function recoverStandard(bytes32 _hash, bytes memory _signature) public pure returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;
    
    assembly {
        r := mload(add(_signature, 32))
        s := mload(add(_signature, 64))
        v := byte(0, mload(add(_signature, 96)))
    }
    
    return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)), v, r, s);
}

// ✅ 优化: 约 1500-2000 Gas
function recoverOptimized(bytes32 _ethSignedHash, bytes32 _r, bytes32 _s, uint8 _v) 
    public pure returns (address) 
{
    address signer;
    assembly {
        let freemem := mload(0x40)
        
        mstore(freemem, _ethSignedHash)
        mstore(add(freemem, 32), _v)
        mstore(add(freemem, 64), _r)
        mstore(add(freemem, 96), _s)
        
        let success := staticcall(gas(), 1, freemem, 128, freemem, 32)
        
        switch success
        case 1 {
            signer := mload(freemem)
        }
        default {
            signer := 0
        }
    }
    return signer;
}
```

### 常用汇编操作

```solidity
// 地址检查
function isNotZeroOptimized(address _addr) public pure returns (bool) {
    bool result;
    assembly {
        result := iszero(iszero(_addr))
    }
    return result;
}

// 获取合约余额
function contractBalanceOptimized() public view returns (uint256) {
    uint256 balance;
    assembly {
        balance := selfbalance()
    }
    return balance;
}

// 创建合约
function createContractOptimized(bytes memory _bytecode) public returns (address) {
    address addr;
    uint256 size = _bytecode.length;
    
    assembly {
        addr := create(0, add(_bytecode, 32), size)
    }
    
    require(addr != address(0), "Creation failed");
    return addr;
}
```

## 💾 高级存储优化

### 紧凑结构体设计

```solidity
// ✅ 优化的用户结构体
struct OptimizedUser {
    uint96 balance;      // 96 位
    address wallet;      // 160 位
    uint32 createdAt;    // 32 位
    uint16 id;           // 16 位
    bool active;         // 8 位 (剩余 8 位未使用)
    // 总共 312 位 = 2 个 slot (约 5000 Gas -> 2000 Gas)
}

// ✅ 紧凑的代币结构
struct CompactToken {
    uint96 balance;      // 96 位
    uint96 allowance;    // 96 位
    uint64 lastUpdate;   // 64 位
    // 总共 256 位 = 1 个 slot
}
```

### 存储打包技巧

```solidity
contract PackedStorage {
    // ❌ 未优化: 5 个 slot
    uint256 public a;
    address public b;
    bool public c;
    uint256 public d;
    uint8 public e;
    
    // ✅ 优化: 2 个 slot
    uint256 public optimizedA;      // slot 1: 32 字节
    uint256 public optimizedD;      // slot 2: 32 字节
    address public optimizedB;      // slot 3: 20 字节
    bool public optimizedC;         // slot 3: 1 字节
    uint8 public optimizedE;        // slot 3: 1 字节
    // slot 3 总共: 22 字节
}
```

## 🧠 内存优化

### Calldata vs Memory

```solidity
// ❌ 使用 Memory (需要复制)
function processArrayBad(uint256[] memory arr) public pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
}

// ✅ 使用 Calldata (只读)
function processArrayGood(uint256[] calldata arr) public pure returns (uint256) {
    uint256 sum = 0;
    uint256 length = arr.length;
    
    for (uint256 i = 0; i < length; ) {
        unchecked {
            sum += arr[i];
            ++i;
        }
    }
    return sum;
}
```

### 内存重用

```solidity
// ✅ 重用内存变量
function complexCalculationOptimized(uint256 _x, uint256 _y) public pure returns (uint256) {
    uint256 temp;  // 重用变量
    
    temp = _x * _y;
    temp = temp + (_x + _y);
    temp = temp * 2;
    
    return temp;
}
```

## 📊 函数调用优化

### Modifier 优化

```solidity
// ✅ 使用 modifier 避免代码重复
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

modifier validValue(uint256 _value) {
    require(_value > 0, "Invalid value");
    _;
}

function setValueOptimized(uint256 _value) 
    public 
    onlyOwner 
    validValue(_value) 
{
    value = _value;
}
```

### 简化返回

```solidity
// ✅ 直接返回
function simpleCheck(uint256 _x) public pure returns (bool) {
    return _x > 100;  // 比 if-else 便宜
}
```

## 🎯 高级模式优化

### Unchecked 块使用

```solidity
// ✅ 确定不会溢出时使用
function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
    uint256 c;
    unchecked {
        c = a + b;
    }
    return c;
}

// 优化的循环
function sumArray(uint256[] calldata arr) external pure returns (uint256) {
    uint256 total = 0;
    uint256 length = arr.length;
    
    for (uint256 i = 0; i < length; ) {
        unchecked {
            total += arr[i];
            ++i;
        }
    }
    
    return total;
}
```

### 条件短路评估

```solidity
function multiCheck(
    uint256 _value,
    address _addr,
    bool _flag
) public pure returns (bool) {
    // 低成本检查在前
    if (_value == 0) return false;
    if (_addr == address(0)) return false;
    if (!_flag) return false;
    
    // 高成本检查在后
    return _value > 100000;
}
```

### 位运算技巧

```solidity
// ✅ 使用位运算
function boolToUint(bool _value) public pure returns (uint256) {
    return uint256(_value);  // 比 _value ? 1 : 0 便宜
}

function uintToBool(uint256 _value) public pure returns (bool) {
    return _value != 0;  // 比 _value == 1 便宜
}
```

## 💰 优化的 ERC20 代币

```solidity
contract GasOptimizedToken {
    struct Account {
        uint96 balance;
        uint96 allowance;
        uint32 lastTransfer;
    }
    
    mapping(address => Account) private accounts;
    mapping(address => mapping(address => uint96)) private allowances;
    
    // ✅ 优化的转账
    function transfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Zero address");
        
        Account storage sender = accounts[msg.sender];
        require(sender.balance >= uint96(_amount), "Insufficient balance");
        
        unchecked {
            sender.balance -= uint96(_amount);
            accounts[_to].balance += uint96(_amount);
        }
        
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }
    
    // ✅ 优化的授权
    function approve(address _spender, uint256 _amount) external returns (bool) {
        allowances[msg.sender][_spender] = uint96(_amount);
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }
}
```

## 📈 Gas 优化检查清单

### 存储优化
- [ ] 紧凑的结构体打包
- [ ] 使用适当大小的整数类型
- [ ] 删除而非重置变量
- [ ] 使用 mapping 而非数组

### 内存优化
- [ ] 优先使用 calldata
- [ ] 重用内存变量
- [ ] 避免不必要的内存分配
- [ ] 使用固定大小数组

### 计算优化
- [ ] 使用 unchecked 块
- [ ] 缓存重复计算
- [ ] 使用位运算
- [ ] 优化循环

### 函数优化
- [ ] 使用 modifier
- [ ] 简化返回逻辑
- [ ] 批量操作
- [ ] 使用事件代替存储

## 🎓 课后练习

### 基础题

1. 实现优化的代币合约
2. 使用汇编优化关键函数
3. 优化存储结构

### 进阶题

1. 对比优化前后 Gas 消耗
2. 实现高度优化的 DeFi 协议
3. 使用 Gas 报告分析瓶颈

## 🔗 常见问题

### Q1: 汇编优化值得吗?
**A**: 关键路径上值得,但要权衡可读性。

### Q2: unchecked 块安全吗?
**A**: 只在确定不会溢出时使用。

### Q3: 如何测试优化效果?
**A**: 使用 Hardhat Gas Reporter。

## ✅ 课程检查清单

- [ ] 掌握内联汇编基础
- [ ] 理解存储优化技巧
- [ ] 能够优化内存使用
- [ ] 使用高级设计模式
- [ ] 实现优化代币合约
- [ ] 对比优化效果

---

**下一课预告**: 审计与测试 - 学习如何全面测试和审计智能合约!

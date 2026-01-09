# Lesson 04: 控制结构 - Solidity 的交通信号灯

## 📚 课程概述

控制结构决定了代码的执行流程，就像城市的交通信号灯指挥车辆通行一样。本课将深入学习 Solidity 的各种控制流语句，帮助你编写逻辑清晰、高效的智能合约。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 熟练使用 if-else 条件语句
- ✅ 掌握 for、while、do-while 循环
- ✅ 理解 break 和 continue 的使用
- ✅ 掌握 try-catch 错误处理机制
- ✅ 使用三元运算符简化代码
- ✅ 理解短路评估的原理和优势

## 🚦 If-Else 条件语句

### 基本 If-Else

```solidity
function checkValue(uint256 _value) public pure returns (string memory) {
    if (_value < 10) {
        return "Small";
    } else if (_value < 100) {
        return "Medium";
    } else {
        return "Large";
    }
}
```

### 嵌套 If-Else

```solidity
function evaluateNumber(int256 _num) public pure returns (string memory) {
    if (_num < 0) {
        if (_num < -100) {
            return "Very Negative";
        } else {
            return "Negative";
        }
    } else if (_num > 0) {
        if (_num > 100) {
            return "Very Positive";
        } else {
            return "Positive";
        }
    } else {
        return "Zero";
    }
}
```

**最佳实践**：
```solidity
// ❌ 避免：过深的嵌套
function badNested(int256 x) public pure returns (string memory) {
    if (x > 0) {
        if (x < 100) {
            if (x % 2 == 0) {
                if (x > 50) {
                    return "Complex condition";
                }
            }
        }
    }
    return "Other";
}

// ✅ 推荐：提前返回（Guard Clauses）
function goodNested(int256 x) public pure returns (string memory) {
    if (x <= 0) return "Other";
    if (x >= 100) return "Other";
    if (x % 2 != 0) return "Other";
    if (x <= 50) return "Other";
    return "Complex condition";
}
```

### 三元运算符

```solidity
function ternaryOperator(uint256 _value) public pure returns (string memory) {
    return _value > 50 ? "Greater than 50" : "Less than or equal to 50";
}
```

**使用场景**：
```solidity
// ✅ 简单条件赋值
uint256 max = a > b ? a : b;

// ✅ 函数返回
return success ? "Success" : "Failed";

// ❌ 避免：复杂逻辑
string memory result = a > b ? c > d ? "A>B and C>D" : "A>B but C<=D" : "A<=B";
// 太复杂了，不如用 if-else
```

### 短路评估（Short-circuit Evaluation）

```solidity
function shortCircuit(uint256 a, uint256 b, uint256 c) public pure returns (bool) {
    // 如果 a 为 false，不会评估 b 和 c
    if (a > 10 && b > 20 && c > 30) {
        return true;
    }
    return false;
}
```

**Gas 优化技巧**：
```solidity
// ✅ 低 Gas：将低成本检查放在前面
require(
    _value > 0 && _value <= maxAmount && balances[msg.sender] >= _value,
    "Invalid transfer"
);
// 如果 _value <= 0，不会评估后面的条件

// ❌ 高 Gas：将高成本检查放在前面
require(
    balances[msg.sender] >= _value && _value > 0 && _value <= maxAmount,
    "Invalid transfer"
);
// 即使 _value <= 0，也会先读取 storage
```

## 🔁 循环结构

### For 循环

```solidity
function sumArray(uint256[] memory _array) public pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < _array.length; i++) {
        sum += _array[i];
    }
    return sum;
}
```

**For 循环最佳实践**：
```solidity
// ✅ 推荐：缓存数组长度
function processArray(uint256[] memory _array) public pure returns (uint256) {
    uint256 length = _array.length; // 缓存长度
    uint256 sum = 0;
    for (uint256 i = 0; i < length; i++) {
        sum += _array[i];
    }
    return sum;
}

// ✅ 推荐：使用 unchecked（小心溢出）
function sumUnchecked(uint256 n) public pure returns (uint256) {
    uint256 sum = 0;
    unchecked {
        for (uint256 i = 0; i < n; ++i) {
            sum += i;
        }
    }
    return sum;
}
```

### While 循环

```solidity
function countDown(uint256 _start) public pure returns (uint256[] memory) {
    uint256[] memory result = new uint256[](_start);
    uint256 i = 0;
    uint256 current = _start;
    
    while (current > 0) {
        result[i] = current;
        current--;
        i++;
    }
    
    return result;
}
```

### Do-While 循环

```solidity
function processAtLeastOnce(uint256 _target) public pure returns (uint256) {
    uint256 counter = 0;
    do {
        counter++;
    } while (counter < _target);
    return counter;
}
```

**选择指南**：

| 循环类型 | 使用场景 | 示例 |
|---------|----------|------|
| **For** | 已知迭代次数 | 遍历数组、固定次数计算 |
| **While** | 未知迭代次数 | 等待条件、动态终止 |
| **Do-While** | 至少执行一次 | 输入验证、重试机制 |

### Break 和 Continue

```solidity
// Continue: 跳过当前迭代
function sumEvenNumbers(uint256[] memory _array) public pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] % 2 != 0) {
            continue; // 跳过奇数
        }
        sum += _array[i];
    }
    return sum;
}

// Break: 提前退出循环
function findFirstLargeNumber(uint256[] memory _array) public pure returns (uint256, bool) {
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] > 1000) {
            return (_array[i], true); // 找到后立即退出
        }
    }
    return (0, false);
}
```

**Gas 优化提示**：
```solidity
// ✅ 推荐：提前退出节省 Gas
for (uint256 i = 0; i < _array.length; i++) {
    if (_array[i] == target) {
        return i; // 找到后立即返回
    }
}

// ❌ 避免：不必要的循环
function searchArray(uint256[] memory _array, uint256 _target) public view returns (bool) {
    bool found = false;
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] == _target) {
            found = true;
            // 应该在这里 break
        }
    }
    return found;
}
```

## 🎯 Try-Catch 错误处理

### 基本 Try-Catch

```solidity
function tryExternalCall(address _contract, uint256 _value) public returns (bool) {
    (bool success, ) = _contract.call(
        abi.encodeWithSignature("setValue(uint256)", _value)
    );
    return success;
}
```

### 低级调用类型

| 调用类型 | 用途 | 只读 | 上下文 |
|----------|------|------|--------|
| `call` | 通用调用 | ❌ | 调用者上下文 |
| `delegatecall` | 委托调用 | ❌ | 当前合约上下文 |
| `staticcall` | 静态调用 | ✅ | 调用者上下文 |

**实战示例**：
```solidity
// 调用外部合约并处理错误
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

function safeTokenTransfer(address token, address to, uint256 amount) public returns (bool) {
    (bool success, bytes memory data) = token.call(
        abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
    );
    
    // 检查调用是否成功
    require(success, "Transfer failed");
    
    // 检查返回值
    return abi.decode(data, (bool));
}
```

**幽默类比**：
- `call` 就像打电话："喂，帮我转账"
- `delegatecall` 就像借用别人的身份："我用你的名义转账"
- `staticcall` 就像只读查询："查一下余额"

## 🔧 高级控制技巧

### 提前返回（Early Return）

```solidity
// ✅ 推荐：使用提前返回
function complexFunction(uint256 _value) public view returns (string memory) {
    if (_value == 0) {
        revert("Value cannot be zero");
    }
    if (paused) {
        revert("Contract is paused");
    }
    if (msg.sender != owner) {
        revert("Unauthorized");
    }
    
    // 主要逻辑
    return "Success";
}

// ❌ 避免：深层嵌套
function complexFunctionBad(uint256 _value) public view returns (string memory) {
    if (_value != 0) {
        if (!paused) {
            if (msg.sender == owner) {
                return "Success";
            } else {
                revert("Unauthorized");
            }
        } else {
            revert("Contract is paused");
        }
    } else {
        revert("Value cannot be zero");
    }
}
```

### 修改器组合

```solidity
modifier whenNotPaused() {
    require(!paused, "Contract is paused");
    _;
}

modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

function sensitiveAction() public onlyOwner whenNotPaused {
    // 必须是所有者且合约未暂停
}
```

### 多条件组合

```solidity
function complexCondition(uint256 age, bool hasPermission, uint256 balance) public pure returns (bool) {
    // 使用括号明确优先级
    if ((age >= 18 && hasPermission) || (balance > 1000)) {
        return true;
    }
    return false;
}
```

## 📊 算法复杂度和 Gas

### 常见算法复杂度

| 算法 | 时间复杂度 | 适用场景 | Gas 成本 |
|------|-----------|----------|----------|
| **线性查找** | O(n) | 小数组 | 低 |
| **二分查找** | O(log n) | 已排序数组 | 中 |
| **冒泡排序** | O(n²) | 小数组 | 高 |
| **快速排序** | O(n log n) | 大数组 | 中 |

**Gas 对比示例**：
```solidity
// ❌ O(n) - 线性查找
function linearSearch(uint256[] memory _array, uint256 _target) public pure returns (bool) {
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] == _target) {
            return true;
        }
    }
    return false;
}

// ✅ O(log n) - 二分查找（要求已排序）
function binarySearch(uint256[] memory _array, uint256 _target) public pure returns (int256) {
    uint256 left = 0;
    uint256 right = _array.length - 1;
    
    while (left <= right) {
        uint256 mid = left + (right - left) / 2;
        
        if (_array[mid] == _target) {
            return int256(mid);
        } else if (_array[mid] < _target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return -1; // 未找到
}
```

## 💡 实用模式

### 批量操作

```solidity
function batchTransfer(address[] memory _recipients, uint256[] memory _amounts) public payable {
    require(_recipients.length == _amounts.length, "Length mismatch");
    
    // 计算总额
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < _amounts.length; i++) {
        totalAmount += _amounts[i];
    }
    
    require(msg.value >= totalAmount, "Insufficient funds");
    
    // 执行转账
    for (uint256 i = 0; i < _recipients.length; i++) {
        payable(_recipients[i]).transfer(_amounts[i]);
    }
}
```

### 数组过滤

```solidity
function filterGreaterThan(uint256[] memory _array, uint256 _threshold) public pure returns (uint256[] memory) {
    // 先计算符合条件的元素数量
    uint256 count = 0;
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] > _threshold) {
            count++;
        }
    }
    
    // 创建结果数组
    uint256[] memory result = new uint256[](count);
    uint256 index = 0;
    
    for (uint256 i = 0; i < _array.length; i++) {
        if (_array[i] > _threshold) {
            result[index] = _array[i];
            index++;
        }
    }
    
    return result;
}
```

### 斐波那契数列

```solidity
function fibonacci(uint256 n) public pure returns (uint256) {
    if (n <= 1) {
        return n;
    }
    
    uint256[] memory fib = new uint256[](n + 1);
    fib[0] = 0;
    fib[1] = 1;
    
    for (uint256 i = 2; i <= n; i++) {
        fib[i] = fib[i - 1] + fib[i - 2];
    }
    
    return fib[n];
}
```

## 🎓 课后练习

### 基础题（必做）

1. **成绩评级系统**
   - 使用 if-else 根据分数评级（A/B/C/D/F）
   - 使用三元运算符判断及格
   - 处理边界条件

2. **数组统计**
   - 计算数组的最大值、最小值、平均值
   - 使用 for 循环遍历
   - 使用 break 提前退出优化

3. **质数检查**
   - 实现质数检查函数
   - 使用优化算法（只检查到 √n）
   - 使用 continue 跳过偶数

### 进阶题（选做）

1. **排序算法实现**
   - 实现冒泡排序
   - 实现选择排序
   - 对比不同算法的 Gas 消耗

2. **搜索算法对比**
   - 实现线性查找
   - 实现二分查找
   - 测量并对比性能

3. **批量操作优化**
   - 批量转账合约
   - 批量批准合约
   - 优化循环以减少 Gas

## 🔗 常见问题

### Q1: 为什么循环次数有限制？
**A**: 
- Gas 限制：每个区块有 Gas 上限
- 避免无限循环：可能导致合约卡死
- 建议：循环次数不超过合理范围（如 1000 次）

### Q2: For 和 While 循环如何选择？
**A**: 
- 已知次数：用 `for`
- 未知次数：用 `while`
- 至少执行一次：用 `do-while`

### Q3: 如何优化循环的 Gas 消耗？
**A**: 
```solidity
// ✅ 缓存数组长度
uint256 length = _array.length;
for (uint256 i = 0; i < length; i++) {
    // ...
}

// ✅ 使用 unchecked（确定不会溢出时）
unchecked {
    for (uint256 i = 0; i < n; ++i) {
        sum += i;
    }
}

// ✅ 提前退出
for (uint256 i = 0; i < _array.length; i++) {
    if (_array[i] == target) {
        return i;
    }
}
```

### Q4: Try-catch 会消耗更多 Gas 吗？
**A**: 
- Try-catch 本身不消耗额外 Gas
- 但失败的调用会消耗所有 Gas（除非使用 low-level call）
- 建议先检查条件，避免不必要的调用

### Q5: 什么时候使用嵌套循环？
**A**: 
- 尽量避免嵌套循环（O(n²) 复杂度）
- 考虑使用映射（O(1)）代替数组查找
- 如果必须使用，确保数组大小很小

## 📚 延伸阅读

- [Solidity 控制结构文档](https://docs.soliditylang.org/en/v0.8.20/control-structures.html)
- [Loop 优化技巧](https://docs.soliditylang.org/en/v0.8.20/internals/optimizer.html)
- [低级调用函数](https://docs.soliditylang.org/en/v0.8.20/units-and-global-variables.html#block-and-transaction-properties)
- [算法复杂度分析](https://www.bigocheatsheet.com/)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 熟练使用 if-else 条件语句
- [ ] 掌握 for、while、do-while 循环
- [ ] 理解 break 和 continue 的使用场景
- [ ] 能够使用 try-catch 处理外部调用错误
- [ ] 理解短路评估的 Gas 优化原理
- [ ] 掌握常见算法的实现
- [ ] 了解不同算法的时间复杂度
- [ ] 完成至少一个基础练习题

---

**下一课预告**：面向对象编程 - 学习 Contract、Interface、Library、继承等高级特性！

**继续你的 Solidity 之旅！** 🚀

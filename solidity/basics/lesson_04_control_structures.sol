// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ControlStructures
 * @dev Solidity 控制结构完整示例
 * @notice 演示 if-else、循环、try-catch 等控制流语句
 */
contract ControlStructures {
    
    // ==================== 状态变量 ====================
    
    uint256 public counter = 0;
    uint256[] public numbers;
    mapping(address => uint256) public scores;
    bool public paused = false;
    address public owner;
    
    // ==================== 构造函数 ====================
    
    constructor() {
        owner = msg.sender;
    }
    
    // ==================== If-Else 语句 ====================
    
    /**
     * @notice 基本 if-else 语句
     */
    function checkValue(uint256 _value) public pure returns (string memory) {
        if (_value < 10) {
            return "Small";
        } else if (_value < 100) {
            return "Medium";
        } else {
            return "Large";
        }
    }
    
    /**
     * @notice 嵌套 if-else
     */
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
    
    /**
     * @notice 短路评估（Short-circuit Evaluation）
     */
    function shortCircuit(uint256 a, uint256 b, uint256 c) public pure returns (bool) {
        // 如果 a 为 false，不会评估 b 和 c
        if (a > 10 && b > 20 && c > 30) {
            return true;
        }
        return false;
    }
    
    /**
     * @notice 三元运算符
     */
    function ternaryOperator(uint256 _value) public pure returns (string memory) {
        return _value > 50 ? "Greater than 50" : "Less than or equal to 50";
    }
    
    // ==================== For 循环 ====================
    
    /**
     * @notice 基本 for 循环
     */
    function sumArray(uint256[] memory _array) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _array.length; i++) {
            sum += _array[i];
        }
        return sum;
    }
    
    /**
     * @notice 嵌套循环（谨慎使用，Gas 高）
     */
    function createMatrix(uint256 rows, uint256 cols) public pure returns (uint256[][] memory) {
        uint256[][] memory matrix = new uint256[][](rows);
        for (uint256 i = 0; i < rows; i++) {
            matrix[i] = new uint256[](cols);
            for (uint256 j = 0; j < cols; j++) {
                matrix[i][j] = (i + 1) * (j + 1);
            }
        }
        return matrix;
    }
    
    /**
     * @notice 遍历数组并修改
     */
    function doubleArrayValues(uint256[] memory _array) public pure returns (uint256[] memory) {
        uint256[] memory result = new uint256[](_array.length);
        for (uint256 i = 0; i < _array.length; i++) {
            result[i] = _array[i] * 2;
        }
        return result;
    }
    
    /**
     * @dev 循环中的 continue，跳过奇数
     */
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
    
    /**
     * @notice 循环中的 break
     */
    function findFirstLargeNumber(uint256[] memory _array) public pure returns (uint256, bool) {
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] > 1000) {
                return (_array[i], true); // 找到后立即退出
            }
        }
        return (0, false);
    }
    
    // ==================== While 循环 ====================
    
    /**
     * @notice 基本 while 循环
     */
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
    
    /**
     * @notice Do-while 循环
     */
    function processAtLeastOnce(uint256 _target) public pure returns (uint256 iterations) {
        uint256 count = 0;
        do {
            count++;
        } while (count < _target);
        return count;
    }
    
    // ==================== For vs While 对比 ====================
    
    /**
     * @notice For 循环 - 推荐用于已知迭代次数
     */
    function forLoopSum(uint256 n) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 1; i <= n; i++) {
            sum += i;
        }
        return sum;
    }
    
    /**
     * @notice While 循环 - 推荐用于未知迭代次数
     */
    function whileLoopSum(uint256 target) public pure returns (uint256) {
        uint256 sum = 0;
        uint256 i = 1;
        while (sum < target) {
            sum += i;
            i++;
        }
        return sum;
    }
    
    // ==================== Try-Catch 错误处理 ====================
    
    /**
     * @notice 尝试调用外部合约并捕获错误
     */
    function tryExternalCall(address _contract, uint256 _value) public returns (bool success) {
        // 假设外部合约有一个 setValue 函数
        (success, ) = _contract.call(abi.encodeWithSignature("setValue(uint256)", _value));
        return success;
    }
    
    /**
     * @notice Try-catch 与 delegatecall
     */
    function tryDelegateCall(address _target, bytes memory _data) public returns (bool, bytes memory) {
        (bool success, bytes memory result) = _target.delegatecall(_data);
        return (success, result);
    }
    
    /**
     * @notice Try-catch 与 staticcall（只读调用）
     */
    function tryStaticCall(address _contract, bytes memory _data) public view returns (bool, bytes memory) {
        (bool success, bytes memory result) = _contract.staticcall(_data);
        return (success, result);
    }
    
    // ==================== 高级控制结构 ====================
    
    /**
     * @notice 使用 revert 提前退出
     */
    function earlyExit(uint256 _value) public pure returns (uint256) {
        if (_value == 0) {
            revert("Value cannot be zero");
        }
        
        // 执行主要逻辑
        return _value * 2;
    }
    
    /**
     * @notice 多条件组合
     */
    function complexCondition(uint256 age, bool hasPermission, uint256 balance) public pure returns (bool) {
        // 使用括号明确优先级
        if ((age >= 18 && hasPermission) || (balance > 1000)) {
            return true;
        }
        return false;
    }
    
    /**
     * @notice 使用修改器进行控制
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function sensitiveAction() public view onlyOwner whenNotPaused returns (string memory) {
        return "Action executed successfully";
    }
    
    // ==================== 实战示例 ====================
    
    /**
     * @notice 批量转账
     */
    function batchTransfer(address[] memory _recipients, uint256[] memory _amounts) public payable {
        require(_recipients.length == _amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        require(msg.value >= totalAmount, "Insufficient funds");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            payable(_recipients[i]).transfer(_amounts[i]);
        }
    }
    
    /**
     * @notice 查找数组中的最大值
     */
    function findMax(uint256[] memory _array) public pure returns (uint256) {
        require(_array.length > 0, "Array is empty");
        
        uint256 maxVal = _array[0];
        for (uint256 i = 1; i < _array.length; i++) {
            if (_array[i] > maxVal) {
                maxVal = _array[i];
            }
        }
        return maxVal;
    }
    
    /**
     * @notice 检查数组是否包含某个值
     */
    function contains(uint256[] memory _array, uint256 _value) public pure returns (bool) {
        for (uint256 i = 0; i < _array.length; i++) {
            if (_array[i] == _value) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice 过滤数组（只保留符合条件的元素）
     */
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
    
    /**
     * @notice 冒泡排序示例
     */
    function bubbleSort(uint256[] memory _array) public pure returns (uint256[] memory) {
        uint256 n = _array.length;
        
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (_array[j] > _array[j + 1]) {
                    // 交换元素
                    uint256 temp = _array[j];
                    _array[j] = _array[j + 1];
                    _array[j + 1] = temp;
                }
            }
        }
        
        return _array;
    }
    
    /**
     * @notice 二分查找（假设数组已排序）
     */
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
                if (mid == 0) break;
                right = mid - 1;
            }
        }
        
        return -1; // 未找到
    }
    
    // ==================== 实用函数 ====================
    
    /**
     * @notice 切换暂停状态
     */
    function togglePause() public onlyOwner {
        paused = !paused;
    }
    
    /**
     * @notice 添加到数字数组
     */
    function addNumber(uint256 _num) public {
        numbers.push(_num);
    }
    
    /**
     * @notice 获取数组长度
     */
    function getNumbersLength() public view returns (uint256) {
        return numbers.length;
    }
    
    /**
     * @notice 清空数组
     */
    function clearNumbers() public {
        delete numbers;
    }
    
    /**
     * @notice 计算平均值
     */
    function average(uint256[] memory _array) public pure returns (uint256) {
        require(_array.length > 0, "Array is empty");
        
        uint256 sum = 0;
        for (uint256 i = 0; i < _array.length; i++) {
            sum += _array[i];
        }
        
        return sum / _array.length;
    }
    
    /**
     * @notice 斐波那契数列计算
     */
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
}

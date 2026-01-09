// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GasOptimizationBasics
 * @dev Gas 优化基础完整示例
 * @notice 演示 Storage 打包、循环优化、事件优化等 Gas 优化技巧
 */

// ==================== Storage 优化 ====================

/**
 * @title PackingOptimization
 * @dev 存储打包优化示例
 */
contract PackingOptimization {
    // ❌ 错误:未优化,占用 5 个 slot (约 20000 Gas)
    struct BadPacked {
        uint256 a;      // 32 字节
        address b;      // 20 字节
        bool c;         // 1 字节
        uint256 d;      // 32 字节
        uint8 e;        // 1 字节
    }

    // ✅ 正确:优化后,占用 2 个 slot (约 8000 Gas)
    struct WellPacked {
        uint256 a;      // 32 字节 - slot 1
        uint256 d;      // 32 字节 - slot 2
        address b;      // 20 字节
        bool c;         // 1 字节
        uint8 e;        // 1 字节
        // 总共 22 字节,打包到 slot 3
    }

    // ❌ 错误:变量声明顺序不当
    uint256 public large1 = 100;
    uint8 public small = 1;
    uint256 public large2 = 200;
    // 占用 3 个 slot

    // ✅ 正确:小变量打包在一起
    uint256 public optimizedLarge1 = 100;
    uint256 public optimizedLarge2 = 200;
    uint8 public optimizedSmall = 1;
    // 占用 2 个 slot

    /**
     * @dev 计算打包后的存储槽位
     */
    function calculateStorageSlots() public pure returns (uint256 badSlots, uint256 goodSlots) {
        BadPacked memory bad = BadPacked(1, address(1), true, 2, 3);
        badSlots = 5; // 实际需要 5 个 slot

        WellPacked memory good = WellPacked(1, address(1), true, 2, 3);
        goodSlots = 2; // 只需 2 个 slot
    }
}

/**
 * @title StorageVsMemory
 * @dev Storage vs Memory 对比
 */
contract StorageVsMemory {
    uint256 public value1;
    uint256 public value2;
    uint256 public value3;

    // ❌ 错误:在循环中读取 Storage
    function sumBad() public view returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < 3; i++) {
            if (i == 0) sum += value1;  // 每次 SLOAD 成本高
            else if (i == 1) sum += value2;
            else sum += value3;
        }
        return sum;
    }

    // ✅ 正确:缓存到 Memory
    function sumGood() public view returns (uint256) {
        uint256 v1 = value1;  // 只读取 3 次 SLOAD
        uint256 v2 = value2;
        uint256 v3 = value3;

        uint256 sum = 0;
        for (uint256 i = 0; i < 3; i++) {
            if (i == 0) sum += v1;  // MLOAD 成本低
            else if (i == 1) sum += v2;
            else sum += v3;
        }
        return sum;
    }

    /**
     * @dev 对比 Gas 消耗
     */
    function compareGas() public view returns (uint256 badGas, uint256 goodGas) {
        uint256 gasBefore = gasleft();
        sumBad();
        badGas = gasBefore - gasleft();

        gasBefore = gasleft();
        sumGood();
        goodGas = gasBefore - gasleft();

        // goodGas 应该显著少于 badGas
    }
}

/**
 * @title CalldataOptimization
 * @dev Calldata vs Memory vs Storage
 */
contract CalldataOptimization {
    // ❌ 错误:使用 Memory(需要复制)
    function processArrayBad(uint256[] memory arr) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        return sum;
    }

    // ✅ 正确:使用 Calldata(只读,不复制)
    function processArrayGood(uint256[] calldata arr) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        return sum;
    }

    // ✅ 最佳:如果需要修改,先到 Memory
    function processArrayBest(uint256[] calldata arr) public pure returns (uint256) {
        uint256[] memory temp = arr;  // 复制一次
        uint256 sum = 0;

        for (uint256 i = 0; i < temp.length; i++) {
            temp[i] *= 2;  // 修改
            sum += temp[i];
        }
        return sum;
    }
}

// ==================== 循环优化 ====================

/**
 * @title LoopOptimization
 * @dev 循环优化技巧
 */
contract LoopOptimization {
    uint256[] public numbers;

    // ❌ 错误:动态数组循环,每次检查长度
    function processBad(uint256[] memory arr) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < arr.length; i++) {  // 每次都读取 length
            sum += arr[i];
        }
        return sum;
    }

    // ✅ 正确:缓存数组长度
    function processGood(uint256[] memory arr) public pure returns (uint256) {
        uint256 sum = 0;
        uint256 length = arr.length;  // 缓存长度
        for (uint256 i = 0; i < length; i++) {
            sum += arr[i];
        }
        return sum;
    }

    // ❌ 错误:在循环中写入 Storage
    function incrementBad() public {
        for (uint256 i = 0; i < numbers.length; i++) {
            numbers[i] += 1;  // 每次 SSTORE
        }
    }

    // ✅ 正确:使用 Memory 批量更新
    function incrementGood() public {
        uint256 length = numbers.length;
        uint256[] memory temp = new uint256[](length);

        // 读取到 Memory
        for (uint256 i = 0; i < length; i++) {
            temp[i] = numbers[i] + 1;
        }

        // 批量写回 Storage
        for (uint256 i = 0; i < length; i++) {
            numbers[i] = temp[i];
        }
    }

    // ✅ 最佳:使用 unchecked 块(Solidity 0.8+)
    function sumUnchecked(uint256[] calldata arr) public pure returns (uint256) {
        uint256 sum = 0;
        uint256 length = arr.length;

        for (uint256 i = 0; i < length; ) {
            unchecked {
                sum += arr[i];
                ++i;  // 不会溢出检查
            }
        }
        return sum;
    }
}

/**
 * @title BatchOperations
 * @dev 批量操作优化
 */
contract BatchOperations {
    mapping(address => uint256) public balances;

    // ❌ 错误:逐个转账
    function batchTransferBad(
        address[] memory recipients,
        uint256[] memory amounts
    ) public {
        for (uint256 i = 0; i < recipients.length; i++) {
            require(balances[msg.sender] >= amounts[i], "Insufficient balance");
            balances[msg.sender] -= amounts[i];
            balances[recipients[i]] += amounts[i];
        }
    }

    // ✅ 正确:预先计算总额
    function batchTransferGood(
        address[] memory recipients,
        uint256[] memory amounts
    ) public {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(balances[msg.sender] >= totalAmount, "Insufficient balance");
        balances[msg.sender] -= totalAmount;

        for (uint256 i = 0; i < recipients.length; i++) {
            balances[recipients[i]] += amounts[i];
        }
    }
}

// ==================== 事件优化 ====================

/**
 * @title EventOptimization
 * @dev 事件优化技巧
 */
contract EventOptimization {
    // ❌ 错误:过多 indexed 参数(最多 3 个)
    event BadEvent(
        address indexed from,
        address indexed to,
        uint256 indexed amount,
        uint256 timestamp  // 第 4 个参数不能 indexed
    );

    // ✅ 正确:最多 3 个 indexed
    event GoodEvent(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp  // 不 indexed
    );

    // ❌ 错误:频繁触发事件
    function logNumbersBad(uint256[] memory numbers) public {
        for (uint256 i = 0; i < numbers.length; i++) {
            emit NumberLogged(numbers[i]);  // N 次事件
        }
    }

    // ✅ 正确:汇总事件
    function logNumbersGood(uint256[] memory numbers) public {
        emit NumbersLogged(numbers);  // 1 次事件
    }

    event NumberLogged(uint256 number);
    event NumbersLogged(uint256[] numbers);

    // ✅ 最佳:批量事件+哈希
    function logNumbersBest(uint256[] calldata numbers) public {
        bytes32 hash = keccak256(abi.encodePacked(numbers));
        uint256 sum = 0;

        for (uint256 i = 0; i < numbers.length; ) {
            unchecked {
                sum += numbers[i];
                ++i;
            }
        }

        emit NumbersBatchLogged(numbers.length, sum, hash);
    }

    event NumbersBatchLogged(
        uint256 count,
        uint256 total,
        bytes32 indexed dataHash
    );
}

// ==================== 短路优化 ====================

/**
 * @title ShortCircuiting
 * @dev 短路评估优化
 */
contract ShortCircuiting {
    address public owner;
    uint256 public value;

    // ❌ 错误:高成本检查在前
    function checkBad(uint256 amount) public view returns (bool) {
        // 复杂计算在前,如果失败前面的检查就浪费了
        if (calculateExpensiveThing() > 100) {
            return false;
        }
        if (amount == 0) {
            return false;
        }
        if (msg.sender != owner) {
            return false;
        }
        return true;
    }

    // ✅ 正确:低成本检查在前
    function checkGood(uint256 amount) public view returns (bool) {
        // 简单检查在前,快速失败
        if (amount == 0) {
            return false;
        }
        if (msg.sender != owner) {
            return false;
        }
        if (calculateExpensiveThing() > 100) {
            return false;
        }
        return true;
    }

    function calculateExpensiveThing() public pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < 100; i++) {
            result += i;
        }
        return result;
    }
}

// ==================== 数学优化 ====================

/**
 * @title MathOptimization
 * @dev 数学运算优化
 */
contract MathOptimization {
    // ❌ 错误:使用除法
    function divideBad(uint256 x, uint256 y) public pure returns (uint256) {
        return x / y;  // 除法很贵
    }

    // ✅ 正确:使用右移(如果是 2 的幂)
    function divideGood(uint256 x) public pure returns (uint256) {
        return x >> 2;  // 相当于除以 4,但更便宜
    }

    // ❌ 错误:重复计算
    function calculateBad(uint256 x) public pure returns (uint256) {
        return (x * 3) + (x * 3) + (x * 3);  // 3 次乘法
    }

    // ✅ 正确:缓存结果
    function calculateGood(uint256 x) public pure returns (uint256) {
        uint256 temp = x * 3;
        return temp + temp + temp;  // 1 次乘法,2 次加法
    }

    // ✅ 最佳:展开表达式
    function calculateBest(uint256 x) public pure returns (uint256) {
        return x * 9;  // 1 次乘法
    }

    // 使用 unchecked 块避免溢出检查
    function addUnchecked(uint256 a, uint256 b) public pure returns (uint256) {
        unchecked {
            return a + b;  // 没有 overflow check
        }
    }

    function multiplyUnchecked(uint256 a, uint256 b) public pure returns (uint256) {
        unchecked {
            return a * b;  // 没有 overflow check
        }
    }
}

// ==================== 综合优化示例 ====================

/**
 * @title OptimizedContract
 * @dev 综合优化的合约示例
 */
contract OptimizedContract {
    // 打包存储
    address public owner;
    bool public paused;
    uint8 public version;
    uint96 public totalSupply;  // 96 位足够大

    uint256 public value1;
    uint256 public value2;

    mapping(address => uint256) public balances;

    event BatchTransfer(address indexed from, uint256 count, uint256 total);

    constructor() {
        owner = msg.sender;
        version = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // 优化的批量转账
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        uint256 length = recipients.length;
        require(length == amounts.length, "Length mismatch");
        require(length <= 100, "Too many recipients");

        uint256 totalAmount = 0;

        // 使用 unchecked 块
        for (uint256 i = 0; i < length; ) {
            unchecked {
                totalAmount += amounts[i];
                ++i;
            }
        }

        require(balances[msg.sender] >= totalAmount, "Insufficient balance");

        // 更新余额
        balances[msg.sender] -= totalAmount;

        for (uint256 i = 0; i < length; ) {
            unchecked {
                balances[recipients[i]] += amounts[i];
                ++i;
            }
        }

        emit BatchTransfer(msg.sender, length, totalAmount);
    }

    // 优化的数组求和
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

    // 优化的条件检查
    function validateAndExecute(
        uint256 amount,
        address recipient
    ) external view returns (bool) {
        // 低成本检查在前
        if (amount == 0) return false;
        if (recipient == address(0)) return false;
        if (paused) return false;

        // 权限检查
        if (msg.sender != owner) return false;

        // 余额检查(成本较高)
        if (balances[msg.sender] < amount) return false;

        return true;
    }

    // 优化的字符串比较
    function compareStrings(string memory a, string memory b) public pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}

/**
 * @title GasComparison
 * @dev Gas 消耗对比合约
 */
contract GasComparison {
    /**
     * @dev 对比不同实现的 Gas 消耗
     */
    function compareImplementations(
        uint256[] calldata arr
    ) external pure returns (
        uint256 badGas,
        uint256 goodGas,
        uint256 bestGas
    ) {
        uint256 gasBefore;

        // Bad implementation
        gasBefore = gasleft();
        uint256 sum1 = 0;
        for (uint256 i = 0; i < arr.length; i++) {
            sum1 += arr[i];
        }
        badGas = gasBefore - gasleft();

        // Good implementation
        gasBefore = gasleft();
        uint256 sum2 = 0;
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            sum2 += arr[i];
        }
        goodGas = gasBefore - gasleft();

        // Best implementation (with unchecked)
        gasBefore = gasleft();
        uint256 sum3 = 0;
        for (uint256 i = 0; i < length; ) {
            unchecked {
                sum3 += arr[i];
                ++i;
            }
        }
        bestGas = gasBefore - gasleft();

        // 验证结果一致
        assert(sum1 == sum2 && sum2 == sum3);
    }
}

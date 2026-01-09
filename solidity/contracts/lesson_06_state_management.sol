// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StateManagement
 * @dev Solidity 状态管理深度剖析
 * @notice 演示 Storage 布局、Memory vs Calldata 性能对比、变量作用域等
 */
contract StateManagement {
    
    // ==================== Storage 布局示例 ====================
    
    /**
     * @notice 演示 Storage 打包优化
     * @dev 每个 Storage 槽是 32 字节
     *      编译器会自动将小变量打包到同一个槽
     */
    // 槽 0: owner (20 字节) + paused (1 字节) = 21 字节
    address public owner;
    bool public paused;
    
    // 槽 1: counter (32 字节)
    uint256 public counter;
    
    // 槽 2: maxValue (32 字节)
    uint128 public maxValue = 1000;
    uint128 public minValue = 0;
    
    // 槽 3: flag1 + flag2 + flag3 可以打包
    bool public flag1 = true;
    bool public flag2 = false;
    bool public flag3 = true;
    uint8 public smallValue = 255;
    
    /**
     * @notice 演示固定大小数组在 Storage 中的布局
     */
    uint256[3] public fixedArray; // 占用 3 个槽
    
    /**
     * @notice 演示结构体的 Storage 布局
     */
    struct User {
        uint128 id;        // 16 字节
        uint128 balance;   // 16 字节
        bool verified;     // 1 字节
        address wallet;    // 20 字节
        // 总共 37 字节，占用 2 个槽（32 + 5）
    }
    
    User public admin;
    mapping(uint256 => User) public users;
    
    // ==================== 构造函数 ====================
    
    constructor() {
        owner = msg.sender;
        admin = User({
            id: 1,
            balance: 1000,
            verified: true,
            wallet: msg.sender
        });
    }
    
    // ==================== Storage 读写成本演示 ====================
    
    /**
     * @notice 读取 Storage 变量
     * @dev SLOAD 操作成本：2100 gas（冷访问）或 100 gas（热访问）
     */
    function readStorage() public view returns (
        uint256 _counter,
        bool _paused,
        uint256 _maxValue
    ) {
        _counter = counter;
        _paused = paused;
        _maxValue = maxValue;
    }
    
    /**
     * @notice 写入 Storage 变量
     * @dev SSTORE 操作成本：
     *      - 第一次写入（冷）：20,000 gas
     *      - 修改现有值（热）：5,000 gas
     *      - 清零（退款）：15,000 gas
     */
    function writeStorage(uint256 _newValue) public {
        counter = _newValue;
    }
    
    /**
     * @notice 批量写入 vs 单次写入对比
     */
    function batchWrite(
        uint256 _value1,
        uint256 _value2,
        uint256 _value3
    ) public {
        fixedArray[0] = _value1;
        fixedArray[1] = _value2;
        fixedArray[2] = _value3;
    }
    
    // ==================== Memory vs Calldata 性能对比 ====================
    
    /**
     * @notice Memory 版本
     * @dev Memory 可以修改，但成本较高
     */
    function processMemory(uint256[] memory _data) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _data.length; i++) {
            sum += _data[i];
        }
        return sum;
    }
    
    /**
     * @notice Calldata 版本
     * @dev Calldata 不可修改，但成本更低
     */
    function processCalldata(uint256[] calldata _data) external pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _data.length; i++) {
            sum += _data[i];
        }
        return sum;
    }
    
    /**
     * @notice Memory 可以修改
     */
    function modifyMemory(uint256[] memory _data) public pure returns (uint256[] memory) {
        for (uint256 i = 0; i < _data.length; i++) {
            _data[i] *= 2;
        }
        return _data;
    }
    
    // ==================== 变量作用域与生命周期 ====================
    
    /**
     * @notice 演示不同作用域的变量
     */
    function scopeExample() public pure returns (uint256) {
        // 局部变量（Memory）
        uint256 localVar = 100;
        
        {
            // 块作用域变量
            uint256 blockScoped = 200;
            localVar += blockScoped;
        }
        
        // blockScoped 在这里不可访问
        
        return localVar;
    }
    
    /**
     * @notice 演示循环变量的作用域
     */
    function loopScope() public pure returns (uint256) {
        uint256 sum = 0;
        
        for (uint256 i = 0; i < 10; i++) {
            sum += i;
        }
        
        // i 在这里不可访问
        
        return sum;
    }
    
    // ==================== Storage 打包优化 ====================
    
    /**
     * @notice 未优化的结构
     * @dev 每个变量占用一个槽，浪费空间
     */
    struct NotOptimized {
        uint256 a;  // 32 字节 - 槽 N
        bool b;     // 1 字节 - 槽 N+1
        uint8 c;    // 1 字节 - 槽 N+2
    }
    
    /**
     * @notice 优化的结构
     * @dev 小变量打包到同一个槽
     */
    struct Optimized {
        uint256 a;  // 32 字节 - 槽 N
        bool b;     // 1 字节
        uint8 c;    // 1 字节
        // b 和 c 可以与后面的变量打包
    }
    
    /**
     * @notice 演示优化前后的 Gas 差异
     */
    NotOptimized public notOptimizedData;
    Optimized public optimizedData;
    
    function setNotOptimized(uint256 _a, bool _b, uint8 _c) public {
        notOptimizedData = NotOptimized(_a, _b, _c);
    }
    
    function setOptimized(uint256 _a, bool _b, uint8 _c) public {
        optimizedData = Optimized(_a, _b, _c);
    }
    
    // ==================== 状态变量持久化机制 ====================
    
    /**
     * @notice 演示状态变量的持久化
     */
    uint256 public persistentValue = 0;
    
    function incrementPersistent() public {
        persistentValue += 1;
        // 这个值会永久保存在区块链上
    }
    
    /**
     * @notice 演示临时变量的生命周期
     */
    function temporaryVariable() public pure returns (uint256) {
        uint256 temp = 100;
        temp *= 2;
        return temp;
        // temp 在函数结束后被删除
    }
    
    // ==================== 数据位置最佳实践 ====================
    
    /**
     * @notice 参数选择指南
     * @dev 
     *      - Storage: 状态变量
     *      - Memory: 需要修改的临时数据
     *      - Calldata: 只读参数（省 Gas）
     */
    
    // ✅ 推荐：外部函数使用 calldata
    function externalCall(uint256[] calldata _data) external pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _data.length; i++) {
            sum += _data[i];
        }
        return sum;
    }
    
    // ✅ 推荐：内部函数使用 memory
    function internalCall(uint256[] memory _data) internal pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _data.length; i++) {
            sum += _data[i];
        }
        return sum;
    }
    
    /**
     * @notice 演示 storage 和 memory 的互操作
     */
    function storageToMemory() public view returns (uint256) {
        uint256[] memory temp = new uint256[](3);
        temp[0] = fixedArray[0];
        temp[1] = fixedArray[1];
        temp[2] = fixedArray[2];
        
        uint256 sum = 0;
        for (uint256 i = 0; i < temp.length; i++) {
            sum += temp[i];
        }
        return sum;
    }
    
    // ==================== 高级主题 ====================
    
    /**
     * @notice 演示状态变量的初始化
     */
    uint256 public initializedValue = 100;  // 显式初始化
    uint256 public defaultValue;           // 默认为 0
    
    /**
     * @notice 演示常量和不可变变量
     */
    uint256 public constant CONSTANT_VALUE = 1000;
    address public immutable IMMUTABLE_OWNER;
    
    constructor() {
        IMMUTABLE_OWNER = msg.sender;
    }
    
    /**
     * @notice 演示删除操作
     */
    uint256 public deletable = 999;
    
    function resetValue() public {
        delete deletable; // 重置为默认值 0
    }
    
    /**
     * @notice 演示数组在 Storage 中的行为
     */
    uint256[] public dynamicArray;
    
    function addToDynamicArray(uint256 _value) public {
        dynamicArray.push(_value);
    }
    
    function getDynamicArrayLength() public view returns (uint256) {
        return dynamicArray.length;
    }
    
    function getDynamicArrayElement(uint256 _index) public view returns (uint256) {
        return dynamicArray[_index];
    }
    
    /**
     * @notice 演示映射的 Storage 行为
     */
    mapping(address => uint256) public balances;
    
    function setBalance(address _account, uint256 _amount) public {
        balances[_account] = _amount;
    }
    
    function getBalance(address _account) public view returns (uint256) {
        return balances[_account];
    }
    
    /**
     * @notice 演示结构体数组
     */
    User[] public userList;
    
    function addUser(uint128 _id, uint128 _balance, bool _verified, address _wallet) public {
        userList.push(User({
            id: _id,
            balance: _balance,
            verified: _verified,
            wallet: _wallet
        }));
    }
    
    function getUser(uint256 _index) public view returns (
        uint128 id,
        uint128 balance,
        bool verified,
        address wallet
    ) {
        User memory user = userList[_index];
        return (user.id, user.balance, user.verified, user.wallet);
    }
    
    // ==================== Gas 优化示例 ====================
    
    /**
     * @notice 缓存 Storage 变量到 Memory
     */
    function cachedAccess() public view returns (uint256) {
        uint256 cachedCounter = counter; // SLOAD: 2100 gas
        uint256 result = cachedCounter * 2;
        return result;
    }
    
    /**
     * @notice 直接访问 Storage（不推荐）
     */
    function directAccess() public view returns (uint256) {
        return counter * 2; // SLOAD: 2100 gas
    }
    
    /**
     * @notice 批量读取优化
     */
    function batchRead() public view returns (
        uint256 _counter,
        bool _paused,
        uint256 _maxValue,
        uint256 _minValue
    ) {
        _counter = counter;
        _paused = paused;
        _maxValue = maxValue;
        _minValue = minValue;
    }
}

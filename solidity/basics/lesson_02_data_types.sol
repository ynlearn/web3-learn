// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataTypes
 * @dev Solidity 数据类型完整示例
 * @notice 演示值类型、引用类型和数据位置的用法
 */
contract DataTypes {
    
    // ==================== 值类型 (Value Types) ====================
    // 值类型在传递时进行值拷贝，修改副本不影响原值
    
    /**
     * @notice 布尔类型
     * @dev 默认值：false
     */
    bool public isActive = true;
    bool public isPaused = false;
    
    /**
     * @notice 无符号整数
     * @dev uint8 到 uint256，默认 uint256 等于 uint256
     *      默认值：0
     *      Solidity 0.8.x 内置溢出检查
     */
    uint8 public tinyNumber = 255;        // 0 到 2^8 - 1
    uint16 public smallNumber = 65535;    // 0 到 2^16 - 1
    uint256 public bigNumber = 4200000000000000000; // 4.2 * 10^18
    uint public defaultUint = 100;        // uint 等于 uint256
    
    /**
     * @notice 有符号整数
     * @dev int8 到 int256，默认 int256 等于 int256
     *      默认值：0
     */
    int8 public positiveTiny = 127;       // -2^7 到 2^7 - 1
    int8 public negativeTiny = -128;
    int256 public temperature = -25;      // 可以表示负数
    
    /**
     * @notice 地址类型
     * @dev 存储以太坊地址（20字节）
     *      默认值：0x0000...0000
     */
    address public owner;
    address public contractAddress;
    address payable public wallet;        // payable 地址可以接收 ETH
    
    /**
     * @notice 定长字节数组
     * @dev bytes1 到 bytes32
     *      默认值：0x00...
     */
    bytes1 public singleByte = 0xFF;      // 1 字节
    bytes32 public hash = keccak256("Hello"); // 32 字节，常用于存储哈希
    
    /**
     * @notice 枚举类型
     * @dev 自定义类型，默认值：第一个元素（0）
     */
    enum Status { Pending, Active, Inactive, Deleted }
    Status public currentStatus = Status.Active;
    
    // ==================== 引用类型 (Reference Types) ====================
    // 引用类型在传递时传递引用，需要指定数据位置
    
    /**
     * @notice 动态数组
     * @dev 长度可变，存储时消耗 Gas 较高
     */
    uint256[] public numbers;
    string[] public names;
    
    /**
     * @notice 定长数组
     * @dev 长度固定，Gas 效率更高
     */
    uint256[5] public fixedNumbers;       // 固定 5 个元素
    uint8[3] public rgb = [255, 128, 0]; // RGB 颜色值
    
    /**
     * @notice 字符串类型
     * @dev 特殊的动态字节数组
     */
    string public greeting = "Hello Web3";
    string public emptyString = "";
    
    /**
     * @notice 结构体
     * @dev 自定义复合数据类型
     */
    struct User {
        uint256 id;
        string name;
        bool verified;
        uint256 balance;
    }
    
    User public admin;
    User[] public users;
    mapping(uint256 => User) public userById;
    
    /**
     * @notice 映射（哈希表）
     * @dev key => value 的键值对存储
     *      不可遍历（除非配合数组）
     */
    mapping(address => uint256) public balances;
    mapping(string => uint256) public nameToId;
    mapping(uint256 => bool) public idExists;
    
    // ==================== 数据位置示例 ====================
    
    /**
     * @notice 演示 memory 数据位置
     * @dev memory 数据在函数执行期间存在，执行后删除
     */
    function processInMemory(uint256[] memory _numbers) public pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _numbers.length; i++) {
            sum += _numbers[i];
        }
        return sum;
    }
    
    /**
     * @notice 演示 calldata 数据位置
     * @dev calldata 只读且不可修改，用于外部函数参数，比 memory 省 Gas
     */
    function processInCalldata(uint256[] calldata _numbers) external pure returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < _numbers.length; i++) {
            sum += _numbers[i];
        }
        return sum;
    }
    
    /**
     * @notice 演示 storage 数据位置
     * @dev storage 数据永久存储在合约中，修改会影响状态变量
     */
    function addToStorage(uint256 _number) public {
        numbers.push(_number); // 修改状态变量
    }
    
    // ==================== 类型转换示例 ====================
    
    /**
     * @notice 显式类型转换
     * @dev 演示安全和不安全的转换
     */
    function typeConversion() public pure returns (uint256, int256) {
        uint256 a = 100;
        int256 b = -50;
        
        // 不安全的转换：可能导致意外结果
        uint256 c = uint256(b); // c 将是很大的正数
        
        // 安全的转换
        int256 d = int256(a);   // d = 100
        
        return (c, d);
    }
    
    // ==================== 构造函数和辅助函数 ====================
    
    constructor() {
        owner = msg.sender;
        wallet = payable(msg.sender);
        
        // 初始化管理员
        admin = User({
            id: 1,
            name: "Admin",
            verified: true,
            balance: 1000
        });
        
        users.push(admin);
        userById[1] = admin;
    }
    
    /**
     * @notice 添加新用户
     * @param _name 用户名
     * @param _balance 初始余额
     */
    function addUser(string memory _name, uint256 _balance) public {
        uint256 newId = users.length + 1;
        
        User memory newUser = User({
            id: newId,
            name: _name,
            verified: false,
            balance: _balance
        });
        
        users.push(newUser);
        userById[newId] = newUser;
        idExists[newId] = true;
    }
    
    /**
     * @notice 获取用户信息
     * @param _id 用户 ID
     */
    function getUser(uint256 _id) public view returns (User memory) {
        require(idExists[_id], "User does not exist");
        return userById[_id];
    }
    
    /**
     * @notice 设置余额
     * @param _account 地址
     * @param _amount 金额
     */
    function setBalance(address _account, uint256 _amount) public {
        balances[_account] = _amount;
    }
    
    /**
     * @notice 获取数组长度
     */
    function getNumbersCount() public view returns (uint256) {
        return numbers.length;
    }
    
    /**
     * @notice 获取数组元素
     * @param _index 索引
     */
    function getNumber(uint256 _index) public view returns (uint256) {
        require(_index < numbers.length, "Index out of bounds");
        return numbers[_index];
    }
    
    /**
     * @notice 演示枚举状态切换
     */
    function nextStatus() public {
        require(uint(currentStatus) < 3, "Already at last status");
        currentStatus = Status(uint(currentStatus) + 1);
    }
    
    /**
     * @notice 获取当前状态的字符串表示
     */
    function getStatusString() public view returns (string memory) {
        if (currentStatus == Status.Pending) return "Pending";
        if (currentStatus == Status.Active) return "Active";
        if (currentStatus == Status.Inactive) return "Inactive";
        if (currentStatus == Status.Deleted) return "Deleted";
        return "Unknown";
    }
    
    /**
     * @notice 演示 bytes32 与 string 转换
     */
    function stringToBytes32(string memory _source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(_source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        
        assembly {
            result := mload(add(_source, 32))
        }
    }
    
    /**
     * @notice 演示地址操作
     */
    function addressOperations(address _addr) public view returns (
        uint256 balance,
        bytes32 codeHash,
        bool isContract
    ) {
        balance = _addr.balance;
        codeHash = _addr.codehash; // 合约代码哈希，EOA 为 0x0
        isContract = _addr.code.length > 0; // 是否为合约
    }
    
    /**
     * @notice 演示整数运算
     */
    function arithmetic() public pure returns (
        uint256 sum,
        uint256 product,
        uint256 power,
        int256 difference
    ) {
        uint256 a = 10;
        uint256 b = 3;
        int256 x = 20;
        int256 y = 8;
        
        sum = a + b;           // 加法
        product = a * b;       // 乘法
        power = a ** b;        // 幂运算
        difference = x - y;    // 减法
        
        return (sum, product, power, difference);
    }
    
    /**
     * @notice 接收 ETH 的示例
     */
    receive() external payable {}
    
    /**
     * @notice 获取合约余额
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

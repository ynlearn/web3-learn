// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Functions
 * @dev Solidity 函数完整示例
 * @notice 演示函数可见性、修饰符、返回值、参数校验等
 */
contract Functions {
    
    // ==================== 状态变量 ====================
    
    uint256 public counter = 0;
    string public message = "Hello";
    address public owner;
    uint256 private privateValue = 100;
    mapping(address => uint256) public balances;
    
    // ==================== 构造函数 ====================
    
    constructor() {
        owner = msg.sender;
    }
    
    // ==================== 函数可见性示例 ====================
    
    /**
     * @notice Public 函数 - 内部和外部都可调用
     * @dev 自动生成 getter 函数（如果是 public 状态变量）
     */
    function publicFunction() public pure returns (string memory) {
        return "This is a public function";
    }
    
    /**
     * @notice External 函数 - 仅从外部调用
     * @dev 不能在内部直接调用，需要使用 this.functionName()
     *      Gas 成本比 public 低
     */
    function externalFunction() external pure returns (string memory) {
        return "This is an external function";
    }
    
    /**
     * @notice Internal 函数 - 仅合约内部及子合约可调用
     * @dev 不会生成 ABI 接口
     */
    function internalFunction() internal pure returns (string memory) {
        return "This is an internal function";
    }
    
    /**
     * @notice Private 函数 - 仅当前合约可调用
     * @dev 子合约也无法访问
     */
    function privateFunction() private pure returns (string memory) {
        return "This is a private function";
    }
    
    /**
     * @notice 演示内部调用 external 函数
     */
    function callExternalFunction() public pure returns (string memory) {
        // ❌ 不能直接调用 external 函数
        // return externalFunction();
        
        // ✅ 必须通过 this 调用（外部调用）
        return this.externalFunction();
    }
    
    /**
     * @notice 演示内部函数调用
     */
    function callInternalFunctions() public pure returns (string memory) {
        return internalFunction();
    }
    
    // ==================== 函数修饰符示例 ====================
    
    /**
     * @notice View 函数 - 不修改状态
     * @dev 可以读取状态变量，但不能修改
     */
    function getMessage() public view returns (string memory) {
        return message;
    }
    
    /**
     * @notice Pure 函数 - 不读取也不修改状态
     * @dev 保证函数不访问状态变量
     */
    function add(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    /**
     * @notice Payable 函数 - 可以接收 ETH
     */
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    /**
     * @notice 非 payable 函数无法接收 ETH
     */
    function nonPayableFunction() public {
        // 如果发送 ETH 调用此函数，会回滚
        counter += 1;
    }
    
    // ==================== 返回值示例 ====================
    
    /**
     * @notice 单个返回值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
    
    /**
     * @notice 多个返回值
     */
    function getMultipleValues() public view returns (
        uint256 count,
        string memory msg,
        address sender
    ) {
        return (counter, message, msg.sender);
    }
    
    /**
     * @notice 命名返回值
     * @dev 可以在函数体中直接使用返回值变量名
     */
    function getNamedReturns() public view returns (
        uint256 currentCount,
        string memory currentMessage
    ) {
        currentCount = counter;
        currentMessage = message;
        // 自动返回 currentCount 和 currentMessage
    }
    
    /**
     * @notice 返回值解构
     */
    function returnStruct() public view returns (
        uint256 count,
        string memory msg,
        bool isOwner
    ) {
        return (counter, message, msg.sender == owner);
    }
    
    // ==================== 参数校验示例 ====================
    
    /**
     * @notice 使用 require 进行校验
     * @dev 条件为 false 时回滚，并显示错误消息
     */
    function requireExample(uint256 _value) public {
        require(_value > 0, "Value must be greater than 0");
        require(_value <= 1000, "Value must be less than or equal to 1000");
        counter += _value;
    }
    
    /**
     * @notice 使用 revert 进行校验
     * @dev 复杂条件时使用 revert 更清晰
     */
    function revertExample(uint256 _value) public {
        if (_value == 0) {
            revert("Value cannot be zero");
        }
        if (_value > 1000) {
            revert("Value exceeds maximum");
        }
        counter += _value;
    }
    
    /**
     * @notice 使用 assert 进行内部检查
     * @dev 用于检查不应该失败的条件
     *      失败通常表示代码有 bug
     */
    function assertExample(uint256 _value) public {
        uint256 oldValue = counter;
        counter += _value;
        // 断言：counter 应该增加
        assert(counter > oldValue);
    }
    
    /**
     * @notice 自定义错误
     * @dev 比 require 更省 Gas
     */
    error InvalidValue(uint256 value, string reason);
    error Unauthorized(address caller);
    
    function customErrorExample(uint256 _value) public {
        if (_value == 0) {
            revert InvalidValue({
                value: _value,
                reason: "Value cannot be zero"
            });
        }
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        counter += _value;
    }
    
    // ==================== 命名参数示例 ====================
    
    /**
     * @notice 使用命名参数调用函数
     */
    function namedParameters(
        uint256 _first,
        uint256 _second,
        string memory _message
    ) public pure returns (string memory) {
        return string(abi.encodePacked(
            "First:", _first, 
            " Second:", _second, 
            " Message:", _message
        ));
    }
    
    /**
     * @notice 演示命名参数调用
     */
    function callNamedParameters() public pure returns (string memory) {
        return namedParameters({
            _message: "Hello",
            _first: 1,
            _second: 2
        });
    }
    
    // ==================== 函数重载示例 ====================
    
    /**
     * @notice 函数重载 - 相同名称，不同参数
     */
    function processValue(uint256 _value) public pure returns (string memory) {
        return string(abi.encodePacked("Processing uint:", _value));
    }
    
    function processValue(int256 _value) public pure returns (string memory) {
        return string(abi.encodePacked("Processing int:", _value));
    }
    
    function processValue(string memory _value) public pure returns (string memory) {
        return string(abi.encodePacked("Processing string:", _value));
    }
    
    // ==================== 函数修改器示例 ====================
    
    /**
     * @notice 修改器 - 只有所有者可以调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _; // 执行函数体
    }
    
    /**
     * @notice 使用 onlyOwner 修改器
     */
    function ownerOnlyFunction() public view onlyOwner returns (string memory) {
        return "Only owner can see this";
    }
    
    /**
     * @notice 带参数的修改器
     */
    modifier greaterThan(uint256 _value, uint256 _minimum) {
        require(_value > _minimum, "Value too small");
        _;
    }
    
    function setValue(uint256 _value) public greaterThan(_value, 10) {
        counter = _value;
    }
    
    /**
     * @notice 修改器中的代码执行顺序
     */
    modifier logBefore() {
        emit Log("Before function execution");
        _;
    }
    
    modifier logAfter() {
        _;
        emit Log("After function execution");
    }
    
    event Log(string message);
    
    function modifiedFunction() public logBefore logAfter returns (string memory) {
        return "Function executed";
    }
    
    // ==================== 特殊函数 ====================
    
    /**
     * @notice 接收 ETH 的回退函数
     */
    receive() external payable {
        emit DepositReceived(msg.sender, msg.value);
    }
    
    /**
     * @notice 处理不存在的函数调用
     */
    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value, msg.data);
    }
    
    event DepositReceived(address sender, uint256 amount);
    event FallbackCalled(address sender, uint256 amount, bytes data);
    
    // ==================== 实用函数 ====================
    
    /**
     * @notice 重置计数器（仅所有者）
     */
    function resetCounter(uint256 _newCounter) public onlyOwner {
        counter = _newCounter;
    }
    
    /**
     * @notice 增加计数器
     */
    function incrementCounter(uint256 _amount) public {
        require(_amount > 0, "Amount must be positive");
        counter += _amount;
    }
    
    /**
     * @notice 获取余额
     */
    function getBalance(address _account) public view returns (uint256) {
        return balances[_account];
    }
    
    /**
     * @notice 提取余额
     */
    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    /**
     * @notice 获取合约余额
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice 演示 view 函数的 Gas 消耗
     * @dev 注意：在链上调用 view 函数不消耗 Gas，
     *      但如果被其他合约调用，会消耗 Gas
     */
    function viewFunctionExample() public view returns (uint256) {
        return counter * 2;
    }
    
    /**
     * @notice 演示 pure 函数
     * @dev 不访问任何状态变量
     */
    function pureFunctionExample(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
}

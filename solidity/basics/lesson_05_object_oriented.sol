// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ObjectOrientedProgramming
 * @dev Solidity 面向对象编程完整示例
 * @notice 演示 Contract、Interface、Library、继承、抽象合约等
 */

// ==================== 基础合约 ====================

/**
 * @title Animal
 * @dev 基础动物合约（抽象合约）
 * @notice 抽象合约不能直接部署，必须被继承
 */
abstract contract Animal {
    string public name;
    
    constructor(string memory _name) {
        name = _name;
    }
    
    // 抽象函数：没有实现，子合约必须实现
    function makeSound() public virtual pure returns (string memory);
    
    function sleep() public pure returns (string memory) {
        return "Zzz...";
    }
}

/**
 * @title Dog
 * @dev 继承自 Animal 的狗合约
 */
contract Dog is Animal {
    string public breed;
    
    constructor(string memory _name, string memory _breed) Animal(_name) {
        breed = _breed;
    }
    
    function makeSound() public override pure returns (string memory) {
        return "Woof!";
    }
    
    function fetch() public pure returns (string memory) {
        return "Fetching the ball!";
    }
}

/**
 * @title Cat
 * @dev 继承自 Animal 的猫合约
 */
contract Cat is Animal {
    bool public isIndoor;
    
    constructor(string memory _name, bool _isIndoor) Animal(_name) {
        isIndoor = _isIndoor;
    }
    
    function makeSound() public override pure returns (string memory) {
        return "Meow!";
    }
    
    function scratch() public pure returns (string memory) {
        return "Scratching furniture!";
    }
}

// ==================== 接口 ====================

/**
 * @title IERC20
 * @dev ERC20 代币接口
 * @notice 接口只定义函数签名，不包含实现
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title Token
 * @dev 实现 IERC20 接口的代币合约
 */
contract Token is IERC20 {
    string public name = "My Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf[sender] >= amount, "Insufficient balance");
        require(allowance[sender][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        allowance[sender][msg.sender] -= amount;
        
        emit Transfer(sender, recipient, amount);
        return true;
    }
}

// ==================== 库（Library）====================

/**
 * @title Math
 * @dev 数学运算库
 * @notice 库用于复用代码，通过 using for 语法使用
 */
library Math {
    // 库函数默认是 internal
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a <= b ? a : b;
    }
    
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a & b) + (a ^ b) / 2;
    }
}

/**
 * @title SafeMath
 * @dev 安全数学运算库（防止溢出）
 * @notice Solidity 0.8.x 内置溢出检查，但示例仍保留
 */
library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
    
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }
    
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
}

/**
 * @title StringUtils
 * @dev 字符串工具库
 */
library StringUtils {
    function compare(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    function toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        
        for (uint256 i = 0; i < bStr.length; i++) {
            // 大写字母 A-Z (65-90) 转为小写 (97-122)
            if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        
        return string(bLower);
    }
}

// ==================== 多重继承 ====================

/**
 * @title Ownable
 * @dev 所有权管理合约
 */
contract Ownable {
    address public owner;
    address public pendingOwner;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Zero address");
        pendingOwner = newOwner;
    }
    
    function acceptOwnership() public {
        require(msg.sender == pendingOwner, "Not pending owner");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }
}

/**
 * @title Pausable
 * @dev 暂停功能合约
 */
contract Pausable {
    bool public paused = false;
    
    event Paused(address account);
    event Unpaused(address account);
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }
    
    function pause() public {
        paused = true;
        emit Paused(msg.sender);
    }
    
    function unpause() public {
        paused = false;
        emit Unpaused(msg.sender);
    }
}

/**
 * @title ManageableContract
 * @dev 多重继承示例
 * @notice 继承顺序很重要（最基类到最派生类）
 */
contract ManageableContract is Ownable, Pausable {
    uint256 public value;
    
    function setValue(uint256 _value) public onlyOwner whenNotPaused {
        value = _value;
    }
    
    function emergencySet(uint256 _value) public onlyOwner whenPaused {
        value = _value;
    }
}

// ==================== 使用库的合约 ====================

/**
 * @title Calculator
 * @dev 使用 Math 库的合约
 */
contract Calculator {
    using Math for uint256;
    
    function findMax(uint256 a, uint256 b) public pure returns (uint256) {
        return a.max(b); // 使用库函数
    }
    
    function findMin(uint256 a, uint256 b) public pure returns (uint256) {
        return a.min(b);
    }
    
    function calculateAverage(uint256 a, uint256 b) public pure returns (uint256) {
        return a.average(b);
    }
}

/**
 * @title SafeCalculator
 * @dev 使用 SafeMath 库的合约
 */
contract SafeCalculator {
    using SafeMath for uint256;
    
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a.add(b);
    }
    
    function safeSub(uint256 a, uint256 b) public pure returns (uint256) {
        return a.sub(b);
    }
    
    function safeMul(uint256 a, uint256 b) public pure returns (uint256) {
        return a.mul(b);
    }
}

// ==================== 覆盖和重写 ====================

/**
 * @title BaseContract
 * @dev 基础合约
 */
contract BaseContract {
    string public name = "Base";
    
    function getValue() public pure virtual returns (uint256) {
        return 100;
    }
    
    function getDescription() public pure returns (string memory) {
        return "This is the base contract";
    }
}

/**
 * @title DerivedContract
 * @dev 派生合约
 */
contract DerivedContract is BaseContract {
    string public name = "Derived"; // 覆盖状态变量
    
    function getValue() public pure override returns (uint256) {
        return 200; // 覆盖函数
    }
    
    function getDescription() public pure override returns (string memory) {
        return "This is the derived contract";
    }
    
    function getBaseValue() public pure returns (uint256) {
        return BaseContract.getValue(); // 调用父合约函数
    }
}

// ==================== Super 关键字 ====================

/**
 * @title A
 */
contract A {
    event Log(string message);
    
    function foo() public virtual {
        emit Log("A.foo called");
    }
}

/**
 * @title B
 */
contract B is A {
    function foo() public virtual override {
        emit Log("B.foo called");
        super.foo(); // 调用父合约 foo()
    }
}

/**
 * @title C
 */
contract C is A {
    function foo() public virtual override {
        emit Log("C.foo called");
        super.foo(); // 调用父合约 foo()
    }
}

/**
 * @title D
 * @dev 多重继承示例
 */
contract D is B, C {
    function foo() public override(B, C) {
        emit Log("D.foo called");
        super.foo(); // 按继承顺序调用：C -> A
    }
}

// ==================== 构造函数继承 ====================

/**
 * @title Parent
 */
contract Parent {
    uint256 public parentValue;
    
    constructor(uint256 _value) {
        parentValue = _value;
    }
}

/**
 * @title Child
 * @dev 继承父合约并传递参数
 */
contract Child is Parent {
    uint256 public childValue;
    
    constructor(uint256 _parentValue, uint256 _childValue) Parent(_parentValue) {
        childValue = _childValue;
    }
}

// ==================== 实用工具合约 ====================

/**
 * @title InterfaceExample
 * @dev 接口使用示例
 */
contract InterfaceExample {
    IERC20 public token;
    
    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }
    
    function getTokenBalance(address _account) public view returns (uint256) {
        return token.balanceOf(_account);
    }
    
    function transferTokens(address _to, uint256 _amount) public returns (bool) {
        return token.transfer(_to, _amount);
    }
}

/**
 * @title ReentrancyGuard
 * @dev 防重入攻击合约
 */
contract ReentrancyGuard {
    bool private locked;
    
    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    function sensitiveFunction() public noReentrant {
        // 敏感操作
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InheritanceAndPolymorphism
 * @dev Solidity 继承与多态深度解析
 * @notice 演示单继承、多重继承、super 关键字、函数重写等
 */

// ==================== 基础继承示例 ====================

/**
 * @title Animal
 * @dev 基础动物合约
 */
contract Animal {
    string public name;
    
    constructor(string memory _name) {
        name = _name;
    }
    
    function makeSound() public virtual pure returns (string memory) {
        return "Some sound";
    }
    
    function sleep() public pure returns (string memory) {
        return "Zzz...";
    }
}

/**
 * @title Dog
 * @dev 继承自 Animal
 */
contract Dog is Animal {
    string public breed;
    
    constructor(string memory _name, string memory _breed) Animal(_name) {
        breed = _breed;
    }
    
    // 重写父合约函数
    function makeSound() public override pure returns (string memory) {
        return "Woof!";
    }
    
    // 子合约特有函数
    function fetch() public pure returns (string memory) {
        return "Fetching!";
    }
}

// ==================== 多重继承示例 ====================

/**
 * @title A
 */
contract A {
    event Log(string message);
    
    function foo() public virtual returns (string memory) {
        emit Log("A.foo called");
        return "A";
    }
    
    function bar() public virtual returns (string memory) {
        emit Log("A.bar called");
        return "A.bar";
    }
}

/**
 * @title B
 * @dev 继承自 A
 */
contract B is A {
    function foo() public virtual override returns (string memory) {
        emit Log("B.foo called");
        return "B";
    }
    
    function extra() public pure returns (string memory) {
        return "B.extra";
    }
}

/**
 * @title C
 * @dev 继承自 A
 */
contract C is A {
    function foo() public virtual override returns (string memory) {
        emit Log("C.foo called");
        return "C";
    }
    
    function another() public pure returns (string memory) {
        return "C.another";
    }
}

/**
 * @title D
 * @dev 多重继承 B 和 C
 *      继承顺序很重要：D is B, C
 *      线性化顺序：D -> C -> B -> A
 */
contract D is B, C {
    // 必须明确指定 override(B, C)
    function foo() public override(B, C) returns (string memory) {
        emit Log("D.foo called");
        return super.foo(); // 调用 C.foo()（最右边的父合约）
    }
    
    function callAll() public returns (string memory) {
        emit Log("D.callAll called");
        return string(abi.encodePacked(foo(), ":", bar()));
    }
}

// ==================== Super 关键字深度解析 ====================

/**
 * @title Base1
 */
contract Base1 {
    event LogBase1(string message);
    
    function func() public virtual returns (string memory) {
        emit LogBase1("Base1.func");
        return "Base1";
    }
}

/**
 * @title Base2
 */
contract Base2 {
    event LogBase2(string message);
    
    function func() public virtual returns (string memory) {
        emit LogBase2("Base2.func");
        return "Base2";
    }
}

/**
 * @title Derived
 * @dev 演示 super 的调用顺序
 */
contract Derived is Base1, Base2 {
    event LogDerived(string message);
    
    // 线性化顺序：Derived -> Base2 -> Base1
    function func() public override(Base1, Base2) returns (string memory) {
        emit LogDerived("Derived.func");
        // super.func() 调用 Base2.func()（下一个在继承链中）
        return super.func();
    }
    
    function callBase1() public returns (string memory) {
        return Base1.func(); // 明确调用 Base1
    }
    
    function callBase2() public returns (string memory) {
        return Base2.func(); // 明确调用 Base2
    }
}

// ==================== 构造函数继承 ====================

/**
 * @title Parent
 */
contract Parent {
    uint256 public parentValue;
    string public parentName;
    
    constructor(uint256 _value, string memory _name) {
        parentValue = _value;
        parentName = _name;
    }
}

/**
 * @title Child
 * @dev 演示构造函数继承
 */
contract Child is Parent {
    uint256 public childValue;
    
    // 必须在子合约构造函数中初始化父合约
    constructor(uint256 _parentValue, string memory _parentName, uint256 _childValue) 
        Parent(_parentValue, _parentName) 
    {
        childValue = _childValue;
    }
}

// ==================== 虚拟函数和重写 ====================

/**
 * @title Shape
 * @dev 抽象基类
 */
abstract contract Shape {
    uint256 public sides;
    
    constructor(uint256 _sides) {
        sides = _sides;
    }
    
    // 虚拟函数：子合约可以重写
    function area() public virtual pure returns (uint256) {
        return 0;
    }
    
    function perimeter() public virtual pure returns (uint256) {
        return 0;
    }
    
    function getDescription() public pure returns (string memory) {
        return "This is a shape";
    }
}

/**
 * @title Rectangle
 */
contract Rectangle is Shape {
    uint256 public width;
    uint256 public length;
    
    constructor(uint256 _width, uint256 _length) Shape(4) {
        width = _width;
        length = _length;
    }
    
    function area() public override pure returns (uint256) {
        return width * length;
    }
    
    function perimeter() public override pure returns (uint256) {
        return 2 * (width + length);
    }
    
    function getDescription() public override pure returns (string memory) {
        return "This is a rectangle";
    }
}

/**
 * @title Square
 */
contract Square is Shape {
    uint256 public side;
    
    constructor(uint256 _side) Shape(4) {
        side = _side;
    }
    
    function area() public override pure returns (uint256) {
        return side * side;
    }
    
    function perimeter() public override pure returns (uint256) {
        return 4 * side;
    }
    
    function getDescription() public override pure returns (string memory) {
        return "This is a square";
    }
}

// ==================== 接口继承 ====================

/**
 * @title IERC20
 * @dev 基础 ERC20 接口
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title IERC20Extended
 * @dev 扩展 ERC20 接口
 */
interface IERC20Extended is IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title MyToken
 * @dev 实现扩展接口
 */
contract MyToken is IERC20Extended {
    string public name = "My Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(balanceOf[sender] >= amount, "Insufficient balance");
        require(allowance[sender][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        allowance[sender][msg.sender] -= amount;
        
        return true;
    }
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
}

// ==================== 钻石继承问题 ====================

/**
 * @title Base
 */
contract Base {
    event Log(string message);
    
    function foo() public virtual returns (string memory) {
        emit Log("Base.foo");
        return "Base";
    }
}

/**
 * @title Left
 */
contract Left is Base {
    function foo() public virtual override returns (string memory) {
        emit Log("Left.foo");
        return "Left";
    }
}

/**
 * @title Right
 */
contract Right is Base {
    function foo() public virtual override returns (string memory) {
        emit Log("Right.foo");
        return "Right";
    }
}

/**
 * @title Diamond
 * @dev 钻石继承：Left -> Base <- Right
 *      Diamond 继承 Left 和 Right
 *      线性化顺序：Diamond -> Right -> Left -> Base
 */
contract Diamond is Left, Right {
    function foo() public override(Left, Right) returns (string memory) {
        emit Log("Diamond.foo");
        // super.foo() 调用 Right.foo()（最右边的父合约）
        return super.foo();
    }
    
    function callLeft() public returns (string memory) {
        return Left.foo();
    }
    
    function callRight() public returns (string memory) {
        return Right.foo();
    }
}

// ==================== 实用示例：多签钱包 ====================

/**
 * @title Ownable
 */
contract Ownable {
    address public owner;
    
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
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

/**
 * @title Pausable
 */
contract Pausable {
    bool public paused = false;
    
    event Paused(address account);
    event Unpaused(address account);
    
    modifier whenNotPaused() {
        require(!paused, "Paused");
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
 * @title MultisigWallet
 * @dev 结合多重继承实现多签钱包
 */
contract MultisigWallet is Ownable, Pausable {
    uint256 public required;
    address[] public owners;
    mapping(address => bool) public isOwner;
    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
    }
    
    event Submission(uint256 indexed transactionId);
    event Confirmation(address indexed sender, uint256 indexed transactionId);
    event Execution(uint256 indexed transactionId);
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier transactionExists(uint256 transactionId) {
        require(transactionId < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 transactionId) {
        require(!transactions[transactionId].executed, "Already executed");
        _;
    }
    
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "No owners");
        require(_required > 0 && _required <= _owners.length, "Invalid required");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0) && !isOwner[owner], "Invalid owner");
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        required = _required;
    }
    
    function submitTransaction(address _to, uint256 _value, bytes memory _data) 
        public 
        onlyOwner 
        whenNotPaused 
        returns (uint256) 
    {
        uint256 transactionId = transactionCount;
        transactions[transactionId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false
        });
        transactionCount += 1;
        
        emit Submission(transactionId);
        return transactionId;
    }
    
    function executeTransaction(uint256 transactionId) 
        public 
        onlyOwner 
        whenNotPaused 
        transactionExists(transactionId) 
        notExecuted(transactionId) 
    {
        Transaction storage txn = transactions[transactionId];
        txn.executed = true;
        
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Transaction failed");
        
        emit Execution(transactionId);
    }
}

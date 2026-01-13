// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SecurityMechanisms
 * @dev Solidity 安全机制完整示例
 * @notice 演示访问控制、防重入攻击、暂停机制等安全措施
 */

// ==================== 访问控制 ====================

/**
 * @title Ownable
 * @dev 所有权管理合约
 * @notice 提供基本的访问控制机制
 */
contract Ownable {
    address public owner;
    address public pendingOwner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev 仅所有者修饰器
     */
    modifier onlyOwner() virtual {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev 转移所有权
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Ownable: new owner is the zero address");
        pendingOwner = _newOwner;
    }

    /**
     * @dev 接受所有权
     */
    function acceptOwnership() public {
        require(msg.sender == pendingOwner, "Ownable: caller is not the pending owner");
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    /**
     * @dev 放弃所有权
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}

/**
 * @title AccessControl
 * @dev 基于角色的访问控制
 * @notice 支持多角色管理
 */
contract AccessControl {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR");
    bytes32 public constant USER_ROLE = keccak256("USER");

    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );

    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );

    constructor() {
        // 设置 ADMIN_ROLE 为自己的管理员
        _roles[ADMIN_ROLE].adminRole = ADMIN_ROLE;
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev 检查角色
     */
    function hasRole(bytes32 _role, address _account) public view returns (bool) {
        return _roles[_role].members[_account];
    }

    /**
     * @dev 授予角色
     */
    function grantRole(bytes32 _role, address _account) public {
        // 如果该角色还没有设置 adminRole，允许 ADMIN_ROLE 授予
        bytes32 adminRoleToCheck = _roles[_role].adminRole;
        if (adminRoleToCheck == bytes32(0)) {
            adminRoleToCheck = ADMIN_ROLE;
        }
        require(hasRole(adminRoleToCheck, msg.sender), "AccessControl: sender must be admin");
        _grantRole(_role, _account);
    }

    /**
     * @dev 撤销角色
     */
    function revokeRole(bytes32 _role, address _account) public {
        // 如果该角色还没有设置 adminRole，允许 ADMIN_ROLE 撤销
        bytes32 adminRoleToCheck = _roles[_role].adminRole;
        if (adminRoleToCheck == bytes32(0)) {
            adminRoleToCheck = ADMIN_ROLE;
        }
        require(hasRole(adminRoleToCheck, msg.sender), "AccessControl: sender must be admin");
        _revokeRole(_role, _account);
    }

    /**
     * @dev 仅角色修饰器
     */
    modifier onlyRole(bytes32 _role) {
        require(hasRole(_role, msg.sender), "AccessControl: missing role");
        _;
    }

    function _grantRole(bytes32 _role, address _account) private {
        // 如果这是第一次授予该角色，设置 ADMIN_ROLE 为管理员
        // (除非角色本身就是 ADMIN_ROLE，它管理自己)
        if (_roles[_role].adminRole == bytes32(0)) {
            _roles[_role].adminRole = ADMIN_ROLE;
        }
        _roles[_role].members[_account] = true;
        emit RoleGranted(_role, _account, msg.sender);
    }

    function _revokeRole(bytes32 _role, address _account) private {
        _roles[_role].members[_account] = false;
        emit RoleRevoked(_role, _account, msg.sender);
    }
}

/**
 * @title RoleBasedContract
 * @dev 基于角色的合约示例
 */
contract RoleBasedContract is AccessControl {
    uint256 public value;

    function adminFunction() public onlyRole(ADMIN_ROLE) {
        value = 100;
    }

    function moderatorFunction() public onlyRole(MODERATOR_ROLE) {
        value = 50;
    }

    function userFunction() public onlyRole(USER_ROLE) {
        value = 10;
    }
}

// ==================== 防重入攻击 ====================

/**
 * @title ReentrancyGuard
 * @dev 防重入攻击合约
 * @notice 使用互斥锁防止重入攻击
 */
contract ReentrancyGuard {
    bool private locked;

    event ReentrancyAttempt(address indexed caller);

    constructor() {
        locked = false;
    }

    /**
     * @dev 防重入修饰器
     */
    modifier noReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    /**
     * @dev 检测重入攻击尝试
     */
    function _detectReentrancy() private {
        if (locked) {
            emit ReentrancyAttempt(msg.sender);
        }
    }
}

/**
 * @title SecureBank
 * @dev 安全的银行合约（防重入）
 */
contract SecureBank is Ownable, ReentrancyGuard {
    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @dev 安全存款
     */
    function deposit() public payable noReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 安全取款（Checks-Effects-Interactions 模式）
     */
    function withdraw(uint256 _amount) public noReentrant {
        // 1. Checks（检查）
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // 2. Effects（影响）
        balances[msg.sender] -= _amount;

        // 3. Interactions（交互）
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 批量取款
     */
    function batchWithdraw(uint256[] memory _amounts) public noReentrant {
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Invalid amount");
            totalAmount += _amounts[i];
        }

        require(balances[msg.sender] >= totalAmount, "Insufficient total balance");
        balances[msg.sender] -= totalAmount;

        (bool success, ) = msg.sender.call{value: totalAmount}("");
        require(success, "Batch transfer failed");

        emit Withdrawal(msg.sender, totalAmount);
    }
}

/**
 * @title VulnerableBank
 * @dev 有漏洞的银行合约（用于教学）
 * @notice ❌ 不要在生产环境使用
 */
contract VulnerableBank {
    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 有漏洞的取款函数
     * @notice 违反了 Checks-Effects-Interactions 模式
     */
    function vulnerableWithdraw(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // ❌ 先进行外部调用
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        // ❌ 后更新状态（重入攻击机会）
        balances[msg.sender] -= _amount;

        emit Withdrawal(msg.sender, _amount);
    }
}

/**
 * @title Attacker
 * @dev 重入攻击合约
 * @notice 用于演示攻击原理
 */
contract Attacker {
    SecureBank public secureBank;
    VulnerableBank public vulnerableBank;
    uint256 public attackCount;
    uint256 private attackAmount;
    bool private attackingSecure;

    event AttackSuccess(uint256 amount);

    constructor(address _secureBank, address _vulnerableBank) {
        secureBank = SecureBank(_secureBank);
        vulnerableBank = VulnerableBank(_vulnerableBank);
    }

    receive() external payable {
        attackCount++;

        if (attackCount < 3) {
            // 尝试重入攻击（根据当前目标选择银行）
            if (attackingSecure) {
                secureBank.withdraw(attackAmount);
            } else {
                vulnerableBank.vulnerableWithdraw(attackAmount);
            }
        }

        emit AttackSuccess(msg.value);
    }

    function attack(uint256 _amount) external payable {
        attackAmount = _amount;
        attackingSecure = false;
        vulnerableBank.deposit{value: _amount}();
        vulnerableBank.vulnerableWithdraw(_amount);
    }

    function attackSecure(uint256 _amount) external payable {
        attackAmount = _amount;
        attackingSecure = true;
        secureBank.deposit{value: _amount}();
        secureBank.withdraw(_amount);
    }
}

// ==================== 暂停机制 ====================

/**
 * @title Pausable
 * @dev 暂停功能合约
 * @notice 允许在紧急情况下暂停合约
 */
contract Pausable is Ownable {
    bool public paused;

    event Paused(address account);
    event Unpaused(address account);

    /**
     * @dev 未暂停时才可执行
     */
    modifier whenNotPaused() {
        require(!paused, "Pausable: paused");
        _;
    }

    /**
     * @dev 已暂停时才可执行
     */
    modifier whenPaused() {
        require(paused, "Pausable: not paused");
        _;
    }

    /**
     * @dev 暂停合约
     */
    function pause() public onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev 恢复合约
     */
    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
}

/**
 * @title PausableToken
 * @dev 可暂停的代币合约
 */
contract PausableToken is Pausable {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply;
        balances[msg.sender] = _initialSupply;
    }

    /**
     * @dev 转账（可暂停）
     */
    function transfer(address _to, uint256 _amount) public whenNotPaused {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
        emit Transfer(msg.sender, _to, _amount);
    }

    /**
     * @dev 仅暂停时可调用的紧急函数
     */
    function emergencyWithdraw() public whenPaused onlyOwner {
        // 紧急取款逻辑
    }
}

// ==================== 综合安全示例 ====================

/**
 * @title SecureVault
 * @dev 综合安全措施的金库合约
 * @notice 结合访问控制、防重入、暂停机制
 */
contract SecureVault is Ownable, ReentrancyGuard, Pausable {
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    uint256 public withdrawalLimit;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event LimitUpdated(uint256 oldLimit, uint256 newLimit);

    constructor(uint256 _withdrawalLimit) {
        withdrawalLimit = _withdrawalLimit;
    }

    /**
     * @dev 存款
     */
    function deposit() public payable whenNotPaused noReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");

        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev 取款（多种安全措施）
     */
    function withdraw(uint256 _amount) public whenNotPaused noReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= withdrawalLimit, "Amount exceeds withdrawal limit");
        require(deposits[msg.sender] >= _amount, "Insufficient deposit");

        // Checks-Effects-Interactions 模式
        deposits[msg.sender] -= _amount;
        totalDeposits -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev 紧急取款（仅暂停时）
     */
    function emergencyWithdraw(address _user, uint256 _amount) public whenPaused onlyOwner {
        require(deposits[_user] >= _amount, "Insufficient deposit");

        deposits[_user] -= _amount;
        totalDeposits -= _amount;

        (bool success, ) = _user.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(_user, _amount);
    }

    /**
     * @dev 更新取款限制
     */
    function setWithdrawalLimit(uint256 _newLimit) public onlyOwner {
        uint256 oldLimit = withdrawalLimit;
        withdrawalLimit = _newLimit;

        emit LimitUpdated(oldLimit, _newLimit);
    }

    /**
     * @dev 获取存款
     */
    function getDeposit(address _user) public view returns (uint256) {
        return deposits[_user];
    }

    /**
     * @dev 接收 Ether
     */
    receive() external payable {
        deposit();
    }
}

/**
 * @title MultiSigWallet
 * @dev 多签钱包合约
 * @notice 需要多个签名才能执行交易
 */
contract MultiSigWallet is Ownable {
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    address[] public owners;
    uint256 public requiredConfirmations;
    uint256 public transactionCount;

    event Submission(uint256 indexed transactionId);
    event Confirmation(address indexed sender, uint256 indexed transactionId);
    event Execution(uint256 indexed transactionId);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);

    modifier onlyOwner() override {
        bool isOwner = false;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                isOwner = true;
                break;
            }
        }
        require(isOwner, "Not owner");
        _;
    }

    modifier transactionExists(uint256 _transactionId) {
        require(_transactionId < transactionCount, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _transactionId) {
        require(!transactions[_transactionId].executed, "Transaction already executed");
        _;
    }

    modifier confirmed(uint256 _transactionId) {
        require(confirmations[_transactionId][msg.sender], "Transaction not confirmed");
        _;
    }

    constructor(address[] memory _owners, uint256 _requiredConfirmations) {
        require(_owners.length >= _requiredConfirmations, "Invalid number of owners");
        require(_requiredConfirmations >= 1, "Invalid required confirmations");

        owners = _owners;
        requiredConfirmations = _requiredConfirmations;
    }

    /**
     * @dev 提交交易
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner returns (uint256) {
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

    /**
     * @dev 确认交易
     */
    function confirmTransaction(uint256 _transactionId)
        public
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
    {
        confirmations[_transactionId][msg.sender] = true;
        emit Confirmation(msg.sender, _transactionId);
    }

    /**
     * @dev 执行交易
     */
    function executeTransaction(uint256 _transactionId)
        public
        onlyOwner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
    {
        require(isConfirmed(_transactionId), "Transaction not confirmed");

        Transaction storage txn = transactions[_transactionId];
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Transaction execution failed");

        emit Execution(_transactionId);
    }

    /**
     * @dev 检查交易是否已确认
     */
    function isConfirmed(uint256 _transactionId) public view returns (bool) {
        uint256 count = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[_transactionId][owners[i]]) {
                count += 1;
            }
        }
        return count >= requiredConfirmations;
    }

    /**
     * @dev 添加所有者
     */
    function addOwner(address _owner) public onlyOwner {
        require(_owner != address(0), "Invalid owner");
        require(!isOwner[_owner], "Owner already exists");

        owners.push(_owner);
        emit OwnerAdded(_owner);
    }

    /**
     * @dev 移除所有者
     */
    function removeOwner(address _owner) public onlyOwner {
        require(isOwner[_owner], "Not owner");
        require(owners.length > requiredConfirmations, "Cannot remove owner");

        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(_owner);
    }

    mapping(address => bool) public isOwner;

    /**
     * @dev 接收 ETH 的回退函数
     */
    receive() external payable {}
}

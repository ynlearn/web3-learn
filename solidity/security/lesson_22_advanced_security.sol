// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AdvancedSecurity
 * @dev 高级安全主题完整示例
 * @notice 演示闪电贷攻击、价格操纵、时间操纵、签名重放等高级攻击
 */

// ==================== 闪电贷攻击 ====================

/**
 * @title SimpleLendingPool
 * @dev 简化的借贷池（用于教学）
 * @notice ❌ 包含闪电贷漏洞的简化版本
 */
contract SimpleLendingPool {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalDeposits;
    uint256 public totalBorrows;
    uint256 public constant COLLATERAL_RATIO = 150; // 150%
    
    // 价格预言机（简化版）
    IPriceOracle public priceOracle;

    event Deposit(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidation(address indexed user, address indexed liquidator, uint256 amount);

    constructor(address _priceOracle) {
        priceOracle = IPriceOracle(_priceOracle);
    }

    /**
     * @dev 存款
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 易受闪电贷攻击的借款函数
     */
    function borrow(uint256 _amount) public {
        uint256 collateral = deposits[msg.sender];
        uint256 currentPrice = priceOracle.getPrice(address(this));
        
        // 计算最大可借金额
        uint256 maxBorrow = (collateral * currentPrice * COLLATERAL_RATIO) / 10000;
        
        require(_amount > 0, "Amount must be greater than 0");
        require(borrows[msg.sender] + _amount <= maxBorrow, "Insufficient collateral");
        require(address(this).balance >= _amount, "Insufficient liquidity");

        borrows[msg.sender] += _amount;
        totalBorrows += _amount;
        
        payable(msg.sender).transfer(_amount);
        emit Borrow(msg.sender, _amount);
    }

    /**
     * @dev 偿还借款
     */
    function repay() public payable {
        require(msg.value > 0, "Repayment amount must be greater than 0");
        require(borrows[msg.sender] >= msg.value, "Repayment exceeds borrowed amount");
        
        borrows[msg.sender] -= msg.value;
        totalBorrows -= msg.value;
        emit Repay(msg.sender, msg.value);
    }

    /**
     * @dev 清算
     */
    function liquidate(address _user) public {
        uint256 collateral = deposits[_user];
        uint256 borrow = borrows[_user];
        uint256 currentPrice = priceOracle.getPrice(address(this));
        
        uint256 maxBorrow = (collateral * currentPrice * COLLATERAL_RATIO) / 10000;
        
        require(borrow > maxBorrow, "Not undercollateralized");
        
        // 清算逻辑（简化）
        uint256 liquidationAmount = borrow / 2;
        borrows[_user] -= liquidationAmount;
        deposits[_user] -= liquidationAmount;
        
        payable(msg.sender).transfer(liquidationAmount);
        emit Liquidation(_user, msg.sender, liquidationAmount);
    }

    /**
     * @dev 获取用户借款能力
     */
    function getBorrowingPower(address _user) public view returns (uint256) {
        uint256 collateral = deposits[_user];
        uint256 currentPrice = priceOracle.getPrice(address(this));
        return (collateral * currentPrice * COLLATERAL_RATIO) / 10000 - borrows[_user];
    }
}

/**
 * @title IPriceOracle
 * @dev 价格预言机接口
 */
interface IPriceOracle {
    function getPrice(address _token) external view returns (uint256);
}

/**
 * @title ManipulatedPriceOracle
 * @dev 可被操纵的价格预言机
 * @notice ❌ 不要在生产环境使用
 */
contract ManipulatedPriceOracle is IPriceOracle {
    uint256 public price;
    address public owner;
    bool public manipulated;

    constructor(uint256 _initialPrice) {
        price = _initialPrice;
        owner = msg.sender;
    }

    /**
     * @dev 获取价格
     */
    function getPrice(address _token) external view override returns (uint256) {
        return price;
    }

    /**
     * @dev ❌ 设置价格（易被操纵）
     */
    function setPrice(uint256 _newPrice) public {
        require(msg.sender == owner, "Not owner");
        price = _newPrice;
        manipulated = true;
    }

    /**
     * @dev 操纵价格攻击
     */
    function manipulatePrice(uint256 _targetPrice) public {
        require(msg.sender == owner, "Not owner");
        price = _targetPrice;
        manipulated = true;
    }

    /**
     * @dev 重置价格
     */
    function resetPrice(uint256 _normalPrice) public {
        require(msg.sender == owner, "Not owner");
        price = _normalPrice;
        manipulated = false;
    }
}

/**
 * @title FlashLoanAttacker
 * @dev 闪电贷攻击合约
 * @notice 演示如何利用闪电贷攻击借贷协议
 */
contract FlashLoanAttacker {
    SimpleLendingPool public lendingPool;
    ManipulatedPriceOracle public priceOracle;
    
    uint256 public stolenAmount;
    bool public attackSuccessful;

    event AttackStarted(uint256 loanAmount);
    event PriceManipulated(uint256 oldPrice, uint256 newPrice);
    event AttackSuccessful(uint256 profit);

    constructor(address _lendingPool, address _priceOracle) {
        lendingPool = SimpleLendingPool(_lendingPool);
        priceOracle = ManipulatedPriceOracle(_priceOracle);
    }

    /**
     * @dev 执行闪电贷攻击
     */
    function executeFlashLoanAttack(uint256 _loanAmount) external {
        emit AttackStarted(_loanAmount);

        // 1. 获取闪电贷（假设从某个 DEX）
        uint256 balanceBefore = address(this).balance;
        
        // 2. 操纵价格
        uint256 oldPrice = priceOracle.price();
        uint256 manipulatedPrice = oldPrice * 10; // 提高 10 倍
        priceOracle.manipulatePrice(manipulatedPrice);
        emit PriceManipulated(oldPrice, manipulatedPrice);

        // 3. 利用操纵后的价格借款
        lendingPool.borrow(_loanAmount);
        
        // 4. 还原价格
        priceOracle.resetPrice(oldPrice);
        
        // 5. 归还闪电贷（假设有足够的利润）
        stolenAmount = _loanAmount;
        attackSuccessful = true;
        
        emit AttackSuccessful(_loanAmount);
    }

    /**
     * @dev 接收 Ether
     */
    receive() external payable {}
}

/**
 * @title SecureLendingPool
 * @dev 安全的借贷池
 * @notice ✅ 防止闪电贷攻击
 */
contract SecureLendingPool {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalDeposits;
    uint256 public totalBorrows;
    uint256 public constant COLLATERAL_RATIO = 150;
    
    // 使用去中心化预言机
    ISecureOracle public secureOracle;
    
    // 时间加权平均价格（TWAP）
    uint256 public priceTimestamp;
    uint256 public cachedPrice;
    uint256 public constant PRICE_UPDATE_DELAY = 1 hours;

    event Deposit(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(address _secureOracle) {
        secureOracle = ISecureOracle(_secureOracle);
        priceTimestamp = block.timestamp;
        cachedPrice = secureOracle.getLatestPrice();
    }

    /**
     * @dev ✅ 安全的价格更新
     */
    function updatePrice() public {
        require(block.timestamp >= priceTimestamp + PRICE_UPDATE_DELAY, "Too early to update");
        
        uint256 newPrice = secureOracle.getLatestPrice();
        require(newPrice > 0, "Invalid price");
        
        // 价格变化不能超过 10%
        uint256 priceChange = newPrice > cachedPrice ? 
            (newPrice - cachedPrice) * 100 / cachedPrice :
            (cachedPrice - newPrice) * 100 / cachedPrice;
        require(priceChange <= 10, "Price change too large");
        
        emit PriceUpdated(cachedPrice, newPrice);
        cachedPrice = newPrice;
        priceTimestamp = block.timestamp;
    }

    /**
     * @dev ✅ 安全的借款函数
     */
    function borrow(uint256 _amount) public {
        // 确保价格是新鲜的
        if (block.timestamp >= priceTimestamp + PRICE_UPDATE_DELAY) {
            updatePrice();
        }
        
        uint256 collateral = deposits[msg.sender];
        uint256 maxBorrow = (collateral * cachedPrice * COLLATERAL_RATIO) / 10000;
        
        require(_amount > 0, "Amount must be greater than 0");
        require(borrows[msg.sender] + _amount <= maxBorrow, "Insufficient collateral");
        require(address(this).balance >= _amount, "Insufficient liquidity");

        borrows[msg.sender] += _amount;
        totalBorrows += _amount;
        
        payable(msg.sender).transfer(_amount);
        emit Borrow(msg.sender, _amount);
    }

    /**
     * @dev 存款
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 偿还借款
     */
    function repay() public payable {
        require(msg.value > 0, "Repayment amount must be greater than 0");
        require(borrows[msg.sender] >= msg.value, "Repayment exceeds borrowed amount");
        
        borrows[msg.sender] -= msg.value;
        totalBorrows -= msg.value;
        emit Repay(msg.sender, msg.value);
    }
}

/**
 * @title ISecureOracle
 * @dev 安全预言机接口
 */
interface ISecureOracle {
    function getLatestPrice() external view returns (uint256);
}

// ==================== 签名重放攻击 ====================

/**
 * @title SignatureReplayVulnerable
 * @dev 易受签名重放攻击的合约
 * @notice ❌ 不要在生产环境使用
 */
contract SignatureReplayVulnerable {
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @dev 存款
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 易受重放攻击的取款函数
     * @notice 没有检查 nonce 或签名唯一性
     */
    function withdrawWithSignature(
        uint256 _amount,
        bytes memory _signature
    ) public {
        // 恢复签名者地址
        address signer = recoverSigner(_amount, _signature);
        
        // 检查签名者有足够余额
        require(balances[signer] >= _amount, "Insufficient balance");
        
        // 转账
        balances[signer] -= _amount;
        payable(msg.sender).transfer(_amount);
        
        emit Withdrawal(signer, _amount);
    }

    /**
     * @dev 恢复签名者
     */
    function recoverSigner(uint256 _amount, bytes memory _signature) public pure returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(_amount));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @dev 分离签名
     */
    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}

/**
 * @title SignatureReplayFixed
 * @dev 修复了签名重放攻击的合约
 * @notice ✅ 使用 nonce 和链 ID
 */
contract SignatureReplayFixed {
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public balances;
    
    uint256 public chainId;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event NonceUsed(address indexed account, uint256 nonce);

    constructor() {
        chainId = block.chainid;
    }

    /**
     * @dev 存款
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ✅ 安全的签名取款
     * @notice 包含 nonce 和链 ID 防止重放
     */
    function withdrawWithSignature(
        uint256 _amount,
        uint256 _nonce,
        bytes memory _signature
    ) public {
        // 恢复签名者地址
        address signer = recoverSigner(_amount, _nonce, _signature);
        
        // 检查 nonce
        require(nonces[signer] == _nonce, "Invalid nonce");
        
        // 检查余额
        require(balances[signer] >= _amount, "Insufficient balance");
        
        // 更新 nonce
        nonces[signer] = _nonce + 1;
        
        // 转账
        balances[signer] -= _amount;
        payable(msg.sender).transfer(_amount);
        
        emit Withdrawal(signer, _amount);
        emit NonceUsed(signer, _nonce);
    }

    /**
     * @dev ✅ 安全的签名恢复
     * @notice 包含链 ID 和 nonce
     */
    function recoverSigner(
        uint256 _amount,
        uint256 _nonce,
        bytes memory _signature
    ) public view returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(
            address(this),
            chainId,
            _amount,
            _nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @dev 分离签名
     */
    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /**
     * @dev 获取下一个 nonce
     */
    function getNonce(address _user) public view returns (uint256) {
        return nonces[_user];
    }
}

/**
 * @title SignatureReplayAttacker
 * @dev 签名重放攻击合约
 * @notice 演示如何重放签名
 */
contract SignatureReplayAttacker {
    SignatureReplayVulnerable public target;
    
    constructor(address _target) {
        target = SignatureReplayVulnerable(_target);
    }

    /**
     * @dev 重放签名攻击
     */
    function replayAttack(
        uint256 _amount,
        bytes memory _signature,
        uint256 _times
    ) public {
        for (uint256 i = 0; i < _times; i++) {
            // 多次使用相同的签名
            target.withdrawWithSignature(_amount, _signature);
        }
    }
}

// ==================== 时间操纵攻击 ====================

/**
 * @title TimeManipulationVulnerable
 * @dev 易受时间操纵攻击的合约
 * @notice ❌ 依赖 block.timestamp 和 block.number
 */
contract TimeManipulationVulnerable {
    struct LotteryEntry {
        address player;
        uint256 timestamp;
        uint256 blockNumber;
    }

    LotteryEntry[] public entries;
    uint256 public lotteryEnd;
    bool public lotteryActive;

    event EntrySubmitted(address indexed player, uint256 timestamp);
    event WinnerSelected(address indexed winner, uint256 amount);

    constructor(uint256 _duration) {
        lotteryEnd = block.timestamp + _duration;
        lotteryActive = true;
    }

    /**
     * @dev ❌ 易受时间操纵的彩票函数
     * @notice 矿工可以操纵 block.timestamp
     */
    function submitEntry() public {
        require(lotteryActive, "Lottery not active");
        require(block.timestamp < lotteryEnd, "Lottery ended");
        
        entries.push(LotteryEntry({
            player: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        emit EntrySubmitted(msg.sender, block.timestamp);
    }

    /**
     * @dev ❌ 易受操纵的赢家选择
     * @notice 矿工可以选择对自己有利的区块
     */
    function selectWinner() public {
        require(block.timestamp >= lotteryEnd, "Lottery not ended");
        require(lotteryActive, "Lottery already settled");
        
        lotteryActive = false;
        
        // 使用 block.number 选择赢家（易被操纵）
        uint256 winningIndex = block.number % entries.length;
        LotteryEntry memory winner = entries[winningIndex];
        
        emit WinnerSelected(winner.player, 0);
    }
}

/**
 * @title TimeManipulationFixed
 * @dev 修复了时间操纵攻击的合约
 * @notice ✅ 使用随机数源和更安全的时间检查
 */
contract TimeManipulationFixed {
    struct LotteryEntry {
        address player;
        bytes32 commitHash;
        uint256 revealTime;
        uint256 randomValue;
    }

    mapping(address => LotteryEntry) public entries;
    uint256 public lotteryEnd;
    bool public lotteryActive;
    uint256 public totalEntries;
    
    IRandomGenerator public randomGenerator;

    event EntryCommitted(address indexed player, bytes32 commitHash);
    event EntryRevealed(address indexed player, uint256 randomValue);
    event WinnerSelected(address indexed winner, uint256 amount);

    constructor(uint256 _duration, address _randomGenerator) {
        lotteryEnd = block.timestamp + _duration;
        lotteryActive = true;
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    /**
     * @dev ✅ 提交承诺
     * @notice 先提交哈希，后揭示随机值
     */
    function commitEntry(bytes32 _commitHash) public {
        require(lotteryActive, "Lottery not active");
        require(block.timestamp < lotteryEnd - 1 hours, "Too late to commit");
        require(entries[msg.sender].commitHash == bytes32(0), "Already committed");
        
        entries[msg.sender] = LotteryEntry({
            player: msg.sender,
            commitHash: _commitHash,
            revealTime: 0,
            randomValue: 0
        });
        
        totalEntries++;
        
        emit EntryCommitted(msg.sender, _commitHash);
    }

    /**
     * @dev ✅ 揭示随机值
     */
    function revealEntry(uint256 _randomValue, bytes32 _secret) public {
        require(lotteryActive, "Lottery not active");
        require(block.timestamp >= lotteryEnd, "Too early to reveal");
        require(block.timestamp < lotteryEnd + 1 hours, "Too late to reveal");
        
        bytes32 commitHash = keccak256(abi.encodePacked(msg.sender, _randomValue, _secret));
        require(entries[msg.sender].commitHash == commitHash, "Invalid reveal");
        
        entries[msg.sender].randomValue = _randomValue;
        entries[msg.sender].revealTime = block.timestamp;
        
        emit EntryRevealed(msg.sender, _randomValue);
    }

    /**
     * @dev ✅ 安全的赢家选择
     * @notice 使用链上随机数生成器
     */
    function selectWinner() public {
        require(block.timestamp >= lotteryEnd + 1 hours, "Too early to select");
        require(lotteryActive, "Lottery already settled");
        
        lotteryActive = false;
        
        // 使用随机数生成器
        uint256 randomSeed = randomGenerator.getRandomNumber();
        uint256 winningIndex = randomSeed % totalEntries;
        
        // 找到对应的赢家（简化版）
        // 实际需要遍历找到第 winningIndex 个揭示的参与者
        address winner = address(0); // 简化
        
        emit WinnerSelected(winner, 0);
    }
}

/**
 * @title IRandomGenerator
 * @dev 随机数生成器接口
 */
interface IRandomGenerator {
    function getRandomNumber() external view returns (uint256);
}

// ==================== 综合安全合约 ====================

/**
 * @title ComprehensiveSecureVault
 * @dev 综合安全措施的金库合约
 * @notice ✅ 生产级别的安全实现
 */
contract ComprehensiveSecureVault {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public nonces;
    
    address public owner;
    address public proposedOwner;
    uint256 public timelock;
    uint256 public constant TIMELOCK_DURATION = 2 days;
    
    bool public paused;
    bool private locked;
    
    uint256 public chainId;
    
    mapping(bytes32 => bool) public usedSignatures;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    modifier noReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier timelocked() {
        require(timelock <= block.timestamp, "Timelock not expired");
        _;
    }

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed proposedOwner);
    event OwnershipTransferAccepted(address indexed previousOwner, address indexed newOwner);
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        owner = msg.sender;
        chainId = block.chainid;
    }

    /**
     * @dev 存款
     */
    function deposit() public payable whenNotPaused noReentrant {
        require(msg.value > 0, "Deposit too low");
        deposits[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 安全取款
     */
    function withdraw(uint256 _amount) public whenNotPaused noReentrant {
        require(_amount > 0, "Invalid amount");
        require(deposits[msg.sender] >= _amount, "Insufficient balance");

        deposits[msg.sender] -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 签名取款（防止重放）
     */
    function withdrawWithSignature(
        uint256 _amount,
        uint256 _nonce,
        bytes memory _signature
    ) public whenNotPaused noReentrant {
        // 检查签名唯一性
        bytes32 signatureHash = keccak256(_signature);
        require(!usedSignatures[signatureHash], "Signature already used");
        usedSignatures[signatureHash] = true;
        
        // 恢复签名者
        address signer = recoverSigner(_amount, _nonce, _signature);
        require(nonces[signer] == _nonce, "Invalid nonce");
        require(deposits[signer] >= _amount, "Insufficient balance");
        
        nonces[signer] = _nonce + 1;
        deposits[signer] -= _amount;
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(signer, _amount);
    }

    /**
     * @dev 恢复签名者
     */
    function recoverSigner(
        uint256 _amount,
        uint256 _nonce,
        bytes memory _signature
    ) public view returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked(
            address(this),
            chainId,
            _amount,
            _nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(ethSignedHash, v, r, s);
    }

    /**
     * @dev 分离签名
     */
    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /**
     * @dev 发起所有权转移
     */
    function initiateOwnershipTransfer(address _proposedOwner) public onlyOwner {
        require(_proposedOwner != address(0), "Invalid address");
        proposedOwner = _proposedOwner;
        timelock = block.timestamp + TIMELOCK_DURATION;
        emit OwnershipTransferInitiated(owner, proposedOwner);
    }

    /**
     * @dev 接受所有权转移
     */
    function acceptOwnership() public timelocked {
        require(msg.sender == proposedOwner, "Not proposed owner");
        
        emit OwnershipTransferAccepted(owner, proposedOwner);
        owner = proposedOwner;
        proposedOwner = address(0);
        timelock = 0;
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

    /**
     * @dev 紧急取款
     */
    function emergencyWithdraw(address _user, uint256 _amount) public onlyOwner {
        require(paused, "Not paused");
        require(deposits[_user] >= _amount, "Insufficient deposit");
        
        deposits[_user] -= _amount;
        payable(_user).transfer(_amount);
        
        emit Withdrawal(_user, _amount);
    }

    /**
     * @dev 获取用户 nonce
     */
    function getNonce(address _user) public view returns (uint256) {
        return nonces[_user];
    }

    receive() external payable {
        deposit();
    }
}

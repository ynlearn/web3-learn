// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CommonPatterns
 * @dev 常用设计模式完整示例
 * @notice 演示智能合约开发中的其他常用模式，包括所有权、紧急停止、可升级性、Pausable、Ownable等
 */

// ==================== 所有权模式 ====================

/**
 * @title Ownable
 * @dev 所有权模式
 * @notice 最基础但最重要的模式之一
 */
contract Ownable {
    address public owner;
    address public pendingOwner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferInitiated(address indexed currentOwner, address indexed pendingOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev 转移所有权（两步验证）
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferInitiated(owner, newOwner);
    }

    /**
     * @dev 接受所有权
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);

        emit OwnershipTransferred(oldOwner, owner);
    }

    /**
     * @dev 取消所有权转移
     */
    function cancelOwnershipTransfer() external onlyOwner {
        require(pendingOwner != address(0), "No pending transfer");
        pendingOwner = address(0);
    }

    /**
     * @dev 放弃所有权（危险操作）
     */
    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}

/**
 * @title AccessControl
 * @dev 基于角色的访问控制
 * @notice 支持多个角色的细粒度权限管理
 */
contract AccessControl {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    bytes32 public constant DEFAULT_ADMIN_ROLE = bytes32(0);

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev 检查是否有角色
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members[account];
    }

    /**
     * @dev 授予角色
     */
    function grantRole(bytes32 role, address account) external virtual {
        require(hasRole(_roles[role].adminRole, msg.sender), "Not admin");

        _roles[role].members[account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @dev 撤销角色
     */
    function revokeRole(bytes32 role, address account) external virtual {
        require(hasRole(_roles[role].adminRole, msg.sender), "Not admin");

        _roles[role].members[account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /**
     * @dev 修改器：只有特定角色可以调用
     */
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Not authorized");
        _;
    }

    /**
     * @dev 设置角色管理员
     */
    function setRoleAdmin(bytes32 role, bytes32 adminRole) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
        _roles[role].adminRole = adminRole;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role].members[account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
}

// ==================== 紧急停止模式 ====================

/**
 * @title Pausable
 * @dev 可暂停合约
 * @notice 允许在紧急情况下暂停合约功能
 */
contract Pausable {
    bool public paused;

    event Paused(address account);
    event Unpaused(address account);

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Not paused");
        _;
    }

    /**
     * @dev 暂停合约
     */
    function pause() external virtual whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external virtual whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }
}

/**
 * @title PausableToken
 * @dev 可暂停的代币合约
 * @notice 演示如何在代币合约中实现暂停功能
 */
contract PausableToken is Pausable, Ownable {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    string public name = "Pausable Token";
    string public symbol = "PAUS";
    uint8 public decimals = 18;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _totalSupply) {
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    /**
     * @dev 转账（受暂停影响）
     */
    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        require(to != address(0), "Zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev 授权转账（受暂停影响）
     */
    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        require(from != address(0), "Zero address");
        require(to != address(0), "Zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev 授权（不受暂停影响）
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev 只有所有者可以暂停
     */
    function pause() external override onlyOwner whenNotPaused {
        super.pause();
    }

    /**
     * @dev 只有所有者可以恢复
     */
    function unpause() external override onlyOwner whenPaused {
        super.unpause();
    }
}

// ==================== 存档模式 ====================

/**
 * @title Vault
 * @dev 存档合约模式
 * @notice 将资金存入合约，只有满足条件才能提取
 */
contract Vault is Pausable, Ownable {
    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @dev 存款
     */
    function deposit() external payable whenNotPaused {
        require(msg.value > 0, "No value");

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 提款
     */
    function withdraw(uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev 紧急提款（仅所有者）
     */
    function emergencyWithdraw(address recipient, uint256 amount) external onlyOwner whenPaused {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(recipient).transfer(amount);
    }
}

// ==================== 白名单模式 ====================

/**
 * @title Whitelist
 * @dev 白名单模式
 * @notice 只有白名单用户可以执行特定操作
 */
contract Whitelist {
    mapping(address => bool) public isWhitelisted;
    address[] public whitelistedAddresses;

    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);

    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "Not whitelisted");
        _;
    }

    /**
     * @dev 添加到白名单
     */
    function addToWhitelist(address account) external {
        require(!isWhitelisted[account], "Already whitelisted");

        isWhitelisted[account] = true;
        whitelistedAddresses.push(account);

        emit AddedToWhitelist(account);
    }

    /**
     * @dev 从白名单移除
     */
    function removeFromWhitelist(address account) external {
        require(isWhitelisted[account], "Not whitelisted");

        isWhitelisted[account] = false;

        emit RemovedFromWhitelist(account);
    }

    /**
     * @dev 批量添加到白名单
     */
    function batchAddToWhitelist(address[] calldata accounts) external {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (!isWhitelisted[accounts[i]]) {
                isWhitelisted[accounts[i]] = true;
                whitelistedAddresses.push(accounts[i]);
                emit AddedToWhitelist(accounts[i]);
            }
        }
    }

    /**
     * @dev 获取白名单数量
     */
    function getWhitelistCount() external view returns (uint256) {
        return whitelistedAddresses.length;
    }
}

/**
 * @title WhitelistedSale
 * @dev 白名单销售合约
 * @notice 只有白名单用户可以购买代币
 */
contract WhitelistedSale is Whitelist, Ownable {
    uint256 public price;
    uint256 public totalSold;
    uint256 public maxSupply;
    mapping(address => uint256) public purchased;

    event Purchase(address indexed buyer, uint256 amount, uint256 cost);

    constructor(uint256 _price, uint256 _maxSupply) {
        price = _price;
        maxSupply = _maxSupply;
    }

    /**
     * @dev 购买代币（仅白名单）
     */
    function purchase() external payable onlyWhitelisted {
        require(totalSold < maxSupply, "Sold out");
        require(msg.value >= price, "Insufficient payment");

        uint256 amount = msg.value / price;
        require(totalSold + amount <= maxSupply, "Exceeds max supply");

        purchased[msg.sender] += amount;
        totalSold += amount;

        emit Purchase(msg.sender, amount, msg.value);
    }

    /**
     * @dev 设置价格
     */
    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
    }

    /**
     * @dev 提取销售收入
     */
    function withdrawSales() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}

// ==================== 费用收取模式 ====================

/**
 * @title FeeCollector
 * @dev 费用收取模式
 * @notice 自动收取交易手续费
 */
contract FeeCollector is Ownable {
    uint256 public feeNumerator; // 分子
    uint256 public feeDenominator = 10000; // 分母（基点）
    address public feeRecipient;

    event FeeCollected(address indexed from, uint256 fee);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient);
    event FeeRateChanged(uint256 oldRate, uint256 newRate);

    constructor(uint256 _feeNumerator, address _feeRecipient) {
        require(_feeNumerator <= feeDenominator, "Invalid fee rate");
        feeNumerator = _feeNumerator;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev 计算费用
     */
    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * feeNumerator) / feeDenominator;
    }

    /**
     * @dev 收取费用
     */
    function collectFee(uint256 amount) internal {
        uint256 fee = calculateFee(amount);
        if (fee > 0) {
            payable(feeRecipient).transfer(fee);
            emit FeeCollected(msg.sender, fee);
        }
    }

    /**
     * @dev 设置费用接收者
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Zero address");
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientChanged(oldRecipient, _feeRecipient);
    }

    /**
     * @dev 设置费用率
     */
    function setFeeRate(uint256 _feeNumerator) external onlyOwner {
        require(_feeNumerator <= feeDenominator, "Invalid fee rate");
        uint256 oldRate = feeNumerator;
        feeNumerator = _feeNumerator;
        emit FeeRateChanged(oldRate, _feeNumerator);
    }
}

/**
 * @title FeeMarketplace
 * @dev 带费用的市场合约
 * @notice 演示如何在交易中自动收取费用
 */
contract FeeMarketplace is FeeCollector {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    event ItemListed(uint256 indexed itemId, address indexed seller, uint256 price);
    event ItemSold(uint256 indexed itemId, address indexed buyer, address indexed seller, uint256 price);

    constructor(uint256 _feeNumerator, address _feeRecipient)
        FeeCollector(_feeNumerator, _feeRecipient)
    {}

    /**
     * @dev 上架商品
     */
    function listItem(uint256 itemId, uint256 price) external {
        require(price > 0, "Invalid price");
        require(!listings[itemId].active, "Already listed");

        listings[itemId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        listingCount++;

        emit ItemListed(itemId, msg.sender, price);
    }

    /**
     * @dev 购买商品（自动收取费用）
     */
    function buyItem(uint256 itemId) external payable {
        Listing storage listing = listings[itemId];
        require(listing.active, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false;

        // 收取费用
        collectFee(msg.value);

        // 转账给卖家
        uint256 sellerAmount = msg.value - calculateFee(msg.value);
        payable(listing.seller).transfer(sellerAmount);

        emit ItemSold(itemId, msg.sender, listing.seller, listing.price);
    }

    /**
     * @dev 取消上架
     */
    function cancelListing(uint256 itemId) external {
        Listing storage listing = listings[itemId];
        require(listing.active, "Not listed");
        require(listing.seller == msg.sender, "Not seller");

        listing.active = false;
    }
}

// ==================== 防止重入模式 ====================

/**
 * @title ReentrancyGuard
 * @dev 防重入攻击
 * @notice 保护合约免受重入攻击
 */
contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title SecureVault
 * @dev 安全金库（防重入）
 * @notice 演示如何防止重入攻击
 */
contract SecureVault is ReentrancyGuard, Ownable {
    mapping(address => uint256) public balances;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    /**
     * @dev 存款
     */
    function deposit() external payable {
        require(msg.value > 0, "No value");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 提款（防重入）
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // ✅ 先更新状态
        balances[msg.sender] -= amount;

        // ✅ 后执行外部调用
        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev 批量提款（防重入）
     */
    function batchWithdraw(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyOwner
        nonReentrant
    {
        require(recipients.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];

            require(balances[recipient] >= amount, "Insufficient balance");

            // 先更新所有状态
            balances[recipient] -= amount;
        }

        // 后执行所有外部调用
        for (uint256 i = 0; i < recipients.length; i++) {
            payable(recipients[i]).transfer(amounts[i]);
        }
    }
}

// ==================== 徽章/成就模式 ====================

/**
 * @title Badge
 * @dev 徽章合约
 * @notice 管理用户成就和徽章
 */
contract Badge is Ownable {
    struct BadgeInfo {
        string name;
        string description;
        string image;
        bool exists;
    }

    mapping(uint256 => BadgeInfo) public badges;
    mapping(uint256 => mapping(address => bool)) public hasBadge;
    mapping(uint256 => uint256) public badgeCount;
    uint256 public totalBadges;

    event BadgeCreated(uint256 indexed badgeId, string name, string description);
    event BadgeAwarded(uint256 indexed badgeId, address indexed recipient);

    /**
     * @dev 创建徽章
     */
    function createBadge(
        uint256 badgeId,
        string calldata name,
        string calldata description,
        string calldata image
    ) external onlyOwner {
        require(!badges[badgeId].exists, "Badge exists");

        badges[badgeId] = BadgeInfo({
            name: name,
            description: description,
            image: image,
            exists: true
        });

        totalBadges++;

        emit BadgeCreated(badgeId, name, description);
    }

    /**
     * @dev 授予徽章
     */
    function awardBadge(uint256 badgeId, address recipient) external onlyOwner {
        require(badges[badgeId].exists, "Badge not exists");
        require(!hasBadge[badgeId][recipient], "Already has badge");

        hasBadge[badgeId][recipient] = true;
        badgeCount[badgeId]++;

        emit BadgeAwarded(badgeId, recipient);
    }

    /**
     * @dev 批量授予徽章
     */
    function batchAwardBadge(uint256 badgeId, address[] calldata recipients) external onlyOwner {
        require(badges[badgeId].exists, "Badge not exists");

        for (uint256 i = 0; i < recipients.length; i++) {
            if (!hasBadge[badgeId][recipients[i]]) {
                hasBadge[badgeId][recipients[i]] = true;
                badgeCount[badgeId]++;
                emit BadgeAwarded(badgeId, recipients[i]);
            }
        }
    }

    /**
     * @dev 检查是否有徽章
     */
    function checkBadge(uint256 badgeId, address account) external view returns (bool) {
        return hasBadge[badgeId][account];
    }

    /**
     * @dev 获取用户的徽章数量
     */
    function getUserBadgeCount(address account, uint256[] calldata badgeIds)
        external
        view
        returns (uint256)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < badgeIds.length; i++) {
            if (hasBadge[badgeIds[i]][account]) {
                count++;
            }
        }
        return count;
    }
}

// ==================== 速率限制模式 ====================

/**
 * @title RateLimiter
 * @dev 速率限制器
 * @notice 限制用户在特定时间内的操作次数
 */
contract RateLimiter {
    struct Limit {
        uint256 maxCalls;
        uint256 window;
        mapping(address => uint256) lastCallTime;
        mapping(address => uint256) callCount;
    }

    mapping(bytes32 => Limit) private limits;

    event LimitSet(bytes32 indexed limitId, uint256 maxCalls, uint256 window);

    /**
     * @dev 设置限制
     */
    function setLimit(
        bytes32 limitId,
        uint256 maxCalls,
        uint256 window
    ) external {
        limits[limitId].maxCalls = maxCalls;
        limits[limitId].window = window;
        emit LimitSet(limitId, maxCalls, window);
    }

    /**
     * @dev 修改器：速率限制
     */
    modifier rateLimit(bytes32 limitId) {
        Limit storage limit = limits[limitId];

        require(limit.maxCalls > 0, "No limit set");

        // 重置窗口
        if (block.timestamp >= limit.lastCallTime[msg.sender] + limit.window) {
            limit.callCount[msg.sender] = 0;
            limit.lastCallTime[msg.sender] = block.timestamp;
        }

        require(limit.callCount[msg.sender] < limit.maxCalls, "Rate limit exceeded");

        limit.callCount[msg.sender]++;
        _;
    }

    /**
     * @dev 检查是否允许调用
     */
    function canCall(bytes32 limitId, address account) external view returns (bool) {
        Limit storage limit = limits[limitId];

        if (limit.maxCalls == 0) return true;

        if (block.timestamp >= limit.lastCallTime[account] + limit.window) {
            return true;
        }

        return limit.callCount[account] < limit.maxCalls;
    }

    /**
     * @dev 获取剩余调用次数
     */
    function getRemainingCalls(bytes32 limitId, address account) external view returns (uint256) {
        Limit storage limit = limits[limitId];

        if (limit.maxCalls == 0) return type(uint256).max;

        if (block.timestamp >= limit.lastCallTime[account] + limit.window) {
            return limit.maxCalls;
        }

        return limit.maxCalls - limit.callCount[account];
    }
}

/**
 * @title RateLimitedMint
 * @dev 速率限制的铸造合约
 * @notice 限制用户的铸造频率
 */
contract RateLimitedMint is RateLimiter, Ownable {
    uint256 public totalMinted;
    uint256 public maxSupply;
    mapping(address => uint256) public mintedBy;

    bytes32 public constant MINT_LIMIT = keccak256("MINT_LIMIT");

    event Minted(address indexed minter, uint256 amount);

    constructor(uint256 _maxSupply) {
        maxSupply = _maxSupply;

        // 每小时最多铸造5次
        setLimit(MINT_LIMIT, 5, 1 hours);
    }

    /**
     * @dev 铸造（受速率限制）
     */
    function mint(uint256 amount) external rateLimit(MINT_LIMIT) {
        require(totalMinted + amount <= maxSupply, "Exceeds max supply");
        require(amount > 0, "Invalid amount");

        totalMinted += amount;
        mintedBy[msg.sender] += amount;

        emit Minted(msg.sender, amount);
    }

    /**
     * @dev 设置铸造限制
     */
    function setMintLimit(uint256 maxCalls, uint256 window) external onlyOwner {
        setLimit(MINT_LIMIT, maxCalls, window);
    }
}

// ==================== 模式组合示例 ====================

/**
 * @title RobustToken
 * @dev 健壮的代币合约
 * @notice 组合多种模式的完整示例
 */
contract RobustToken is
    Pausable,
    Ownable,
    ReentrancyGuard,
    AccessControl
{
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    string public name = "Robust Token";
    string public symbol = "RBT";
    uint8 public decimals = 18;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER");

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    /**
     * @dev 转账（可暂停）
     */
    function transfer(address to, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(to != address(0), "Zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev 授权转账（可暂停）
     */
    function transferFrom(address from, address to, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        require(from != address(0), "Zero address");
        require(to != address(0), "Zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev 授权
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev 铸造（需要角色）
     */
    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(to != address(0), "Zero address");

        balanceOf[to] += amount;
        totalSupply += amount;

        emit Transfer(address(0), to, amount);
        emit Minted(to, amount);
    }

    /**
     * @dev 销毁（需要角色）
     */
    function burn(uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        nonReentrant
    {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;

        emit Transfer(msg.sender, address(0), amount);
        emit Burned(msg.sender, amount);
    }

    /**
     * @dev 暂停（只有所有者）
     */
    function pause() external override onlyOwner whenNotPaused {
        super.pause();
    }

    /**
     * @dev 恢复（只有所有者）
     */
    function unpause() external override onlyOwner whenPaused {
        super.unpause();
    }
}

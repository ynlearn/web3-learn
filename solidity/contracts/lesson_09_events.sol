// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EventsAndLogs
 * @dev Solidity 事件与日志完整示例
 * @notice 演示事件的定义、索引、参数、Gas 优化等
 */

/**
 * @title EventContract
 * @dev 事件使用示例合约
 */
contract EventContract {
    // ==================== 状态变量 ====================
    mapping(address => uint256) public balances;
    mapping(address => bool) public verifiedUsers;

    address public owner;
    uint256 public totalTransfers;
    uint256 public totalDeposits;

    // ==================== 基础事件定义 ====================

    /**
     * @dev 转账事件
     * @notice 最多 3 个 indexed 参数（用于过滤）
     */
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 timestamp
    );

    /**
     * @dev 存款事件
     * @notice 非 indexed 参数不能用于过滤，但更节省 Gas
     */
    event Deposit(
        address indexed account,
        uint256 amount,
        uint256 newBalance,
        string message
    );

    /**
     * @dev 所有权转移事件
     */
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ==================== 高级事件定义 ====================

    /**
     * @dev 批量转账事件
     * @notice 使用数组作为参数
     */
    event BatchTransfer(
        address indexed from,
        address[] recipients,
        uint256[] amounts,
        uint256 total
    );

    /**
     * @dev 用户验证事件
     * @notice 使用布尔值
     */
    event UserVerified(
        address indexed account,
        bool verified,
        uint256 timestamp
    );

    /**
     * @dev 管理员操作事件
     * @notice 使用枚举和结构体
     */
    enum AdminActionType { Pause, Unpause, UpdateConfig, EmergencyWithdraw }

    event AdminAction(
        address indexed admin,
        AdminActionType action,
        uint256 timestamp,
        string details
    );

    /**
     * @dev 错误事件
     * @notice 记录操作失败
     */
    event ErrorOccurred(
        address indexed account,
        string reason,
        uint256 errorCode
    );

    /**
     * @dev 状态变更事件
     * @notice 记录重要状态变化
     */
    event StateChanged(
        bytes32 indexed stateKey,
        bytes32 oldValue,
        bytes32 newValue,
        uint256 timestamp
    );

    /**
     * @dev 合约创建事件
     * @notice 记录子合约创建
     */
    event ContractCreated(
        address indexed newContract,
        string contractType,
        address indexed creator
    );

    // ==================== 匿名事件 ====================

    /**
     * @dev 匿名事件
     * @notice anonymous 关键字允许没有索引参数的过滤
     */
    event AnonymousEvent(address sender, uint256 value) anonymous;

    // ==================== 构造函数 ====================

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ==================== 基础功能函数 ====================

    /**
     * @dev 存款函数
     */
    function deposit(string memory _message) public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(
            msg.sender,
            msg.value,
            balances[msg.sender],
            _message
        );
    }

    /**
     * @dev 转账函数
     */
    function transfer(address _to, uint256 _value) public {
        require(_to != address(0), "Cannot transfer to zero address");
        require(_value > 0, "Transfer amount must be greater than 0");
        require(balances[msg.sender] >= _value, "Insufficient balance");

        balances[msg.sender] -= _value;
        balances[_to] += _value;
        totalTransfers++;

        emit Transfer(
            msg.sender,
            _to,
            _value,
            block.timestamp
        );
    }

    /**
     * @dev 批量转账
     */
    function batchTransfer(
        address[] memory _recipients,
        uint256[] memory _amounts
    ) public {
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        require(_recipients.length > 0, "Empty arrays");
        require(_recipients.length <= 50, "Too many recipients");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_recipients[i] != address(0), "Invalid recipient");
            require(_amounts[i] > 0, "Invalid amount");
            totalAmount += _amounts[i];
        }

        require(balances[msg.sender] >= totalAmount, "Insufficient balance");

        balances[msg.sender] -= totalAmount;

        for (uint256 i = 0; i < _recipients.length; i++) {
            balances[_recipients[i]] += _amounts[i];
        }

        emit BatchTransfer(
            msg.sender,
            _recipients,
            _amounts,
            totalAmount
        );
    }

    /**
     * @dev 验证用户
     */
    function verifyUser(address _user, bool _verified) public {
        require(msg.sender == owner, "Only owner");

        verifiedUsers[_user] = _verified;

        emit UserVerified(
            _user,
            _verified,
            block.timestamp
        );
    }

    /**
     * @dev 管理员操作
     */
    function performAdminAction(
        AdminActionType _action,
        string memory _details
    ) public {
        require(msg.sender == owner, "Only owner");

        emit AdminAction(
            msg.sender,
            _action,
            block.timestamp,
            _details
        );
    }

    /**
     * @dev 转移所有权
     */
    function transferOwnership(address _newOwner) public {
        require(msg.sender == owner, "Only owner");
        require(_newOwner != address(0), "Zero address");

        address oldOwner = owner;
        owner = _newOwner;

        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    // ==================== 高级功能函数 ====================

    /**
     * @dev 条件转账（带错误处理）
     */
    function conditionalTransfer(
        address _to,
        uint256 _value,
        uint256 _minBalance
    ) public {
        if (_to == address(0) || _value == 0) {
            emit ErrorOccurred(
                msg.sender,
                "Invalid transfer parameters",
                400
            );
            revert("Invalid parameters");
        }

        if (balances[msg.sender] < _value) {
            emit ErrorOccurred(
                msg.sender,
                "Insufficient balance",
                401
            );
            revert("Insufficient balance");
        }

        if (balances[_to] + _value < _minBalance) {
            emit ErrorOccurred(
                msg.sender,
                "Recipient balance would be too low",
                402
            );
            revert("Recipient balance constraint");
        }

        balances[msg.sender] -= _value;
        balances[_to] += _value;

        emit Transfer(msg.sender, _to, _value, block.timestamp);
    }

    /**
     * @dev 状态变更记录
     */
    function updateState(
        bytes32 _key,
        bytes32 _newValue
    ) public {
        require(msg.sender == owner, "Only owner");

        // 模拟状态存储
        emit StateChanged(
            _key,
            bytes32(0), // 旧值（简化）
            _newValue,
            block.timestamp
        );
    }

    /**
     * @dev 记录复杂操作
     */
    function complexOperation(
        address _user,
        uint256 _amount1,
        uint256 _amount2,
        string memory _operationType
    ) public {
        require(msg.sender == owner, "Only owner");

        uint256 total = _amount1 + _amount2;

        emit UserVerified(_user, true, block.timestamp);
        emit Transfer(owner, _user, total, block.timestamp);

        emit AdminAction(
            msg.sender,
            AdminActionType.UpdateConfig,
            block.timestamp,
            _operationType
        );
    }

    // ==================== Gas 优化事件 ====================

    /**
     * @dev 高效转账事件
     * @notice 优化索引参数数量以节省 Gas
     */
    event EfficientTransfer(
        address indexed from,
        address indexed to,
        uint256 value
        // timestamp 不索引，节省 Gas
    );

    function efficientTransfer(address _to, uint256 _value) public {
        require(balances[msg.sender] >= _value, "Insufficient balance");

        balances[msg.sender] -= _value;
        balances[_to] += _value;

        emit EfficientTransfer(msg.sender, _to, _value);
    }

    /**
     * @dev 批量操作汇总事件
     * @notice 一次事件记录多次操作
     */
    event BatchOperation(
        address indexed operator,
        uint256 operationCount,
        uint256 totalValue,
        bytes32 operationsHash
    );

    function batchOperation(
        address[] memory _recipients,
        uint256[] memory _values
    ) public {
        require(_recipients.length == _values.length, "Length mismatch");

        uint256 totalValue = 0;
        for (uint256 i = 0; i < _values.length; i++) {
            totalValue += _values[i];
            require(balances[msg.sender] >= _values[i], "Insufficient balance");
            balances[msg.sender] -= _values[i];
            balances[_recipients[i]] += _values[i];
        }

        emit BatchOperation(
            msg.sender,
            _recipients.length,
            totalValue,
            keccak256(abi.encodePacked(_recipients, _values))
        );
    }

    // ==================== 辅助函数 ====================

    /**
     * @dev 获取余额
     */
    function getBalance(address _account) public view returns (uint256) {
        return balances[_account];
    }

    /**
     * @dev 接收 Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, balances[msg.sender], "Received ETH");
    }

    /**
     * @dev Fallback 函数
     */
    fallback() external payable {
        emit ErrorOccurred(msg.sender, "Fallback called", 404);
    }
}

/**
 * @title NFTContract
 * @dev NFT 事件示例
 */
contract NFTContract {
    struct Token {
        uint256 id;
        address creator;
        string uri;
        uint256 createdAt;
    }

    mapping(uint256 => Token) public tokens;
    mapping(address => uint256[]) public userTokens;

    uint256 public totalTokens;

    // NFT 标准事件
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );

    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // 自定义事件
    event Minted(
        uint256 indexed tokenId,
        address indexed creator,
        string uri,
        uint256 timestamp
    );

    event Burned(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string oldUri,
        string newUri,
        uint256 timestamp
    );

    function mint(string memory _uri) public {
        uint256 tokenId = ++totalTokens;

        tokens[tokenId] = Token({
            id: tokenId,
            creator: msg.sender,
            uri: _uri,
            createdAt: block.timestamp
        });

        userTokens[msg.sender].push(tokenId);

        emit Minted(tokenId, msg.sender, _uri, block.timestamp);
        emit Transfer(address(0), msg.sender, tokenId);
    }

    function burn(uint256 _tokenId) public {
        require(tokens[_tokenId].creator == msg.sender, "Not token owner");

        delete tokens[_tokenId];

        emit Burned(_tokenId, msg.sender, block.timestamp);
        emit Transfer(msg.sender, address(0), _tokenId);
    }

    function updateMetadata(uint256 _tokenId, string memory _newUri) public {
        require(tokens[_tokenId].creator == msg.sender, "Not token owner");

        string memory oldUri = tokens[_tokenId].uri;
        tokens[_tokenId].uri = _newUri;

        emit MetadataUpdated(_tokenId, oldUri, _newUri, block.timestamp);
    }
}

/**
 * @title DeFiProtocol
 * @dev DeFi 协议事件示例
 */
contract DeFiProtocol {
    struct Pool {
        uint256 totalLiquidity;
        uint256 reserveA;
        uint256 reserveB;
        uint256 lastUpdate;
    }

    mapping(address => Pool) public pools;
    mapping(address => uint256) public userLiquidity;

    // 添加流动性事件
    event LiquidityAdded(
        address indexed provider,
        address indexed pool,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityTokens,
        uint256 timestamp
    );

    // 移除流动性事件
    event LiquidityRemoved(
        address indexed provider,
        address indexed pool,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityTokens,
        uint256 timestamp
    );

    // Swap 事件
    event Swapped(
        address indexed trader,
        address indexed pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    // 价格更新事件
    event PriceUpdated(
        address indexed pool,
        uint256 priceA,
        uint256 priceB,
        uint256 timestamp
    );

    // 紧急提款事件
    event EmergencyWithdraw(
        address indexed user,
        address indexed pool,
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    function addLiquidity(
        address _pool,
        uint256 _amountA,
        uint256 _amountB
    ) public {
        Pool storage pool = pools[_pool];

        pool.reserveA += _amountA;
        pool.reserveB += _amountB;
        pool.totalLiquidity += (_amountA + _amountB);
        pool.lastUpdate = block.timestamp;

        userLiquidity[msg.sender] += (_amountA + _amountB);

        emit LiquidityAdded(
            msg.sender,
            _pool,
            _amountA,
            _amountB,
            (_amountA + _amountB),
            block.timestamp
        );

        emit PriceUpdated(_pool, pool.reserveA, pool.reserveB, block.timestamp);
    }

    function swap(
        address _pool,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) public returns (uint256) {
        // 简化的 swap 逻辑
        uint256 amountOut = _amountIn * 95 / 100; // 5% fee

        emit Swapped(
            msg.sender,
            _pool,
            _tokenIn,
            _tokenOut,
            _amountIn,
            amountOut,
            block.timestamp
        );

        return amountOut;
    }
}

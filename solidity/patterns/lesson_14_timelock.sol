// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TimelockPattern
 * @dev 时间锁模式完整示例
 * @notice 演示时间锁在智能合约中的应用，包括延迟执行、交易队列、紧急暂停等
 */

// ==================== 基础时间锁 ====================

/**
 * @title SimpleTimelock
 * @dev 简单时间锁合约
 * @notice 为关键操作添加延迟执行机制
 */
contract SimpleTimelock {
    address public owner;
    uint256 public delay;
    uint256 public constant MIN_DELAY = 1 days;
    uint256 public constant MAX_DELAY = 30 days;

    struct Transaction {
        address target;
        uint256 value;
        bytes data;
        uint256 executeTime;
        bool executed;
    }

    mapping(bytes32 => Transaction) public transactions;
    bytes32[] public transactionIds;

    event TransactionQueued(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        bytes data,
        uint256 executeTime
    );
    event TransactionExecuted(bytes32 indexed txHash, address indexed target);
    event TransactionCancelled(bytes32 indexed txHash);
    event DelayChanged(uint256 oldDelay, uint256 newDelay);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @dev 构造函数
     * @param _delay 延迟时间（秒）
     */
    constructor(uint256 _delay) {
        require(_delay >= MIN_DELAY, "Delay too short");
        require(_delay <= MAX_DELAY, "Delay too long");

        owner = msg.sender;
        delay = _delay;
    }

    /**
     * @dev 将交易加入队列
     * @param target 目标合约
     * @param value 发送的 ETH 数量
     * @param data 调用数据
     * @return txHash 交易哈希
     */
    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bytes32 txHash) {
        require(target != address(0), "Invalid target");

        uint256 executeTime = block.timestamp + delay;
        txHash = keccak256(abi.encode(target, value, data, executeTime));

        transactions[txHash] = Transaction({
            target: target,
            value: value,
            data: data,
            executeTime: executeTime,
            executed: false
        });

        transactionIds.push(txHash);

        emit TransactionQueued(txHash, target, value, data, executeTime);
    }

    /**
     * @dev 执行队列中的交易
     * @param target 目标合约
     * @param value 发送的 ETH 数量
     * @param data 调用数据
     * @param executeTime 执行时间
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeTime
    ) external onlyOwner returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));
        Transaction storage txn = transactions[txHash];

        require(txn.target == target, "Invalid transaction");
        require(txn.value == value, "Invalid value");
        require(txn.executeTime == executeTime, "Invalid execute time");
        require(txn.executed == false, "Already executed");
        require(block.timestamp >= executeTime, "Too early");
        require(block.timestamp <= executeTime + 30 days, "Too late");

        txn.executed = true;

        (bool success, bytes memory returnData) = target.call{value: value}(data);
        require(success, "Transaction failed");

        emit TransactionExecuted(txHash, target);

        return returnData;
    }

    /**
     * @dev 取消队列中的交易
     */
    function cancelTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeTime
    ) external onlyOwner {
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));
        require(transactions[txHash].target == target, "Transaction not found");

        delete transactions[txHash];

        emit TransactionCancelled(txHash);
    }

    /**
     * @dev 更改延迟时间
     */
    function setDelay(uint256 _delay) external onlyOwner {
        require(_delay >= MIN_DELAY, "Delay too short");
        require(_delay <= MAX_DELAY, "Delay too long");

        uint256 oldDelay = delay;
        delay = _delay;

        emit DelayChanged(oldDelay, delay);
    }

    /**
     * @dev 获取交易信息
     */
    function getTransaction(bytes32 txHash) external view returns (
        address target,
        uint256 value,
        bytes memory data,
        uint256 executeTime,
        bool executed
    ) {
        Transaction memory txn = transactions[txHash];
        return (txn.target, txn.value, txn.data, txn.executeTime, txn.executed);
    }

    /**
     * @dev 检查交易是否可以执行
     */
    function isTransactionPending(bytes32 txHash) external view returns (bool) {
        return transactions[txHash].target != address(0) && !transactions[txHash].executed;
    }

    /**
     * @dev 获取所有待处理交易
     */
    function getPendingTransactions() external view returns (bytes32[] memory) {
        bytes32[] memory pending = new bytes32[](transactionIds.length);
        uint256 count = 0;

        for (uint256 i = 0; i < transactionIds.length; i++) {
            if (!transactions[transactionIds[i]].executed) {
                pending[count] = transactionIds[i];
                count++;
            }
        }

        // 调整数组大小
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pending[i];
        }

        return result;
    }
}

// ==================== 管理员时间锁 ====================

/**
 * @title TimelockController
 * @dev 时间锁控制器（OpenZeppelin 风格）
 * @notice 更强大的时间锁实现，支持多签和角色管理
 */
contract TimelockController {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    uint256 public minDelay;
    address public admin;

    mapping(bytes32 => bool) public roles;
    mapping(address => bool) public hasRole;

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    struct Transaction {
        Call[] calls;
        bytes32 salt;
        uint256 executeTime;
        bool executed;
    }

    mapping(bytes32 => Transaction) public transactions;

    event CallScheduled(
        bytes32 indexed id,
        address[] indexed targets,
        uint256[] values,
        bytes[] datas,
        uint256 executeTime
    );
    event CallExecuted(bytes32 indexed id);
    event CallCancelled(bytes32 indexed id);
    event MinDelayChanged(uint256 oldDuration, uint256 newDuration);

    modifier onlyRole(bytes32 role) {
        require(hasRole[msg.sender] && roles[role], "Not authorized");
        _;
    }

    constructor(uint256 _minDelay, address _admin) {
        require(_minDelay >= 1 days, "Delay too short");
        require(_minDelay <= 30 days, "Delay too long");

        minDelay = _minDelay;
        admin = _admin;

        // 设置角色
        roles[ADMIN_ROLE] = true;
        hasRole[_admin] = true;
    }

    /**
     * @dev 调度批量调用
     */
    function schedule(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 salt
    ) external onlyRole(PROPOSER_ROLE) returns (bytes32) {
        require(targets.length == values.length, "Length mismatch");
        require(targets.length == datas.length, "Length mismatch");
        require(targets.length > 0, "Empty calls");

        uint256 executeTime = block.timestamp + minDelay;
        bytes32 txHash = keccak256(abi.encode(targets, values, datas, salt));

        require(transactions[txHash].executeTime == 0, "Already scheduled");

        // 创建调用数组
        Call[] memory calls = new Call[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            calls[i] = Call({
                target: targets[i],
                value: values[i],
                data: datas[i]
            });
        }

        transactions[txHash] = Transaction({
            calls: calls,
            salt: salt,
            executeTime: executeTime,
            executed: false
        });

        emit CallScheduled(txHash, targets, values, datas, executeTime);

        return txHash;
    }

    /**
     * @dev 执行批量调用
     */
    function execute(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 salt
    ) external onlyRole(EXECUTOR_ROLE) {
        bytes32 txHash = keccak256(abi.encode(targets, values, datas, salt));
        Transaction storage txn = transactions[txHash];

        require(txn.executeTime != 0, "Not scheduled");
        require(!txn.executed, "Already executed");
        require(block.timestamp >= txn.executeTime, "Too early");
        require(block.timestamp <= txn.executeTime + 30 days, "Too late");

        txn.executed = true;

        for (uint256 i = 0; i < txn.calls.length; i++) {
            (bool success, ) = txn.calls[i].target.call{value: txn.calls[i].value}(txn.calls[i].data);
            require(success, "Call failed");
        }

        emit CallExecuted(txHash);
    }

    /**
     * @dev 取消调用
     */
    function cancel(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 salt
    ) external onlyRole(CANCELLER_ROLE) {
        bytes32 txHash = keccak256(abi.encode(targets, values, datas, salt));
        require(transactions[txHash].executeTime != 0, "Not scheduled");
        require(!transactions[txHash].executed, "Already executed");

        delete transactions[txHash];

        emit CallCancelled(txHash);
    }

    /**
     * @dev 更改最小延迟
     */
    function updateDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        require(newDelay >= 1 days, "Delay too short");
        require(newDelay <= 30 days, "Delay too long");

        uint256 oldDelay = minDelay;
        minDelay = newDelay;

        emit MinDelayChanged(oldDelay, newDelay);
    }

    /**
     * @dev 授予角色
     */
    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        roles[role] = true;
        hasRole[account] = true;
    }

    /**
     * @dev 撤销角色
     */
    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        hasRole[account] = false;
    }
}

// ==================== 紧急暂停时间锁 ====================

/**
 * @title EmergencyPauseTimelock
 * @dev 紧急暂停时间锁
 * @notice 支持紧急暂停，但需要多长时间后才能恢复
 */
contract EmergencyPauseTimelock {
    address public owner;
    bool public paused;
    uint256 public pauseDelay;
    uint256 public unpauseTime;

    uint256 public constant PAUSE_DURATION = 7 days;
    uint256 public constant MIN_UNPAUSE_DELAY = 3 days;

    event Paused(address indexed caller, uint256 indexed until);
    event UnpauseScheduled(uint256 scheduledTime);
    event Unpaused(address indexed caller);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor(uint256 _pauseDelay) {
        require(_pauseDelay >= MIN_UNPAUSE_DELAY, "Delay too short");

        owner = msg.sender;
        pauseDelay = _pauseDelay;
        paused = false;
    }

    /**
     * @dev 紧急暂停
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");

        paused = true;
        uint256 unpauseSchedule = block.timestamp + pauseDelay;
        unpauseTime = unpauseSchedule;

        emit Paused(msg.sender, unpauseSchedule);
    }

    /**
     * @dev 计划恢复
     */
    function scheduleUnpause() external onlyOwner {
        require(paused, "Not paused");
        require(block.timestamp >= unpauseTime, "Too early");

        emit UnpauseScheduled(block.timestamp);
    }

    /**
     * @dev 恢复
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        require(block.timestamp >= unpauseTime, "Too early");

        paused = false;

        emit Unpaused(msg.sender);
    }

    /**
     * @dev 获取距离恢复还有多长时间
     */
    function timeUntilUnpause() external view returns (uint256) {
        if (!paused) return 0;
        if (block.timestamp >= unpauseTime) return 0;
        return unpauseTime - block.timestamp;
    }
}

// ==================== 投票时间锁 ====================

/**
 * @title VotingTimelock
 * @dev 投票时间锁
 * @notice 投票通过后需要等待一段时间才能执行
 */
contract VotingTimelock {
    address public owner;
    uint256 public votingDelay;
    uint256 public executionDelay;

    struct Proposal {
        address proposer;
        bytes32 descriptionHash;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 executeAfter;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    mapping(bytes32 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;

    bytes32[] public proposalIds;

    event ProposalCreated(
        bytes32 indexed proposalId,
        address indexed proposer,
        bytes32 descriptionHash
    );
    event VoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(bytes32 indexed proposalId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _votingDelay, uint256 _executionDelay) {
        require(_votingDelay >= 1 days, "Voting delay too short");
        require(_executionDelay >= 1 days, "Execution delay too short");

        owner = msg.sender;
        votingDelay = _votingDelay;
        executionDelay = _executionDelay;
    }

    /**
     * @dev 设置投票权重
     */
    function setVotingPower(address voter, uint256 power) external onlyOwner {
        votingPower[voter] = power;
    }

    /**
     * @dev 创建提案
     */
    function propose(
        address target,
        bytes calldata data,
        bytes32 descriptionHash
    ) external returns (bytes32) {
        require(votingPower[msg.sender] > 0, "No voting power");

        bytes32 proposalId = keccak256(abi.encode(target, data, descriptionHash));

        require(proposals[proposalId].startTime == 0, "Proposal exists");

        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            descriptionHash: descriptionHash,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingDelay,
            executeAfter: block.timestamp + votingDelay + executionDelay,
            executed: false
        });

        proposalIds.push(proposalId);

        emit ProposalCreated(proposalId, msg.sender, descriptionHash);

        return proposalId;
    }

    /**
     * @dev 投票
     */
    function vote(bytes32 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.startTime != 0, "Proposal not found");
        require(block.timestamp < proposal.endTime, "Voting ended");
        require(votingPower[msg.sender] > 0, "No voting power");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;
        uint256 weight = votingPower[msg.sender];

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev 执行提案
     */
    function execute(
        address target,
        bytes calldata data,
        bytes32 descriptionHash
    ) external {
        bytes32 proposalId = keccak256(abi.encode(target, data, descriptionHash));
        Proposal storage proposal = proposals[proposalId];

        require(proposal.startTime != 0, "Proposal not found");
        require(!proposal.executed, "Already executed");
        require(block.timestamp >= proposal.executeAfter, "Too early");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        require(totalVotes > 0, "No votes");
        require(proposal.forVotes > proposal.againstVotes, "Not approved");

        proposal.executed = true;

        (bool success, ) = target.call(data);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev 检查提案是否通过
     */
    function state(bytes32 proposalId) external view returns (uint8) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) return 4; // Executed
        if (block.timestamp < proposal.endTime) return 0; // Pending
        if (block.timestamp >= proposal.endTime && block.timestamp < proposal.executeAfter) {
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
            if (totalVotes == 0) return 3; // Defeated
            if (proposal.forVotes > proposal.againstVotes) return 1; // Succeeded
            return 3; // Defeated
        }
        if (block.timestamp >= proposal.executeAfter) {
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
            if (totalVotes == 0) return 3; // Defeated
            if (proposal.forVotes > proposal.againstVotes) return 2; // Ready for execution
            return 3; // Defeated
        }
        return 5; // Expired
    }
}

// ==================== 渐进式去中心化时间锁 ====================

/**
 * @title ProgressiveDecentralizationTimelock
 * @dev 渐进式去中心化时间锁
 * @notice 随着时间推移，逐步将权限转移给社区
 */
contract ProgressiveDecentralizationTimelock {
    address public admin;
    uint256 public startTime;
    uint256 public transitionDuration;

    uint256 public constant FULL_ADMIN_POWER = 100;
    uint256 public constant FULL_COMMUNITY_POWER = 100;

    struct Phase {
        uint256 startTime;
        uint256 adminPower;
        uint256 communityPower;
        string description;
    }

    Phase[] public phases;

    event PhaseTransition(uint256 indexed phase, string description);

    constructor(uint256 _transitionDuration) {
        admin = msg.sender;
        startTime = block.timestamp;
        transitionDuration = _transitionDuration;

        // 定义阶段
        phases.push(Phase({
            startTime: block.timestamp,
            adminPower: 100,
            communityPower: 0,
            description: "Centralized: Admin has full control"
        }));

        phases.push(Phase({
            startTime: block.timestamp + _transitionDuration / 4,
            adminPower: 75,
            communityPower: 25,
            description: "Transition 1: Community gets 25% voting power"
        }));

        phases.push(Phase({
            startTime: block.timestamp + _transitionDuration / 2,
            adminPower: 50,
            communityPower: 50,
            description: "Transition 2: Equal power sharing"
        }));

        phases.push(Phase({
            startTime: block.timestamp + _transitionDuration * 3 / 4,
            adminPower: 25,
            communityPower: 75,
            description: "Transition 3: Community gets 75% voting power"
        }));

        phases.push(Phase({
            startTime: block.timestamp + _transitionDuration,
            adminPower: 0,
            communityPower: 100,
            description: "Decentralized: Community has full control"
        }));
    }

    /**
     * @dev 获取当前阶段
     */
    function getCurrentPhase() public view returns (uint256) {
        for (uint256 i = phases.length - 1; i >= 0; i--) {
            if (block.timestamp >= phases[i].startTime) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @dev 执行需要权限的操作
     */
    function executeWithPermission(
        address target,
        bytes calldata data
    ) external returns (bool) {
        uint256 currentPhase = getCurrentPhase();
        Phase memory phase = phases[currentPhase];

        require(phase.adminPower > 0 || phase.communityPower > 0, "No power");

        // 简化版：实际实现需要投票机制
        if (msg.sender == admin) {
            require(phase.adminPower > 0, "Admin has no power");
            (bool success, ) = target.call(data);
            return success;
        } else {
            require(phase.communityPower > 0, "Community has no power");
            // 这里应该实现社区投票逻辑
            (bool success, ) = target.call(data);
            return success;
        }
    }

    /**
     * @dev 获取当前阶段信息
     */
    function getCurrentPhaseInfo() external view returns (
        uint256 phase,
        uint256 adminPower,
        uint256 communityPower,
        string memory description
    ) {
        phase = getCurrentPhase();
        adminPower = phases[phase].adminPower;
        communityPower = phases[phase].communityPower;
        description = phases[phase].description;
    }
}

// ==================== 时间锁最佳实践 ====================

/**
 * @title TimelockBestPractices
 * @dev 时间锁最佳实践示例
 * @notice 演示如何正确实现时间锁
 */
contract TimelockBestPractices {
    address public owner;
    uint256 public delay;
    uint256 public constant MIN_DELAY = 2 days;
    uint256 public constant GRACE_PERIOD = 30 days;

    mapping(bytes32 => bool) public queuedTransactions;

    event TransactionQueued(bytes32 indexed txHash, uint256 executeTime);
    event TransactionExecuted(bytes32 indexed txHash);
    event TransactionCancelled(bytes32 indexed txHash);

    // ✅ 最佳实践1: 设置合理的最小延迟
    constructor(uint256 _delay) {
        require(_delay >= MIN_DELAY, "Delay too short");
        delay = _delay;
        owner = msg.sender;
    }

    // ✅ 最佳实践2: 使用修饰器进行权限检查
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ✅ 最佳实践3: 验证交易参数
    modifier validTransaction(address target, uint256 value) {
        require(target != address(0), "Invalid target");
        require(value == 0 || address(this).balance >= value, "Insufficient balance");
        _;
    }

    /**
     * @dev 调度交易
     */
    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner validTransaction(target, value) returns (bytes32) {
        uint256 executeTime = block.timestamp + delay;
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));

        require(!queuedTransactions[txHash], "Already queued");

        queuedTransactions[txHash] = true;

        emit TransactionQueued(txHash, executeTime);

        return txHash;
    }

    /**
     * @dev 执行交易
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeTime
    ) external onlyOwner validTransaction(target, value) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));

        require(queuedTransactions[txHash], "Not queued");
        require(block.timestamp >= executeTime, "Too early");
        require(block.timestamp <= executeTime + GRACE_PERIOD, "Too late");

        queuedTransactions[txHash] = false;

        (bool success, ) = target.call{value: value}(data);
        require(success, "Transaction failed");

        emit TransactionExecuted(txHash);
    }

    /**
     * @dev 取消交易
     */
    function cancelTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeTime
    ) external onlyOwner {
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));

        require(queuedTransactions[txHash], "Not queued");
        require(block.timestamp < executeTime, "Already executable");

        queuedTransactions[txHash] = false;

        emit TransactionCancelled(txHash);
    }

    // ✅ 最佳实践4: 提供状态查询函数
    function isTransactionQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash];
    }

    function getTransactionStatus(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 executeTime
    ) external view returns (string memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, executeTime));

        if (!queuedTransactions[txHash]) return "Not queued";
        if (block.timestamp < executeTime) return "Pending";
        if (block.timestamp > executeTime + GRACE_PERIOD) return "Expired";
        return "Ready";
    }

    // ✅ 最佳实践5: 实现优雅期（Grace Period）
    // 在此期间内，交易仍然可以执行，但不是必须的

    // ✅ 最佳实践6: 支持批量操作
    function queueBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwner returns (bytes32[] memory) {
        require(targets.length == values.length, "Length mismatch");
        require(targets.length == datas.length, "Length mismatch");

        bytes32[] memory txHashes = new bytes32[](targets.length);

        for (uint256 i = 0; i < targets.length; i++) {
            txHashes[i] = this.queueTransaction(targets[i], values[i], datas[i]);
        }

        return txHashes;
    }
}

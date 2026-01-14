// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Lesson 20: DAO 治理系统 (Governance System)
 * @notice 本合约实现一个完整的 DAO 治理系统，包括提案、投票、执行、时间锁
 * @dev 核心功能：代币治理、提案管理、投票机制、时间锁执行
 *
 * 学习目标：
 * 1. 理解 DAO 治理的核心原理
 * 2. 掌握提案生命周期的各个阶段
 * 3. 学习不同的投票机制（权重、委托）
 * 4. 实现时间锁保护机制
 * 5. 理解治理代币的经济模型
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @dev 治理代币合约
 * @notice 带有治理功能的 ERC20 代币
 */
contract GovernanceToken is ERC20, Ownable {
    /// @notice 总供应量
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    /// @notice 投票权重映射
    mapping(address => uint256) public votingPower;

    /// @notice 委托记录
    mapping(address => address) public delegates;

    /// @notice 检查点（用于历史投票权查询）
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    /// @notice 用户检查点
    mapping(address => Checkpoint[]) public checkpoints;

    /// @notice 总供应量检查点
    Checkpoint[] public totalSupplyCheckpoints;

    // ========== 事件 ==========

    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    // ========== 构造函数 ==========

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_initialSupply <= MAX_SUPPLY, unicode"超过最大供应量");
        _mint(msg.sender, _initialSupply);

        // 记录初始总供应量检查点
        _mintCheckpoint(msg.sender, _initialSupply);
    }

    // ========== 核心功能：投票权重 ==========

    /**
     * @notice 获取当前投票权重
     * @param account 账户地址
     * @return 投票权重
     */
    function getVotes(address account) public view returns (uint256) {
        uint256 checkpointsNum = checkpoints[account].length;
        return checkpointsNum == 0 ? 0 : checkpoints[account][checkpointsNum - 1].votes;
    }

    /**
     * @notice 获取历史投票权重
     * @param account 账户地址
     * @param blockNumber 区块号
     * @return 该区块的投票权重
     */
    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        require(blockNumber < block.number, unicode"查询未来区块");

        uint256 checkpointsNum = checkpoints[account].length;
        if (checkpointsNum == 0) {
            return 0;
        }

        // 二分查找
        uint256 lower = 0;
        uint256 upper = checkpointsNum - 1;

        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock > blockNumber) {
                upper = center - 1;
            } else {
                lower = center;
            }
        }

        return checkpoints[account][lower].votes;
    }

    /**
     * @notice 委托投票权
     * @param delegatee 被委托人地址
     */
    function delegate(address delegatee) external {
        address currentDelegate = delegates[msg.sender];
        delegates[msg.sender] = delegatee;

        emit DelegateChanged(msg.sender, currentDelegate, delegatee);

        _moveDelegateVotes(currentDelegate, delegatee, balanceOf(msg.sender));
    }

    /**
     * @notice 转移投票权重
     * @param srcRep 源委托人
     * @param dstRep 目标委托人
     * @param amount 转移数量
     */
    function _moveDelegateVotes(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint256 srcRepOld = getVotes(srcRep);
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint256 dstRepOld = getVotes(dstRep);
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepOld, dstRepNew);
            }
        }
    }

    /**
     * @notice 写入检查点
     * @param delegatee 委托人地址
     * @param oldWeight 旧权重
     * @param newWeight 新权重
     */
    function _writeCheckpoint(address delegatee, uint256 oldWeight, uint256 newWeight) internal {
        Checkpoint[] storage cp = checkpoints[delegatee];

        if (cp.length == 0 || cp[cp.length - 1].fromBlock < block.number) {
            cp.push(Checkpoint({
                fromBlock: uint32(block.number),
                votes: uint224(newWeight)
            }));
        } else {
            Checkpoint storage old = cp[cp.length - 1];
            old.votes = uint224(newWeight);
        }

        emit DelegateVotesChanged(delegatee, oldWeight, newWeight);
    }

    /**
     * @notice 铸造代币时更新检查点
     * @param account 账户地址
     * @param amount 数量
     */
    function _mintCheckpoint(address account, uint256 amount) internal {
        uint256 oldWeight = getVotes(account);
        uint256 newWeight = oldWeight + amount;
        _writeCheckpoint(account, oldWeight, newWeight);
    }

    /**
     * @notice 转账时更新投票权重
     */
    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);

        if (from == address(0)) {
            // 铸造
            uint256 oldSupply = getPastTotalSupply(block.number - 1);
            uint256 newSupply = oldSupply + amount;
            _writeTotalSupplyCheckpoint(oldSupply, newSupply);
        }

        if (to == address(0)) {
            // 销毁
            uint256 oldSupply = getPastTotalSupply(block.number - 1);
            uint256 newSupply = oldSupply - amount;
            _writeTotalSupplyCheckpoint(oldSupply, newSupply);
        }

        if (delegates[from] == delegates[to]) {
            // 没有委托变化
            return;
        }

        _moveDelegateVotes(delegates[from], delegates[to], amount);
    }

    /**
     * @notice 写入总供应量检查点
     */
    function _writeTotalSupplyCheckpoint(uint256 oldSupply, uint256 newSupply) internal {
        totalSupplyCheckpoints.push(Checkpoint({
            fromBlock: uint32(block.number),
            votes: uint224(newSupply)
        }));
    }

    /**
     * @notice 获取历史总供应量
     */
    function getPastTotalSupply(uint256 blockNumber) public view returns (uint256) {
        require(blockNumber < block.number, unicode"查询未来区块");

        uint256 checkpointsNum = totalSupplyCheckpoints.length;
        if (checkpointsNum == 0) {
            return 0;
        }

        // 二分查找
        uint256 lower = 0;
        uint256 upper = checkpointsNum - 1;

        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = totalSupplyCheckpoints[center];
            if (cp.fromBlock > blockNumber) {
                upper = center - 1;
            } else {
                lower = center;
            }
        }

        return totalSupplyCheckpoints[lower].votes;
    }
}

/**
 * @dev DAO 治理合约
 * @notice 管理提案、投票、执行
 */
contract DAOGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // ========== 构造函数 ==========

    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumNumerator
    )
        Governor("DAO Governor")
        GovernorSettings(uint48(_votingDelay), uint32(_votingPeriod), 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumNumerator)
        GovernorTimelockControl(_timelock)
    {}

    // ========== 必须实现的函数 ==========

    /**
     * @notice 投票延迟（区块数）
     */
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    /**
     * @notice 投票周期（区块数）
     */
    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    /**
     * @notice 提案阈值
     */
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @notice 提案是否需要排队
     */
    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    /**
     * @notice 提案排队操作
     */
    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice 提案执行操作
     */
    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice 取消提案
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @notice 提案执行器
     */
    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    /**
     * @notice 提案逻辑
     * @dev 需要满足：足够多的代币支持、正确的提案格式
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    /**
     * @notice 获取法定人数（最少投票数）
     */
    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     * @notice 获取提案状态
     */
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }
}

/**
 * @dev 时间锁控制器
 * @notice 为治理操作添加时间延迟
 */
contract DAOTimeLock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(minDelay, proposers, executors, msg.sender) {}
}

/**
 * @dev DAO 工厂合约
 * @notice 一键部署完整的 DAO 系统
 */
contract DAOFactory {
    struct DAOConfig {
        string tokenName;
        string tokenSymbol;
        uint256 initialSupply;
        uint256 votingDelay;      // 投票延迟（区块）
        uint256 votingPeriod;     // 投票周期（区块）
        uint256 quorumFraction;   // 法定人数比例（基点）
        uint256 timelockDelay;    // 时间锁延迟（秒）
    }

    struct DAOInstance {
        address token;
        address governor;
        address timelock;
    }

    /// @notice 部署的 DAO 列表
    DAOInstance[] public daos;

    /// @notice 用户到 DAO 的映射
    mapping(address => address[]) public userDAOs;

    // ========== 事件 ==========

    event DAOCreated(
        address indexed creator,
        address token,
        address governor,
        address timelock,
        uint256 timestamp
    );

    // ========== 核心功能 ==========

    /**
     * @notice 创建新的 DAO
     * @param config DAO 配置
     * @return dao 创建的 DAO 实例
     */
    function createDAO(DAOConfig calldata config) external returns (DAOInstance memory dao) {
        // 1. 部署治理代币
        GovernanceToken token = new GovernanceToken(
            config.tokenName,
            config.tokenSymbol,
            config.initialSupply
        );

        // 2. 部署时间锁
        address[] memory proposers = new address[](1);
        proposers[0] = address(this); // 临时设置为工厂地址

        address[] memory executors = new address[](1);
        executors[0] = address(0); // 任何人都可以执行

        DAOTimeLock timelock = new DAOTimeLock(
            config.timelockDelay,
            proposers,
            executors
        );

        // 3. 部署治理合约
        DAOGovernor governor = new DAOGovernor(
            IVotes(address(token)),
            TimelockController(payable(address(timelock))),
            config.votingDelay,
            config.votingPeriod,
            config.quorumFraction
        );

        // 4. 配置时间锁
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0)); // 任何人都可以执行
        timelock.revokeRole(timelock.PROPOSER_ROLE(), address(this));
        timelock.revokeRole(timelock.DEFAULT_ADMIN_ROLE(), msg.sender);
        // acceptAdmin() 已在新版本中移除

        // 5. 记录 DAO
        dao = DAOInstance({
            token: address(token),
            governor: address(governor),
            timelock: address(timelock)
        });

        daos.push(dao);
        userDAOs[msg.sender].push(address(governor));

        emit DAOCreated(
            msg.sender,
            address(token),
            address(governor),
            address(timelock),
            block.timestamp
        );

        return dao;
    }

    /**
     * @notice 获取用户创建的所有 DAO
     * @param user 用户地址
     * @return DAO 地址列表
     */
    function getUserDAOs(address user) external view returns (address[] memory) {
        return userDAOs[user];
    }

    /**
     * @notice 获取所有创建的 DAO
     * @return DAO 列表
     */
    function getAllDAOs() external view returns (DAOInstance[] memory) {
        return daos;
    }

    /**
     * @notice 获取 DAO 数量
     * @return DAO 数量
     */
    function getDAOCount() external view returns (uint256) {
        return daos.length;
    }
}

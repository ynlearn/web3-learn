// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StateMachinePattern
 * @dev 状态机模式完整示例
 * @notice 演示状态机在智能合约中的应用，包括订单流程、投票系统、众筹项目等
 */

// ==================== 基础状态机 ====================

/**
 * @title State
 * @dev 状态枚举定义
 */
enum State {
    Pending,    // 待处理
    Active,     // 进行中
    Completed,  // 已完成
    Cancelled   // 已取消
}

/**
 * @title BasicStateMachine
 * @dev 基础状态机合约
 * @notice 演示最简单的状态转换逻辑
 */
contract BasicStateMachine {
    State public currentState;

    event StateChanged(State indexed oldState, State indexed newState, address indexed caller);

    constructor() {
        currentState = State.Pending;
        emit StateChanged(State.Pending, State.Pending, msg.sender);
    }

    /**
     * @dev 修改器：检查当前状态
     */
    modifier onlyState(State _requiredState) {
        require(currentState == _requiredState, "Invalid state");
        _;
    }

    /**
     * @dev 修改器：检查状态是否有效转换
     */
    modifier validTransition(State _newState) {
        require(_isValidTransition(currentState, _newState), "Invalid state transition");
        _;
    }

    /**
     * @dev 检查状态转换是否有效
     */
    function _isValidTransition(State _current, State _next) internal pure returns (bool) {
        return (
            (_current == State.Pending && _next == State.Active) ||
            (_current == State.Active && _next == State.Completed) ||
            (_current == State.Active && _next == State.Cancelled) ||
            (_current == State.Pending && _next == State.Cancelled)
        );
    }

    /**
     * @dev 激活状态
     */
    function activate() public onlyState(State.Pending) validTransition(State.Active) {
        State oldState = currentState;
        currentState = State.Active;
        emit StateChanged(oldState, currentState, msg.sender);
    }

    /**
     * @dev 完成状态
     */
    function complete() public onlyState(State.Active) validTransition(State.Completed) {
        State oldState = currentState;
        currentState = State.Completed;
        emit StateChanged(oldState, currentState, msg.sender);
    }

    /**
     * @dev 取消状态
     */
    function cancel() public validTransition(State.Cancelled) {
        require(currentState == State.Pending || currentState == State.Active, "Cannot cancel");
        State oldState = currentState;
        currentState = State.Cancelled;
        emit StateChanged(oldState, currentState, msg.sender);
    }

    /**
     * @dev 获取当前状态名称
     */
    function getStateName() public view returns (string memory) {
        if (currentState == State.Pending) return "Pending";
        if (currentState == State.Active) return "Active";
        if (currentState == State.Completed) return "Completed";
        if (currentState == State.Cancelled) return "Cancelled";
        return "Unknown";
    }
}

// ==================== 订单状态机 ====================

/**
 * @title OrderState
 * @dev 订单状态枚举
 */
enum OrderState {
    Created,    // 已创建
    Paid,       // 已付款
    Shipped,    // 已发货
    Delivered,  // 已送达
    Refunded,   // 已退款
    Cancelled   // 已取消
}

/**
 * @title OrderStateMachine
 * @dev 订单状态机合约
 * @notice 演示电商订单的完整生命周期
 */
contract OrderStateMachine {
    struct Order {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        OrderState state;
        uint256 createdAt;
        uint256 updatedAt;
    }

    mapping(uint256 => Order) public orders;
    uint256 public orderCount;
    uint256 public constant SHIPPING_DURATION = 7 days;

    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderStateChanged(uint256 indexed orderId, OrderState indexed oldState, OrderState indexed newState);
    event OrderShipped(uint256 indexed orderId, string trackingNumber);
    event OrderDelivered(uint256 indexed orderId);
    event OrderRefunded(uint256 indexed orderId, uint256 refundAmount);
    event OrderCancelled(uint256 indexed orderId, string reason);

    /**
     * @dev 创建订单
     */
    function createOrder(address _seller, uint256 _amount) external returns (uint256) {
        require(_seller != address(0), "Invalid seller");
        require(_seller != msg.sender, "Cannot buy from yourself");
        require(_amount > 0, "Amount must be positive");

        orderCount++;
        uint256 orderId = orderCount;

        orders[orderId] = Order({
            id: orderId,
            buyer: msg.sender,
            seller: _seller,
            amount: _amount,
            state: OrderState.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit OrderCreated(orderId, msg.sender, _seller, _amount);
        return orderId;
    }

    /**
     * @dev 修改器：只有买家可以操作
     */
    modifier onlyBuyer(uint256 _orderId) {
        require(orders[_orderId].buyer == msg.sender, "Only buyer");
        _;
    }

    /**
     * @dev 修改器：只有卖家可以操作
     */
    modifier onlySeller(uint256 _orderId) {
        require(orders[_orderId].seller == msg.sender, "Only seller");
        _;
    }

    /**
     * @dev 支付订单
     */
    function payOrder(uint256 _orderId) external payable onlyBuyer(_orderId) {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.Created, "Invalid state");
        require(msg.value == order.amount, "Incorrect amount");

        OrderState oldState = order.state;
        order.state = OrderState.Paid;
        order.updatedAt = block.timestamp;

        emit OrderStateChanged(_orderId, oldState, order.state);
    }

    /**
     * @dev 发货
     */
    function shipOrder(uint256 _orderId, string calldata _trackingNumber) external onlySeller(_orderId) {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.Paid, "Order not paid");

        OrderState oldState = order.state;
        order.state = OrderState.Shipped;
        order.updatedAt = block.timestamp;

        emit OrderStateChanged(_orderId, oldState, order.state);
        emit OrderShipped(_orderId, _trackingNumber);
    }

    /**
     * @dev 确认收货
     */
    function confirmDelivery(uint256 _orderId) external onlyBuyer(_orderId) {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.Shipped, "Order not shipped");

        OrderState oldState = order.state;
        order.state = OrderState.Delivered;
        order.updatedAt = block.timestamp;

        // 释放资金给卖家
        payable(order.seller).transfer(order.amount);

        emit OrderStateChanged(_orderId, oldState, order.state);
        emit OrderDelivered(_orderId);
    }

    /**
     * @dev 申请退款
     */
    function requestRefund(uint256 _orderId, string calldata _reason) external onlyBuyer(_orderId) {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.Paid || order.state == OrderState.Shipped, "Cannot refund");

        OrderState oldState = order.state;
        order.state = OrderState.Refunded;
        order.updatedAt = block.timestamp;

        // 退款给买家
        payable(order.buyer).transfer(order.amount);

        emit OrderStateChanged(_orderId, oldState, order.state);
        emit OrderRefunded(_orderId, order.amount);
    }

    /**
     * @dev 取消订单
     */
    function cancelOrder(uint256 _orderId, string calldata _reason) external {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.buyer || msg.sender == order.seller,
            "Not authorized"
        );
        require(order.state == OrderState.Created, "Cannot cancel");

        OrderState oldState = order.state;
        order.state = OrderState.Cancelled;
        order.updatedAt = block.timestamp;

        emit OrderStateChanged(_orderId, oldState, order.state);
        emit OrderCancelled(_orderId, _reason);
    }

    /**
     * @dev 获取订单信息
     */
    function getOrder(uint256 _orderId) external view returns (
        uint256 id,
        address buyer,
        address seller,
        uint256 amount,
        OrderState state,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Order memory order = orders[_orderId];
        return (
            order.id,
            order.buyer,
            order.seller,
            order.amount,
            order.state,
            order.createdAt,
            order.updatedAt
        );
    }

    /**
     * @dev 获取状态名称
     */
    function getOrderStateName(uint256 _orderId) external view returns (string memory) {
        OrderState state = orders[_orderId].state;
        if (state == OrderState.Created) return "Created";
        if (state == OrderState.Paid) return "Paid";
        if (state == OrderState.Shipped) return "Shipped";
        if (state == OrderState.Delivered) return "Delivered";
        if (state == OrderState.Refunded) return "Refunded";
        if (state == OrderState.Cancelled) return "Cancelled";
        return "Unknown";
    }
}

// ==================== 投票状态机 ====================

/**
 * @title ProposalState
 * @dev 提案状态枚举
 */
enum ProposalState {
    Draft,      // 草稿
    Active,     // 活跃
    Passed,     // 通过
    Rejected,   // 拒绝
    Executed,   // 已执行
    Expired     // 已过期
}

/**
 * @title VotingStateMachine
 * @dev 投票状态机合约
 * @notice 演示 DAO 治理中的提案生命周期
 */
contract VotingStateMachine {
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        uint256 quorum;
        ProposalState state;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    uint256 public proposalCount;
    uint256 public constant VOTING_DURATION = 3 days;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event ProposalStateChanged(uint256 indexed proposalId, ProposalState indexed oldState, ProposalState indexed newState);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    /**
     * @dev 设置投票权重
     */
    function setVotingPower(address _voter, uint256 _power) external {
        votingPower[_voter] = _power;
    }

    /**
     * @dev 创建提案
     */
    function createProposal(string calldata _description, uint256 _quorum) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "No voting power");
        require(bytes(_description).length > 0, "Empty description");

        proposalCount++;
        uint256 proposalId = proposalCount;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = _description;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_DURATION;
        proposal.quorum = _quorum;
        proposal.state = ProposalState.Draft;

        emit ProposalCreated(proposalId, msg.sender, _description);
        return proposalId;
    }

    /**
     * @dev 激活提案
     */
    function activateProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.proposer == msg.sender, "Not proposer");
        require(proposal.state == ProposalState.Draft, "Invalid state");

        ProposalState oldState = proposal.state;
        proposal.state = ProposalState.Active;

        emit ProposalStateChanged(_proposalId, oldState, proposal.state);
    }

    /**
     * @dev 投票
     */
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp < proposal.endTime, "Voting ended");
        require(votingPower[msg.sender] > 0, "No voting power");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;
        uint256 weight = votingPower[msg.sender];

        if (_support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(_proposalId, msg.sender, _support, weight);
    }

    /**
     * @dev 计算投票结果
     */
    function _calculateResult(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp >= proposal.endTime, "Voting not ended");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        bool passed = totalVotes >= proposal.quorum && proposal.forVotes > proposal.againstVotes;

        ProposalState oldState = proposal.state;
        proposal.state = passed ? ProposalState.Passed : ProposalState.Rejected;

        emit ProposalStateChanged(_proposalId, oldState, proposal.state);
    }

    /**
     * @dev 执行提案
     */
    function executeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Passed, "Not passed");

        ProposalState oldState = proposal.state;
        proposal.state = ProposalState.Executed;

        emit ProposalStateChanged(_proposalId, oldState, proposal.state);
        emit ProposalExecuted(_proposalId);
    }

    /**
     * @dev 过期提案
     */
    function expireProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.timestamp >= proposal.endTime + 30 days, "Not expired");

        ProposalState oldState = proposal.state;
        proposal.state = ProposalState.Expired;

        emit ProposalStateChanged(_proposalId, oldState, proposal.state);
    }

    /**
     * @dev 获取提案信息
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        ProposalState state
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.state
        );
    }

    /**
     * @dev 检查是否已投票
     */
    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return proposals[_proposalId].hasVoted[_voter];
    }
}

// ==================== 众筹状态机 ====================

/**
 * @title CampaignState
 * @dev 众筹活动状态枚举
 */
enum CampaignState {
    Fundraising,  // 筹款中
    Successful,   // 成功
    Failed,       // 失败
    Claimed,      // 已领取
    Refunded      // 已退款
}

/**
 * @title CrowdfundingStateMachine
 * @dev 众筹状态机合约
 * @notice 演示众筹活动的完整生命周期
 */
contract CrowdfundingStateMachine {
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 pledged;
        uint256 deadline;
        uint256 createdAt;
        CampaignState state;
        mapping(address => uint256) contributions;
        address[] contributors;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCount;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title, uint256 goal);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignStateChanged(uint256 indexed campaignId, CampaignState indexed oldState, CampaignState indexed newState);
    event FundsClaimed(uint256 indexed campaignId, uint256 amount);
    event ContributionRefunded(uint256 indexed campaignId, address indexed contributor, uint256 amount);

    /**
     * @dev 创建众筹活动
     */
    function createCampaign(
        string calldata _title,
        string calldata _description,
        uint256 _goal,
        uint256 _duration
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Empty title");
        require(_goal > 0, "Invalid goal");
        require(_duration > 0, "Invalid duration");

        campaignCount++;
        uint256 campaignId = campaignCount;

        Campaign storage campaign = campaigns[campaignId];
        campaign.id = campaignId;
        campaign.creator = msg.sender;
        campaign.title = _title;
        campaign.description = _description;
        campaign.goal = _goal;
        campaign.deadline = block.timestamp + _duration;
        campaign.createdAt = block.timestamp;
        campaign.state = CampaignState.Fundraising;

        emit CampaignCreated(campaignId, msg.sender, _title, _goal);
        return campaignId;
    }

    /**
     * @dev 贡献资金
     */
    function contribute(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.state == CampaignState.Fundraising, "Not fundraising");
        require(block.timestamp < campaign.deadline, "Campaign ended");
        require(msg.value > 0, "No contribution");

        // 首次贡献
        if (campaign.contributions[msg.sender] == 0) {
            campaign.contributors.push(msg.sender);
        }

        campaign.contributions[msg.sender] += msg.value;
        campaign.pledged += msg.value;

        emit ContributionMade(_campaignId, msg.sender, msg.value);

        // 检查是否达到目标
        if (campaign.pledged >= campaign.goal) {
            CampaignState oldState = campaign.state;
            campaign.state = CampaignState.Successful;
            emit CampaignStateChanged(_campaignId, oldState, campaign.state);
        }
    }

    /**
     * @dev 结束众筹
     */
    function finalizeCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.state == CampaignState.Fundraising, "Not fundraising");
        require(block.timestamp >= campaign.deadline, "Not ended");

        CampaignState oldState = campaign.state;
        campaign.state = campaign.pledged >= campaign.goal
            ? CampaignState.Successful
            : CampaignState.Failed;

        emit CampaignStateChanged(_campaignId, oldState, campaign.state);
    }

    /**
     * @dev 领取资金（创建者）
     */
    function claimFunds(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.creator == msg.sender, "Not creator");
        require(campaign.state == CampaignState.Successful, "Not successful");

        CampaignState oldState = campaign.state;
        campaign.state = CampaignState.Claimed;

        uint256 amount = campaign.pledged;
        campaign.pledged = 0;

        payable(campaign.creator).transfer(amount);

        emit CampaignStateChanged(_campaignId, oldState, campaign.state);
        emit FundsClaimed(_campaignId, amount);
    }

    /**
     * @dev 退款（贡献者）
     */
    function refundContribution(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.state == CampaignState.Failed, "Not failed");
        require(campaign.contributions[msg.sender] > 0, "No contribution");

        uint256 amount = campaign.contributions[msg.sender];
        campaign.contributions[msg.sender] = 0;

        payable(msg.sender).transfer(amount);

        emit ContributionRefunded(_campaignId, msg.sender, amount);
    }

    /**
     * @dev 获取众筹活动信息
     */
    function getCampaign(uint256 _campaignId) external view returns (
        uint256 id,
        address creator,
        string memory title,
        uint256 goal,
        uint256 pledged,
        uint256 deadline,
        CampaignState state,
        uint256 contributorCount
    ) {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.id,
            campaign.creator,
            campaign.title,
            campaign.goal,
            campaign.pledged,
            campaign.deadline,
            campaign.state,
            campaign.contributors.length
        );
    }

    /**
     * @dev 获取贡献者的贡献金额
     */
    function getContribution(uint256 _campaignId, address _contributor) external view returns (uint256) {
        return campaigns[_campaignId].contributions[_contributor];
    }

    /**
     * @dev 获取所有贡献者
     */
    function getContributors(uint256 _campaignId) external view returns (address[] memory) {
        return campaigns[_campaignId].contributors;
    }
}

// ==================== 状态机工具库 ====================

/**
 * @title StateMachineUtils
 * @dev 状态机工具库
 * @notice 提供状态机的通用工具函数
 */
library StateMachineUtils {
    /**
     * @dev 检查状态转换是否有效
     */
    function isValidTransition(
        uint256 _currentState,
        uint256 _newState,
        uint256[][] memory _validTransitions
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < _validTransitions.length; i++) {
            if (_validTransitions[i][0] == _currentState && _validTransitions[i][1] == _newState) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev 获取状态名称
     */
    function getStateName(uint256 _state, string[] memory _stateNames) internal pure returns (string memory) {
        require(_state < _stateNames.length, "Invalid state");
        return _stateNames[_state];
    }

    /**
     * @dev 检查状态是否为终态
     */
    function isFinalState(
        uint256 _state,
        uint256[] memory _finalStates
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < _finalStates.length; i++) {
            if (_finalStates[i] == _state) {
                return true;
            }
        }
        return false;
    }
}

// ==================== 状态机最佳实践 ====================

/**
 * @title StateMachineBestPractices
 * @dev 状态机最佳实践示例
 * @notice 演示如何正确实现状态机
 */
contract StateMachineBestPractices {
    enum State { Active, Paused, Closed }

    State public state;

    // ✅ 最佳实践1: 使用枚举而不是魔法数字
    // ❌ 错误: uint256 public state = 0;

    // ✅ 最佳实践2: 明确定义状态转换规则
    mapping(State => State[]) public validTransitions;

    constructor() {
        state = State.Active;

        // 定义有效的状态转换
        validTransitions[State.Active] = [State.Paused, State.Closed];
        validTransitions[State.Paused] = [State.Active, State.Closed];
        // Closed 是终态，没有转换
    }

    // ✅ 最佳实践3: 使用修改器进行状态检查
    modifier onlyState(State _requiredState) {
        require(state == _requiredState, "Invalid state");
        _;
    }

    // ✅ 最佳实践4: 使用修改器验证状态转换
    modifier validStateTransition(State _newState) {
        require(_isValidTransition(_newState), "Invalid transition");
        _;
    }

    function _isValidTransition(State _newState) private view returns (bool) {
        State[] memory validNextStates = validTransitions[state];
        for (uint256 i = 0; i < validNextStates.length; i++) {
            if (validNextStates[i] == _newState) {
                return true;
            }
        }
        return false;
    }

    // ✅ 最佳实践5: 状态改变必须触发事件
    event StateChanged(State indexed oldState, State indexed newState, address indexed caller);

    function changeState(State _newState) external validStateTransition(_newState) {
        State oldState = state;
        state = _newState;
        emit StateChanged(oldState, state, msg.sender);
    }

    // ✅ 最佳实践6: 在关键操作前检查状态
    function criticalOperation() external onlyState(State.Active) {
        // 只有在 Active 状态下才能执行
    }

    // ✅ 最佳实践7: 提供状态查询函数
    function isActive() external view returns (bool) {
        return state == State.Active;
    }

    function isPaused() external view returns (bool) {
        return state == State.Paused;
    }

    function isClosed() external view returns (bool) {
        return state == State.Closed;
    }

    // ✅ 最佳实践8: 添加紧急暂停机制
    function pause() external validStateTransition(State.Paused) {
        State oldState = state;
        state = State.Paused;
        emit StateChanged(oldState, state, msg.sender);
    }

    function resume() external onlyState(State.Paused) {
        State oldState = state;
        state = State.Active;
        emit StateChanged(oldState, state, msg.sender);
    }

    function close() external validStateTransition(State.Closed) {
        State oldState = state;
        state = State.Closed;
        emit StateChanged(oldState, state, msg.sender);
    }
}

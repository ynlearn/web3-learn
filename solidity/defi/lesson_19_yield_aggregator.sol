// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Lesson 19: 收益聚合器 (Yield Aggregator)
 * @notice 本合约实现一个 Yearn.finance 风格的收益聚合器
 * @dev 核心功能：自动复投、策略管理、收益分配、提款队列
 *
 * 学习目标：
 * 1. 理解收益聚合器的工作原理
 * 2. 掌握自动复投机制
 * 3. 学习策略模式在 DeFi 中的应用
 * 4. 实现收益分配和费用收取
 * 5. 理解流动性和提款管理
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @dev 收益策略接口
 * @notice 定义收益策略必须实现的标准接口
 */
interface IStrategy {
    /**
     * @notice 获取策略中管理的总资产
     * @return 策略中的资产数量
     */
    function totalAssets() external view returns (uint256);

    /**
     * @notice 存入资产到策略
     * @param amount 存入数量
     * @return 实际存入数量
     */
    function deposit(uint256 amount) external returns (uint256);

    /**
     * @notice 从策略提取资产
     * @param amount 提取数量
     * @return 实际提取数量
     */
    function withdraw(uint256 amount) external returns (uint256);

    /**
     * @notice 收获策略收益
     * @return 收益数量
     */
    function harvest() external returns (uint256);

    /**
     * @notice 退出策略
     * @param amount 退出数量
     */
    function exit(uint256 amount) external;

    /**
     * @notice 获取策略名称
     * @return 策略名称
     */
    function getName() external view returns (string memory);
}

/**
 * @dev 收益聚合器合约
 * @notice 自动将用户资金分配到最优收益策略
 */
contract YieldAggregator is ERC20, ReentrancyGuard, Ownable {
    // ========== 核心参数 ==========

    /// @notice 底层资产代币
    IERC20 public immutable asset;

    /// @notice 当前活跃策略
    IStrategy public activeStrategy;

    /// @notice 每份份额的底层资产数量（使用 1e18 精度）
    uint256 public sharePrice;

    /// @notice 上次收获时间
    uint256 public lastHarvestTime;

    /// @notice 收获间隔（秒）
    uint256 public harvestInterval;

    /// @notice 管理费用（基点，100 = 1%）
    uint256 public managementFee;

    /// @notice 性能费用（基点，100 = 1%）
    uint256 public performanceFee;

    /// @notice 管理费用收取间隔（秒）
    uint256 public managementFeeInterval;

    /// @notice 上次管理费用收取时间
    uint256 public lastManagementFeeTime;

    /// @notice 总收获收益
    uint256 public totalHarvested;

    /// @notice 费用接收地址
    address public feeRecipient;

    /// @notice 最小份额价格（防止价格操纵）
    uint256 public constant MIN_SHARE_PRICE = 1e18;

    /// @notice 精度常数
    uint256 private constant PRICE_PRECISION = 1e18;

    // ========== 用户数据 ==========

    /// @notice 用户存款信息
    struct DepositInfo {
        uint256 amount;         // 存款数量
        uint256 sharePrice;     // 存款时的份额价格
        uint256 timestamp;      // 存款时间
    }

    /// @notice 用户存款记录
    mapping(address => DepositInfo[]) public deposits;

    /// @notice 用户提款队列
    struct WithdrawRequest {
        uint256 shares;         // 要提取的份额数量
        uint256 timestamp;      // 请求时间
        bool processed;         // 是否已处理
    }

    /// @notice 用户提款请求
    mapping(address => WithdrawRequest) public withdrawRequests;

    // ========== 事件 ==========

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 amount);
    event Harvest(uint256 profit, uint256 fee, uint256 timestamp);
    event StrategyChanged(address indexed oldStrategy, address indexed newStrategy);
    event FeesCollected(uint256 managementFee, uint256 performanceFee);
    event WithdrawRequested(address indexed user, uint256 shares);

    // ========== 构造函数 ==========

    /**
     * @notice 构造函数
     * @param _asset 底层资产地址
     * @param _name 份额代币名称
     * @param _symbol 份额代币符号
     * @param _harvestInterval 收获间隔（秒）
     */
    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint256 _harvestInterval
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_asset != address(0), unicode"无效的资产地址");
        require(_harvestInterval > 0, unicode"收获间隔必须大于零");

        asset = IERC20(_asset);
        sharePrice = MIN_SHARE_PRICE;
        harvestInterval = _harvestInterval;
        lastHarvestTime = block.timestamp;
        lastManagementFeeTime = block.timestamp;

        // 默认参数
        managementFee = 200; // 2% 年化管理费
        performanceFee = 2000; // 20% 性能费用
        managementFeeInterval = 365 days; // 每年收取一次
        feeRecipient = msg.sender;
    }

    // ========== 核心功能：存款 ==========

    /**
     * @notice 存款
     * @param amount 存款数量
     * @return 获得的份额数量
     *
     * 计算逻辑：
     * shares = (amount × sharePrice) / PRICE_PRECISION
     *
     * 示例：
     * - 存入 1000 USDT
     * - 份额价格 = 1.2e18（每份额价值 1.2 USDT）
     * - 获得份额 = (1000 × 1.2e18) / 1e18 = 1200 份额
     */
    function deposit(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, unicode"存款数量必须大于零");

        // 收获收益（更新份额价格）
        _harvestIfNeeded();

        // 转入资产
        require(
            asset.transferFrom(msg.sender, address(this), amount),
            unicode"资产转账失败"
        );

        // 计算份额数量
        uint256 shares = (amount * PRICE_PRECISION) / sharePrice;
        require(shares > 0, unicode"份额数量为零");

        // 铸造份额代币
        _mint(msg.sender, shares);

        // 存入策略
        if (address(activeStrategy) != address(0)) {
            uint256 strategyBalance = asset.balanceOf(address(this));
            if (strategyBalance > 0) {
                activeStrategy.deposit(strategyBalance);
            }
        }

        // 记录存款信息
        deposits[msg.sender].push(DepositInfo({
            amount: amount,
            sharePrice: sharePrice,
            timestamp: block.timestamp
        }));

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    // ========== 核心功能：提款 ==========

    /**
     * @notice 请求提款
     * @param shares 要提取的份额数量
     *
     * 某些策略可能需要时间解锁资产，因此需要提前请求提款
     */
    function requestWithdraw(uint256 shares) external {
        require(shares > 0, unicode"份额数量必须大于零");
        require(balanceOf(msg.sender) >= shares, unicode"份额余额不足");

        // 取消之前的请求（如果有）
        withdrawRequests[msg.sender] = WithdrawRequest({
            shares: shares,
            timestamp: block.timestamp,
            processed: false
        });

        emit WithdrawRequested(msg.sender, shares);
    }

    /**
     * @notice 执行提款
     * @param shares 要提取的份额数量
     * @return 实际提取的资产数量
     *
     * 计算逻辑：
     * amount = (shares × sharePrice) / PRICE_PRECISION
     *
     * 示例：
     * - 提取 1200 份额
     * - 份额价格 = 1.3e18（每份额价值 1.3 USDT）
     * - 提取金额 = (1200 × 1.3e18) / 1e18 = 1560 USDT
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256) {
        require(shares > 0, unicode"份额数量必须大于零");
        require(balanceOf(msg.sender) >= shares, unicode"份额余额不足");

        // 检查是否有提款请求
        WithdrawRequest storage request = withdrawRequests[msg.sender];
        if (request.shares > 0 && !request.processed) {
            require(request.shares == shares, unicode"份额数量不匹配");
            // 可以添加时间检查，例如：
            // require(block.timestamp >= request.timestamp + 1 days, unicode"提款锁定期未过");
            request.processed = true;
        }

        // 收获收益（更新份额价格）
        _harvestIfNeeded();

        // 计算提取金额
        uint256 amount = (shares * sharePrice) / PRICE_PRECISION;

        // 从策略提取资产
        uint256 balanceHere = asset.balanceOf(address(this));
        if (balanceHere < amount) {
            uint256 needFromStrategy = amount - balanceHere;
            if (address(activeStrategy) != address(0)) {
                activeStrategy.withdraw(needFromStrategy);
            }
        }

        // 确保有足够资产
        balanceHere = asset.balanceOf(address(this));
        require(balanceHere >= amount, unicode"流动性不足");

        // 销毁份额
        _burn(msg.sender, shares);

        // 转出资产
        require(asset.transfer(msg.sender, amount), unicode"资产转账失败");

        emit Withdraw(msg.sender, shares, amount);
        return amount;
    }

    // ========== 核心功能：收益收获 ==========

    /**
     * @notice 收获策略收益
     * @dev 将策略收益转入合约，更新份额价格
     * @return 收益数量
     *
     * 流程：
     * 1. 调用策略的 harvest() 函数
     * 2. 收到的收益转入合约
     * 3. 计算性能费用并收取
     * 4. 重新计算份额价格
     * 5. 将收益重新存入策略（复投）
     */
    function harvest() external onlyOwner returns (uint256) {
        return _harvest();
    }

    /**
     * @notice 内部收获函数
     * @return 收益数量
     */
    function _harvest() internal returns (uint256) {
        if (address(activeStrategy) == address(0)) {
            return 0;
        }

        // 记录收获前的资产
        uint256 balanceBefore = asset.balanceOf(address(this));

        // 调用策略收获
        try activeStrategy.harvest() returns (uint256 harvested) {
            // 计算收益
            uint256 balanceAfter = asset.balanceOf(address(this));
            uint256 profit = balanceAfter - balanceBefore;

            if (profit > 0) {
                // 收取性能费用
                uint256 fee = (profit * performanceFee) / 10000;
                if (fee > 0) {
                    require(asset.transfer(feeRecipient, fee), unicode"费用转账失败");
                    profit -= fee;
                }

                // 更新总收获
                totalHarvested += profit;

                // 更新份额价格
                _updateSharePrice();

                // 将收益重新存入策略（复投）
                uint256 balanceToInvest = asset.balanceOf(address(this));
                if (balanceToInvest > 0) {
                    activeStrategy.deposit(balanceToInvest);
                }

                emit Harvest(profit, fee, block.timestamp);
                return profit;
            }
        } catch {
            // 策略收获失败，继续执行
        }

        // 更新收获时间
        lastHarvestTime = block.timestamp;
        return 0;
    }

    /**
     * @notice 如果需要，自动收获
     * @dev 在存款和提款时自动调用
     */
    function _harvestIfNeeded() internal {
        if (block.timestamp >= lastHarvestTime + harvestInterval) {
            _harvest();
        }
    }

    // ========== 核心功能：份额价格管理 ==========

    /**
     * @notice 更新份额价格
     * @dev 根据总资产和总供应量计算新价格
     *
     * 计算公式：
     * sharePrice = (totalAssets × PRICE_PRECISION) / totalSupply
     *
     * 示例：
     * - totalAssets = 1200 USDT
     * - totalSupply = 1000 份额
     * - sharePrice = (1200 × 1e18) / 1000 = 1.2e18
     */
    function _updateSharePrice() internal {
        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) {
            sharePrice = MIN_SHARE_PRICE;
            return;
        }

        uint256 totalAssets = getTotalAssets();
        sharePrice = (totalAssets * PRICE_PRECISION) / totalSupply;

        // 确保价格不低于最小值
        if (sharePrice < MIN_SHARE_PRICE) {
            sharePrice = MIN_SHARE_PRICE;
        }
    }

    /**
     * @notice 获取总资产
     * @return 总资产数量（合约余额 + 策略资产）
     */
    function getTotalAssets() public view returns (uint256) {
        uint256 balanceHere = asset.balanceOf(address(this));
        uint256 balanceInStrategy = 0;

        if (address(activeStrategy) != address(0)) {
            balanceInStrategy = activeStrategy.totalAssets();
        }

        return balanceHere + balanceInStrategy;
    }

    /**
     * @notice 获取用户资产价值
     * @param user 用户地址
     * @return 用户资产价值
     */
    function getUserAssets(address user) external view returns (uint256) {
        uint256 shares = balanceOf(user);
        return (shares * sharePrice) / PRICE_PRECISION;
    }

    // ========== 核心功能：费用收取 ==========

    /**
     * @notice 收取管理费用
     * @dev 按时间间隔收取管理费用
     */
    function collectManagementFee() external {
        require(
            block.timestamp >= lastManagementFeeTime + managementFeeInterval,
            unicode"管理费用收取间隔未到"
        );

        uint256 totalAssets = getTotalAssets();
        uint256 timePassed = block.timestamp - lastManagementFeeTime;
        uint256 fee = (totalAssets * managementFee * timePassed) / (10000 * 365 days);

        if (fee > 0) {
            // 从策略提取足够资产支付费用
            uint256 balanceHere = asset.balanceOf(address(this));
            if (balanceHere < fee) {
                uint256 needFromStrategy = fee - balanceHere;
                if (address(activeStrategy) != address(0)) {
                    activeStrategy.withdraw(needFromStrategy);
                }
            }

            require(asset.transfer(feeRecipient, fee), unicode"费用转账失败");

            emit FeesCollected(fee, 0);
        }

        lastManagementFeeTime = block.timestamp;
    }

    // ========== 策略管理 ==========

    /**
     * @notice 设置新策略
     * @param _newStrategy 新策略地址
     *
     * 流程：
     * 1. 从旧策略提取所有资产
     * 2. 设置新策略
     * 3. 将资产存入新策略
     */
    function setStrategy(address _newStrategy) external onlyOwner {
        require(_newStrategy != address(0), unicode"无效的策略地址");

        // 从旧策略提取所有资产
        if (address(activeStrategy) != address(0)) {
            uint256 oldStrategyBalance = activeStrategy.totalAssets();
            if (oldStrategyBalance > 0) {
                activeStrategy.exit(oldStrategyBalance);
            }
        }

        address oldStrategy = address(activeStrategy);
        activeStrategy = IStrategy(_newStrategy);

        // 将资产存入新策略
        uint256 balanceHere = asset.balanceOf(address(this));
        if (balanceHere > 0) {
            activeStrategy.deposit(balanceHere);
        }

        emit StrategyChanged(oldStrategy, _newStrategy);
    }

    /**
     * @notice 紧急提取（仅限紧急情况）
     * @dev 绕过策略，直接提取合约资产
     * @param amount 提取数量
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 balanceHere = asset.balanceOf(address(this));
        require(balanceHere >= amount, unicode"余额不足");

        require(asset.transfer(owner(), amount), unicode"转账失败");
    }

    // ========== 管理员功能 ==========

    /**
     * @notice 设置收获间隔
     * @param _interval 新的收获间隔（秒）
     */
    function setHarvestInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, unicode"间隔必须大于零");
        harvestInterval = _interval;
    }

    /**
     * @notice 设置管理费用
     * @param _fee 新的管理费用（基点）
     */
    function setManagementFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, unicode"管理费用不能超过 10%");
        managementFee = _fee;
    }

    /**
     * @notice 设置性能费用
     * @param _fee 新的性能费用（基点）
     */
    function setPerformanceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 5000, unicode"性能费用不能超过 50%");
        performanceFee = _fee;
    }

    /**
     * @notice 设置费用接收地址
     * @param _recipient 新的费用接收地址
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), unicode"无效的接收地址");
        feeRecipient = _recipient;
    }

    // ========== 查询功能 ==========

    /**
     * @notice 获取合约信息
     * @return totalAssets 总资产
     * @return totalTokenSupply 总供应量
     * @return sharePrice 份额价格
     * @return activeStrategyAddress 活跃策略地址
     */
    function getVaultInfo()
        external
        view
        returns (
            uint256 totalAssets,
            uint256 totalTokenSupply,
            uint256 sharePrice,
            address activeStrategyAddress
        )
    {
        return (
            getTotalAssets(),
            totalSupply(),
            sharePrice,
            address(activeStrategy)
        );
    }

    /**
     * @notice 获取用户存款历史
     * @param user 用户地址
     * @return deposits 用户存款记录
     */
    function getUserDeposits(address user)
        external
        view
        returns (DepositInfo[] memory)
    {
        return deposits[user];
    }

    /**
     * @notice 预估存款份额数量
     * @param amount 存款数量
     * @return 预估的份额数量
     */
    function previewDeposit(uint256 amount) external view returns (uint256) {
        return (amount * PRICE_PRECISION) / sharePrice;
    }

    /**
     * @notice 预估提款资产数量
     * @param shares 份额数量
     * @return 预估的资产数量
     */
    function previewWithdraw(uint256 shares) external view returns (uint256) {
        return (shares * sharePrice) / PRICE_PRECISION;
    }
}

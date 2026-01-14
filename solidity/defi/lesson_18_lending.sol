// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Lesson 18: 借贷协议 (Lending Protocol)
 * @notice 本合约实现了一个简化的 Aave/Compound 风格的借贷协议
 * @dev 核心功能：存入资产、借贷、清算、利息计算
 *
 * 学习目标：
 * 1. 理解借贷协议的核心机制
 * 2. 掌握抵押率和清算阈值
 * 3. 学习利息累积和复利计算
 * 4. 实现清算机制和罚金系统
 * 5. 理解借贷池的资金管理
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @dev 借贷池合约
 * @notice 管理单一资产的借贷池
 */
contract LendingPool is ERC20, ReentrancyGuard, Ownable {
    // ========== 核心参数 ==========

    /// @notice 底层资产代币
    IERC20 public immutable asset;

    /// @notice 总储备金（包括已贷出资产）
    uint256 public totalReserves;

    /// @notice 总借出金额
    uint256 public totalBorrows;

    /// @notice 每个区块的借款利率（基点，1基点=0.01%）
    uint256 public borrowRatePerBlock;

    /// @notice 每个区块的存款利率（基点）
    uint256 public supplyRatePerBlock;

    /// @notice 上次利率更新的区块
    uint256 public accrualBlockNumber;

    /// @notice 借款指数（用于计算复利）
    uint256 public borrowIndex;

    /// @notice 抵押率（例如 75 表示 75%）
    uint256 public collateralFactor;

    /// @notice 清算阈值（例如 85 表示 85%）
    uint256 public liquidationThreshold;

    /// @notice 清算罚金（例如 5 表示 5%）
    uint256 public liquidationBonus;

    /// @notice 利率常数（1e18）
    uint256 private constant RATE_SCALE = 1e18;

    // ========== 用户数据 ==========

    /// @notice 用户账户信息
    struct Account {
        uint256 principal;        // 本金（存款）
        uint256 borrowBalance;    // 借款余额
        uint256 interestIndex;    // 利息指数（用于计算复利）
    }

    /// @notice 用户账户映射
    mapping(address => Account) public accounts;

    // ========== 事件 ==========

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidate(
        address indexed borrower,
        address indexed liquidator,
        uint256 repayAmount,
        uint256 collateralSeized
    );
    event AccrueInterest(uint256 interestAccumulated, uint256 borrowIndex);

    // ========== 构造函数 ==========

    /**
     * @notice 构造函数
     * @param _asset 底层资产地址
     * @param _name 存款凭证代币名称
     * @param _symbol 存款凭证代币符号
     * @param _borrowRate 年化借款利率（基点）
     */
    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        uint256 _borrowRate
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_asset != address(0), unicode"无效的资产地址");

        asset = IERC20(_asset);
        borrowRatePerBlock = _borrowRate * 1e16 / 2102400; // 年化转每区块（假设年化 5%）
        borrowIndex = RATE_SCALE;
        accrualBlockNumber = block.number;

        // 默认参数
        collateralFactor = 75; // 75% 抵押率
        liquidationThreshold = 85; // 85% 清算阈值
        liquidationBonus = 5; // 5% 清算罚金
    }

    // ========== 核心功能：利息累积 ==========

    /**
     * @notice 累积利息
     * @dev 每次交互前调用，更新全局利息指数
     *
     * 计算逻辑：
     * 1. 计算经过的区块数
     * 2. 计算应计利息 = 总借款 × 利率 × 区块数
     * 3. 更新借款指数（复利效果）
     * 4. 更新总借款和储备金
     */
    function accrueInterest() public {
        uint256 currentBlockNumber = block.number;
        uint256 accrualBlock = accrualBlockNumber;

        if (currentBlockNumber > accrualBlock) {
            // 计算经过的区块数
            uint256 blockDelta = currentBlockNumber - accrualBlock;

            // 计算应计利息
            // interest = totalBorrows × borrowRatePerBlock × blockDelta
            uint256 interestAccumulated = (totalBorrows * borrowRatePerBlock * blockDelta) / RATE_SCALE;

            // 更新总借款（复利）
            totalBorrows += interestAccumulated;

            // 更新借款指数
            // borrowIndex = borrowIndex × (1 + interest / totalBorrows)
            uint256 indexDelta = (interestAccumulated * RATE_SCALE) / totalBorrows;
            borrowIndex += indexDelta;

            // 更新储备金（利息收入）
            totalReserves += interestAccumulated;

            // 更新区块号
            accrualBlockNumber = currentBlockNumber;

            emit AccrueInterest(interestAccumulated, borrowIndex);
        }
    }

    // ========== 核心功能：存款 ==========

    /**
     * @notice 存款
     * @param amount 存款数量
     * @return 存款凭证代币数量
     *
     * 流程：
     * 1. 转入资产到合约
     * 2. 铸造存款凭证代币给用户
     * 3. 更新用户账户信息
     */
    function deposit(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, unicode"数量必须大于零");

        // 累积利息
        accrueInterest();

        // 转入资产
        require(
            asset.transferFrom(msg.sender, address(this), amount),
            unicode"资产转账失败"
        );

        // 铸造存款凭证代币（1:1 比例）
        _mint(msg.sender, amount);

        // 更新用户账户
        Account storage account = accounts[msg.sender];
        account.principal += amount;
        account.interestIndex = borrowIndex;

        emit Deposit(msg.sender, amount);
        return amount;
    }

    /**
     * @notice 提款
     * @param amount 提款数量
     * @return 实际提款数量
     *
     * 流程：
     * 1. 检查是否有足够存款
     * 2. 销毁存款凭证代币
     * 3. 转出资产给用户
     * 4. 更新用户账户信息
     */
    function withdraw(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, unicode"数量必须大于零");
        require(balanceOf(msg.sender) >= amount, unicode"存款余额不足");

        // 累积利息
        accrueInterest();

        // 检查合约是否有足够流动性
        uint256 availableLiquidity = getAvailableLiquidity();
        require(availableLiquidity >= amount, unicode"流动性不足");

        // 销毁存款凭证代币
        _burn(msg.sender, amount);

        // 更新用户账户
        Account storage account = accounts[msg.sender];
        account.principal = account.principal > amount ? account.principal - amount : 0;

        // 转出资产
        require(asset.transfer(msg.sender, amount), unicode"资产转账失败");

        emit Withdraw(msg.sender, amount);
        return amount;
    }

    // ========== 核心功能：借贷 ==========

    /**
     * @notice 借款
     * @param amount 借款数量
     * @return 实际借款数量
     *
     * 借款条件：
     * 1. 有足够的存款作为抵押
     * 2. 借款不超过抵押额度
     * 3. 合约有足够流动性
     *
     * 抵押额度 = 存款金额 × 抵押率
     * 最大借款 = 抵押额度 - 当前借款
     */
    function borrow(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, unicode"数量必须大于零");

        // 累积利息
        accrueInterest();

        // 更新用户借款余额（包含之前累积的利息）
        updateBorrowBalance(msg.sender);

        // 计算可借款额度
        uint256 borrowCapacity = getBorrowCapacity(msg.sender);
        uint256 currentBorrow = accounts[msg.sender].borrowBalance;

        require(currentBorrow + amount <= borrowCapacity, unicode"超出借款额度");

        // 检查流动性
        uint256 availableLiquidity = getAvailableLiquidity();
        require(availableLiquidity >= amount, unicode"流动性不足");

        // 更新用户借款
        Account storage account = accounts[msg.sender];
        account.borrowBalance += amount;

        // 更新总借款
        totalBorrows += amount;

        // 转出资产
        require(asset.transfer(msg.sender, amount), unicode"资产转账失败");

        emit Borrow(msg.sender, amount);
        return amount;
    }

    /**
     * @notice 还款
     * @param amount 还款数量
     * @return 实际还款数量
     *
     * 流程：
     * 1. 更新借款余额（包含利息）
     * 2. 转入资产到合约
     * 3. 减少用户借款余额
     * 4. 更新总借款
     */
    function repay(uint256 amount) external nonReentrant returns (uint256) {
        require(amount > 0, unicode"数量必须大于零");

        // 累积利息
        accrueInterest();

        // 更新用户借款余额
        updateBorrowBalance(msg.sender);

        Account storage account = accounts[msg.sender];
        uint256 totalDebt = account.borrowBalance;

        // 计算实际还款数量（不能超过总债务）
        uint256 repayAmount = amount > totalDebt ? totalDebt : amount;

        // 转入资产
        require(
            asset.transferFrom(msg.sender, address(this), repayAmount),
            unicode"资产转账失败"
        );

        // 减少借款余额
        account.borrowBalance -= repayAmount;

        // 减少总借款
        totalBorrows -= repayAmount;

        emit Repay(msg.sender, repayAmount);
        return repayAmount;
    }

    // ========== 核心功能：清算 ==========

    /**
     * @notice 清算
     * @param borrower 被清算用户
     * @param repayAmount 还款数量
     * @return 实际获得的抵押品数量
     *
     * 清算条件：
     * 1. 债务价值 / 抵押价值 > 清算阈值
     * 2. 清算人替借款人还款
     * 3. 清算人获得抵押品 + 额外罚金
     *
     * 计算逻辑：
     * - 抵押品价值 = 存款余额
     * - 债务价值 = 借款余额
     * - 清算比率 = 债务 / 抵押品
     * - 如果清算比率 > 清算阈值，可以清算
     */
    function liquidate(address borrower, uint256 repayAmount)
        external
        nonReentrant
        returns (uint256)
    {
        require(borrower != address(0), unicode"无效的借款人地址");
        require(repayAmount > 0, unicode"还款数量必须大于零");

        // 累积利息
        accrueInterest();

        // 更新借款余额
        updateBorrowBalance(borrower);

        Account storage account = accounts[borrower];
        uint256 totalDebt = account.borrowBalance;
        uint256 collateral = balanceOf(borrower);

        require(totalDebt > 0, unicode"该用户无借款");
        require(collateral > 0, unicode"该用户无抵押品");

        // 检查是否可以清算
        uint256 collateralRatio = (totalDebt * 100) / collateral;
        require(collateralRatio > liquidationThreshold, unicode"未达到清算条件");

        // 计算可清算数量（最多清算债务的 50%）
        uint256 maxRepay = totalDebt / 2;
        uint256 actualRepay = repayAmount > maxRepay ? maxRepay : repayAmount;

        // 计算获得的抵押品（包含罚金）
        // collateralSeized = actualRepay × (1 + liquidationBonus)
        uint256 collateralSeized = (actualRepay * (100 + liquidationBonus)) / 100;

        require(collateral >= collateralSeized, unicode"抵押品不足");

        // 清算人还款
        require(
            asset.transferFrom(msg.sender, address(this), actualRepay),
            unicode"还款转账失败"
        );

        // 减少借款
        account.borrowBalance -= actualRepay;
        totalBorrows -= actualRepay;

        // 转移抵押品给清算人
        _burn(borrower, collateralSeized);
        _mint(msg.sender, collateralSeized);

        emit Liquidate(borrower, msg.sender, actualRepay, collateralSeized);
        return collateralSeized;
    }

    // ========== 查询功能 ==========

    /**
     * @notice 获取用户借款额度
     * @param user 用户地址
     * @return 可借款额度
     *
     * 计算公式：
     * borrowCapacity = 存款余额 × 抵押率 - 当前借款
     */
    function getBorrowCapacity(address user) public view returns (uint256) {
        uint256 balance = balanceOf(user);
        uint256 currentBorrow = accounts[user].borrowBalance;

        // 考虑利息累积的借款余额
        uint256 borrowBalanceWithInterest = calculateBorrowBalance(user);

        // 计算可借款额度
        uint256 capacity = (balance * collateralFactor) / 100;

        if (borrowBalanceWithInterest >= capacity) {
            return 0;
        }

        return capacity - borrowBalanceWithInterest;
    }

    /**
     * @notice 计算用户借款余额（包含利息）
     * @param user 用户地址
     * @return 借款余额
     *
     * 计算公式：
     * borrowBalance = principal × (currentBorrowIndex / userBorrowIndex)
     */
    function calculateBorrowBalance(address user) public view returns (uint256) {
        Account memory account = accounts[user];

        if (account.principal == 0) {
            return 0;
        }

        // 计算利息
        uint256 principal = account.borrowBalance;
        uint256 interestIndex = account.interestIndex;

        if (interestIndex == 0) {
            return principal;
        }

        // 计算复利
        return (principal * borrowIndex) / interestIndex;
    }

    /**
     * @notice 获取可用流动性
     * @return 可用流动性
     *
     * 计算公式：
     * availableLiquidity = 合约余额 - 总借款
     */
    function getAvailableLiquidity() public view returns (uint256) {
        uint256 contractBalance = asset.balanceOf(address(this));
        return contractBalance >= totalBorrows ? contractBalance - totalBorrows : 0;
    }

    /**
     * @notice 获取用户账户信息
     * @param user 用户地址
     * @return principal 存款本金
     * @return borrowBalance 借款余额
     * @return borrowCapacity 可借款额度
     */
    function getUserAccount(address user)
        external
        view
        returns (
            uint256 principal,
            uint256 borrowBalance,
            uint256 borrowCapacity
        )
    {
        principal = balanceOf(user);
        borrowBalance = calculateBorrowBalance(user);
        borrowCapacity = getBorrowCapacity(user);
    }

    // ========== 内部函数 ==========

    /**
     * @notice 更新用户借款余额
     * @param user 用户地址
     * @dev 将累积的利息加到本金中
     */
    function updateBorrowBalance(address user) internal {
        Account storage account = accounts[user];

        if (account.borrowBalance > 0 && account.interestIndex > 0) {
            // 计算利息并加到本金
            uint256 interest = (account.borrowBalance * (borrowIndex - account.interestIndex)) / account.interestIndex;
            account.borrowBalance += interest;
        }

        // 更新利息指数
        account.interestIndex = borrowIndex;
    }

    // ========== 管理员功能 ==========

    /**
     * @notice 设置抵押率
     * @param _collateralFactor 新的抵押率
     */
    function setCollateralFactor(uint256 _collateralFactor) external onlyOwner {
        require(_collateralFactor <= 100, unicode"抵押率不能超过 100%");
        require(_collateralFactor > 0, unicode"抵押率必须大于 0");
        collateralFactor = _collateralFactor;
    }

    /**
     * @notice 设置清算阈值
     * @param _liquidationThreshold 新的清算阈值
     */
    function setLiquidationThreshold(uint256 _liquidationThreshold) external onlyOwner {
        require(_liquidationThreshold <= 100, unicode"清算阈值不能超过 100%");
        require(_liquidationThreshold > 0, unicode"清算阈值必须大于 0");
        liquidationThreshold = _liquidationThreshold;
    }

    /**
     * @notice 设置清算罚金
     * @param _liquidationBonus 新的清算罚金
     */
    function setLiquidationBonus(uint256 _liquidationBonus) external onlyOwner {
        require(_liquidationBonus <= 20, unicode"清算罚金不能超过 20%");
        liquidationBonus = _liquidationBonus;
    }

    /**
     * @notice 设置借款利率
     * @param _borrowRate 年化借款利率（基点）
     */
    function setBorrowRate(uint256 _borrowRate) external onlyOwner {
        accrueInterest();
        borrowRatePerBlock = _borrowRate * 1e16 / 2102400;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ErrorHandling
 * @dev Solidity 错误处理完整示例
 * @notice 演示 require、revert、assert、custom errors 的使用
 */

/**
 * @dev 自定义错误：余额不足
 * @notice 自定义错误比字符串错误信息更节省 Gas
 */
error InsufficientBalanceError(uint256 requested, uint256 available);

/**
 * @dev 自定义错误：非所有者
 */
error OnlyOwnerError(address caller, address owner);

/**
 * @dev 自定义错误：无效值
 */
error InvalidValueError(uint256 value);

/**
 * @title BankContract
 * @dev 银行合约，演示错误处理
 */
contract BankContract {
    mapping(address => uint256) public balances;
    address public owner;
    uint256 public totalDeposits;
    bool private locked;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    // ==================== Require 示例 ====================

    /**
     * @dev 存款函数（使用 require 验证）
     * @notice require 适合验证输入条件和前置条件
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");

        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev 取款函数（使用 require 验证）
     * @notice 多个 require 语句按成本从低到高排列
     */
    function withdraw(uint256 _amount) public {
        // 低成本检查：金额必须大于 0
        require(_amount > 0, "Amount must be greater than 0");

        // 中等成本检查：余额充足
        uint256 userBalance = balances[msg.sender];
        require(userBalance >= _amount, "Insufficient balance");

        // 更新状态（Checks-Effects-Interactions 模式）
        balances[msg.sender] = userBalance - _amount;
        totalDeposits -= _amount;

        // 外部交互（最后执行）
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 批量取款（使用 require 验证）
     */
    function batchWithdraw(uint256[] memory _amounts) public {
        require(_amounts.length > 0, "Empty amounts array");
        require(_amounts.length <= 10, "Too many withdrawals");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Amount must be greater than 0");
            totalAmount += _amounts[i];
        }

        require(balances[msg.sender] >= totalAmount, "Insufficient total balance");

        balances[msg.sender] -= totalAmount;
        totalDeposits -= totalAmount;

        (bool success, ) = msg.sender.call{value: totalAmount}("");
        require(success, "Batch transfer failed");

        emit Withdrawal(msg.sender, totalAmount);
    }

    // ==================== Revert 示例 ====================

    /**
     * @dev 转账函数（使用 revert）
     * @notice revert 适合复杂条件和嵌套判断
     */
    function transfer(address _to, uint256 _amount) public {
        if (_to == address(0)) {
            revert("Cannot transfer to zero address");
        }

        if (_amount == 0) {
            revert("Transfer amount must be greater than 0");
        }

        if (balances[msg.sender] < _amount) {
            revert("Insufficient balance for transfer");
        }

        if (_to == msg.sender) {
            revert("Cannot transfer to self");
        }

        balances[msg.sender] -= _amount;
        balances[_to] += _amount;

        emit Transfer(msg.sender, _to, _amount);
    }

    /**
     * @dev 条件取款（使用 revert）
     * @notice 演示复杂条件下的 revert 使用
     */
    function conditionalWithdraw(uint256 _amount, uint256 _fee) public {
        uint256 totalCost = _amount + _fee;

        if (_amount == 0) {
            revert("Amount must be greater than 0");
        }

        if (_fee > _amount / 10) {
            revert("Fee too high (max 10%)");
        }

        if (balances[msg.sender] < totalCost) {
            revert("Insufficient balance including fee");
        }

        if (totalDeposits < _amount) {
            revert("Bank reserves insufficient");
        }

        balances[msg.sender] -= totalCost;
        totalDeposits -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        if (!success) {
            revert("Transfer failed");
        }

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 高级转账（使用 revert 和复杂逻辑）
     */
    function advancedTransfer(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _minBalance
    ) public {
        // 复杂条件检查
        bool validFrom = _from != address(0) && _from != _to;
        bool validTo = _to != address(0);
        bool validAmount = _amount > 0 && _amount <= balances[_from];
        bool validBalance = balances[_to] + _amount >= _minBalance;

        if (!validFrom || !validTo || !validAmount || !validBalance) {
            revert("Invalid transfer parameters");
        }

        balances[_from] -= _amount;
        balances[_to] += _amount;

        emit Transfer(_from, _to, _amount);
    }

    // ==================== Assert 示例 ====================

    /**
     * @dev 内部函数：计算利息
     * @notice assert 用于检查不应该失败的内部不变量
     */
    function calculateInterest(uint256 _principal, uint256 _rate) public pure returns (uint256) {
        uint256 interest = (_principal * _rate) / 100;

        // 断言：利息计算结果不应该小于本金
        assert(interest >= 0);

        // 断言：高利率下不应溢出（内部检查）
        assert(_rate <= 100);

        return interest;
    }

    /**
     * @dev 分红分配
     * @notice assert 用于验证内部状态一致性
     */
    function distributeDividends(uint256[] memory _percentages) public pure returns (uint256[] memory) {
        uint256 total = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            total += _percentages[i];
        }

        // 断言：百分比总和必须为 100（内部不变量）
        assert(total == 100);

        return _percentages;
    }

    /**
     * @dev 除法运算
     * @notice assert 用于检查数学运算的正确性
     */
    function safeDivide(uint256 _numerator, uint256 _denominator) public pure returns (uint256) {
        require(_denominator != 0, "Division by zero");

        uint256 result = _numerator / _denominator;

        // 断言：验证结果合理性
        assert(result * _denominator <= _numerator);

        return result;
    }

    // ==================== 自定义错误示例 ====================

    /**
     * @dev 使用自定义错误的取款函数
     * @notice 自定义错误节省 Gas（约 60-70 Gas）
     */
    function withdrawWithCustomError(uint256 _amount) public {
        if (_amount == 0) {
            revert InvalidValueError(_amount);
        }

        uint256 balance = balances[msg.sender];
        if (balance < _amount) {
            revert InsufficientBalanceError(_amount, balance);
        }

        balances[msg.sender] = balance - _amount;
        totalDeposits -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        if (!success) {
            revert("Transfer failed");
        }

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 仅所有者函数（使用自定义错误）
     * @notice 自定义错误可以携带更多信息
     */
    function ownerFunction() public view {
        if (msg.sender != owner) {
            revert OnlyOwnerError(msg.sender, owner);
        }

        // 所有者专属功能
    }

    /**
     * @dev 批量转账（使用自定义错误）
     */
    function batchTransferWithCustomError(
        address[] memory _recipients,
        uint256[] memory _amounts
    ) public {
        if (_recipients.length != _amounts.length) {
            revert("Arrays length mismatch");
        }

        if (_recipients.length == 0) {
            revert InvalidValueError(0);
        }

        if (_recipients.length > 20) {
            revert InvalidValueError(_recipients.length);
        }

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        uint256 balance = balances[msg.sender];
        if (balance < totalAmount) {
            revert InsufficientBalanceError(totalAmount, balance);
        }

        balances[msg.sender] = balance - totalAmount;

        for (uint256 i = 0; i < _recipients.length; i++) {
            balances[_recipients[i]] += _amounts[i];
            emit Transfer(msg.sender, _recipients[i], _amounts[i]);
        }
    }

    // ==================== 错误处理最佳实践 ====================

    /**
     * @dev 安全的 Ether 提取
     * @notice 演示完整的错误处理流程
     */
    function withdrawEther(uint256 _amount) public noReentrant {
        // 1. 输入验证（低 Gas 成本）
        if (_amount == 0) {
            revert InvalidValueError(_amount);
        }

        // 2. 条件检查（中等 Gas 成本）
        uint256 balance = balances[msg.sender];
        if (balance < _amount) {
            revert InsufficientBalanceError(_amount, balance);
        }

        // 3. 更新状态（高 Gas 成本）
        balances[msg.sender] = balance - _amount;
        totalDeposits -= _amount;

        // 4. 外部调用（最后执行）
        (bool success, ) = msg.sender.call{value: _amount}("");

        // 5. 验证调用结果
        if (!success) {
            // 恢复状态
            balances[msg.sender] = balance;
            totalDeposits += _amount;
            revert("Transfer failed, state reverted");
        }

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 复杂业务逻辑的错误处理
     * @notice 演示如何组织多个错误条件
     */
    function complexOperation(
        uint256 _amount,
        uint256 _fee,
        uint256 _minBalance,
        address _recipient
    ) public {
        // 输入验证阶段
        if (_amount == 0) {
            revert InvalidValueError(_amount);
        }

        if (_recipient == address(0) || _recipient == msg.sender) {
            revert("Invalid recipient");
        }

        if (_fee > _amount / 20) {
            revert InvalidValueError(_fee); // Fee too high
        }

        // 余额检查阶段
        uint256 senderBalance = balances[msg.sender];
        uint256 totalCost = _amount + _fee;

        if (senderBalance < totalCost) {
            revert InsufficientBalanceError(totalCost, senderBalance);
        }

        // 业务规则检查阶段
        uint256 recipientBalance = balances[_recipient];
        if (recipientBalance + _amount < _minBalance) {
            revert("Recipient would have insufficient balance");
        }

        // 状态更新阶段
        balances[msg.sender] = senderBalance - totalCost;
        balances[_recipient] = recipientBalance + _amount;
        totalDeposits -= _amount;

        // 事件记录
        emit Transfer(msg.sender, _recipient, _amount);
    }

    /**
     * @dev 防重入修饰器
     */
    modifier noReentrant() {
        if (locked) {
            revert("Reentrant call");
        }
        locked = true;
        _;
        locked = false;
    }

    // ==================== Gas 优化示例 ====================

    /**
     * @dev 比较 require 和自定义错误的 Gas 成本
     * @notice 自定义错误更节省 Gas
     */
    function withdrawTraditional(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        balances[msg.sender] -= _amount;
        totalDeposits -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        emit Withdrawal(msg.sender, _amount);
    }

    /**
     * @dev 错误捕获示例
     * @notice 演示如何捕获外部调用的错误
     */
    function callExternalContract(address _target, bytes memory _data) public returns (bytes memory) {
        (bool success, bytes memory returnData) = _target.call(_data);

        if (!success) {
            // 解析 revert 原因
            if (returnData.length < 68) {
                revert("Transaction reverted without reason");
            }

            assembly {
                returnData := add(returnData, 0x04)
            }

            revert(string(returnData));
        }

        return returnData;
    }

    // ==================== 辅助函数 ====================

    /**
     * @dev 获取余额
     */
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }

    /**
     * @dev 获取合约总余额
     */
    function getTotalBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 接收 Ether
     */
    receive() external payable {
        deposit();
    }

    /**
     * @dev Fallback 函数
     */
    fallback() external payable {
        deposit();
    }

    /**
     * @dev 转账事件
     */
    event Transfer(address indexed from, address indexed to, uint256 value);
}

/**
 * @title ErrorHandlingComparison
 * @dev 错误处理方式对比合约
 */
contract ErrorHandlingComparison {
    uint256 public value = 100;

    // 方式 1: require（传统方式）
    function setValueWithRequire(uint256 _value) public {
        require(_value > 0, "Value must be positive");
        require(_value <= 1000, "Value must be less than or equal to 1000");
        value = _value;
    }

    // 方式 2: revert（适合复杂条件）
    function setValueWithRevert(uint256 _value) public {
        if (_value <= 0 || _value > 1000) {
            revert("Invalid value");
        }
        value = _value;
    }

    // 方式 3: 自定义错误（Gas 优化）
    function setValueWithCustomError(uint256 _value) public {
        if (_value <= 0 || _value > 1000) {
            revert InvalidValueError(_value);
        }
        value = _value;
    }

    // 方式 4: assert（内部检查）
    function setValueWithAssert(uint256 _value) public {
        require(_value > 0, "Value must be positive");
        value = _value;
        assert(value > 0); // 内部不变量检查
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./lesson_19_yield_aggregator.sol";

/**
 * @title MockStrategy
 * @dev 模拟策略合约(用于收益聚合器测试)
 */
contract MockStrategy is IStrategy {
    IERC20 public asset;
    uint256 public profit;
    address public vault;

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function setVault(address _vault) external {
        vault = _vault;
    }

    function setProfit(uint256 _profit) external {
        profit = _profit;
    }

    function totalAssets() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function deposit(uint256 amount) external override returns (uint256) {
        require(asset.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        return amount;
    }

    function withdraw(uint256 amount) external override returns (uint256) {
        require(asset.transfer(msg.sender, amount), "Transfer failed");
        return amount;
    }

    function harvest() external override returns (uint256) {
        if (profit > 0) {
            // 模拟收益：铸造额外的代币
            require(asset.transfer(msg.sender, profit), "Transfer failed");
            uint256 harvested = profit;
            profit = 0;
            return harvested;
        }
        return 0;
    }

    function exit(uint256 amount) external override {
        withdraw(amount);
    }

    function getName() external pure override returns (string memory) {
        return "Mock Strategy";
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockSecureOracle
 * @dev 模拟安全预言机(用于测试)
 */
contract MockSecureOracle {
    uint256 public price = 100; // 初始价格

    function getLatestPrice() external view returns (uint256) {
        return price;
    }

    function setPrice(uint256 _newPrice) public {
        price = _newPrice;
    }
}

/**
 * @title MockRandomGenerator
 * @dev 模拟随机数生成器(用于测试)
 */
contract MockRandomGenerator {
    uint256 public randomValue = 12345;

    function getRandomNumber() external view returns (uint256) {
        return randomValue;
    }

    function setRandomValue(uint256 _newValue) public {
        randomValue = _newValue;
    }
}

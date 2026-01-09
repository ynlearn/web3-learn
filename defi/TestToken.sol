// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * @notice 测试用的 ERC20 代币，用于测试 DeFi 合约
 */
contract TestToken is ERC20, Ownable {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {}

    /**
     * @notice 铸造代币（仅限所有者）
     * @param to 接收地址
     * @param amount 数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice 销毁代币
     * @param amount 数量
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}

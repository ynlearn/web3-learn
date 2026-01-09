// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HelloWorld
 * @dev 第一个智能合约示例 - 演示 Solidity 基本结构
 * @notice 这是学习 Solidity 的起点，了解合约的基本组成部分
 */
contract HelloWorld {
    // ==================== 状态变量 ====================
    
    /**
     * @notice 公共字符串变量，存储问候语
     * @dev public 自动生成 getter 函数
     */
    string public greet = "Hello, Web3 World!";
    
    /**
     * @notice 私有计数器，演示整型变量
     * @dev private 只能在合约内部访问
     */
    uint256 private counter = 0;
    
    // ==================== 事件定义 ====================
    
    /**
     * @notice 问候语更新事件
     * @param oldGreet 旧的问候语
     * @param newGreet 新的问候语
     * @dev 事件用于记录链上日志，前端可以监听
     */
    event GreetChanged(string oldGreet, string newGreet);
    
    /**
     * @notice 计数器增加事件
     * @param newCount 新的计数值
     * @param sender 触发者地址
     */
    event CounterIncremented(uint256 newCount, address sender);
    
    // ==================== 构造函数 ====================
    
    /**
     * @dev 构造函数，在合约部署时执行一次
     * @param _initialGreet 初始问候语，如果不提供则使用默认值
     */
    constructor(string memory _initialGreet) {
        if (bytes(_initialGreet).length > 0) {
            greet = _initialGreet;
        }
        emit GreetChanged("", greet);
    }
    
    // ==================== 函数定义 ====================
    
    /**
     * @notice 获取当前问候语
     * @return 当前问候语字符串
     * @dev view 表示函数不修改状态
     */
    function getGreet() public view returns (string memory) {
        return greet;
    }
    
    /**
     * @notice 设置新的问候语
     * @param _newGreet 新的问候语
     * @dev 此函数会修改状态变量，需要消耗 Gas
     */
    function setGreet(string memory _newGreet) public {
        string memory oldGreet = greet;
        greet = _newGreet;
        emit GreetChanged(oldGreet, _newGreet);
    }
    
    /**
     * @notice 增加计数器
     * @dev 演示状态变量的修改和算术运算
     */
    function increment() public {
        counter += 1;
        emit CounterIncremented(counter, msg.sender);
    }
    
    /**
     * @notice 获取计数器当前值
     * @return 当前计数值
     */
    function getCounter() public view returns (uint256) {
        return counter;
    }
    
    /**
     * @notice 重置计数器
     * @dev 演示函数参数和输入验证
     * @param _newCount 新的计数值
     */
    function resetCounter(uint256 _newCount) public {
        require(_newCount >= 0, "Count cannot be negative");
        counter = _newCount;
        emit CounterIncremented(counter, msg.sender);
    }
}

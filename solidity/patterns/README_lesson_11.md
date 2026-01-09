# Lesson 11: 工厂模式 - 批量创建智能合约的利器

## 📚 课程概述

工厂模式（Factory Pattern）是智能合约开发中最常用的设计模式之一。它提供了一种统一的方式来创建合约实例，无论是使用传统的 CREATE 操作码、确定性的 CREATE2，还是超节省 Gas 的克隆（Clone）技术。本课将深入讲解各种工厂模式的实现原理、应用场景和最佳实践。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解工厂模式的核心概念和应用场景
- ✅ 掌握 CREATE 和 CREATE2 操作码的区别
- ✅ 实现基础工厂合约
- ✅ 使用 CREATE2 实现确定性部署
- ✅ 实现最小代理合约（EIP-1167）
- ✅ 理解元交易工厂的工作原理
- ✅ 对比不同创建方式的 Gas 成本
- ✅ 选择最适合的工厂模式

## 📝 什么是工厂模式？

### 基本概念

**工厂模式** 是一种创建型设计模式，它提供了一种创建对象的最佳方式。在智能合约中，工厂合约负责创建和管理其他合约实例。

**核心优势**：
1. **统一管理**：集中管理合约的创建
2. **批量操作**：支持批量创建合约
3. **地址追踪**：记录所有创建的合约地址
4. **访问控制**：控制谁能创建合约
5. **Gas 优化**：通过克隆技术大幅降低成本

### 生活中的工厂模式

**汽车工厂**：
```
工厂 → 生产汽车 → 每辆车有独立 VIN
      → 批量生产 → 效率高
      → 统一标准 → 质量保证
```

**幽默比喻**：
- 不用工厂模式 = 每次要用车都手工打造一辆
- 用工厂模式 = 工厂统一生产，你要多少辆就给你多少辆
- 克隆模式 = 3D 打印，更便宜更快！

### 为什么智能合约需要工厂模式？

1. **批量部署**：DeFi 协议需要创建成千上万个金库
2. **确定性地址**：用户可以在部署前知道合约地址
3. **成本控制**：克隆技术可节省 90% 以上的部署成本
4. **统一管理**：追踪所有创建的合约
5. **权限控制**：限制谁能创建合约

## 🔧 核心实现模式

### 1. 基础工厂模式（CREATE）

```solidity
contract BasicFactory {
    address[] public products;
    mapping(address => bool) public isProduct;

    event ProductDeployed(
        address indexed product,
        address indexed creator,
        uint256 id
    );

    function createProduct(uint256 _id, string memory _name)
        public
        returns (address)
    {
        Product product = new Product(_id, _name);

        products.push(address(product));
        isProduct[address(product)] = true;

        emit ProductDeployed(address(product), msg.sender, _id);

        return address(product);
    }
}
```

**CREATE 地址计算**：
```
address = keccak256(rlp_encode(sender, nonce))
```

**特点**：
- ✅ 简单直观
- ✅ 自动增加 nonce
- ❌ 地址不可预测
- ❌ Gas 成本较高

### 2. 确定性工厂（CREATE2）

```solidity
contract CREATE2Factory {
    event ContractDeployed(address indexed contractAddr, bytes32 indexed salt);

    function deploy(bytes memory bytecode, bytes32 salt)
        public
        returns (address)
    {
        address addr;

        assembly {
            // create2(value, offset, length, salt)
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)

            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        emit ContractDeployed(addr, salt);

        return addr;
    }

    function getAddress(
        address deployer,
        bytes memory bytecode,
        bytes32 salt
    ) public pure returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),           // CREATE2 前缀
                deployer,
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }
}
```

**CREATE2 地址计算**：
```
address = keccak256(0xff + deployer + salt + keccak256(bytecode))
```

**特点**：
- ✅ 地址可预测
- ✅ 支持Counterfactual部署
- ✅ 可以在链上计算地址
- ❌ 需要管理 salt

**应用场景**：
- **钱包合约**：用户可以在没有钱包的情况下预知地址并接收资金
- **状态通道**：提前计算通道地址
- **原子交换**：双方都知道合约地址

### 3. 克隆工厂（EIP-1167）

```solidity
contract MinimalCloneFactory {
    event CloneCreated(address indexed clone, address indexed target);

    function createClone(address target)
        external
        returns (address result)
    {
        bytes20 targetBytes = bytes20(target);

        assembly {
            // EIP-1167 克隆字节码
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf3)

            result := create(0, clone, 0x37)

            switch extcodesize(result)
            case 0 {
                revert(0, 0)
            }
        }

        emit CloneCreated(result, target);

        return result;
    }

    function isClone(address target, address query)
        public view returns (bool result)
    {
        bytes20 targetBytes = bytes20(target);

        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x363d3d373d3d3d363d73)
            mstore(add(clone, 0xa), targetBytes)
            mstore(add(clone, 0x1a), 0x5af43d82803e903d91602b57fd5bf3)

            let other := mload(0x40)
            extcodecopy(query, other, 0, 0x2d)

            result := eq(
                keccak256(clone, 0x2d),
                keccak256(other, 0x2d)
            )
        }
    }
}
```

**EIP-1167 工作原理**：
```
克隆合约运行时：
1. 接收调用
2. 委托给实现合约
3. 在实现合约的上下文中执行
4. 返回结果
```

**特点**：
- ✅ 超低 Gas 成本（~30,000 vs ~500,000）
- ✅ 所有克隆共享逻辑
- ✅ 每个克隆有独立状态
- ❌ 不能使用构造函数
- ❌ 需要初始化函数

**Gas 对比**：
```
CREATE:   ~500,000 gas
CREATE2:  ~500,000 gas
Clone:    ~32,000 gas  (节省 93%!)
```

## 📦 实战案例 1：DeFi 金库工厂

### 场景描述

一个 DeFi 协议需要为每个用户创建独立的金库合约，用于管理他们的资产。

### 实现方案

```solidity
// 金库实现合约
contract VaultImplementation {
    address public owner;
    address public factory;
    uint256 public balance;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
        factory = msg.sender;
    }

    function deposit() external payable {
        require(msg.sender == owner, "Not owner");
        balance += msg.value;
        emit Deposited(owner, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        require(balance >= amount, "Insufficient balance");

        balance -= amount;
        payable(owner).transfer(amount);

        emit Withdrawn(owner, amount);
    }
}

// 金库工厂
contract VaultFactory is MinimalCloneFactory {
    address public implementation;

    event VaultCreated(address indexed vault, address indexed owner);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    function createVault() external returns (address) {
        address vault = createClone(implementation);
        VaultImplementation(vault).initialize(msg.sender);

        emit VaultCreated(vault, msg.sender);

        return vault;
    }
}
```

### Gas 节省分析

假设为 10,000 个用户创建金库：

```
使用 CREATE:  10,000 × 500,000 = 5,000,000,000 gas
使用 Clone:   10,000 × 32,000   = 320,000,000 gas

节省: 4,680,000,000 gas (约 93.6%)
按 50 gwei 计算，节省约 234 ETH！
```

## 📦 实战案例 2：NFT 系列工厂

### 场景描述

一个 NFT 平台允许创作者创建多个 NFT 系列，每个系列都是独立的合约。

### 实现方案

```solidity
contract NFTCollectionFactory {
    struct CollectionInfo {
        address creator;
        address collectionAddress;
        uint256 createdAt;
    }

    mapping(address => CollectionInfo[]) public creatorCollections;
    address[] public allCollections;

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol
    );

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external returns (address) {
        // 使用 CREATE2 确定性部署
        bytes32 salt = keccak256(
            abi.encodePacked(msg.sender, name, symbol, block.timestamp)
        );

        bytes memory bytecode = type(NFTCollection).creationCode;
        bytes memory bytecodeWithArgs = abi.encodePacked(
            bytecode,
            abi.encode(msg.sender, name, symbol, baseURI)
        );

        address collection;
        assembly {
            collection := create2(0, add(bytecodeWithArgs, 0x20), mload(bytecodeWithArgs), salt)
        }

        require(collection != address(0), "Deployment failed");

        creatorCollections[msg.sender].push(CollectionInfo({
            creator: msg.sender,
            collectionAddress: collection,
            createdAt: block.timestamp
        }));

        allCollections.push(collection);

        emit CollectionCreated(collection, msg.sender, name, symbol);

        return collection;
    }

    function getCreatorCollections(address creator)
        external
        view
        returns (CollectionInfo[] memory)
    {
        return creatorCollections[creator];
    }

    function getAllCollections()
        external
        view
        returns (address[] memory)
    {
        return allCollections;
    }
}
```

## 📦 实战案例 3：确定性部署（钱包）

### 场景描述

用户想要创建一个智能合约钱包，但希望提前知道钱包地址，以便在创建钱包前就能接收资金。

### 实现方案

```solidity
contract DeterministicWalletFactory {
    mapping(bytes32 => address) public wallets;

    event WalletCreated(address indexed wallet, bytes32 indexed salt);

    function predictAddress(bytes32 salt)
        public
        view
        returns (address)
    {
        bytes memory bytecode = type(Wallet).creationCode;
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, abi.encode(salt));

        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecodeWithArgs)
        )))));
    }

    function createWallet(bytes32 salt) external returns (address) {
        bytes memory bytecode = type(Wallet).creationCode;
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, abi.encode(salt));

        address predictedAddress = predictAddress(salt);
        require(wallets[salt] == address(0), "Already created");

        address wallet;
        assembly {
            wallet := create2(0, add(bytecodeWithArgs, 0x20), mload(bytecodeWithArgs), salt)
        }

        require(wallet == predictedAddress, "Address mismatch");

        wallets[salt] = wallet;

        emit WalletCreated(wallet, salt);

        return wallet;
    }
}

contract Wallet {
    address public owner;
    bytes32 public salt;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(bytes32 _salt) {
        owner = msg.sender;
        salt = _salt;
    }

    function execute(
        address to,
        uint256 value,
        bytes memory data
    ) external onlyOwner {
        (bool success, ) = to.call{value: value}(data);
        require(success, "Execution failed");
    }
}
```

### 使用流程

```javascript
// 1. 用户生成 salt
const salt = ethers.keccak256(ethers.toUtf8Bytes("my-wallet-1"));

// 2. 预测钱包地址
const predictedAddress = await factory.predictAddress(salt);

// 3. 用户可以向这个地址发送资金（即使钱包还不存在！）
await token.transfer(predictedAddress, amount);

// 4. 稍后创建钱包
await factory.createWallet(salt);

// 5. 钱包现在可以访问资金了
```

## 🛡️ 最佳实践

### 1. 批量创建优化

```solidity
// ✅ 好的做法：批量创建
function batchCreate(uint256 count) external {
    for (uint256 i = 0; i < count; i++) {
        createClone(implementation);
    }
}

// ❌ 不好的做法：逐个创建（多次交易）
// 用户需要发起多次交易
```

### 2. 创建限制

```solidity
// ✅ 添加创建限制
uint256 public constant MAX_BATCH_SIZE = 50;

function batchCreate(uint256 count) external {
    require(count > 0 && count <= MAX_BATCH_SIZE, "Invalid count");
    // ...
}
```

### 3. 事件记录

```solidity
// ✅ 详细的事件记录
event ContractCreated(
    address indexed contractAddress,
    address indexed creator,
    bytes32 indexed salt,
    uint256 timestamp
);

function createContract(bytes32 salt) external {
    // ...
    emit ContractCreated(contractAddress, msg.sender, salt, block.timestamp);
}
```

### 4. 访问控制

```solidity
// ✅ 添加访问控制
contract Factory {
    address public admin;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function setImplementation(address _impl) external onlyAdmin {
        implementation = _impl;
    }
}
```

### 5. 克隆初始化

```solidity
// ✅ 使用初始化模式
contract CloneImplementation {
    address public owner;

    function initialize(address _owner) external {
        require(owner == address(0), "Already initialized");
        owner = _owner;
    }
}

// ❌ 不要在克隆中使用构造函数
// 克隆不会执行构造函数！
```

## ⚠️ 常见安全漏洞

### 1. 构造函数参数错误

```solidity
// ❌ 危险：CREATE2 参数编码错误
function deploy(bytes32 salt) external {
    bytes memory bytecode = type(MyContract).creationCode;
    assembly {
        addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
    }
    // 忘记编码构造函数参数！
}

// ✅ 正确：包含构造函数参数
function deploy(bytes32 salt) external {
    bytes memory bytecode = type(MyContract).creationCode;
    bytes memory bytecodeWithArgs = abi.encodePacked(
        bytecode,
        abi.encode(constructorArg1, constructorArg2)
    );
    assembly {
        addr := create2(0, add(bytecodeWithArgs, 0x20), mload(bytecodeWithArgs), salt)
    }
}
```

### 2. 重复部署

```solidity
// ❌ 危险：可能重复部署
function deploy(bytes32 salt) external returns (address) {
    address addr;
    assembly {
        addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
    }
    return addr;
}

// ✅ 正确：检查是否已部署
mapping(bytes32 => bool) public deployed;

function deploy(bytes32 salt) external returns (address) {
    require(!deployed[salt], "Already deployed");

    address addr;
    assembly {
        addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
    }

    deployed[salt] = true;
    return addr;
}
```

### 3. 克隆初始化攻击

```solidity
// ❌ 危险：没有初始化保护
contract VulnerableClone {
    address public owner;

    function initialize(address _owner) external {
        owner = _owner; // 可以重复调用！
    }
}

// ✅ 正确：初始化保护
contract SafeClone {
    address public owner;
    bool private initialized;

    function initialize(address _owner) external {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = _owner;
    }
}
```

## 📊 工厂模式对比

| 特性 | CREATE | CREATE2 | Clone (EIP-1167) |
|------|--------|---------|------------------|
| 地址预测 | ❌ | ✅ | ❌ (但有 nonce) |
| 部署成本 | 高 (~500k) | 高 (~500k) | 低 (~32k) |
| 构造函数 | ✅ | ✅ | ❌ |
| 适用场景 | 通用 | 确定性部署 | 大量实例 |
| 复杂度 | 低 | 中 | 中 |

**选择建议**：
- **CREATE**：一般用途，地址预测不重要
- **CREATE2**：需要预测地址（钱包、状态通道）
- **Clone**：需要大量实例（DeFi 金库、NFT）

## 🧪 测试建议

### 1. 测试地址预测

```javascript
it("应该正确预测地址", async function () {
    const predictedAddress = await factory.predictAddress(salt);
    const actualAddress = await factory.deploy(salt);

    expect(predictedAddress).to.equal(actualAddress);
});
```

### 2. 测试批量创建

```javascript
it("应该成功批量创建", async function () {
    const count = 10;
    await factory.batchCreate(count);

    expect(await factory.getCount()).to.equal(count);
});
```

### 3. 测试克隆功能

```javascript
it("克隆应该独立工作", async function () {
    const clone1 = await factory.createClone();
    const clone2 = await factory.createClone();

    await clone1.initialize(owner.address);
    await clone2.initialize(user.address);

    expect(await clone1.owner()).to.equal(owner.address);
    expect(await clone2.owner()).to.equal(user.address);
});
```

## 🎓 课后练习

### 基础题（必做）

1. **ERC20 代币工厂**
   - 创建工厂合约部署 ERC20 代币
   - 支持批量创建
   - 记录所有创建的代币

2. **多重签名钱包工厂**
   - 使用 CREATE2 确定性部署
   - 允许预测钱包地址
   - 实现场景：用户可以先收款再创建钱包

3. **众筹活动工厂**
   - 使用克隆技术节省成本
   - 每个活动独立状态
   - 实现初始化和保护机制

### 进阶题（选做）

1. **元交易工厂**
   - 支持代付 Gas
   - 实现签名验证
   - 防止重放攻击

2. **可升级克隆工厂**
   - 实现合约可升级
   - 所有克隆共享新逻辑
   - 保持状态不变

3. **工厂自动化**
   - 定时批量创建
   - 条件触发创建
   - Gas 优化策略

## 🔗 常见问题

### Q1: CREATE 和 CREATE2 有什么区别？
**A**:
- **CREATE**：地址由发送者地址和 nonce 决定
- **CREATE2**：地址由发送者、salt 和字节码决定
- CREATE2 允许在部署前预测地址

### Q2: 克隆合约真的能节省这么多 Gas 吗？
**A**: 是的！克隆只复制最小的委托逻辑，实际代码在实现合约中。部署成本从 ~500,000 gas 降到 ~32,000 gas。

### Q3: 克隆合约能使用构造函数吗？
**A**: 不能。克隆合约不执行构造函数，需要使用初始化函数代替。

### Q4: 什么时候使用 CREATE2？
**A**:
- 需要提前知道合约地址（钱包、状态通道）
- 原子交换
- 生态系统集成

### Q5: 工厂模式会增加 Gas 成本吗？
**A**: 工厂合约本身的调用成本很小（~5,000-10,000 gas），但能带来更好的管理和批量操作能力。

## 📚 延伸阅读

- [EIP-1014: CREATE2](https://eips.ethereum.org/EIPS/eip-1014)
- [EIP-1167: Minimal Proxy Contract](https://eips.ethereum.org/EIPS/eip-1167)
- [OpenZeppelin Clones](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Clones)
- [Uniswap V2 Factory](https://docs.uniswap.org/protocol/V2/introduction)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解工厂模式的核心概念
- [ ] 掌握 CREATE 和 CREATE2 的区别
- [ ] 能够实现基础工厂合约
- [ ] 理解 EIP-1167 克隆模式
- [ ] 能够预测 CREATE2 地址
- [ ] 了解工厂模式的安全考虑
- [ ] 理解不同创建方式的 Gas 成本
- [ ] 完成至少一个练习题

---

**下一课预告**：代理模式 - 让智能合约可升级，告别"一次部署，终生不变"！

**准备好了吗？继续你的 Web3 之旅！** 🚀

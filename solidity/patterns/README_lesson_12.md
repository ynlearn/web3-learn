# Lesson 12: 代理模式 - 让智能合约可升级

## 📚 课程概述

代理模式（Proxy Pattern）是解决智能合约"不可修改性"问题的革命性方案。它通过将数据和逻辑分离，使得我们可以在保持合约状态不变的情况下升级合约逻辑。本课将深入讲解透明代理、UUPS、信标代理等主流代理模式的实现原理和应用场景。

## 🎯 学习目标

完成本课后，你将能够：

- ✅ 理解代理模式的核心价值和工作原理
- ✅ 掌握 delegatecall 委托调用机制
- ✅ 实现透明可升级代理
- ✅ 实现通用可升级代理（UUPS）
- ✅ 实现信标代理模式
- ✅ 理解存储槽位管理（EIP-1967）
- ✅ 避免常见的代理安全漏洞
- ✅ 选择最适合的代理模式

## 📝 什么是代理模式？

### 基本概念

**代理模式** 是一种结构型设计模式，它提供了一个代理对象来控制对其他对象的访问。

在智能合约中，代理模式由两部分组成：
1. **代理合约（Proxy）**：负责存储数据并委托调用
2. **逻辑合约（Logic/Implementation）**：负责实现业务逻辑

**工作原理**：
```
用户调用 → 代理合约 → delegatecall → 逻辑合约
              ↓                    ↓
          存储数据              执行代码
          (状态)                (行为)
```

### 为什么需要代理模式？

**智能合约的困境**：
```
传统智能合约：
- 部署后无法修改代码
- 发现漏洞无法修复
- 无法添加新功能
- 无法优化 Gas 成本

结果：一次部署，终生不变
```

**代理模式的解决方案**：
```
可升级智能合约：
- 代理合约：保持不变，存储数据
- 逻辑合约：可以升级，改变行为

结果：数据不变，逻辑可升级！
```

### 现实世界类比

**餐厅经营**：
```
不使用代理模式：
- 餐厅装修固定
- 想改变风格？只能重新开一家！

使用代理模式：
- 餐厅地址不变（代理合约）
- 厨师可以更换（逻辑合约）
- 菜单可以更新（功能升级）

顾客总是去同一个地址，但享受不同的服务！
```

**幽默比喻**：
- 不用代理 = 换手机号要通知所有人
- 用代理 = 你有了一个"虚拟号码"，可以随时绑定到真实号码上
- 升级时，只需更换绑定的真实号码，虚拟号码不变

## 🔧 核心技术：delegatecall

### 委托调用原理

**delegatecall vs call**：

```solidity
// call：在被调用合约的上下文中执行
contract A {
    function foo() public {
        B(addr).call(abi.encodeWithSignature("bar()"));
        // 执行 B 的代码，修改 B 的存储
    }
}

// delegatecall：在调用合约的上下文中执行
contract A {
    function foo() public {
        B(addr).delegatecall(abi.encodeWithSignature("bar()"));
        // 执行 B 的代码，修改 A 的存储
    }
}
```

**关键区别**：
- **call**：代码在目标合约执行，存储修改目标合约
- **delegatecall**：代码在目标合约执行，存储修改当前合约

### 存储布局冲突

```solidity
// 逻辑合约 V1
contract LogicV1 {
    uint256 public a;  // slot 0
    uint256 public b;  // slot 1
}

// 逻辑合约 V2
contract LogicV2 {
    uint256 public a;  // slot 0
    address public c;  // slot 1 (冲突！)
}

// 代理合约
contract Proxy {
    address public implementation;  // slot 0 (冲突！)
    // ... delegatecall 逻辑
}
```

**问题**：如果存储布局不匹配，会导致数据错乱！

**解决方案**：
1. 使用不连续的存储槽位（EIP-1967）
2. 升级时保持存储布局兼容
3. 使用 gap 为未来预留空间

## 🔧 代理模式实现

### 1. 透明可升级代理（Transparent Proxy）

**核心思想**：管理员调用总是路由到代理本身，用户调用路由到实现合约。

```solidity
contract TransparentUpgradeableProxy {
    using StorageSlot for *;

    constructor(address _logic, address _admin, bytes memory _data) payable {
        _setImplementation(_logic);
        _setAdmin(_admin);

        if (_data.length > 0) {
            (bool success, ) = _logic.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    fallback() external payable {
        address impl = _getImplementation();

        // 防止管理员调用实现合约
        if (msg.sender == _getAdmin()) {
            revert("Proxy: admin cannot fallback to proxy");
        }

        _delegate(impl);
    }

    function _delegate(address implementation) internal {
        assembly {
            // 复制 calldata 到内存
            calldatacopy(0, 0, calldatasize())

            // 使用 delegatecall 调用实现合约
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

            // 复制返回数据
            returndatacopy(0, 0, returndatasize())

            // 根据结果返回或回退
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function upgradeTo(address newImplementation) external {
        require(msg.sender == _getAdmin(), "Only admin");
        require(newImplementation.isContract(), "Implementation not contract");

        _setImplementation(newImplementation);
    }

    // ... 其他管理函数
}
```

**EIP-1967 存储槽**：
```solidity
library StorageSlot {
    bytes32 internal constant IMPLEMENTATION_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    bytes32 internal constant ADMIN_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
}
```

**优点**：
- ✅ 简单易用
- ✅ 管理员和用户调用自动路由
- ✅ 存储槽位标准化

**缺点**：
- ❌ 管理员调用额外 Gas 成本
- ❌ 每次调用都需要检查是否为管理员

### 2. UUPS 代理（Universal Upgradeable Proxy Standard）

**核心思想**：升级逻辑在实现合约中，而不是代理合约中。

```solidity
abstract contract UUPSUpgradeable {
    function upgradeTo(address newImplementation) external {
        _authorizeUpgrade();
        _upgradeTo(newImplementation);
    }

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable
    {
        _authorizeUpgrade();
        _upgradeTo(newImplementation);

        (bool success, ) = newImplementation.delegatecall(data);
        require(success, "Initialization failed");
    }

    function _authorizeUpgrade() internal virtual;

    function _upgradeTo(address newImplementation) internal {
        _setImplementation(newImplementation);
    }

    function _setImplementation(address newImplementation) private {
        StorageSlot.getAddressSlot(
            StorageSlot.IMPLEMENTATION_SLOT
        ).value = newImplementation;
    }
}

contract UUPSProxy {
    constructor(address _logic, bytes memory _data) payable {
        StorageSlot.getAddressSlot(
            StorageSlot.IMPLEMENTATION_SLOT
        ).value = _logic;

        if (_data.length > 0) {
            (bool success, ) = _logic.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    fallback() external payable {
        _delegate(_getImplementation());
    }

    // ... delegatecall 实现
}

// 实现合约示例
contract CounterV1 is UUPSUpgradeable {
    uint256 public count;
    address public owner;

    function initialize() public {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
    }

    function increment() public {
        count += 1;
    }

    function _authorizeUpgrade() internal override {
        require(msg.sender == owner, "Only owner");
    }
}
```

**优点**：
- ✅ 更节省 Gas（没有管理员检查）
- ✅ 升级逻辑更灵活
- ✅ 符合最小代理原则

**缺点**：
- ❌ 实现合约需要包含升级逻辑
- ❌ 每个实现合约都要继承 UUPSUpgradeable

### 3. 信标代理（Beacon Proxy）

**核心思想**：多个代理共享同一个实现合约，通过升级信标来统一升级。

```solidity
contract BeaconProxy {
    constructor(address beacon, bytes memory data) payable {
        _setBeacon(beacon);

        if (data.length > 0) {
            _delegate(_getImplementation());
        }
    }

    fallback() external payable {
        _delegate(_getImplementation());
    }

    function _getImplementation() private view returns (address) {
        address beacon = StorageSlot.getAddressSlot(
            StorageSlot.BEACON_SLOT
        ).value;

        (bool success, bytes memory data) = beacon.staticcall(
            abi.encodeWithSignature("implementation()")
        );

        require(success, "Beacon call failed");

        return abi.decode(data, (address));
    }

    function _setBeacon(address beacon) private {
        StorageSlot.getAddressSlot(
            StorageSlot.BEACON_SLOT
        ).value = beacon;
    }
}

contract UpgradeableBeacon {
    address public implementation;
    address public owner;

    event Upgraded(address indexed implementation);

    constructor(address _implementation) {
        require(_implementation.isContract(), "Not contract");
        implementation = _implementation;
        owner = msg.sender;
    }

    function upgrade(address _implementation) external {
        require(msg.sender == owner, "Only owner");
        require(_implementation.isContract(), "Not contract");

        implementation = _implementation;

        emit Upgraded(_implementation);
    }
}
```

**EIP-1967 信标槽**：
```solidity
bytes32 internal constant BEACON_SLOT =
    bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1);
```

**优点**：
- ✅ 一次升级，所有代理都更新
- ✅ 节省部署成本
- ✅ 统一管理多个实例

**缺点**：
- ❌ 灵活性较低（所有代理必须使用相同实现）
- ❌ 单个代理无法独立升级

## 📦 实战案例 1：DeFi 协议升级

### 场景描述

一个 DeFi 借贷协议需要添加新功能并修复发现的漏洞。

### V1 实现

```solidity
contract LendingProtocolV1 {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalDeposits;
    uint256 public totalBorrows;

    address public owner;
    bool private initialized;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);

    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = msg.sender;
    }

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function borrow(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient collateral");

        deposits[msg.sender] -= amount;
        borrows[msg.sender] += amount;
        totalBorrows += amount;

        payable(msg.sender).transfer(amount);
        emit Borrowed(msg.sender, amount);
    }
}
```

### V2 升级

```solidity
contract LendingProtocolV2 is UUPSUpgradeable {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    uint256 public totalDeposits;
    uint256 public totalBorrows;
    address public owner;
    bool private initialized;

    // 新增：利率
    uint256 public interestRate;

    // 新增：最后更新时间
    mapping(address => uint256) public lastUpdate;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event InterestApplied(address indexed user, uint256 interest);

    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = msg.sender;
        interestRate = 100; // 1% (基点)
    }

    function deposit() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;
        lastUpdate[msg.sender] = block.timestamp;
        emit Deposited(msg.sender, msg.value);
    }

    function borrow(uint256 amount) external {
        _applyInterest(msg.sender);

        uint256 collateral = deposits[msg.sender];
        require(collateral >= amount, "Insufficient collateral");

        deposits[msg.sender] -= amount;
        borrows[msg.sender] += amount;
        totalBorrows += amount;

        payable(msg.sender).transfer(amount);
        emit Borrowed(msg.sender, amount);
    }

    // 新增：应用利息
    function _applyInterest(address user) internal {
        uint256 timeElapsed = block.timestamp - lastUpdate[user];
        if (timeElapsed > 0 && borrows[user] > 0) {
            uint256 interest = (borrows[user] * interestRate * timeElapsed) / 10000 / 365 days;
            borrows[user] += interest;
            lastUpdate[user] = block.timestamp;
            emit InterestApplied(user, interest);
        }
    }

    function setInterestRate(uint256 newRate) external {
        require(msg.sender == owner, "Only owner");
        require(newRate <= 1000, "Rate too high"); // 最高 10%
        interestRate = newRate;
    }

    function _authorizeUpgrade() internal override {
        require(msg.sender == owner, "Only owner");
    }
}
```

### 升级流程

```javascript
// 1. 部署 V2 实现合约
const lendingV2 = await LendingProtocolV2.deploy();
await lendingV2.waitForDeployment();

// 2. 通过代理升级到 V2
const proxyAsV1 = await ethers.getContractAt(
    "LendingProtocolV1",
    proxyAddress
);

await proxyAsV1.upgradeTo(await lendingV2.getAddress());

// 3. 现在可以使用 V2 的新功能
const proxyAsV2 = await ethers.getContractAt(
    "LendingProtocolV2",
    proxyAddress
);

await proxyAsV2.setInterestRate(50); // 设置为 0.5%

// 4. V1 的数据保持不变
expect(await proxyAsV2.totalDeposits()).to.equal(previousDeposits);
```

## 📦 实战案例 2：NFT 市场升级

### 场景描述

一个 NFT 市场需要添加版税功能。

### V1 实现

```solidity
contract NFTMarketplaceV1 {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer);

    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256) {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = listingCount++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price
        });

        emit Listed(listingId, msg.sender, price);
        return listingId;
    }

    function buy(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        require(listing.price > 0, "Invalid listing");
        require(msg.value >= listing.price, "Insufficient payment");

        IERC721(listing.nftContract).transferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );

        payable(listing.seller).transfer(listing.price);

        delete listings[listingId];

        emit Sold(listingId, msg.sender);
    }
}
```

### V2 升级（添加版税）

```solidity
contract NFTMarketplaceV2 {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 royaltyBasisPoints; // 新增：版税
    }

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    // 新增：版税接收者
    mapping(address => address) public royaltyReceivers;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer);
    event RoyaltyPaid(address indexed creator, uint256 amount); // 新增

    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 royaltyBps // 新增参数
    ) external returns (uint256) {
        require(royaltyBps <= 1000, "Royalty too high"); // 最高 10%

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 listingId = listingCount++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            royaltyBasisPoints: royaltyBps
        });

        emit Listed(listingId, msg.sender, price);
        return listingId;
    }

    function buy(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        require(listing.price > 0, "Invalid listing");
        require(msg.value >= listing.price, "Insufficient payment");

        IERC721(listing.nftContract).transferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );

        // 新增：计算和支付版税
        uint256 royalty = (listing.price * listing.royaltyBasisPoints) / 10000;
        if (royalty > 0) {
            address royaltyReceiver = royaltyReceivers[listing.nftContract];
            if (royaltyReceiver == address(0)) {
                royaltyReceiver = listing.seller;
            }
            payable(royaltyReceiver).transfer(royalty);
            emit RoyaltyPaid(royaltyReceiver, royalty);
        }

        // 卖家收到：价格 - 版税
        uint256 sellerAmount = listing.price - royalty;
        payable(listing.seller).transfer(sellerAmount);

        delete listings[listingId];

        emit Sold(listingId, msg.sender);
    }

    // 新增：设置版税接收者
    function setRoyaltyReceiver(address nftContract, address receiver) external {
        royaltyReceivers[nftContract] = receiver;
    }
}
```

## 🛡️ 最佳实践

### 1. 存储布局兼容性

```solidity
// ✅ 好的做法：保持存储布局兼容
contract V1 {
    uint256 public a;
    uint256 public b;
    uint256[50] private __gap; // 预留空间
}

contract V2 {
    uint256 public a;
    uint256 public b;
    uint256 public c; // 新增变量
    uint256[49] private __gap; // 减少预留
}

// ❌ 不好的做法：改变现有变量位置
contract V2 {
    uint256 public c; // 改变了顺序！
    uint256 public a;
    uint256 public b;
}
```

### 2. 初始化保护

```solidity
// ✅ 使用初始化模式
contract UpgradeableContract {
    address public owner;
    bool private initialized;

    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = msg.sender;
    }
}

// ❌ 不要在可升级合约中使用构造函数
// 构造函数只在部署时执行一次，升级时不会执行
contract BadContract {
    address public owner;

    constructor() {
        owner = msg.sender; // 升级后不会执行！
    }
}
```

### 3. 访问控制

```solidity
// ✅ 在实现合约中实现访问控制
contract MyContractV1 is UUPSUpgradeable, OwnableUpgradeable {
    function sensitiveFunction() external onlyOwner {
        // 只有所有者能调用
    }

    function _authorizeUpgrade() internal override {
        _checkOwner(); // 使用 OpenZeppelin 的检查
    }
}
```

### 4. 事件日志

```solidity
// ✅ 升级时添加新事件
contract V2 {
    event Upgraded(address indexed implementation);

    function upgradeTo(address newImplementation) external {
        // ...
        emit Upgraded(newImplementation);
    }
}
```

### 5. 测试升级

```javascript
// ✅ 测试升级流程
describe("升级测试", function () {
    it("应该成功升级并保留状态", async function () {
        // V1 操作
        await v1.setValue(100);
        expect(await v1.getValue()).to.equal(100);

        // 升级到 V2
        await v1.upgradeTo(await v2.getAddress());

        // 通过 V2 接口访问
        const v2 = await ethers.getContractAt("MyContractV2", proxyAddress);

        // 状态应该保留
        expect(await v2.getValue()).to.equal(100);

        // 新功能应该可用
        await v2.setNewValue(200);
        expect(await v2.getNewValue()).to.equal(200);
    });
});
```

## ⚠️ 常见安全漏洞

### 1. 存储冲突

```solidity
// ❌ 危险：存储槽位冲突
contract Proxy {
    address public implementation; // slot 0
    // ...
}

contract Implementation {
    address public owner; // slot 0 - 冲突！
    uint256 public value; // slot 1
}

// ✅ 正确：使用不连续的槽位
library StorageSlot {
    bytes32 internal constant IMPLEMENTATION_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
}
```

### 2. 初始化失败

```solidity
// ❌ 危险：可能重复初始化
contract Vulnerable {
    address public owner;

    function initialize() external {
        owner = msg.sender; // 可以重复调用！
    }
}

// ✅ 正确：初始化保护
contract Safe {
    address public owner;
    bool private initialized;

    function initialize() external {
        require(!initialized, "Already initialized");
        initialized = true;
        owner = msg.sender;
    }
}
```

### 3. 函数选择器冲突

```solidity
// ❌ 危险：管理员函数可能与实现合约冲突
contract Proxy {
    function upgradeTo(address) external { } // 选择器: 0x0f0...
}

contract Implementation {
    function emergencyWithdraw() external { } // 可能冲突！
}

// ✅ 正确：透明代理自动路由
// 管理员调用不会 delegatecall 到实现合约
```

### 4. 自毁攻击

```solidity
// ❌ 危险：实现合约可能被销毁
contract Implementation {
    function destroy() external {
        selfdestruct(payable(owner));
    }
}

// ✅ 正确：限制危险函数
contract Implementation {
    function destroy() external onlyOwner {
        // 添加额外检查
        require(!locked, "Contract locked");
        selfdestruct(payable(owner));
    }
}
```

## 📊 代理模式对比

| 特性 | Transparent Proxy | UUPS | Beacon Proxy |
|------|------------------|------|--------------|
| 复杂度 | 低 | 中 | 中 |
| Gas 成本 | 较高 | 较低 | 低 |
| 升级逻辑位置 | 代理合约 | 实现合约 | 信标合约 |
| 多实例管理 | 分散升级 | 分散升级 | 统一升级 |
| 适用场景 | 单合约 | 单合约 | 多实例 |

**选择建议**：
- **Transparent Proxy**：简单场景，需要明确的权限分离
- **UUPS**：注重 Gas 优化，灵活的升级逻辑
- **Beacon Proxy**：大量相同实例，需要统一升级

## 🧪 测试建议

### 1. 测试状态保留

```javascript
it("升级后应该保留状态", async function () {
    await v1.setValue(100);
    await v1.upgradeTo(await v2.getAddress());

    const v2 = await ethers.getContractAt("MyContractV2", proxyAddress);
    expect(await v2.getValue()).to.equal(100);
});
```

### 2. 测试新功能

```javascript
it("升级后应该有新功能", async function () {
    await v1.upgradeTo(await v2.getAddress());

    const v2 = await ethers.getContractAt("MyContractV2", proxyAddress);
    await v2.setNewValue(200);
    expect(await v2.getNewValue()).to.equal(200);
});
```

### 3. 测试访问控制

```javascript
it("非管理员不应该能够升级", async function () {
    await expect(
        v1.connect(user).upgradeTo(await v2.getAddress())
    ).to.be.revertedWith("Only admin");
});
```

## 🎓 课后练习

### 基础题（必做）

1. **可升级代币合约**
   - 实现 ERC20 代币
   - 添加铸造功能
   - 升级添加代币冻结功能

2. **可升级投票合约**
   - 实现基础投票功能
   - 升级添加委托投票
   - 升级添加时间锁

3. **可升级多签钱包**
   - 实现多签钱包
   - 升级添加每日限额
   - 升级添加恢复功能

### 进阶题（选做）

1. **信标代理系统**
   - 创建多个代理实例
   - 统一升级所有实例
   - 实现代理注册表

2. **时间锁升级**
   - 升级需要延迟生效
   - 支持取消升级
   - 多重签名控制

3. **自动化升级**
   - 提案系统
   - 投票决定升级
   - 自动执行升级

## 🔗 常见问题

### Q1: 代理模式会增加 Gas 成本吗？
**A**: 是的。每次调用需要额外的 delegatecall 操作，通常增加 200-500 gas。但这是可升级性的必要成本。

### Q2: 可以升级无限次吗？
**A**: 技术上可以，但建议限制升级次数和频率，每次升级都应经过充分测试。

### Q3: 升级期间合约会暂停服务吗？
**A**: 不会。升级交易只是一个状态更新，完成后立即可用。

### Q4: 如何确保升级安全？
**A**:
- 充分测试新实现
- 使用时间锁延迟升级
- 多重签名控制升级
- 社区审计和投票

### Q5: UUPS 和 Transparent Proxy 哪个更好？
**A**: 取决于场景：
- UUPS：更节省 Gas，更灵活
- Transparent：更简单，更容易理解

## 📚 延伸阅读

- [EIP-1822: UUPS](https://eips.ethereum.org/EIPS/eip-1822)
- [EIP-1967: Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967)
- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Proxy Patterns](https://blog.openzeppelin.com/proxy-patterns/)

## ✅ 课程检查清单

完成本课前，确保你：
- [ ] 理解代理模式的核心价值
- [ ] 掌握 delegatecall 的工作原理
- [ ] 能够实现透明代理合约
- [ ] 能够实现 UUPS 代理
- [ ] 能够实现信标代理
- [ ] 理解存储布局的重要性
- [ ] 了解代理安全最佳实践
- [ ] 完成至少一个练习题

---

**下一课预告**：状态机模式 - 让智能合约有条理地运转，状态清晰可控！

**准备好了吗？继续你的 Web3 之旅！** 🚀

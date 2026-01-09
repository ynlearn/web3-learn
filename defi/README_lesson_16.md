# 📘 Lesson 16: 代币标准 (Token Standards)

## 📚 课程概述

欢迎来到 DeFi 实战的第一课！在本课程中，我们将深入学习以太坊上三大主流代币标准：

- **ERC20** - 同质化代币标准（比特币、USDT 等都属此类）
- **ERC721** - 非同质化代币标准（NFT 的技术基础）
- **ERC1155** - 多代币标准（游戏道具、票务等高效场景）

理解这些标准是开发 DeFi 应用的基础，几乎所有的 DeFi 协议都基于这些代币标准构建。

## 🎯 学习目标

完成本课程后，你将能够：

1. ✅ 理解三大代币标准的区别和应用场景
2. ✅ 掌握 ERC20 的转账、授权机制
3. ✅ 理解 ERC721 的唯一性和所有权管理
4. ✅ 掌握 ERC1155 的批量操作和 Gas 优化
5. ✅ 能够选择合适的代币标准
6. ✅ 理解代币安全和最佳实践
7. ✅ 实现可燃烧和可铸造的代币

## 🔑 核心概念

### 1. 什么是代币标准？

**想象一下：**

在以太坊发明之前，每个要发币的人都需要：
```
张三币：有自己的转账规则
李四币：有不同的转账规则
王五币：完全不一样的实现方式
```

交易所想支持新币，需要专门为每个币写代码！

**代币标准来了：**
```
ERC20 标准：
├── balanceOf(address) - 查询余额
├── transfer(address, amount) - 转账
├── approve(address, amount) - 授权
└── transferFrom(address, address, amount) - 代理转账
```

现在只要符合 ERC20 标准，所有钱包和交易所都能自动识别！

### 2. ERC20 vs ERC721 vs ERC1155

#### ERC20 - 同质化代币（Fungible）

**特点：我的 1 个 = 你的 1 个**

```
钱包 A: [💰💰💰💰💰] 5 个 USDT
钱包 B: [💰💰💰💰💰] 5 个 USDT

价值完全相同，可以互换
```

**应用场景：**
- 🪙 货币代币（USDT、USDC、DAI）
- 🏦 治理代币（UNI、AAVE、COMP）
- 🎫 积分奖励
- 📊 股票代币化

#### ERC721 - 非同质化代币（Non-Fungible）

**特点：每个都独一无二**

```
钱包 A: [🎨#1 神秘画作]
钱包 B: [🎨#2 神秘画作]

即使图片一样，#1 ≠ #2
每个都有自己的 ID 和历史
```

**应用场景：**
- 🖼️ 数字艺术品（BAYC、CryptoPunks）
- 🎮 游戏道具（稀有武器、皮肤）
- 🎫 门票（演唱会、体育赛事）
- 📜 身份证明（域名、学历证书）
- 🏠 房地产代币化

#### ERC1155 - 多代币标准（Multi-Token）

**特点：一个合约管理多种代币**

```
游戏道具合约：
├── ID 0: 普通报 ⚔️ (同质化)
├── ID 1: 稀有剑 🗡️ (同质化)
├── ID 2: 传奇头盔 ⛑️ (NFT，只有 1 个)
└── ID 3: 门票 🎫 (同质化，但过期即销毁)

可以批量转账，节省 Gas！
```

**应用场景：**
- 🎮 游戏道具（同时管理货币、装备、NFT）
- 🎫 票务系统（不同类型的票）
- 🏆 证书和徽章
- 📦 商品券和代金券

### 3. 代币选择决策树

```
你的项目需要什么？
│
├─ 货币/积分/治理？
│  └─ → ERC20 ✅
│
├─ 独特的艺术品/收藏品？
│  └─ → ERC721 ✅
│
├─ 游戏道具（多种类型）？
│  └─ → ERC1155 ✅
│
├─ 需要批量操作（省钱）？
│  └─ → ERC1155 ✅
│
└─ 票务/证书系统？
   └─ → ERC1155 ✅
```

### 4. Gas 消耗对比

**转账 10 个代币的 Gas 成本：**

| 操作 | ERC20 | ERC721 | ERC1155 |
|------|-------|-------|--------|
| 单次转账 | ~50,000 | ~80,000 | ~60,000 |
| 转账 10 次 | ~500,000 | ~800,000 | ~100,000 (批量) |

**结论：**
- 少量 NFT → ERC721
- 大量道具/需要批量 → ERC1155
- 简单货币 → ERC20

## 📝 ERC20 标准详解

### 核心功能

#### 1. 基本信息

```solidity
string public name = "My Token";        // 代币名称
string public symbol = "MTK";           // 代币符号
uint8 public decimals = 18;             // 小数位数
uint256 public totalSupply;             // 总供应量
```

**为什么是 18 位小数？**

模仿以太币的设计：
```
1 ETH = 10^18 Wei
1 USDT = 10^6 基本单位 (6 位小数)
1 BTC = 10^8 Satoshi (8 位小数)
```

#### 2. 转账功能

```solidity
function transfer(address recipient, uint256 amount) public returns (bool) {
    // 1. 验证
    require(recipient != address(0), "不能转给零地址");
    require(balanceOf[msg.sender] >= amount, "余额不足");

    // 2. 更新状态
    balanceOf[msg.sender] -= amount;
    balanceOf[recipient] += amount;

    // 3. 触发事件
    emit Transfer(msg.sender, recipient, amount);

    return true;
}
```

#### 3. 授权机制

**为什么需要授权？**

场景：Alice 想让 Uniswap 帮她代币交换

```
传统方式：
❌ Alice 先转币给 Uniswap
❌ Uniswap 完成后再转回

有授权：
✅ Alice 授权 Uniswap 使用 100 个代币
✅ Uniswap 用 transferFrom 操作
✅ 币一直在 Alice 手里，安全！
```

```solidity
// 授权某人使用你的代币
function approve(address spender, uint256 amount) public returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
}

// 被授权者转账
function transferFrom(
    address sender,
    address recipient,
    uint256 amount
) public returns (bool) {
    require(allowance[sender][msg.sender] >= amount, "授权额度不足");

    allowance[sender][msg.sender] -= amount;
    balanceOf[sender] -= amount;
    balanceOf[recipient] += amount;

    emit Transfer(sender, recipient, amount);
    return true;
}
```

**授权额度调整：**

```solidity
// 增加授权（避免需要先撤销再授权）
function increaseAllowance(address spender, uint256 addedValue) public {
    allowance[msg.sender][spender] += addedValue;
}

// 减少授权
function decreaseAllowance(address spender, uint256 subtractedValue) public {
    allowance[msg.sender][spender] -= subtractedValue;
}
```

#### 4. 事件

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

**为什么要记录事件？**
- 📊 钱包可以监听事件显示余额
- 🔍 区块浏览器可以追踪交易
- 📈 分析工具可以统计数据

### 可燃烧代币

```solidity
contract BurnableToken is MyToken {
    event Burned(address indexed account, uint256 amount);

    // 销毁自己的代币
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    // 销毁他人的代币（需要授权）
    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance[account][msg.sender];
        require(currentAllowance >= amount, "Burn amount exceeds allowance");

        allowance[account][msg.sender] = currentAllowance - amount;
        _burn(account, amount);
        emit Burned(account, amount);
    }
}
```

**为什么需要销毁代币？**
- 📉 通缩机制（币总量减少，价值上升）
- 🔥 支付手续费（用代币支付平台费用）
- 🎮 游戏道具消耗（使用后销毁）
- 📊 股票回购（公司回购并销毁股票）

## 📝 ERC721 标准详解

### 核心功能

#### 1. 基本信息

```solidity
string public name = "My NFT";
string public symbol = "MNFT";

// NFT 的核心：tokenId → owner 映射
mapping(uint256 => address) private _owners;

// owner 拥有的 NFT 数量
mapping(address => uint256) private _balances;

// 单个 NFT 的授权
mapping(uint256 => address) private _tokenApprovals;

// 全部授权（运营者）
mapping(address => mapping(address => bool)) private _operatorApprovals;
```

#### 2. 查询功能

```solidity
// 查询某地址拥有的 NFT 数量
function balanceOf(address owner) public view returns (uint256) {
    require(owner != address(0), "不能查询零地址");
    return _balances[owner];
}

// 查询某个 NFT 的所有者
function ownerOf(uint256 tokenId) public view returns (address) {
    address owner = _owners[tokenId];
    require(owner != address(0), "NFT 不存在");
    return owner;
}
```

#### 3. 铸造 NFT

```solidity
uint256 private _tokenIdCounter;

function mint(address to) public returns (uint256) {
    uint256 tokenId = _tokenIdCounter++;
    _safeMint(to, tokenId);
    return tokenId;
}

function _mint(address to, uint256 tokenId) internal {
    require(to != address(0), "不能铸造到零地址");
    require(_owners[tokenId] == address(0), "Token 已存在");

    _balances[to] += 1;
    _owners[tokenId] = to;

    emit Transfer(address(0), to, tokenId);
}
```

#### 4. 授权机制

**单个授权：**
```solidity
function approve(address to, uint256 tokenId) public {
    address owner = ownerOf(tokenId);
    require(to != owner, "不能授权给自己");
    require(
        msg.sender == owner || isApprovedForAll(owner, msg.sender),
        "无权授权"
    );

    _tokenApprovals[tokenId] = to;
    emit Approval(owner, to, tokenId);
}
```

**全部授权（运营者）：**
```solidity
function setApprovalForAll(address operator, bool approved) public {
    require(operator != msg.sender, "不能授权给自己");
    _operatorApprovals[msg.sender][operator] = approved;
    emit ApprovalForAll(msg.sender, operator, approved);
}

function isApprovedForAll(address owner, address operator)
    public view returns (bool)
{
    return _operatorApprovals[owner][operator];
}
```

#### 5. 转账功能

**普通转账：**
```solidity
function transferFrom(address from, address to, uint256 tokenId) public {
    require(_isApprovedOrOwner(msg.sender, tokenId), "无权转账");
    _transfer(from, to, tokenId);
}

function _transfer(address from, address to, uint256 tokenId) internal {
    require(ownerOf(tokenId) == from, "from 不是所有者");
    require(to != address(0), "不能转给零地址");

    _balances[from] -= 1;
    _balances[to] += 1;
    _owners[tokenId] = to;

    emit Transfer(from, to, tokenId);
}
```

**安全转账：**
```solidity
function safeTransferFrom(address from, address to, uint256 tokenId) public {
    safeTransferFrom(from, to, tokenId, "");
}

function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
) public {
    require(_isApprovedOrOwner(msg.sender, tokenId), "无权转账");
    _safeTransfer(from, to, tokenId, data);
}

function _safeTransfer(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
) internal {
    _transfer(from, to, tokenId);

    // 检查接收合约是否实现了 onERC721Received
    require(
        _checkOnERC721Received(from, to, tokenId, data),
        "接收合约未实现 ERC721 接口"
    );
}
```

**为什么要安全转账？**

防止 NFT 被锁定在无法处理的合约中！

```solidity
// 接收合约需要实现这个接口
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
```

#### 6. 销毁 NFT

```solidity
function _burn(uint256 tokenId) internal {
    address owner = ownerOf(tokenId);

    _balances[owner] -= 1;
    delete _owners[tokenId];
    delete _tokenApprovals[tokenId];

    emit Transfer(owner, address(0), tokenId);
}
```

## 📝 ERC1155 标准详解

### 核心优势

**对比 ERC721：**

```
ERC721：转 10 个道具
├── 需要调用 10 次 transferFrom
├── 消耗 800,000 Gas
└── 耗时且昂贵

ERC1155：转 10 个道具
├── 只需调用 1 次 safeBatchTransferFrom
├── 消耗 100,000 Gas
└── 快速且便宜！
```

### 核心功能

#### 1. 余额管理

```solidity
// tokenId → account → balance
mapping(uint256 => mapping(address => uint256)) private _balances;

function balanceOf(address account, uint256 id)
    public view returns (uint256)
{
    require(account != address(0), "不能查询零地址");
    return _balances[id][account];
}

function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
    public view returns (uint256[] memory)
{
    require(accounts.length == ids.length, "数组长度不匹配");

    uint256[] memory batchBalances = new uint256[](accounts.length);

    for (uint256 i = 0; i < accounts.length; ++i) {
        batchBalances[i] = _balances[ids[i]][accounts[i]];
    }

    return batchBalances;
}
```

#### 2. 铸造代币

```solidity
function mint(address account, uint256 id, uint256 amount) public {
    require(account != address(0), "不能铸造到零地址");

    _balances[id][account] += amount;

    emit TransferSingle(msg.sender, address(0), account, id, amount);
}

function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts
) public {
    require(to != address(0), "不能铸造到零地址");
    require(ids.length == amounts.length, "数组长度不匹配");

    for (uint256 i = 0; i < ids.length; i++) {
        _balances[ids[i]][to] += amounts[i];
    }

    emit TransferBatch(msg.sender, address(0), to, ids, amounts);
}
```

#### 3. 转账功能

```solidity
function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
) public {
    require(
        from == msg.sender || isApprovedForAll(from, msg.sender),
        "无权转账"
    );
    require(to != address(0), "不能转给零地址");
    require(_balances[id][from] >= amount, "余额不足");

    _balances[id][from] -= amount;
    _balances[id][to] += amount;

    emit TransferSingle(msg.sender, from, to, id, amount);

    _doSafeTransferAcceptanceCheck(msg.sender, from, to, id, amount, data);
}
```

#### 4. 批量转账

```solidity
function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
) public {
    require(
        from == msg.sender || isApprovedForAll(from, msg.sender),
        "无权转账"
    );
    require(ids.length == amounts.length, "数组长度不匹配");
    require(to != address(0), "不能转给零地址");

    for (uint256 i = 0; i < ids.length; ++i) {
        uint256 id = ids[i];
        uint256 amount = amounts[i];

        require(_balances[id][from] >= amount, "余额不足");

        _balances[id][from] -= amount;
        _balances[id][to] += amount;
    }

    emit TransferBatch(msg.sender, from, to, ids, amounts);

    _doSafeBatchTransferAcceptanceCheck(
        msg.sender, from, to, ids, amounts, data
    );
}
```

#### 5. 销毁代币

```solidity
function burn(address account, uint256 id, uint256 amount) public {
    require(account != address(0), "不能销毁零地址");
    require(_balances[id][account] >= amount, "销毁数量超过余额");

    _balances[id][account] -= amount;

    emit TransferSingle(msg.sender, account, address(0), id, amount);
}

function burnBatch(
    address account,
    uint256[] memory ids,
    uint256[] memory amounts
) public {
    require(account != address(0), "不能销毁零地址");
    require(ids.length == amounts.length, "数组长度不匹配");

    for (uint256 i = 0; i < ids.length; i++) {
        uint256 id = ids[i];
        uint256 amount = amounts[i];

        require(_balances[id][account] >= amount, "销毁数量超过余额");

        _balances[id][account] -= amount;
    }

    emit TransferBatch(msg.sender, account, address(0), ids, amounts);
}
```

## 💡 实用技巧

### 1. ERC20 授权安全

**问题：授权后无法撤销？**

```solidity
// ❌ 危险：先授权无限额度
approve(uniswap, type(uint256).max);

// 想撤销时，需要设置为零
approve(uniswap, 0);

// 但如果在撤销之前有未完成的交易，可能被抢跑！
```

**解决方案：**
```solidity
// ✅ 使用 increaseAllowance / decreaseAllowance
increaseAllowance(uniswap, amount);

// 撤销时
decreaseAllowance(uniswap, amount);
```

### 2. NFT 元数据

**存储 NFT 的图片和信息：**

```solidity
// ❌ 不要把图片存在链上（太贵）
string public tokenImage;

// ✅ 存储 URI（指向 IPFS 或其他存储）
function tokenURI(uint256 tokenId) public view returns (string memory) {
    return "https://ipfs.io/ipfs/QmHash...";
}
```

**Metadata 格式：**
```json
{
    "name": "My Awesome NFT #1",
    "description": "This is a rare collectible",
    "image": "https://ipfs.io/ipfs/QmHash...",
    "attributes": [
        {
            "trait_type": "Rarity",
            "value": "Legendary"
        },
        {
            "trait_type": "Power",
            "value": 100
        }
    ]
}
```

### 3. 批量操作优化

**ERC1155 批量转账的 Gas 优势：**

```javascript
// ERC721: 转 10 个 NFT
for (let i = 0; i < 10; i++) {
    await nft.transferFrom(from, to, tokenIds[i]);
}
// Gas: ~800,000

// ERC1155: 批量转 10 个道具
await multiToken.safeBatchTransferFrom(
    from,
    to,
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "0x"
);
// Gas: ~100,000（节省 87.5%！）
```

### 4. 代币标准选择清单

```
项目需求检查清单：

□ 是否需要货币功能？
  └─ YES → ERC20

□ 是否需要唯一性（每个都不同）？
  └─ YES → ERC721

□ 是否需要批量操作（10+）？
  └─ YES → ERC1155

□ 是否需要管理多种类型的道具？
  └─ YES → ERC1155

□ Gas 成本是关键考虑因素？
  └─ YES → ERC1155

□ 是否需要广泛的钱包支持？
  └─ YES → ERC20 或 ERC721
```

## ⚠️ 安全注意事项

### 1. 重入攻击防护

```solidity
// ✅ 使用 Checks-Effects-Interactions 模式
function transfer(address recipient, uint256 amount) public {
    // 1. 检查
    require(recipient != address(0), "无效地址");
    require(balanceOf[msg.sender] >= amount, "余额不足");

    // 2. 效果（更新状态）
    balanceOf[msg.sender] -= amount;
    balanceOf[recipient] += amount;

    // 3. 交互（外部调用）
    emit Transfer(msg.sender, recipient, amount);
}
```

### 2. 整数溢出防护

```solidity
// ✅ Solidity 0.8+ 自动检查溢出
balanceOf[recipient] += amount;  // 自动 revert 如果溢出

// ✅ 或者使用 SafeMath（旧版本）
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
using SafeMath for uint256;

balanceOf[recipient] = balanceOf[recipient].add(amount);
```

### 3. 授权陷阱

```solidity
// ❌ 危险：授权给恶意合约
approve(maliciousContract, type(uint256).max);
// 恶意合约可以转走你所有的代币！

// ✅ 安全：只授权需要的数量
approve(contract, exactAmount);

// ✅ 或者使用 OpenZeppelin 的 ERC20Permit
// 签名授权，无需 gas
```

### 4. NFT 安全转账

```solidity
// ❌ 危险：使用普通转账转给合约
nft.transferFrom(myAddress, someContract, tokenId);
// 如果合约不能处理 NFT，代币将永久锁定！

// ✅ 安全：使用安全转账
nft.safeTransferFrom(myAddress, someContract, tokenId);
// 会检查接收合约是否实现了 onERC721Received
```

### 5. 批量操作边界检查

```solidity
// ✅ 检查数组长度
require(accounts.length == ids.length, "数组长度不匹配");

// ✅ 检查单个元素
for (uint256 i = 0; i < accounts.length; i++) {
    require(accounts[i] != address(0), "零地址");
    require(_balances[ids[i]][from] >= amounts[i], "余额不足");
}
```

## 🧪 测试要点

### ERC20 测试清单

1. **基本信息测试**
   - ✅ name、symbol、decimals 正确
   - ✅ totalSupply 初始化正确

2. **转账测试**
   - ✅ 正常转账成功
   - ✅ 余额不足失败
   - ✅ 转账给零地址失败
   - ✅ Transfer 事件正确触发

3. **授权测试**
   - ✅ approve 成功
   - ✅ transferFrom 使用授权额度
   - ✅ 授权额度不足失败
   - ✅ Approval 事件正确触发

4. **额度调整测试**
   - ✅ increaseAllowance 成功
   - ✅ decreaseAllowance 成功
   - ✅ 减少到零以下失败

5. **燃烧测试**
   - ✅ burn 成功
   - ✅ burnFrom 使用授权额度
   - ✅ 燃烧数量超过余额失败

### ERC721 测试清单

1. **铸造测试**
   - ✅ mint 成功
   - ✅ tokenId 自增正确
   - ✅ 铸造到零地址失败

2. **所有权测试**
   - ✅ balanceOf 正确
   - ✅ ownerOf 正确
   - ✅ 不存在的 tokenId 查询失败

3. **授权测试**
   - ✅ approve 成功
   - ✅ setApprovalForAll 成功
   - ✅ isApprovedForAll 正确

4. **转账测试**
   - ✅ transferFrom 成功
   - ✅ safeTransferFrom 成功
   - ✅ 未授权转账失败

5. **销毁测试**
   - ✅ burn 成功
   - ✅ 销毁后余额减少
   - ✅ 销毁后授权清除

### ERC1155 测试清单

1. **余额测试**
   - ✅ balanceOf 正确
   - ✅ balanceOfBatch 正确
   - ✅ 数组长度不匹配失败

2. **铸造测试**
   - ✅ mint 成功
   - ✅ mintBatch 成功
   - ✅ 铸造到零地址失败

3. **转账测试**
   - ✅ safeTransferFrom 成功
   - ✅ safeBatchTransferFrom 成功
   - ✅ 批量转账 Gas 优化明显

4. **授权测试**
   - ✅ setApprovalForAll 成功
   - ✅ isApprovedForAll 正确

5. **销毁测试**
   - ✅ burn 成功
   - ✅ burnBatch 成功
   - ✅ 销毁数量超过余额失败

## 📊 代币对比总结

| 特性 | ERC20 | ERC721 | ERC1155 |
|------|-------|--------|---------|
| **类型** | 同质化 | 非同质化 | 多代币 |
| **唯一性** | ❌ 完全相同 | ✅ 每个 ID 独特 | ⚙️ 按 ID |
| **可分割性** | ✅ 可分割 | ❌ 不可分割 | ⚙️ 按 ID |
| **批量操作** | ❌ 不支持 | ❌ 不支持 | ✅ 原生支持 |
| **Gas 效率** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **钱包支持** | ✅✅✅ | ✅✅✅ | ✅✅ |
| **应用场景** | 货币、治理 | NFT、艺术 | 游戏、票务 |

## 🚀 进阶主题

1. **ERC20 扩展**
   - ERC20Permit - 签名授权
   - ERC20Votes - 投票权
   - ERC20FlashMint - 闪电贷

2. **ERC721 扩展**
   - ERC721Enumerable - 可枚举
   - ERC721Metadata - 元数据
   - ERC721Royalty - 版税

3. **ERC1155 扩展**
   - ERC1155Supply - 总供应量
   - ERC1155MetadataURI - 批量元数据

4. **代币标准发展**
   - ERC-4626 - 代币化金库
   - ERC-3525 - 半可替代代币
   - ERC-4907 - 租赁 NFT

## 📚 参考资源

- [ERC20 标准 (EIP-20)](https://eips.ethereum.org/EIPS/eip-20)
- [ERC721 标准 (EIP-721)](https://eips.ethereum.org/EIPS/eip-721)
- [ERC1155 标准 (EIP-1155)](https://eips.ethereum.org/EIPS/eip-1155)
- [OpenZeppelin 合约库](https://docs.openzeppelin.com/contracts/)
- [OpenZeppelin 向导](https://wizard.openzeppelin.com/)

## 🎓 练习题

### 基础练习

1. **实现 ERC20 代币**
   - 添加 mint 函数（只有 owner 可调用）
   - 添加 pause 功能（暂停转账）
   - 添加黑名单功能

2. **实现 ERC721 NFT**
   - 添加 baseURI 设置
   - 添加批量铸造功能
   - 添加版税功能

3. **实现 ERC1155 多代币**
   - 添加不同类型的道具
   - 实现批量购买
   - 添加道具使用消耗功能

### 进阶练习

1. **NFT 市场合约**
   - 用户可以上架 NFT
   - 支持固定价格和拍卖
   - 收取平台手续费

2. **游戏道具系统**
   - 使用 ERC1155 管理道具
   - 实现道具合成功能
   - 添加装备系统

3. **治理代币系统**
   - 实现 ERC20 投票权
   - 提案和投票机制
   - 时间锁执行

### 挑战练习

1. **全功能 NFT 平台**
   - NFT 铸造
   - 市场交易
   - 版税分配
   - 盲盒机制

2. **DeFi 收益聚合器**
   - ERC20 质押
   - 收益分配
   - 流动性挖矿

## ✅ 总结

代币标准是 Web3 应用的基础：

### ERC20 - 货币之王
- ✅ 简单易用
- ✅ 广泛支持
- ✅ DeFi 基础

### ERC721 - NFT 革命
- ✅ 独一无二
- ✅ 数字所有权
- ✅ 创意经济

### ERC1155 - 效率典范
- ✅ 批量操作
- ✅ Gas 优化
- ✅ 灵活多变

**选择建议：**
- 🪙 发币 → ERC20
- 🎨 NFT → ERC721
- 🎮 游戏 → ERC1155

掌握这些标准，你就可以构建各种 DeFi 应用了！

---

**下一步：** 📘 Lesson 17 - DEX 原理（AMM 自动做市商）

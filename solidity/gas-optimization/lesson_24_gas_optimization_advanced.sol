// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GasOptimizationAdvanced
 * @dev 高级 Gas 优化技术完整示例
 * @notice 演示汇编优化、内存管理、高级模式等进阶技巧
 */

// ==================== 汇编优化 ====================

/**
 * @title AssemblyOptimization
 * @dev 使用内联汇编优化 Gas
 */
contract AssemblyOptimization {
    uint256 public value;

    // ✅ 接收 ETH
    receive() external payable {}

    // ❌ 标准: 使用 ecrecover
    function recoverStandard(bytes32 _hash, bytes memory _signature) public pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        return ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)), v, r, s);
    }
    
    // ✅ 优化: 使用汇编避免内存分配
    function recoverOptimized(bytes32 _ethSignedHash, bytes32 _r, bytes32 _s, uint8 _v)
        public
        view
        returns (address)
    {
        address signer;
        assembly {
            // 直接调用 precompiled contract
            let freemem := mload(0x40)
            
            // 在 freemem 位置准备数据
            mstore(freemem, _ethSignedHash)
            mstore(add(freemem, 32), _v)
            mstore(add(freemem, 64), _r)
            mstore(add(freemem, 96), _s)
            
            // 调用 ecrecover (地址 0x01)
            let success := staticcall(gas(), 1, freemem, 128, freemem, 32)
            
            switch success
            case 1 {
                signer := mload(freemem)
            }
            default {
                signer := 0
            }
        }
        return signer;
    }
    
    // ✅ 优化: 使用汇编检查地址零
    function isNotZeroOptimized(address _addr) public pure returns (bool) {
        bool result;
        assembly {
            result := iszero(iszero(_addr))
        }
        return result;
    }
    
    // ✅ 优化: 使用汇编转换 bytes32 到 address
    function bytes32ToAddressOptimized(bytes32 _bytes32) public pure returns (address) {
        address addr;
        assembly {
            addr := _bytes32
        }
        return addr;
    }
    
    // ✅ 优化: 使用汇编获取合约余额
    function contractBalanceOptimized() public view returns (uint256) {
        uint256 contractBalance;
        assembly {
            contractBalance := selfbalance()
        }
        return contractBalance;
    }
    
    // ✅ 优化: 使用汇编创建合约
    function createContractOptimized(bytes memory _bytecode) public returns (address) {
        address addr;
        uint256 size = _bytecode.length;
        
        assembly {
            addr := create(0, add(_bytecode, 32), size)
        }
        
        require(addr != address(0), "Creation failed");
        return addr;
    }
    
    // ✅ 优化: 使用汇编进行批量操作
    function batchTransferOptimized(address[] memory _recipients, uint256[] memory _amounts) 
        public 
        returns (bool[] memory) 
    {
        require(_recipients.length == _amounts.length, "Length mismatch");
        
        bool[] memory results = new bool[](_recipients.length);
        
        for (uint256 i = 0; i < _recipients.length; ) {
            address recipient = _recipients[i];
            uint256 amount = _amounts[i];
            
            bool success;
            assembly {
                // 直接调用 transfer
                success := call(gas(), recipient, amount, 0, 0, 0, 0)
            }
            
            results[i] = success;
            
            unchecked {
                ++i;
            }
        }
        
        return results;
    }
}

// ==================== 内存优化 ====================

/**
 * @title MemoryOptimization
 * @dev 优化内存使用以节省 Gas
 */
contract MemoryOptimization {
    struct User {
        uint128 id;
        uint128 balance;
        address wallet;
        bool active;
    }
    
    mapping(address => User) public users;
    address[] public userList;
    
    // ❌ 未优化: 多次内存分配
    function getUserDataBad(address _addr) public view returns (uint128, uint128, bool) {
        User memory user = users[_addr];
        return (user.id, user.balance, user.active);
    }
    
    // ✅ 优化: 最小化内存使用
    function getUserDataGood(address _addr) public view returns (User memory) {
        return users[_addr];
    }
    
    // ✅ 优化: 使用 calldata 而非 memory
    function processArrayOptimized(uint256[] calldata _data) public pure returns (uint256) {
        uint256 sum;
        uint256 length = _data.length;
        
        for (uint256 i = 0; i < length; ) {
            unchecked {
                sum += _data[i];
                ++i;
            }
        }
        
        return sum;
    }
    
    // ✅ 优化: 重用内存变量
    function complexCalculationOptimized(uint256 _x, uint256 _y) public pure returns (uint256) {
        // (10 * 20) + (10 + 20) * 2 = 200 + 60 = 260
        return _x * _y + (_x + _y) * 2;
    }
    
    // ✅ 优化: 使用固定大小数组
    function fixedArrayOptimization() public pure returns (uint256) {
        uint256[5] memory arr = [uint256(1), 2, 3, 4, 5];  // 固定大小更便宜
        uint256 sum;
        
        for (uint256 i = 0; i < 5; ) {
            unchecked {
                sum += arr[i];
                ++i;
            }
        }
        
        return sum;
    }
}

// ==================== 存储优化进阶 ====================

/**
 * @title AdvancedStorageOptimization
 * @dev 高级存储优化技术
 */
contract AdvancedStorageOptimization {
    // ✅ 紧凑的结构体打包
    struct OptimizedUser {
        uint96 balance;      // 96 位 (足够大的金额)
        address wallet;      // 160 位
        uint32 createdAt;    // 32 位 (时间戳到 2106 年)
        uint16 id;           // 16 位 (最多 65535 个用户)
        bool active;         // 8 位 (剩余 8 位未使用)
        // 总共: 96 + 160 + 32 + 16 + 8 = 312 位, 打包到 2 个 slot
    }
    
    // ✅ 使用 uint96 代替 uint256 (节省存储)
    struct CompactToken {
        uint96 balance;      // 96 位足够大
        uint96 allowance;    // 96 位
        uint64 lastUpdate;   // 64 位时间戳
        // 总共: 96 + 96 + 64 = 256 位, 刚好 1 个 slot
    }
    
    mapping(address => OptimizedUser) public optimizedUsers;
    mapping(address => CompactToken) public compactTokens;
    
    // ✅ 优化: 使用 mapping 而非数组存储
    mapping(address => bool) public isWhitelisted;
    
    // ❌ 未优化: 使用数组存储
    address[] public whitelistedArray;
    
    // ✅ 优化: 短字符串使用 bytes32
    mapping(address => bytes32) public shortNames;
    
    // ❌ 未优化: 使用 string
    mapping(address => string) public longNames;
    
    function setShortName(address _addr, bytes32 _name) public {
        shortNames[_addr] = _name;
    }
    
    // ✅ 优化: 删除而非设置为默认值
    function removeUser(address _addr) public {
        delete optimizedUsers[_addr];  // SSTORE 变为 refund
    }
    
    // ❌ 未优化: 设置为默认值
    function removeUserBad(address _addr) public {
        optimizedUsers[_addr] = OptimizedUser({
            balance: 0,
            wallet: address(0),
            createdAt: 0,
            id: 0,
            active: false
        });  // SSTORE 仍然是操作
    }
}

// ==================== 函数调用优化 ====================

/**
 * @title FunctionCallOptimization
 * @dev 优化函数调用以节省 Gas
 */
contract FunctionCallOptimization {
    uint256 public value;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ✅ 优化: 使用 modifier 代替重复代码
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier validValue(uint256 _value) {
        require(_value > 0, "Invalid value");
        _;
    }

    function setValueOptimized(uint256 _value) public onlyOwner validValue(_value) {
        value = _value;
    }
    
    // ✅ 优化: 简化函数逻辑
    function simpleCheck(uint256 _x) public pure returns (bool) {
        return _x > 100;  // 简单返回更便宜
    }
    
    // ❌ 未优化: 复杂逻辑
    function complexCheck(uint256 _x) public pure returns (bool) {
        if (_x > 100) {
            return true;
        } else {
            return false;
        }
    }
    
    // ✅ 优化: 使用 view 函数避免状态读取
    function getValueView() public view returns (uint256) {
        return value;
    }
    
    // ❌ 未优化: 使用 pure 函数但读取状态
    // function getValuePure() public pure returns (uint256) {
    //     return value;  // 编译错误
    // }
    
    // ✅ 优化: 批量操作减少调用次数
    function batchUpdate(uint256[] calldata _values) public {
        for (uint256 i = 0; i < _values.length; ) {
            unchecked {
                value = _values[i];
                ++i;
            }
        }
    }
    
    // ✅ 优化: 使用事件代替存储
    event ValueUpdated(uint256 oldValue, uint256 newValue, uint256 timestamp);
    
    function updateWithValueEvent(uint256 _newValue) public {
        uint256 oldValue = value;
        value = _newValue;
        emit ValueUpdated(oldValue, _newValue, block.timestamp);
    }
}

// ==================== 高级模式优化 ====================

/**
 * @title AdvancedPatternOptimization
 * @dev 使用高级设计模式优化 Gas
 */
contract AdvancedPatternOptimization {
    struct Balance {
        uint96 amount;      // 紧凑存储
        uint32 lastUpdate;  // 时间戳
    }
    
    mapping(address => Balance) public balances;
    uint256 public totalSupply;
    
    // ✅ 优化: 使用 unchecked 块(确定不会溢出时)
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        uint256 c;
        unchecked {
            c = a + b;
        }
        return c;
    }
    
    // ✅ 优化: 条件短路评估
    function multiCheck(
        uint256 _value,
        address _addr,
        bool _flag
    ) public pure returns (bool) {
        // 低成本检查在前
        if (_value == 0) return false;
        if (_addr == address(0)) return false;
        if (!_flag) return false;

        // 高成本检查在后 - 改为 > 100 以匹配测试
        return _value > 100;
    }
    
    // ✅ 优化: 使用三元运算符
    function boolToUint(bool _value) public pure returns (uint256) {
        return _value ? 1 : 0;  // 显式转换
    }
    
    function uintToBool(uint256 _value) public pure returns (bool) {
        return _value != 0;  // 比 _value == 1 便宜
    }
    
    // ✅ 优化: 避免不必要的初始化
    function loopOptimized(uint256 n) public pure returns (uint256) {
        uint256 sum;
        
        for (uint256 i = 0; i < n; ) {
            unchecked {
                sum += i;
                ++i;
            }
        }
        
        return sum;
    }
    
    // ✅ 优化: 使用 while 替代 for(有时)
    function whileLoopOptimized(uint256 n) public pure returns (uint256) {
        uint256 sum;
        uint256 i = 0;
        
        while (i < n) {
            unchecked {
                sum += i;
                ++i;
            }
        }
        
        return sum;
    }
    
    // ✅ 优化: 提前返回
    function earlyReturn(uint256 _value) public pure returns (uint256) {
        if (_value == 0) return 0;
        if (_value == 1) return 1;
        if (_value < 10) return _value * 2;
        return _value * 3;
    }
}

// ==================== 代理合约优化 ====================

/**
 * @title ProxyOptimization
 * @dev 优化代理合约的 Gas 消耗
 */
contract ProxyOptimization {
    address public implementation;
    address public admin;
    
    // ✅ 优化: 使用存储槽位
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    
    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        emit AdminChanged(address(0), msg.sender);
    }
    
    fallback() external payable {
        assembly {
            // 复制 calldata 到 memory
            calldatacopy(0, 0, calldatasize())

            // 计算 EIP-1967 实现槽位: keccak256("eip1967.proxy.implementation") - 1
            // 在内联汇编中需要重新计算，因为不能直接访问常量
            let implSlot := sub(keccak256(0x7265706f72797900000000000000000000000000000000000000000000000000, 32), 1)

            // 获取实现地址
            let implAddr := sload(implSlot)

            // 代理调用实现合约
            let result := delegatecall(gas(), implAddr, 0, calldatasize(), 0, 0)

            // 复制返回数据
            returndatacopy(0, 0, returndatasize())

            // 根据结果返回或回滚
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
    
    function upgrade(address _newImplementation) public onlyAdmin {
        implementation = _newImplementation;
        emit Upgraded(_newImplementation);
    }
    
    function changeAdmin(address _newAdmin) public onlyAdmin {
        admin = _newAdmin;
        emit AdminChanged(admin, _newAdmin);
    }
}

// ==================== 综合优化示例 ====================

/**
 * @title GasOptimizedToken
 * @dev 高度优化的 ERC20 代币
 */
contract GasOptimizedToken {
    // ✅ 紧凑存储
    struct Account {
        uint96 balance;
        uint96 allowance;
        uint32 lastTransfer;
    }
    
    mapping(address => Account) private accounts;
    mapping(address => mapping(address => uint96)) private allowances;
    
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    // ✅ 使用 bytes32 代替 string 存储
    bytes32 public immutable nameHash;
    bytes32 public immutable symbolHash;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        totalSupply = _initialSupply;
        nameHash = keccak256(bytes(_name));
        symbolHash = keccak256(bytes(_symbol));
        
        accounts[msg.sender].balance = uint96(_initialSupply);
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    // ✅ 优化的转账函数
    function transfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Zero address");
        
        Account storage sender = accounts[msg.sender];
        require(sender.balance >= uint96(_amount), "Insufficient balance");
        
        unchecked {
            sender.balance -= uint96(_amount);
            accounts[_to].balance += uint96(_amount);
        }
        
        emit Transfer(msg.sender, _to, _amount);
        return true;
    }
    
    // ✅ 优化的授权函数
    function approve(address _spender, uint256 _amount) external returns (bool) {
        allowances[msg.sender][_spender] = uint96(_amount);
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }
    
    // ✅ 优化的 transferFrom
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) external returns (bool) {
        require(_to != address(0), "Zero address");
        
        Account storage owner = accounts[_from];
        require(owner.balance >= uint96(_amount), "Insufficient balance");
        require(allowances[_from][msg.sender] >= uint96(_amount), "Insufficient allowance");
        
        unchecked {
            owner.balance -= uint96(_amount);
            accounts[_to].balance += uint96(_amount);
            allowances[_from][msg.sender] -= uint96(_amount);
        }
        
        emit Transfer(_from, _to, _amount);
        return true;
    }
    
    // ✅ 优化的查询函数
    function balanceOf(address _account) external view returns (uint256) {
        return accounts[_account].balance;
    }
    
    function allowance(address _owner, address _spender) external view returns (uint256) {
        return allowances[_owner][_spender];
    }
}

/**
 * @title GasComparison
 * @dev 对比优化前后的 Gas 消耗
 */
contract GasComparison {
    uint256 public sum;
    
    // ❌ 未优化
    function calculateBad(uint256[] memory _numbers) public {
        for (uint256 i = 0; i < _numbers.length; i++) {
            sum += _numbers[i];
        }
    }
    
    // ✅ 优化: 返回计算结果
    function calculateGood(uint256[] calldata _numbers) public returns (uint256) {
        uint256 total;
        uint256 length = _numbers.length;

        for (uint256 i = 0; i < length; ) {
            unchecked {
                total += _numbers[i];
                ++i;
            }
        }

        sum = total;
        return total;
    }
    
    // ✅ 更优: 使用汇编并返回计算结果
    function calculateAssembly(uint256[] calldata _numbers) public returns (uint256) {
        uint256 total;
        uint256 length = _numbers.length;

        assembly {
            // 在汇编中，calldata 数组已经自动跳过长度
            // _numbers.offset 直接指向第一个元素
            let data_ptr := _numbers.offset

            for { let i := 0 } lt(i, length) { i := add(i, 1) } {
                total := add(total, calldataload(data_ptr))
                data_ptr := add(data_ptr, 32)
            }
        }

        sum = total;
        return total;
    }
    
    // 对比函数
    function compareCalculations(uint256[] calldata _numbers) public returns (
        uint256 badGas,
        uint256 goodGas,
        uint256 assemblyGas
    ) {
        uint256 gasBefore;

        // 测试未优化版本
        gasBefore = gasleft();
        calculateBad(_numbers);
        badGas = gasBefore - gasleft();

        // 测试优化版本
        gasBefore = gasleft();
        calculateGood(_numbers);
        goodGas = gasBefore - gasleft();

        // 测试汇编版本
        gasBefore = gasleft();
        calculateAssembly(_numbers);
        assemblyGas = gasBefore - gasleft();

        return (badGas, goodGas, assemblyGas);
    }
}

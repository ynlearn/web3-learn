// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FactoryPattern
 * @dev 工厂模式完整示例
 * @notice 演示工厂合约、CREATE2 操作码、克隆工厂等
 */

// ==================== 基础工厂模式 ====================

/**
 * @title Product
 * @dev 产品合约(被工厂创建)
 */
contract Product {
    address public owner;
    uint256 public id;
    string public name;
    uint256 public createdAt;

    event ProductCreated(address indexed creator, uint256 indexed id, string name);

    constructor(uint256 _id, string memory _name) {
        owner = msg.sender;
        id = _id;
        name = _name;
        createdAt = block.timestamp;

        emit ProductCreated(msg.sender, _id, _name);
    }

    function updateName(string memory _newName) public {
        require(msg.sender == owner, "Not owner");
        name = _newName;
    }

    function getInfo() public view returns (
        address _owner,
        uint256 _id,
        string memory _name,
        uint256 _createdAt
    ) {
        return (owner, id, name, createdAt);
    }
}

/**
 * @title BasicFactory
 * @dev 基础工厂合约
 */
contract BasicFactory {
    address[] public products;
    mapping(address => bool) public isProduct;

    event ProductDeployed(address indexed product, address indexed creator, uint256 id);

    /**
     * @dev 创建新产品
     */
    function createProduct(uint256 _id, string memory _name) public returns (address) {
        Product product = new Product(_id, _name);

        products.push(address(product));
        isProduct[address(product)] = true;

        emit ProductDeployed(address(product), msg.sender, _id);

        return address(product);
    }

    /**
     * @dev 批量创建产品
     */
    function batchCreateProducts(uint256[] memory _ids, string[] memory _names) public returns (address[] memory) {
        require(_ids.length == _names.length, "Arrays length mismatch");
        require(_ids.length > 0 && _ids.length <= 50, "Invalid batch size");

        address[] memory deployedAddresses = new address[](_ids.length);

        for (uint256 i = 0; i < _ids.length; i++) {
            Product product = new Product(_ids[i], _names[i]);
            deployedAddresses[i] = address(product);
            products.push(address(product));
            isProduct[address(product)] = true;

            emit ProductDeployed(address(product), msg.sender, _ids[i]);
        }

        return deployedAddresses;
    }

    /**
     * @dev 获取所有产品地址
     */
    function getAllProducts() public view returns (address[] memory) {
        return products;
    }

    /**
     * @dev 获取产品数量
     */
    function getProductCount() public view returns (uint256) {
        return products.length;
    }
}

// ==================== CREATE2 工厂 ====================

/**
 * @title CREATE2Factory
 * @dev 使用 CREATE2 操作码的确定性工厂
 * @notice CREATE2 允许预测合约地址
 */
contract CREATE2Factory {
    address[] public deployedContracts;

    event ContractDeployed(address indexed contractAddr, bytes32 indexed salt);

    /**
     * @dev 使用 CREATE2 部署合约
     * @param bytecode 合约字节码
     * @param salt 盐值(用于生成唯一地址)
     */
    function deploy(bytes memory bytecode, bytes32 salt) public returns (address) {
        address addr;

        assembly {
            // create2(value, offset, length, salt)
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)

            // 如果部署失败,返回空地址
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        deployedContracts.push(addr);

        emit ContractDeployed(addr, salt);

        return addr;
    }

    /**
     * @dev 计算预期地址
     * @param deployer 工厂合约地址
     * @param bytecode 合约字节码
     * @param salt 盐值
     */
    function getAddress(
        address deployer,
        bytes memory bytecode,
        bytes32 salt
    ) public pure returns (address) {
        // Extract the actual bytecode data (skip Solidity memory layout prefix)
        // In Solidity, bytes memory is stored as: [length (32 bytes)][data (variable)]
        // We need to hash only the data part, not the length prefix
        bytes32 bytecodeHash;
        assembly {
            // Get pointer to data (skip first 32 bytes which is the length)
            let dataPtr := add(bytecode, 0x20)
            // Get length from first 32 bytes
            let length := mload(bytecode)
            // Hash the bytecode data
            bytecodeHash := keccak256(dataPtr, length)
        }

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff), // CREATE2 前缀
                deployer,
                salt,
                bytecodeHash
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @dev 检查地址是否已部署
     */
    function isDeployed(address _addr) public view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }
}

/**
 * @title DeterministicContract
 * @dev 确定性部署的合约
 */
contract DeterministicContract {
    address public factory;
    address public creator;
    uint256 public value;

    constructor(uint256 _value) {
        factory = msg.sender;
        creator = tx.origin;
        value = _value;
    }
}

/**
 * @title DeterministicFactory
 * @dev 确定性工厂示例
 */
contract DeterministicFactory {
    mapping(bytes32 => address) public deployedAddresses;

    /**
     * @dev 确定性部署
     */
    function deployDeterministic(uint256 _value, bytes32 salt) public returns (address) {
        // 获取合约字节码
        bytes memory bytecode = type(DeterministicContract).creationCode;

        // 编码构造函数参数
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, abi.encode(_value));

        // 计算预期地址
        address predictedAddress = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecodeWithArgs)
        )))));

        // 检查是否已部署
        require(deployedAddresses[salt] == address(0), "Already deployed");

        // 部署合约
        DeterministicContract contractAddr;
        assembly {
            contractAddr := create2(0, add(bytecodeWithArgs, 0x20), mload(bytecodeWithArgs), salt)
        }

        require(address(contractAddr) != address(0), "Deployment failed");
        require(address(contractAddr) == predictedAddress, "Address mismatch");

        deployedAddresses[salt] = address(contractAddr);

        return address(contractAddr);
    }

    /**
     * @dev 预测合约地址
     */
    function predictAddress(uint256 _value, bytes32 salt) public view returns (address) {
        bytes memory bytecode = type(DeterministicContract).creationCode;
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, abi.encode(_value));

        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecodeWithArgs)
        )))));
    }

    /**
     * @dev 检查地址是否已部署
     */
    function isDeployed(address _addr) public view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }
}

// ==================== 克隆工厂(EIP-1167) ====================

/**
 * @title MinimalCloneFactory
 * @dev 最小代理合约工厂(EIP-1167)
 * @notice 克隆是最节省 Gas 的创建合约方式
 */
contract MinimalCloneFactory {
    address[] public clones;

    event CloneCreated(address indexed clone, address indexed target);

    /**
     * @dev 创建克隆合约
     * @param target 要克隆的目标合约
     */
    function createClone(address target) public returns (address result) {
        // EIP-1167 最小代理合约标准实现
        // Init code (10 bytes): 3d602d80600a3d3981f3
        // Runtime code (45 bytes): 363d3d373d3d3d363d73 + 20-byte address + 5af43d82803e903d91602b57fd5bf3
        bytes20 targetBytes = bytes20(target);
        assembly {
            let ptr := mload(0x40)

            // Init code at position 0 (10 bytes)
            mstore8(ptr, 0x3d)
            mstore8(add(ptr, 1), 0x60)
            mstore8(add(ptr, 2), 0x2d)
            mstore8(add(ptr, 3), 0x80)
            mstore8(add(ptr, 4), 0x60)
            mstore8(add(ptr, 5), 0x0a)
            mstore8(add(ptr, 6), 0x3d)
            mstore8(add(ptr, 7), 0x39)
            mstore8(add(ptr, 8), 0x81)
            mstore8(add(ptr, 9), 0xf3)

            // Runtime code at position 10
            // First 10 bytes: 363d3d373d3d3d363d73
            mstore8(add(ptr, 10), 0x36)
            mstore8(add(ptr, 11), 0x3d)
            mstore8(add(ptr, 12), 0x3d)
            mstore8(add(ptr, 13), 0x37)
            mstore8(add(ptr, 14), 0x3d)
            mstore8(add(ptr, 15), 0x3d)
            mstore8(add(ptr, 16), 0x3d)
            mstore8(add(ptr, 17), 0x36)
            mstore8(add(ptr, 18), 0x3d)
            mstore8(add(ptr, 19), 0x73)

            // 20-byte address at position 20 (correct order - most significant byte first)
            mstore8(add(ptr, 20), byte(0, targetBytes))
            mstore8(add(ptr, 21), byte(1, targetBytes))
            mstore8(add(ptr, 22), byte(2, targetBytes))
            mstore8(add(ptr, 23), byte(3, targetBytes))
            mstore8(add(ptr, 24), byte(4, targetBytes))
            mstore8(add(ptr, 25), byte(5, targetBytes))
            mstore8(add(ptr, 26), byte(6, targetBytes))
            mstore8(add(ptr, 27), byte(7, targetBytes))
            mstore8(add(ptr, 28), byte(8, targetBytes))
            mstore8(add(ptr, 29), byte(9, targetBytes))
            mstore8(add(ptr, 30), byte(10, targetBytes))
            mstore8(add(ptr, 31), byte(11, targetBytes))
            mstore8(add(ptr, 32), byte(12, targetBytes))
            mstore8(add(ptr, 33), byte(13, targetBytes))
            mstore8(add(ptr, 34), byte(14, targetBytes))
            mstore8(add(ptr, 35), byte(15, targetBytes))
            mstore8(add(ptr, 36), byte(16, targetBytes))
            mstore8(add(ptr, 37), byte(17, targetBytes))
            mstore8(add(ptr, 38), byte(18, targetBytes))
            mstore8(add(ptr, 39), byte(19, targetBytes))

            // Last 14 bytes: 5af43d82803e903d91602b57fd5bf3
            mstore8(add(ptr, 40), 0x5a)
            mstore8(add(ptr, 41), 0xf4)
            mstore8(add(ptr, 42), 0x3d)
            mstore8(add(ptr, 43), 0x82)
            mstore8(add(ptr, 44), 0x80)
            mstore8(add(ptr, 45), 0x3e)
            mstore8(add(ptr, 46), 0x90)
            mstore8(add(ptr, 47), 0x3d)
            mstore8(add(ptr, 48), 0x91)
            mstore8(add(ptr, 49), 0x60)
            mstore8(add(ptr, 50), 0x2b)
            mstore8(add(ptr, 51), 0x57)
            mstore8(add(ptr, 52), 0xfd)
            mstore8(add(ptr, 53), 0x5b)
            mstore8(add(ptr, 54), 0xf3)

            result := create(0, ptr, 55) // 10 init + 45 runtime = 55 bytes

            // 检查是否成功
            switch extcodesize(result)
            case 0 {
                revert(0, 0)
            }
        }

        clones.push(result);
        emit CloneCreated(result, target);
        return result;
    }

    /**
     * @dev 批量创建克隆
     */
    function batchCreateClones(address target, uint256 count) external returns (address[] memory) {
        address[] memory results = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            results[i] = createClone(target);
            // Don't push again - createClone already pushes to clones array
        }

        return results;
    }

    /**
     * @dev 预测克隆地址
     */
    function predictCloneAddress(address target, address deployer, uint256 nonce) public pure returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xd6), // 0xd6 = 0xd0 + 0x06 (RLP + type)
                bytes1(0x94),
                deployer,
                nonce
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @dev 检查是否为克隆合约
     */
    function isClone(address target, address query) public view returns (bool result) {
        bytes20 targetBytes = bytes20(target);

        assembly {
            // First check if query has code (EOAs have no code)
            let queryCodeSize := extcodesize(query)

            // EIP-1167 runtime code is exactly 45 bytes
            // If query's code is not exactly 45 bytes, it's not a minimal proxy clone
            switch queryCodeSize
            case 0 {
                result := 0
            }
            case 45 {
                let clone := mload(0x40)

            // EIP-1167 runtime code is 45 bytes
            // Bytes 0-9:   363d3d373d3d3d363d
            // Bytes 10-29: [20 bytes address]
            // Bytes 30-44: 5af43d82803e903d91602b57fd5bf3

            // Bytes 0-9
            mstore8(clone, 0x36)
            mstore8(add(clone, 1), 0x3d)
            mstore8(add(clone, 2), 0x3d)
            mstore8(add(clone, 3), 0x37)
            mstore8(add(clone, 4), 0x3d)
            mstore8(add(clone, 5), 0x3d)
            mstore8(add(clone, 6), 0x3d)
            mstore8(add(clone, 7), 0x36)
            mstore8(add(clone, 8), 0x3d)
            mstore8(add(clone, 9), 0x73)

            // Bytes 10-29: Address (20 bytes) - correct order
            mstore8(add(clone, 10), byte(0, targetBytes))
            mstore8(add(clone, 11), byte(1, targetBytes))
            mstore8(add(clone, 12), byte(2, targetBytes))
            mstore8(add(clone, 13), byte(3, targetBytes))
            mstore8(add(clone, 14), byte(4, targetBytes))
            mstore8(add(clone, 15), byte(5, targetBytes))
            mstore8(add(clone, 16), byte(6, targetBytes))
            mstore8(add(clone, 17), byte(7, targetBytes))
            mstore8(add(clone, 18), byte(8, targetBytes))
            mstore8(add(clone, 19), byte(9, targetBytes))
            mstore8(add(clone, 20), byte(10, targetBytes))
            mstore8(add(clone, 21), byte(11, targetBytes))
            mstore8(add(clone, 22), byte(12, targetBytes))
            mstore8(add(clone, 23), byte(13, targetBytes))
            mstore8(add(clone, 24), byte(14, targetBytes))
            mstore8(add(clone, 25), byte(15, targetBytes))
            mstore8(add(clone, 26), byte(16, targetBytes))
            mstore8(add(clone, 27), byte(17, targetBytes))
            mstore8(add(clone, 28), byte(18, targetBytes))
            mstore8(add(clone, 29), byte(19, targetBytes))

            // Bytes 30-44: Delegate code (15 bytes)
            mstore8(add(clone, 30), 0x5a)
            mstore8(add(clone, 31), 0xf4)
            mstore8(add(clone, 32), 0x3d)
            mstore8(add(clone, 33), 0x82)
            mstore8(add(clone, 34), 0x80)
            mstore8(add(clone, 35), 0x3e)
            mstore8(add(clone, 36), 0x90)
            mstore8(add(clone, 37), 0x3d)
            mstore8(add(clone, 38), 0x91)
            mstore8(add(clone, 39), 0x60)
            mstore8(add(clone, 40), 0x2b)
            mstore8(add(clone, 41), 0x57)
            mstore8(add(clone, 42), 0xfd)
            mstore8(add(clone, 43), 0x5b)
            mstore8(add(clone, 44), 0xf3)

            // 读取查询地址的代码 (45 bytes)
            let other := mload(0x40)
            extcodecopy(query, other, 0, 45)

            // 比较代码
            result := eq(
                keccak256(clone, 45),
                keccak256(other, 45)
            )
            }
            default {
                result := 0
            }
        }
    }

    /**
     * @dev 获取所有克隆地址
     */
    function getAllClones() public view returns (address[] memory) {
        return clones;
    }

    /**
     * @dev 获取克隆数量
     */
    function getCloneCount() public view returns (uint256) {
        return clones.length;
    }
}

/**
 * @title CloneImplementation
 * @dev 可克隆的实现合约
 */
contract CloneImplementation {
    address public owner;
    uint256 public value;
    string public name;

    event Initialized(address indexed owner, string name);
    event ValueUpdated(uint256 oldValue, uint256 newValue);

    /**
     * @dev 初始化函数(代替构造函数)
     * @notice 克隆合约不能使用构造函数
     */
    function initialize(string memory _name, uint256 _value) external {
        require(owner == address(0), "Already initialized");

        owner = msg.sender;
        name = _name;
        value = _value;

        emit Initialized(msg.sender, _name);
    }

    /**
     * @dev 更新值
     */
    function setValue(uint256 _newValue) external {
        require(msg.sender == owner, "Not owner");

        uint256 oldValue = value;
        value = _newValue;

        emit ValueUpdated(oldValue, _newValue);
    }

    /**
     * @dev 获取信息
     */
    function getInfo() external view returns (
        address _owner,
        uint256 _value,
        string memory _name
    ) {
        return (owner, value, name);
    }

    /**
     * @dev 销毁克隆
     */
    function destroy() external {
        require(msg.sender == owner, "Not owner");
        selfdestruct(payable(owner));
    }
}

/**
 * @title CloneFactoryExample
 * @dev 克隆工厂使用示例
 */
contract CloneFactoryExample is MinimalCloneFactory {
    address public implementation;

    constructor(address _implementation) {
        implementation = _implementation;
    }

    /**
     * @dev 创建并初始化克隆
     */
    function createAndInitializeClone(
        string memory _name,
        uint256 _value
    ) external returns (address) {
        address clone = createClone(implementation);

        // 初始化克隆
        CloneImplementation(clone).initialize(_name, _value);

        return clone;
    }

    /**
     * @dev 批量创建并初始化克隆
     */
    function batchCreateAndInitializeClones(
        string[] memory _names,
        uint256[] memory _values
    ) external returns (address[] memory) {
        require(_names.length == _values.length, "Arrays length mismatch");

        address[] memory clones = new address[](_names.length);

        for (uint256 i = 0; i < _names.length; i++) {
            clones[i] = createClone(implementation);
            CloneImplementation(clones[i]).initialize(_names[i], _values[i]);
        }

        return clones;
    }
}

// ==================== 元事务工厂 ====================

/**
 * @title MetaTransactionFactory
 * @dev 支持元交易(代付Gas)的工厂
 */
contract MetaTransactionFactory {
    mapping(address => uint256) public nonces;

    /**
     * @dev 获取 nonce
     */
    function getNonce(address _sender) public view returns (uint256) {
        return nonces[_sender];
    }

    /**
     * @dev 增加 nonce
     */
    function incrementNonce(address _sender) internal {
        nonces[_sender]++;
    }

    /**
     * @dev 执行元交易
     */
    function executeMetaTransaction(
        address _sender,
        bytes memory _func,
        bytes32 _r,
        bytes32 _s,
        uint8 _v
    ) public returns (bool) {
        // 恢复签名者地址
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(_sender, getNonce(_sender), this, _func))
            )
        );

        address recoveredAddress = recoverSigner(ethSignedMessageHash, _v, _r, _s);

        require(recoveredAddress == _sender, "Invalid signature");

        // 增加 nonce
        incrementNonce(_sender);

        // 执行函数调用
        (bool success, ) = address(this).call(_func);
        require(success, "Execution failed");

        return true;
    }

    /**
     * @dev 恢复签名者地址
     */
    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) internal pure returns (address) {
        bytes32 r = _r;
        bytes32 s = _s;
        uint8 v = _v;

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert("Invalid signature");
        }

        if (v < 27) v += 27;

        if (v != 27 && v != 28) revert("Invalid signature");

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
}

// ==================== 工厂模式对比 ====================

/**
 * @title FactoryComparison
 * @dev 工厂模式对比合约
 */
contract FactoryComparison {
    // CREATE vs CREATE2 vs Clone 的对比

    /**
     * @dev CREATE - 传统创建
     * @notice 地址取决于部署者地址和 nonce
     */
    function createWithCreate() external returns (address) {
        Product product = new Product(1, "Product");
        return address(product);
    }

    /**
     * @dev CREATE2 - 确定性创建
     * @notice 地址取决于部署者、salt 和字节码
     */
    function createWithCREATE2(bytes memory bytecode, bytes32 salt) external returns (address) {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        return addr;
    }

    /**
     * @dev Clone - 克隆创建
     * @notice 最节省 Gas,但需要实现合约
     */
    function createWithClone(address target) external returns (address) {
        MinimalCloneFactory factory = new MinimalCloneFactory();
        return factory.createClone(target);
    }

    /**
     * @dev 对比 Gas 成本
     * @notice 通常: Clone << CREATE2 < CREATE
     */
    function compareGasCosts(
        bytes memory bytecode,
        bytes32 salt,
        address target
    ) external returns (
        uint256 createGas,
        uint256 create2Gas,
        uint256 cloneGas
    ) {
        uint256 gasBefore = gasleft();
        Product product = new Product(1, "Product");
        createGas = gasBefore - gasleft();

        gasBefore = gasleft();
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        create2Gas = gasBefore - gasleft();

        gasBefore = gasleft();
        MinimalCloneFactory factory = new MinimalCloneFactory();
        factory.createClone(target);
        cloneGas = gasBefore - gasleft();
    }
}

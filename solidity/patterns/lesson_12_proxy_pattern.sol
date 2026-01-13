// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProxyPattern
 * @dev 代理模式完整示例
 * @notice 演示 Transparent Proxy、UUPS、Beacon Proxy 等代理模式
 */

// ==================== 基础代理模式 ====================

/**
 * @title StorageSlot
 * @dev 存储槽位工具
 * @notice 代理合约使用特定槽位存储数据以避免冲突
 */
library StorageSlot {
    bytes32 internal constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 internal constant ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    bytes32 internal constant BEACON_SLOT = bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1);

    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage result) {
        assembly {
            result.slot := slot
        }
    }

    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage result) {
        assembly {
            result.slot := slot
        }
    }

    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage result) {
        assembly {
            result.slot := slot
        }
    }
}

/**
 * @title TransparentUpgradeableProxy
 * @dev 透明可升级代理合约
 * @notice 管理员调用总是路由到代理逻辑,用户调用路由到实现合约
 */
contract TransparentUpgradeableProxy {
    using StorageSlot for *;

    /**
     * @dev 构造函数
     * @param _logic 初始实现合约地址
     * @param _admin 代理管理员地址
     * @param _data 初始化调用数据
     */
    constructor(address _logic, address _admin, bytes memory _data) payable {
        require(_logic.isContract(), "Logic not contract");
        require(_admin != address(0), "Admin is zero");

        _setImplementation(_logic);
        _setAdmin(_admin);

        if (_data.length > 0) {
            (bool success, ) = _logic.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    /**
     * @dev Fallback 函数 - 将调用委托给实现合约
     */
    fallback() external payable {
        address impl = _getImplementation();

        // 防止管理员调用实现合约
        if (msg.sender == _getAdmin()) {
            revert("Proxy: admin cannot fallback to proxy");
        }

        _delegate(impl);
    }

    /**
     * @dev Receive 函数 - 接收 ETH
     */
    receive() external payable {
        _delegate(_getImplementation());
    }

    /**
     * @dev 委托调用实现合约
     */
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

    /**
     * @dev 升级实现合约
     */
    function upgradeTo(address newImplementation) external {
        require(msg.sender == _getAdmin(), "Only admin");

        require(newImplementation.isContract(), "Implementation not contract");

        _setImplementation(newImplementation);
    }

    /**
     * @dev 升级实现合约并调用函数
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable {
        require(msg.sender == _getAdmin(), "Only admin");

        _upgradeTo(newImplementation);

        (bool success, ) = newImplementation.delegatecall(data);
        require(success, "Initialization failed");
    }

    /**
     * @dev 更改管理员
     */
    function changeAdmin(address newAdmin) external {
        require(msg.sender == _getAdmin(), "Only admin");
        require(newAdmin != address(0), "Admin is zero");

        _setAdmin(newAdmin);
    }

    /**
     * @dev 获取实现合约地址
     */
    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    /**
     * @dev 获取管理员地址
     */
    function admin() external view returns (address) {
        return _getAdmin();
    }

    /**
     * @dev 内部函数: 设置实现合约
     */
    function _setImplementation(address newImplementation) private {
        StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value = newImplementation;
    }

    /**
     * @dev 内部函数: 设置管理员
     */
    function _setAdmin(address newAdmin) private {
        StorageSlot.getAddressSlot(StorageSlot.ADMIN_SLOT).value = newAdmin;
    }

    /**
     * @dev 内部函数: 获取实现合约
     */
    function _getImplementation() private view returns (address) {
        return StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value;
    }

    /**
     * @dev 内部函数: 获取管理员
     */
    function _getAdmin() private view returns (address) {
        return StorageSlot.getAddressSlot(StorageSlot.ADMIN_SLOT).value;
    }

    /**
     * @dev 内部函数: 升级
     */
    function _upgradeTo(address newImplementation) private {
        require(newImplementation.isContract(), "Implementation not contract");
        _setImplementation(newImplementation);
    }
}

/**
 * @title IsContract
 * @dev 检查地址是否为合约
 */
library IsContract {
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}

// 使用声明
using IsContract for address;

// ==================== UUPS 代理模式 ====================

/**
 * @title UUPSUpgradeable
 * @dev 通用可升级代理模式
 * @notice 实现合约包含升级逻辑
 */
abstract contract UUPSUpgradeable {
    /**
     * @dev 升级实现合约
     */
    function upgradeTo(address newImplementation) external {
        _authorizeUpgrade();
        _upgradeTo(newImplementation);
    }

    /**
     * @dev 升级实现合约并调用
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable {
        _authorizeUpgrade();
        _upgradeTo(newImplementation);

        (bool success, ) = newImplementation.delegatecall(data);
        require(success, "Initialization failed");
    }

    /**
     * @dev 授权升级(需要实现)
     */
    function _authorizeUpgrade() internal virtual;

    /**
     * @dev 执行升级
     */
    function _upgradeTo(address newImplementation) internal {
        _setImplementation(newImplementation);
    }

    /**
     * @dev 获取实现合约
     */
    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value;
    }

    /**
     * @dev 设置实现合约
     */
    function _setImplementation(address newImplementation) private {
        StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value = newImplementation;
    }
}

/**
 * @title UUPSProxy
 * @dev UUPS 代理合约
 */
contract UUPSProxy {
    constructor(address _logic, bytes memory _data) payable {
        StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value = _logic;

        if (_data.length > 0) {
            (bool success, ) = _logic.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    fallback() external payable {
        _delegate(_getImplementation());
    }

    receive() external payable {
        _delegate(_getImplementation());
    }

    function _delegate(address implementation) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function _getImplementation() private view returns (address) {
        return StorageSlot.getAddressSlot(StorageSlot.IMPLEMENTATION_SLOT).value;
    }
}

/**
 * @title CounterV1
 * @dev 计数器合约 V1 (UUPS)
 */
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

/**
 * @title CounterV2
 * @dev 计数器合约 V2 (UUPS)
 */
contract CounterV2 is UUPSUpgradeable {
    uint256 public count;
    address public owner;
    uint256 public addedValue;

    function initialize() public {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
    }

    function increment() public {
        count += 1;
    }

    function addValue(uint256 value) public {
        addedValue += value;
    }

    function _authorizeUpgrade() internal override {
        require(msg.sender == owner, "Only owner");
    }
}

// ==================== Beacon 代理模式 ====================

/**
 * @title BeaconProxy
 * @dev 信标代理合约
 * @notice 多个代理共享同一个实现合约,通过信标升级
 */
contract BeaconProxy {
    constructor(address beacon, bytes memory data) payable {
        _setBeacon(beacon);

        if (data.length > 0) {
            (bool success, ) = _getImplementation().delegatecall(data);
            require(success, "Initialization failed");
        }
    }

    fallback() external payable {
        _delegate(_getImplementation());
    }

    receive() external payable {
        _delegate(_getImplementation());
    }

    function _delegate(address implementation) private {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function _getImplementation() private view returns (address) {
        address beacon = StorageSlot.getAddressSlot(StorageSlot.BEACON_SLOT).value;

        (bool success, bytes memory data) = beacon.staticcall(abi.encodeWithSignature("implementation()"));

        require(success, "Beacon call failed");

        return abi.decode(data, (address));
    }

    function _setBeacon(address beacon) private {
        StorageSlot.getAddressSlot(StorageSlot.BEACON_SLOT).value = beacon;
    }
}

/**
 * @title UpgradeableBeacon
 * @dev 可升级信标
 */
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

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "New owner is zero");

        owner = newOwner;
    }

    function getImplementation() external view returns (address) {
        return implementation;
    }
}

// ==================== 代理模式使用示例 ====================

/**
 * @title Storage
 * @dev 存储合约 v1
 */
contract StorageV1 {
    uint256 public value;
    address public owner;

    function initialize(uint256 _value) public {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
        value = _value;
    }

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}

/**
 * @title StorageV2
 * @dev 存储合约 v2 (添加新功能)
 */
contract StorageV2 {
    uint256 public value;
    address public owner;
    string public name;

    function initialize(uint256 _value, string memory _name) public {
        require(owner == address(0), "Already initialized");
        owner = msg.sender;
        value = _value;
        name = _name;
    }

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }

    function setName(string memory _name) public {
        name = _name;
    }

    function getName() public view returns (string memory) {
        return name;
    }
}

/**
 * @title ProxyAdmin
 * @dev 代理管理员
 */
contract ProxyAdmin {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @dev 升级透明代理
     */
    function upgrade(address proxy, address implementation) external onlyOwner {
        TransparentUpgradeableProxy(payable(proxy)).upgradeTo(implementation);
    }

    /**
     * @dev 升级并调用透明代理
     */
    function upgradeAndCall(
        address proxy,
        address implementation,
        bytes memory data
    ) external onlyOwner {
        TransparentUpgradeableProxy(payable(proxy)).upgradeToAndCall(implementation, data);
    }

    /**
     * @dev 更改代理管理员
     */
    function changeProxyAdmin(address proxy, address newAdmin) external onlyOwner {
        TransparentUpgradeableProxy(payable(proxy)).changeAdmin(newAdmin);
    }

    /**
     * @dev 升级信标
     */
    function upgradeBeacon(address beacon, address implementation) external onlyOwner {
        UpgradeableBeacon(payable(beacon)).upgrade(implementation);
    }
}

// ==================== 代理模式对比 ====================

/**
 * @title ProxyComparison
 * @dev 代理模式对比
 */
contract ProxyComparison {
    /**
     * @dev 透明代理
     * - 优点: 简单易用
     * - 缺点: 管理员调用额外 Gas 成本
     */
    string public constant TRANSPARENT = "Transparent Proxy";

    /**
     * @dev UUPS 代理
     * - 优点: 更节省 Gas
     * - 缺点: 需要在实现合约中包含升级逻辑
     */
    string public constant UUPS = "UUPS Proxy";

    /**
     * @dev 信标代理
     * - 优点: 多个代理共享实现,一次升级全部更新
     * - 缺点: 灵活性较低
     */
    string public constant BEACON = "Beacon Proxy";

    /**
     * @dev 获取推荐模式
     */
    function getRecommendedMode(uint256 proxyCount) public pure returns (string memory) {
        if (proxyCount == 1) {
            return UUPS; // 单个代理用 UUPS 节省 Gas
        } else if (proxyCount > 10) {
            return BEACON; // 多个代理用信标方便统一升级
        } else {
            return TRANSPARENT; // 其他情况用透明代理
        }
    }
}

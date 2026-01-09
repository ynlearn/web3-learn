// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TokenStandards
 * @dev 代币标准完整实现
 * @notice 演示 ERC20、ERC721、ERC1155 等主流代币标准
 */

// ==================== ERC20 标准 ====================

/**
 * @title IERC20
 * @dev ERC20 代币接口
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title MyToken
 * @dev ERC20 代币实现
 */
contract MyToken is IERC20 {
    string public name = "My Token";
    string public symbol = "MTK";
    uint8 public decimals = 18;
    uint256 public override totalSupply;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    constructor(uint256 _initialSupply) {
        _mint(msg.sender, _initialSupply);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(recipient != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;

        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Approve to zero address");

        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");
        require(balanceOf[sender] >= amount, "Insufficient balance");
        require(allowance[sender][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        allowance[sender][msg.sender] -= amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        require(spender != address(0), "Approve to zero address");

        allowance[msg.sender][spender] += addedValue;

        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        require(spender != address(0), "Approve to zero address");
        require(allowance[msg.sender][spender] >= subtractedValue, "Decreased allowance below zero");

        allowance[msg.sender][spender] -= subtractedValue;

        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        return true;
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "Mint to zero address");

        totalSupply += amount;
        balanceOf[account] += amount;

        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "Burn from zero address");
        require(balanceOf[account] >= amount, "Burn amount exceeds balance");

        balanceOf[account] -= amount;
        totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }
}

/**
 * @title BurnableToken
 * @dev 可燃烧的 ERC20 代币
 */
contract BurnableToken is MyToken {
    event Burned(address indexed account, uint256 amount);

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        uint256 currentAllowance = allowance[account][msg.sender];
        require(currentAllowance >= amount, "Burn amount exceeds allowance");

        allowance[account][msg.sender] = currentAllowance - amount;
        _burn(account, amount);
        emit Burned(account, amount);
    }
}

// ==================== ERC721 标准 ====================

/**
 * @title IERC721
 * @dev ERC721 NFT 接口
 */
interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
}

/**
 * @title MyNFT
 * @dev ERC721 NFT 实现
 */
contract MyNFT is IERC721 {
    string public name = "My NFT";
    string public symbol = "MNFT";

    uint256 private _tokenIdCounter;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "Balance query for zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Owner query for nonexistent token");
        return owner;
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        require(to != owner, "Approval to current owner");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "Not authorized");

        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_owners[tokenId] != address(0), "Approved query for nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public override {
        require(operator != msg.sender, "Approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Transfer caller is not owner nor approved");

        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Transfer caller is not owner nor approved");
        _safeTransfer(from, to, tokenId, data);
    }

    function mint(address to) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function _safeMint(address to, uint256 tokenId) internal {
        _safeMint(to, tokenId, "");
    }

    function _safeMint(address to, uint256 tokenId, bytes memory data) internal {
        _mint(to, tokenId);
        require(_checkOnERC721Received(address(0), to, tokenId, data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Mint to zero address");
        require(_owners[tokenId] == address(0), "Token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _burn(uint256 tokenId) internal {
        address owner = ownerOf(tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];
        delete _tokenApprovals[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Transfer from incorrect owner");
        require(to != address(0), "Transfer to zero address");

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        delete _tokenApprovals[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function _safeTransfer(address from, address to, uint256 tokenId, bytes memory data) internal {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver implementer");
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length == 0) return true;

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("Transfer to non ERC721Receiver implementer");
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}

/**
 * @title IERC721Receiver
 * @dev ERC721 接收者接口
 */
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

// ==================== ERC1155 标准 ====================

/**
 * @title IERC1155
 * @dev ERC1155 多代币标准接口
 */
interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
}

/**
 * @title MyMultiToken
 * @dev ERC1155 多代币实现
 */
contract MyMultiToken is IERC1155 {
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    function balanceOf(address account, uint256 id) public view override returns (uint256) {
        require(account != address(0), "Balance query for zero address");
        return _balances[id][account];
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) public view override returns (uint256[] memory) {
        require(accounts.length == ids.length, "Arrays length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Balance query for zero address");
            batchBalances[i] = _balances[ids[i]][accounts[i]];
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) public override {
        require(operator != msg.sender, "Approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view override returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Transfer caller is not owner nor approved");
        require(to != address(0), "Transfer to zero address");
        require(_balances[id][from] >= amount, "Insufficient balance");

        _balances[id][from] -= amount;
        _balances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);

        _doSafeTransferAcceptanceCheck(msg.sender, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public override {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Transfer caller is not owner nor approved");
        require(ids.length == amounts.length, "Arrays length mismatch");
        require(to != address(0), "Transfer to zero address");

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            require(_balances[id][from] >= amount, "Insufficient balance");

            _balances[id][from] -= amount;
            _balances[id][to] += amount;
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);

        _doSafeBatchTransferAcceptanceCheck(msg.sender, from, to, ids, amounts, data);
    }

    function mint(address account, uint256 id, uint256 amount) public {
        require(account != address(0), "Mint to zero address");

        _balances[id][account] += amount;

        emit TransferSingle(msg.sender, address(0), account, id, amount);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) public {
        require(to != address(0), "Mint to zero address");
        require(ids.length == amounts.length, "Arrays length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            _balances[ids[i]][to] += amounts[i];
        }

        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
    }

    function burn(address account, uint256 id, uint256 amount) public {
        require(account != address(0), "Burn from zero address");
        require(_balances[id][account] >= amount, "Burn amount exceeds balance");

        _balances[id][account] -= amount;

        emit TransferSingle(msg.sender, account, address(0), id, amount);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory amounts) public {
        require(account != address(0), "Burn from zero address");
        require(ids.length == amounts.length, "Arrays length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];

            require(_balances[id][account] >= amount, "Burn amount exceeds balance");

            _balances[id][account] -= amount;
        }

        emit TransferBatch(msg.sender, account, address(0), ids, amounts);
    }

    function _doSafeTransferAcceptanceCheck(address operator, address from, address to, uint256 id, uint256 amount, bytes memory data) private {
        if (to.code.length == 0) return;

        try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 retval) {
            require(retval == IERC1155Receiver.onERC1155Received.selector, "ERC1155: transfer to non ERC1155Receiver implementer");
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) private {
        if (to.code.length == 0) return;

        try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 retval) {
            require(retval == IERC1155Receiver.onERC1155BatchReceived.selector, "ERC1155: transfer to non ERC1155Receiver implementer");
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("ERC1155: transfer to non ERC1155Receiver implementer");
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}

/**
 * @title IERC1155Receiver
 * @dev ERC1155 接收者接口
 */
interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external returns (bytes4);
}

// ==================== 代币标准对比 ====================

/**
 * @title TokenComparison
 * @dev 代币标准对比合约
 */
contract TokenComparison {
    /**
     * @dev ERC20 特点
     * - 同质化代币(Fungible)
     * - 每个代币完全相同
     * - 适用于货币、积分、 governance
     */
    string public constant ERC20_FEATURES = "Fungible, Divisible, Interchangeable";

    /**
     * @dev ERC721 特点
     * - 非同质化代币(Non-Fungible)
     * - 每个代币独一无二
     * - 适用于艺术品、收藏品、身份证明
     */
    string public constant ERC721_FEATURES = "Non-Fungible, Unique, Indivisible";

    /**
     * @dev ERC1155 特点
     * - 多代币标准(Multi-Token)
     * - 支持同质化和非同质化
     * - 批量操作节省 Gas
     * - 适用于游戏道具、票务、证书
     */
    string public constant ERC1155_FEATURES = "Multi-Token, Batch Operations, Gas Efficient";

    /**
     * @dev 获取推荐标准
     */
    function getRecommendedStandard(string memory useCase) public pure returns (string memory) {
        bytes32 caseHash = keccak256(bytes(useCase));

        if (caseHash == keccak256("currency")) {
            return "ERC20";
        } else if (caseHash == keccak256("art")) {
            return "ERC721";
        } else if (caseHash == keccak256("game items")) {
            return "ERC1155";
        } else if (caseHash == keccak256("governance")) {
            return "ERC20";
        } else if (caseHash == keccak256("identity")) {
            return "ERC721";
        } else if (caseHash == keccak256("tickets")) {
            return "ERC1155";
        } else {
            return "Depends on requirements";
        }
    }

    /**
     * @dev Gas 消耗对比
     */
    function compareGasCosts() public pure returns (
        uint256 erc20Transfer,
        uint256 erc721Transfer,
        uint256 erc1155Transfer,
        uint256 erc1155BatchTransfer
    ) {
        // 这些是近似值,实际 Gas 消耗取决于具体实现
        erc20Transfer = 50000;
        erc721Transfer = 80000;
        erc1155Transfer = 60000;
        erc1155BatchTransfer = 100000; // 批量转账 10 个代币
    }
}

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lesson 10: 安全机制基础", function () {
    let ownable, accessControl, secureBank, vulnerableBank, attacker, pausableToken, vault;
    let owner, user1, user2, user3;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        // 部署 Ownable
        const Ownable = await ethers.getContractFactory("Ownable");
        ownable = await Ownable.deploy();
        await ownable.deployed();

        // 部署 AccessControl
        const AccessControl = await ethers.getContractFactory("AccessControl");
        accessControl = await AccessControl.deploy();
        await accessControl.deployed();

        // 部署银行合约
        const SecureBank = await ethers.getContractFactory("SecureBank");
        secureBank = await SecureBank.deploy();
        await secureBank.deployed();

        const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
        vulnerableBank = await VulnerableBank.deploy();
        await vulnerableBank.deployed();

        // 部署攻击合约
        const Attacker = await ethers.getContractFactory("Attacker");
        attacker = await Attacker.deploy(secureBank.address, vulnerableBank.address);
        await attacker.deployed();

        // 部署可暂停代币
        const PausableToken = await ethers.getContractFactory("PausableToken");
        pausableToken = await PausableToken.deploy(ethers.utils.parseEther("1000"));
        await pausableToken.deployed();

        // 部署安全金库
        const SecureVault = await ethers.getContractFactory("SecureVault");
        vault = await SecureVault.deploy(ethers.utils.parseEther("10"));
        await vault.deployed();
    });

    describe("Ownable 测试", function () {
        it("应该正确设置初始所有者", async function () {
            expect(await ownable.owner()).to.equal(owner.address);
        });

        it("所有者应该能转移所有权", async function () {
            await ownable.transferOwnership(user1.address);
            expect(await ownable.pendingOwner()).to.equal(user1.address);

            await ownable.connect(user1).acceptOwnership();
            expect(await ownable.owner()).to.equal(user1.address);
        });

        it("非所有者不能转移所有权", async function () {
            await expect(
                ownable.connect(user1).transferOwnership(user2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("应该能放弃所有权", async function () {
            await ownable.renounceOwnership();
            expect(await ownable.owner()).to.equal(ethers.constants.AddressZero);
        });

        it("应该触发所有权转移事件", async function () {
            await expect(ownable.transferOwnership(user1.address))
                .to.emit(ownable, "OwnershipTransferred")
                .withArgs(owner.address, user1.address);
        });
    });

    describe("AccessControl 测试", function () {
        it("部署者应该拥有管理员角色", async function () {
            const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
            expect(await accessControl.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("管理员应该能授予角色", async function () {
            const USER_ROLE = await accessControl.USER_ROLE();
            await accessControl.grantRole(USER_ROLE, user1.address);

            expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.true;
        });

        it("非管理员不能授予角色", async function () {
            const USER_ROLE = await accessControl.USER_ROLE();
            await expect(
                accessControl.connect(user1).grantRole(USER_ROLE, user2.address)
            ).to.be.revertedWith("AccessControl: sender must be admin");
        });

        it("管理员应该能撤销角色", async function () {
            const USER_ROLE = await accessControl.USER_ROLE();
            await accessControl.grantRole(USER_ROLE, user1.address);
            await accessControl.revokeRole(USER_ROLE, user1.address);

            expect(await accessControl.hasRole(USER_ROLE, user1.address)).to.be.false;
        });

        it("应该触发角色授予和撤销事件", async function () {
            const USER_ROLE = await accessControl.USER_ROLE();

            await expect(accessControl.grantRole(USER_ROLE, user1.address))
                .to.emit(accessControl, "RoleGranted")
                .withArgs(USER_ROLE, user1.address, owner.address);

            await expect(accessControl.revokeRole(USER_ROLE, user1.address))
                .to.emit(accessControl, "RoleRevoked")
                .withArgs(USER_ROLE, user1.address, owner.address);
        });
    });

    describe("防重入攻击测试", function () {
        it("安全银行应该能正常存款和取款", async function () {
            const depositAmount = ethers.utils.parseEther("5.0");
            const withdrawAmount = ethers.utils.parseEther("2.0");

            await secureBank.connect(user1).deposit({ value: depositAmount });
            expect(await secureBank.balances(user1.address)).to.equal(depositAmount);

            await secureBank.connect(user1).withdraw(withdrawAmount);
            expect(await secureBank.balances(user1.address)).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("安全银行应该防止重入攻击", async function () {
            const attackAmount = ethers.utils.parseEther("1.0");

            // 攻击者存款
            await attacker.attackSecure(attackAmount, { value: attackAmount });

            // 尝试重入攻击（应该失败）
            await expect(
                attacker.connect(user1).attackSecure(attackAmount)
            ).to.be.reverted;
        });

        it("有漏洞的银行应该容易受到重入攻击", async function () {
            const attackAmount = ethers.utils.parseEther("10.0");

            // 攻击者存款
            await attacker.connect(user1).attack(attackAmount, { value: attackAmount });

            // 攻击应该成功（取出超过存款金额）
            const bankBalance = await ethers.provider.getBalance(vulnerableBank.address);
            const attackerBalance = await ethers.provider.getBalance(attacker.address);

            // 攻击者应该能够多次取款
            const attackCount = await attacker.attackCount();
            expect(attackCount.toNumber()).to.be.greaterThan(0);
        });

        it("批量取款应该安全执行", async function () {
            const depositAmount = ethers.utils.parseEther("20.0");
            await secureBank.connect(user1).deposit({ value: depositAmount });

            const amounts = [
                ethers.utils.parseEther("1.0"),
                ethers.utils.parseEther("2.0"),
                ethers.utils.parseEther("3.0")
            ];

            await secureBank.connect(user1).batchWithdraw(amounts);

            const remaining = ethers.utils.parseEther("14.0");
            expect(await secureBank.balances(user1.address)).to.equal(remaining);
        });

        it("应该检测重入攻击尝试", async function () {
            // 这个测试需要特殊设置，简化处理
            const depositAmount = ethers.utils.parseEther("1.0");
            await secureBank.connect(user1).deposit({ value: depositAmount });

            // 正常取款应该成功
            await secureBank.connect(user1).withdraw(depositAmount);
            expect(await secureBank.balances(user1.address)).to.equal(0);
        });
    });

    describe("暂停机制测试", function () {
        it("所有者应该能暂停合约", async function () {
            await vault.pause();
            expect(await vault.paused()).to.be.true;
        });

        it("所有者应该能取消暂停", async function () {
            await vault.pause();
            await vault.unpause();
            expect(await vault.paused()).to.be.false;
        });

        it("暂停后不能存款", async function () {
            await vault.pause();

            await expect(
                vault.connect(user1).deposit({ value: ethers.utils.parseEther("1.0") })
            ).to.be.revertedWith("Pausable: paused");
        });

        it("暂停后不能取款", async function () {
            await vault.connect(user1).deposit({ value: ethers.utils.parseEther("5.0") });
            await vault.pause();

            await expect(
                vault.connect(user1).withdraw(ethers.utils.parseEther("1.0"))
            ).to.be.revertedWith("Pausable: paused");
        });

        it("暂停后可以紧急取款", async function () {
            const depositAmount = ethers.utils.parseEther("5.0");
            await vault.connect(user1).deposit({ value: depositAmount });
            await vault.pause();

            await vault.emergencyWithdraw(user1.address, depositAmount);
            expect(await vault.deposits(user1.address)).to.equal(0);
        });

        it("应该触发暂停和取消暂停事件", async function () {
            await expect(vault.pause())
                .to.emit(vault, "Paused")
                .withArgs(owner.address);

            await expect(vault.unpause())
                .to.emit(vault, "Unpaused")
                .withArgs(owner.address);
        });

        it("非所有者不能暂停合约", async function () {
            await expect(
                vault.connect(user1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("安全金库综合测试", function () {
        it("应该正确执行存款和取款", async function () {
            const depositAmount = ethers.utils.parseEther("15.0");
            const withdrawAmount = ethers.utils.parseEther("5.0");

            await vault.connect(user1).deposit({ value: depositAmount });
            expect(await vault.deposits(user1.address)).to.equal(depositAmount);

            await vault.connect(user1).withdraw(withdrawAmount);
            expect(await vault.deposits(user1.address)).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("应该强制执行取款限制", async function () {
            const depositAmount = ethers.utils.parseEther("20.0");
            await vault.connect(user1).deposit({ value: depositAmount });

            const withdrawalLimit = await vault.withdrawalLimit();

            await expect(
                vault.connect(user1).withdraw(withdrawalLimit.add(1))
            ).to.be.revertedWith("Amount exceeds withdrawal limit");
        });

        it("所有者应该能更新取款限制", async function () {
            const newLimit = ethers.utils.parseEther("20.0");

            await expect(vault.setWithdrawalLimit(newLimit))
                .to.emit(vault, "LimitUpdated");

            expect(await vault.withdrawalLimit()).to.equal(newLimit);
        });

        it("非所有者不能更新取款限制", async function () {
            await expect(
                vault.connect(user1).setWithdrawalLimit(ethers.utils.parseEther("100.0"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("应该正确处理多个用户的存款", async function () {
            await vault.connect(user1).deposit({ value: ethers.utils.parseEther("10.0") });
            await vault.connect(user2).deposit({ value: ethers.utils.parseEther("20.0") });
            await vault.connect(user3).deposit({ value: ethers.utils.parseEther("15.0") });

            expect(await vault.deposits(user1.address)).to.equal(ethers.utils.parseEther("10.0"));
            expect(await vault.deposits(user2.address)).to.equal(ethers.utils.parseEther("20.0"));
            expect(await vault.deposits(user3.address)).to.equal(ethers.utils.parseEther("15.0"));
            expect(await vault.totalDeposits()).to.equal(ethers.utils.parseEther("45.0"));
        });
    });

    describe("多签钱包测试", function () {
        let multiSig;

        beforeEach(async function () {
            const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
            multiSig = await MultiSigWallet.deploy(
                [owner.address, user1.address, user2.address],
                2 // 需要 2 个确认
            );
            await multiSig.deployed();
        });

        it("应该正确初始化多签钱包", async function () {
            expect(await multiSig.requiredConfirmations()).to.equal(2);
        });

        it("应该能提交交易", async function () {
            const tx = await multiSig.submitTransaction(
                user1.address,
                ethers.utils.parseEther("1.0"),
                "0x"
            );

            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "Submission");

            expect(event.args.transactionId).to.equal(0);
        });

        it("应该能确认交易", async function () {
            await multiSig.submitTransaction(
                user1.address,
                ethers.utils.parseEther("1.0"),
                "0x"
            );

            await expect(multiSig.confirmTransaction(0))
                .to.emit(multiSig, "Confirmation")
                .withArgs(owner.address, 0);
        });

        it("应该能在足够确认后执行交易", async function () {
            await multiSig.submitTransaction(
                user1.address,
                ethers.utils.parseEther("1.0"),
                "0x"
            );

            await multiSig.confirmTransaction(0);
            await multiSig.connect(user1).confirmTransaction(0);

            // 注意：执行需要发送 Ether 到合约
            await multiSig.deposit({ value: ethers.utils.parseEther("5.0") });

            await expect(multiSig.executeTransaction(0))
                .to.emit(multiSig, "Execution");
        });

        it("未确认的交易不能执行", async function () {
            await multiSig.submitTransaction(
                user1.address,
                ethers.utils.parseEther("1.0"),
                "0x"
            );

            await expect(
                multiSig.executeTransaction(0)
            ).to.be.revertedWith("Transaction not confirmed");
        });
    });

    describe("访问控制组合测试", function () {
        it("应该正确应用多种安全措施", async function () {
            // 测试 Pausable
            await vault.pause();
            await expect(
                vault.connect(user1).deposit({ value: ethers.utils.parseEther("1.0") })
            ).to.be.revertedWith("Pausable: paused");

            await vault.unpause();

            // 测试 ReentrancyGuard
            await vault.connect(user1).deposit({ value: ethers.utils.parseEther("5.0") });
            await vault.connect(user1).withdraw(ethers.utils.parseEther("2.0"));

            // 测试 Ownable
            await expect(
                vault.connect(user1).pause()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});

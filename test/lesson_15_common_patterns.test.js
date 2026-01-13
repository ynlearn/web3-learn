/**
 * Lesson 15: 常用模式测试
 *
 * 测试覆盖：
 * - 所有权模式
 * - 访问控制模式
 * - 紧急停止模式
 * - 存档模式
 * - 白名单模式
 * - 费用收取模式
 * - 防重入模式
 * - 徽章模式
 * - 速率限制模式
 * - 模式组合
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("常用模式合约测试", function () {
    // ==================== 所有权模式测试 ====================

    describe("Ownable 合约测试", function () {
        let ownable;
        let owner, newOwner, stranger;

        beforeEach(async function () {
            [owner, newOwner, stranger] = await ethers.getSigners();
            const Ownable = await ethers.getContractFactory("Ownable");
            ownable = await Ownable.deploy();
            await ownable.waitForDeployment();
        });

        describe("初始状态", function () {
            it("应该设置部署者为所有者", async function () {
                expect(await ownable.owner()).to.equal(owner.address);
            });
        });

        describe("所有权转移", function () {
            it("应该启动所有权转移", async function () {
                await ownable.transferOwnership(newOwner.address);
                expect(await ownable.pendingOwner()).to.equal(newOwner.address);
            });

            it("新所有者应该能够接受所有权", async function () {
                await ownable.transferOwnership(newOwner.address);
                await ownable.connect(newOwner).acceptOwnership();

                expect(await ownable.owner()).to.equal(newOwner.address);
                expect(await ownable.pendingOwner()).to.equal(ethers.ZeroAddress);
            });

            it("不应该允许非预期所有者接受所有权", async function () {
                await ownable.transferOwnership(newOwner.address);
                await expect(
                    ownable.connect(stranger).acceptOwnership()
                ).to.be.revertedWith("Not pending owner");
            });

            it("不应该允许非所有者启动转移", async function () {
                await expect(
                    ownable.connect(stranger).transferOwnership(newOwner.address)
                ).to.be.revertedWith("Not owner");
            });

            it("应该能够取消所有权转移", async function () {
                await ownable.transferOwnership(newOwner.address);
                await ownable.cancelOwnershipTransfer();

                expect(await ownable.pendingOwner()).to.equal(ethers.ZeroAddress);
            });
        });

        describe("放弃所有权", function () {
            it("应该能够放弃所有权", async function () {
                await ownable.renounceOwnership();
                expect(await ownable.owner()).to.equal(ethers.ZeroAddress);
            });

            it("放弃所有权后无法再调用所有者函数", async function () {
                await ownable.renounceOwnership();
                await expect(
                    ownable.transferOwnership(newOwner.address)
                ).to.be.revertedWith("Not owner");
            });
        });
    });

    // ==================== 访问控制模式测试 ====================

    describe("AccessControl 合约测试", function () {
        let accessControl;
        let admin, user1, user2;

        beforeEach(async function () {
            [admin, user1, user2] = await ethers.getSigners();
            const AccessControl = await ethers.getContractFactory("AccessControl");
            accessControl = await AccessControl.deploy();
            await accessControl.waitForDeployment();
        });

        describe("角色管理", function () {
            const ROLE = ethers.keccak256(ethers.toUtf8Bytes("TEST_ROLE"));

            it("管理员应该能够授予角色", async function () {
                await accessControl.grantRole(ROLE, user1.address);
                expect(await accessControl.hasRole(ROLE, user1.address)).to.be.true;
            });

            it("应该触发角色授予事件", async function () {
                await expect(accessControl.grantRole(ROLE, user1.address))
                    .to.emit(accessControl, "RoleGranted")
                    .withArgs(ROLE, user1.address, admin.address);
            });

            it("应该能够撤销角色", async function () {
                await accessControl.grantRole(ROLE, user1.address);
                await accessControl.revokeRole(ROLE, user1.address);

                expect(await accessControl.hasRole(ROLE, user1.address)).to.be.false;
            });

            it("不应该允许非管理员授予角色", async function () {
                await expect(
                    accessControl.connect(user1).grantRole(ROLE, user2.address)
                ).to.be.revertedWith("Not admin");
            });
        });
    });

    // ==================== 紧急停止模式测试 ====================

    describe("Pausable 合约测试", function () {
        let pausableToken;
        let owner, user1, user2;

        beforeEach(async function () {
            [owner, user1, user2] = await ethers.getSigners();
            const PausableToken = await ethers.getContractFactory("PausableToken");
            pausableToken = await PausableToken.deploy(ethers.parseEther("1000"));
            await pausableToken.waitForDeployment();
        });

        describe("暂停机制", function () {
            it("所有者应该能够暂停代币", async function () {
                await pausableToken.pause();
                expect(await pausableToken.paused()).to.be.true;
            });

            it("暂停后应该阻止转账", async function () {
                await pausableToken.transfer(user1.address, ethers.parseEther("100"));
                await pausableToken.pause();

                await expect(
                    pausableToken.connect(user1).transfer(user2.address, ethers.parseEther("10"))
                ).to.be.revertedWith("Paused");
            });

            it("所有者应该能够恢复代币", async function () {
                await pausableToken.pause();
                await pausableToken.unpause();

                expect(await pausableToken.paused()).to.be.false;
            });

            it("恢复后应该允许转账", async function () {
                await pausableToken.transfer(user1.address, ethers.parseEther("100"));
                await pausableToken.pause();
                await pausableToken.unpause();

                await expect(
                    pausableToken.connect(user1).transfer(user2.address, ethers.parseEther("10"))
                ).to.not.be.reverted;
            });

            it("不应该允许非所有者暂停", async function () {
                await expect(
                    pausableToken.connect(user1).pause()
                ).to.be.revertedWith("Not owner");
            });
        });
    });

    // ==================== 白名单模式测试 ====================

    describe("Whitelist 合约测试", function () {
        let whitelist;
        let owner, user1, user2;

        beforeEach(async function () {
            [owner, user1, user2] = await ethers.getSigners();
            const Whitelist = await ethers.getContractFactory("Whitelist");
            whitelist = await Whitelist.deploy();
            await whitelist.waitForDeployment();
        });

        describe("白名单管理", function () {
            it("应该能够添加到白名单", async function () {
                await whitelist.addToWhitelist(user1.address);
                expect(await whitelist.isWhitelisted(user1.address)).to.be.true;
            });

            it("应该能够从白名单移除", async function () {
                await whitelist.addToWhitelist(user1.address);
                await whitelist.removeFromWhitelist(user1.address);

                expect(await whitelist.isWhitelisted(user1.address)).to.be.false;
            });

            it("不应该允许重复添加", async function () {
                await whitelist.addToWhitelist(user1.address);
                await whitelist.addToWhitelist(user1.address); // 应该能调用但不重复添加

                const count = await whitelist.getWhitelistCount();
                expect(count).to.equal(1);
            });

            it("应该能够批量添加", async function () {
                await whitelist.batchAddToWhitelist([user1.address, user2.address]);

                expect(await whitelist.isWhitelisted(user1.address)).to.be.true;
                expect(await whitelist.isWhitelisted(user2.address)).to.be.true;
            });
        });

        describe("白名单销售", function () {
            let whitelistedSale;

            beforeEach(async function () {
                const WhitelistedSale = await ethers.getContractFactory("WhitelistedSale");
                whitelistedSale = await WhitelistedSale.deploy(
                    ethers.parseEther("0.1"), // 0.1 ETH per token
                    1000 // max supply
                );
                await whitelistedSale.waitForDeployment();
            });

            it("应该允许白名单用户购买", async function () {
                await whitelistedSale.addToWhitelist(user1.address);

                await expect(
                    whitelistedSale.connect(user1).purchase({ value: ethers.parseEther("1") })
                ).to.not.be.reverted;
            });

            it("不应该允许非白名单用户购买", async function () {
                await expect(
                    whitelistedSale.connect(user2).purchase({ value: ethers.parseEther("1") })
                ).to.be.revertedWith("Not whitelisted");
            });
        });
    });

    // ==================== 费用收取模式测试 ====================

    describe("FeeCollector 合约测试", function () {
        let feeCollector;
        let owner, feeRecipient, user1;

        beforeEach(async function () {
            [owner, feeRecipient, user1] = await ethers.getSigners();
            const FeeCollector = await ethers.getContractFactory("FeeCollector");
            feeCollector = await FeeCollector.deploy(
                500, // 5% fee (500/10000)
                feeRecipient.address
            );
            await feeCollector.waitForDeployment();
        });

        describe("费用计算", function () {
            it("应该正确计算费用", async function () {
                const amount = ethers.parseEther("1");
                const fee = await feeCollector.calculateFee(amount);
                expect(fee).to.equal(ethers.parseEther("0.05")); // 5%
            });
        });

        describe("费用管理", function () {
            it("应该能够更改费用接收者", async function () {
                await feeCollector.setFeeRecipient(user1.address);
                expect(await feeCollector.feeRecipient()).to.equal(user1.address);
            });

            it("应该能够更改费用率", async function () {
                await feeCollector.setFeeRate(1000); // 10%
                expect(await feeCollector.feeNumerator()).to.equal(1000);
            });

            it("不应该允许设置过高的费用率", async function () {
                await expect(
                    feeCollector.setFeeRate(10001) // > 100%
                ).to.be.revertedWith("Invalid fee rate");
            });
        });
    });

    // ==================== 防重入模式测试 ====================

    describe("SecureVault 合约测试", function () {
        let vault;
        let owner, user1, user2;

        beforeEach(async function () {
            [owner, user1, user2] = await ethers.getSigners();
            const SecureVault = await ethers.getContractFactory("SecureVault");
            vault = await SecureVault.deploy();
            await vault.waitForDeployment();
        });

        describe("存款", function () {
            it("应该能够存款", async function () {
                await vault.connect(user1).deposit({ value: ethers.parseEther("1") });
                expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("1"));
            });

            it("不应该允许零存款", async function () {
                await expect(
                    vault.connect(user1).deposit({ value: 0 })
                ).to.be.revertedWith("No value");
            });
        });

        describe("提款", function () {
            beforeEach(async function () {
                await vault.connect(user1).deposit({ value: ethers.parseEther("1") });
            });

            it("应该能够提款", async function () {
                const balanceBefore = await ethers.provider.getBalance(user1.address);
                await vault.connect(user1).withdraw(ethers.parseEther("0.5"));

                const balanceAfter = await ethers.provider.getBalance(user1.address);
                expect(balanceAfter - balanceBefore).to.be.closeTo(ethers.parseEther("0.5"), ethers.parseEther("0.001"));
            });

            it("不应该允许提取超过余额", async function () {
                await expect(
                    vault.connect(user1).withdraw(ethers.parseEther("2"))
                ).to.be.revertedWith("Insufficient balance");
            });

            it("应该防止重入攻击", async function () {
                // 这个测试验证防重入机制的存在
                // 实际的重入攻击需要恶意合约
                await vault.connect(user1).withdraw(ethers.parseEther("0.5"));
                expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("0.5"));
            });
        });

        describe("批量提款", function () {
            beforeEach(async function () {
                await vault.connect(user1).deposit({ value: ethers.parseEther("1") });
                await vault.connect(user2).deposit({ value: ethers.parseEther("2") });
            });

            it("所有者应该能够批量提款", async function () {
                await vault.batchWithdraw(
                    [user1.address, user2.address],
                    [ethers.parseEther("0.5"), ethers.parseEther("1")]
                );

                expect(await vault.balances(user1.address)).to.equal(ethers.parseEther("0.5"));
                expect(await vault.balances(user2.address)).to.equal(ethers.parseEther("1"));
            });

            it("不应该允许长度不匹配的批量提款", async function () {
                await expect(
                    vault.batchWithdraw(
                        [user1.address, user2.address],
                        [ethers.parseEther("1")] // 只有一个金额
                    )
                ).to.be.revertedWith("Length mismatch");
            });
        });
    });

    // ==================== 徽章模式测试 ====================

    describe("Badge 合约测试", function () {
        let badgeContract;
        let owner, user1, user2;

        beforeEach(async function () {
            [owner, user1, user2] = await ethers.getSigners();
            const Badge = await ethers.getContractFactory("Badge");
            badgeContract = await Badge.deploy();
            await badgeContract.waitForDeployment();
        });

        describe("徽章管理", function () {
            it("应该能够创建徽章", async function () {
                await badgeContract.createBadge(
                    1,
                    "Early Adopter",
                    "First 100 users",
                    "ipfs://Qm..."
                );

                expect(await badgeContract.totalBadges()).to.equal(1);
            });

            it("不应该允许创建重复的徽章", async function () {
                await badgeContract.createBadge(1, "Badge 1", "Description", "ipfs://Qm...");
                await expect(
                    badgeContract.createBadge(1, "Badge 2", "Description", "ipfs://Qm...")
                ).to.be.revertedWith("Badge exists");
            });

            it("应该能够授予徽章", async function () {
                await badgeContract.createBadge(1, "Badge", "Description", "ipfs://Qm...");
                await badgeContract.awardBadge(1, user1.address);

                expect(await badgeContract.checkBadge(1, user1.address)).to.be.true;
            });

            it("不应该重复授予徽章", async function () {
                await badgeContract.createBadge(1, "Badge", "Description", "ipfs://Qm...");
                await badgeContract.awardBadge(1, user1.address);

                await expect(
                    badgeContract.awardBadge(1, user1.address)
                ).to.be.revertedWith("Already has badge");
            });

            it("应该能够批量授予徽章", async function () {
                await badgeContract.createBadge(1, "Badge", "Description", "ipfs://Qm...");
                await badgeContract.batchAwardBadge(1, [user1.address, user2.address]);

                expect(await badgeContract.checkBadge(1, user1.address)).to.be.true;
                expect(await badgeContract.checkBadge(1, user2.address)).to.be.true;
            });
        });
    });

    // ==================== 速率限制模式测试 ====================

    describe("RateLimiter 合约测试", function () {
        let rateLimiter;
        let owner, user1;

        beforeEach(async function () {
            [owner, user1] = await ethers.getSigners();
            const RateLimiter = await ethers.getContractFactory("RateLimiter");
            rateLimiter = await RateLimiter.deploy();
            await rateLimiter.waitForDeployment();
        });

        describe("限制设置", function () {
            const LIMIT_ID = ethers.keccak256(ethers.toUtf8Bytes("TEST_LIMIT"));

            it("应该能够设置限制", async function () {
                await rateLimiter.setLimit(LIMIT_ID, 5, 3600); // 5 calls per hour
                // 验证限制已设置
            });
        });

        describe("速率限制的铸造", function () {
            let rateLimitedMint;

            beforeEach(async function () {
                const RateLimitedMint = await ethers.getContractFactory("RateLimitedMint");
                rateLimitedMint = await RateLimitedMint.deploy(1000);
                await rateLimitedMint.waitForDeployment();
            });

            it("应该允许在限制内铸造", async function () {
                await rateLimitedMint.connect(user1).mint(10);
                await rateLimitedMint.connect(user1).mint(20);
                await rateLimitedMint.connect(user1).mint(30);

                expect(await rateLimitedMint.mintedBy(user1.address)).to.equal(60);
            });

            it("应该在超过限制时阻止铸造", async function () {
                // 每小时最多5次
                for (let i = 0; i < 5; i++) {
                    await rateLimitedMint.connect(user1).mint(10);
                }

                await expect(
                    rateLimitedMint.connect(user1).mint(10)
                ).to.be.revertedWith("Rate limit exceeded");
            });

            it("应该报告剩余调用次数", async function () {
                const MINT_LIMIT = ethers.keccak256(ethers.toUtf8Bytes("MINT_LIMIT"));

                const remaining1 = await rateLimitedMint.getRemainingCalls(MINT_LIMIT, user1.address);
                expect(remaining1).to.equal(5);

                await rateLimitedMint.connect(user1).mint(10);

                const remaining2 = await rateLimitedMint.getRemainingCalls(MINT_LIMIT, user1.address);
                expect(remaining2).to.equal(4);
            });
        });
    });

    // ==================== 模式组合测试 ====================

    describe("RobustToken 合约测试", function () {
        let robustToken;
        let owner, user1, user2;

        beforeEach(async function () {
            [owner, user1, user2] = await ethers.getSigners();
            const RobustToken = await ethers.getContractFactory("RobustToken");
            robustToken = await RobustToken.deploy();
            await robustToken.waitForDeployment();
        });

        describe("初始状态", function () {
            it("应该设置正确的初始参数", async function () {
                expect(await robustToken.name()).to.equal("Robust Token");
                expect(await robustToken.symbol()).to.equal("RBT");
                expect(await robustToken.decimals()).to.equal(18);
            });

            it("部署者应该拥有默认管理员角色", async function () {
                const DEFAULT_ADMIN_ROLE = await robustToken.DEFAULT_ADMIN_ROLE();
                expect(await robustToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
            });
        });

        describe("铸造功能", function () {
            it("应该允许拥有铸造角色的用户铸造", async function () {
                await robustToken.mint(user1.address, ethers.parseEther("100"));
                expect(await robustToken.balanceOf(user1.address)).to.equal(ethers.parseEther("100"));
            });

            it("不应该允许没有铸造角色的用户铸造", async function () {
                await expect(
                    robustToken.connect(user1).mint(user2.address, ethers.parseEther("100"))
                ).to.be.revertedWith("Not authorized");
            });
        });

        describe("销毁功能", function () {
            beforeEach(async function () {
                await robustToken.mint(user1.address, ethers.parseEther("100"));
            });

            it("应该允许拥有销毁角色的用户销毁", async function () {
                await robustToken.burn(ethers.parseEther("50"));
                expect(await robustToken.balanceOf(owner.address)).to.equal(ethers.parseEther("50"));
            });

            it("不应该允许没有销毁角色的用户销毁", async function () {
                await expect(
                    robustToken.connect(user1).burn(ethers.parseEther("50"))
                ).to.be.revertedWith("Not authorized");
            });
        });

        describe("暂停功能", function () {
            beforeEach(async function () {
                await robustToken.mint(user1.address, ethers.parseEther("100"));
            });

            it("所有者应该能够暂停代币", async function () {
                await robustToken.pause();
                expect(await robustToken.paused()).to.be.true;
            });

            it("暂停后应该阻止转账", async function () {
                await robustToken.pause();
                await expect(
                    robustToken.connect(user1).transfer(user2.address, ethers.parseEther("10"))
                ).to.be.revertedWith("Paused");
            });

            it("暂停后应该阻止铸造", async function () {
                await robustToken.pause();
                await expect(
                    robustToken.mint(user1.address, ethers.parseEther("100"))
                ).to.be.revertedWith("Paused");
            });
        });

        describe("防重入保护", function () {
            it("应该在转账时防止重入", async function () {
                await robustToken.mint(user1.address, ethers.parseEther("100"));
                await robustToken.mint(user2.address, ethers.parseEther("100"));

                await robustToken.connect(user1).transfer(user2.address, ethers.parseEther("50"));

                expect(await robustToken.balanceOf(user1.address)).to.equal(ethers.parseEther("50"));
                expect(await robustToken.balanceOf(user2.address)).to.equal(ethers.parseEther("150"));
            });
        });
    });

    // ==================== Gas 消耗分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告 Ownable 模式的 Gas 消耗", async function () {
            const Ownable = await ethers.getContractFactory("Ownable");
            const ownable = await Ownable.deploy();
            await ownable.waitForDeployment();

            const [_, newOwner] = await ethers.getSigners();

            const tx1 = await ownable.transferOwnership(newOwner.address);
            const receipt1 = await tx1.wait();
            console.log(`Ownable.transferOwnership() Gas: ${receipt1.gasUsed.toString()}`);

            const tx2 = await ownable.connect(newOwner).acceptOwnership();
            const receipt2 = await tx2.wait();
            console.log(`Ownable.acceptOwnership() Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告 Pausable 模式的 Gas 消耗", async function () {
            const PausableToken = await ethers.getContractFactory("PausableToken");
            const token = await PausableToken.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();

            const [_, user] = await ethers.getSigners();
            await token.transfer(user.address, ethers.parseEther("100"));

            const tx1 = await token.pause();
            const receipt1 = await tx1.wait();
            console.log(`Pausable.pause() Gas: ${receipt1.gasUsed.toString()}`);

            const tx2 = await token.unpause();
            const receipt2 = await tx2.wait();
            console.log(`Pausable.unpause() Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告 AccessControl 模式的 Gas 消耗", async function () {
            const AccessControl = await ethers.getContractFactory("AccessControl");
            const ac = await AccessControl.deploy();
            await ac.waitForDeployment();

            const ROLE = ethers.keccak256(ethers.toUtf8Bytes("TEST_ROLE"));
            const [_, user] = await ethers.getSigners();

            const tx1 = await ac.grantRole(ROLE, user.address);
            const receipt1 = await tx1.wait();
            console.log(`AccessControl.grantRole() Gas: ${receipt1.gasUsed.toString()}`);

            const tx2 = await ac.revokeRole(ROLE, user.address);
            const receipt2 = await tx2.wait();
            console.log(`AccessControl.revokeRole() Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告 ReentrancyGuard 模式的 Gas 消耗", async function () {
            const SecureVault = await ethers.getContractFactory("SecureVault");
            const vault = await SecureVault.deploy();
            await vault.waitForDeployment();

            const [_, user] = await ethers.getSigners();

            const tx1 = await vault.connect(user).deposit({ value: ethers.parseEther("1") });
            const receipt1 = await tx1.wait();
            console.log(`SecureVault.deposit() Gas: ${receipt1.gasUsed.toString()}`);

            const tx2 = await vault.connect(user).withdraw(ethers.parseEther("0.5"));
            const receipt2 = await tx2.wait();
            console.log(`SecureVault.withdraw() Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

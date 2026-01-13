import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Lesson 22: 高级安全主题", function () {
    let vulnerablePool, securePool, priceOracle, secureOracle, attacker;
    let sigVulnerable, sigFixed, sigAttacker;
    let timeVulnerable, timeFixed, randomGenerator;
    let comprehensiveVault;
    let owner, user1, user2, user3, attackerAccount;

    beforeEach(async function () {
        [owner, user1, user2, user3, attackerAccount] = await ethers.getSigners();

        // 部署价格预言机相关合约
        const ManipulatedPriceOracle = await ethers.getContractFactory("ManipulatedPriceOracle");
        priceOracle = await ManipulatedPriceOracle.deploy(100); // 初始价格 100
        await priceOracle.waitForDeployment();

        const SimpleLendingPool = await ethers.getContractFactory("SimpleLendingPool");
        vulnerablePool = await SimpleLendingPool.deploy(await priceOracle.getAddress());
        await vulnerablePool.waitForDeployment();

        const FlashLoanAttacker = await ethers.getContractFactory("FlashLoanAttacker");
        attacker = await FlashLoanAttacker.deploy(await vulnerablePool.getAddress(), await priceOracle.getAddress());
        await attacker.waitForDeployment();

        // 部署安全预言机（简化）
        const MockSecureOracle = await ethers.getContractFactory("MockSecureOracle");
        secureOracle = await MockSecureOracle.deploy();
        await secureOracle.waitForDeployment();

        const SecureLendingPool = await ethers.getContractFactory("SecureLendingPool");
        securePool = await SecureLendingPool.deploy(await secureOracle.getAddress());
        await securePool.waitForDeployment();

        // 部署签名重放相关合约
        const SignatureReplayVulnerable = await ethers.getContractFactory("SignatureReplayVulnerable");
        sigVulnerable = await SignatureReplayVulnerable.deploy();
        await sigVulnerable.waitForDeployment();

        const SignatureReplayFixed = await ethers.getContractFactory("SignatureReplayFixed");
        sigFixed = await SignatureReplayFixed.deploy();
        await sigFixed.waitForDeployment();

        const SignatureReplayAttacker = await ethers.getContractFactory("SignatureReplayAttacker");
        sigAttacker = await SignatureReplayAttacker.deploy(await sigVulnerable.getAddress());
        await sigAttacker.waitForDeployment();

        // 部署时间操纵相关合约
        const MockRandomGenerator = await ethers.getContractFactory("MockRandomGenerator");
        randomGenerator = await MockRandomGenerator.deploy();
        await randomGenerator.waitForDeployment();

        const TimeManipulationVulnerable = await ethers.getContractFactory("TimeManipulationVulnerable");
        timeVulnerable = await TimeManipulationVulnerable.deploy(86400); // 24 小时
        await timeVulnerable.waitForDeployment();

        const TimeManipulationFixed = await ethers.getContractFactory("TimeManipulationFixed");
        timeFixed = await TimeManipulationFixed.deploy(86400, await randomGenerator.getAddress());
        await timeFixed.waitForDeployment();

        // 部署综合安全金库
        const ComprehensiveSecureVault = await ethers.getContractFactory("ComprehensiveSecureVault");
        comprehensiveVault = await ComprehensiveSecureVault.deploy();
        await comprehensiveVault.waitForDeployment();
    });

    describe("闪电贷攻击测试", function () {
        it("应该能正常存款和借款", async function () {
            const depositAmount = ethers.parseEther("100.0");
            const borrowAmount = ethers.parseEther("50.0");

            await vulnerablePool.connect(user1).deposit({ value: depositAmount });
            expect(await vulnerablePool.deposits(user1.address)).to.equal(depositAmount);

            // 借款（150% 抵押率）
            const maxBorrow = await vulnerablePool.getBorrowingPower(user1.address);
            expect(maxBorrow).to.equal(ethers.parseEther("150.0")); // 100 * 100 * 150 / 10000

            await vulnerablePool.connect(user1).borrow(borrowAmount);
            expect(await vulnerablePool.borrows(user1.address)).to.equal(borrowAmount);
        });

        it("应该演示价格操纵攻击", async function () {
            const depositAmount = ethers.parseEther("100.0");
            await vulnerablePool.connect(user1).deposit({ value: depositAmount });

            const originalPrice = await priceOracle.price();
            const manipulatedPrice = (originalPrice * 10); // 提高 10 倍

            // 操纵价格
            await priceOracle.setPrice(manipulatedPrice);

            // 现在可以借更多
            const maxBorrow = await vulnerablePool.getBorrowingPower(user1.address);
            expect(maxBorrow).to.equal(ethers.parseEther("1500.0")); // 100 * 1000 * 150 / 10000

            // 重置价格
            await priceOracle.setPrice(originalPrice);
        });

        it("安全的借贷池应该防止价格操纵", async function () {
            const depositAmount = ethers.parseEther("100.0");
            await securePool.connect(user1).deposit({ value: depositAmount });

            // 尝试立即更新价格（太早）
            await expect(
                securePool.updatePrice()
            ).to.be.revertedWith("Too early to update");

            // 借款应该使用初始价格
            const borrowAmount = ethers.parseEther("50.0");
            await securePool.connect(user1).borrow(borrowAmount);
            expect(await securePool.borrows(user1.address)).to.equal(borrowAmount);
        });

        it("应该限制价格变化幅度", async function () {
            // 等待足够时间
            await time.increase(3601); // 1 小时 + 1 秒

            // 安全预言机返回的价格变化超过 10%
            await secureOracle.setPrice(200); // 从 100 变到 200（100% 变化）

            await expect(
                securePool.updatePrice()
            ).to.be.revertedWith("Price change too large");
        });

        it("应该正确计算借款能力", async function () {
            const depositAmount = ethers.parseEther("100.0");
            await vulnerablePool.connect(user1).deposit({ value: depositAmount });

            const borrowingPower = await vulnerablePool.getBorrowingPower(user1.address);
            expect(borrowingPower).to.equal(ethers.parseEther("150.0"));
        });

        it("应该防止超额借款", async function () {
            const depositAmount = ethers.parseEther("100.0");
            await vulnerablePool.connect(user1).deposit({ value: depositAmount });

            const maxBorrow = ethers.parseEther("150.0");
            const excessBorrow = ethers.parseEther("200.0");

            await expect(
                vulnerablePool.connect(user1).borrow(excessBorrow)
            ).to.be.revertedWith("Insufficient collateral");

            // 最大借款应该成功
            await vulnerablePool.connect(user1).borrow(maxBorrow);
            expect(await vulnerablePool.borrows(user1.address)).to.equal(maxBorrow);
        });

        it("应该能偿还借款", async function () {
            const depositAmount = ethers.parseEther("100.0");
            const borrowAmount = ethers.parseEther("50.0");
            const repayAmount = ethers.parseEther("30.0");

            await vulnerablePool.connect(user1).deposit({ value: depositAmount });
            await vulnerablePool.connect(user1).borrow(borrowAmount);

            await vulnerablePool.connect(user1).repay({ value: repayAmount });
            expect(await vulnerablePool.borrows(user1.address)).to.equal((borrowAmount - repayAmount));
        });
    });

    describe("签名重放攻击测试", function () {
        it("应该能使用签名取款", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("5.0");

            await sigVulnerable.connect(user1).deposit({ value: depositAmount });

            // 创建签名
            const messageHash = ethers.solidityPackedKeccak256(
                ["uint256"],
                [withdrawAmount]
            );
            const signature = await user1.signMessage(ethers.arrayify(messageHash));

            await sigVulnerable.connect(user2).withdrawWithSignature(withdrawAmount, signature);
            expect(await sigVulnerable.deposits(user1.address)).to.equal((depositAmount - withdrawAmount));
        });

        it("应该能重放签名攻击（易受攻击的合约）", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await sigVulnerable.connect(user1).deposit({ value: depositAmount });

            // 创建签名
            const messageHash = ethers.solidityPackedKeccak256(
                ["uint256"],
                [withdrawAmount]
            );
            const signature = await user1.signMessage(ethers.arrayify(messageHash));

            // 第一次取款（成功）
            await sigVulnerable.withdrawWithSignature(withdrawAmount, signature);
            expect(await sigVulnerable.deposits(user1.address)).to.equal((depositAmount - withdrawAmount));

            // 重放攻击（也能成功！）
            await sigVulnerable.withdrawWithSignature(withdrawAmount, signature);
            expect(await sigVulnerable.deposits(user1.address)).to.equal(depositAmount.sub((withdrawAmount * 2)));
        });

        it("修复后的合约应该防止重放攻击", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await sigFixed.connect(user1).deposit({ value: depositAmount });

            // 获取 nonce
            const nonce = await sigFixed.getNonce(user1.address);

            // 创建签名（包含 nonce 和链 ID）
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [await sigFixed.getAddress(), await sigFixed.chainId(), withdrawAmount, nonce]
            );
            const ethSignedHash = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            const signature = await user1.signMessage(ethers.arrayify(ethSignedHash));

            // 第一次取款
            await sigFixed.withdrawWithSignature(withdrawAmount, nonce, signature);
            expect(await sigFixed.deposits(user1.address)).to.equal((depositAmount - withdrawAmount));

            // 尝试重放（应该失败）
            await expect(
                sigFixed.withdrawWithSignature(withdrawAmount, nonce, signature)
            ).to.be.revertedWith("Invalid nonce");
        });

        it("应该正确更新 nonce", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await sigFixed.connect(user1).deposit({ value: depositAmount });

            const nonce1 = await sigFixed.getNonce(user1.address);
            expect(nonce1).to.equal(0);

            // 第一次取款
            const messageHash1 = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [await sigFixed.getAddress(), await sigFixed.chainId(), withdrawAmount, nonce1]
            );
            const ethSignedHash1 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash1]
            );
            const signature1 = await user1.signMessage(ethers.arrayify(ethSignedHash1));

            await sigFixed.withdrawWithSignature(withdrawAmount, nonce1, signature1);

            const nonce2 = await sigFixed.getNonce(user1.address);
            expect(nonce2).to.equal(1);
        });

        it("应该拒绝无效的签名", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await sigFixed.connect(user1).deposit({ value: depositAmount });

            const nonce = await sigFixed.getNonce(user1.address);

            // 使用错误的签名
            const invalidSignature = "0x1234567890abcdef";

            await expect(
                sigFixed.withdrawWithSignature(withdrawAmount, nonce, invalidSignature)
            ).to.be.reverted;
        });
    });

    describe("时间操纵攻击测试", function () {
        it("应该能提交彩票参与", async function () {
            await expect(timeVulnerable.connect(user1).submitEntry())
                .to.emit(timeVulnerable, "EntrySubmitted")
                .withArgs(user1.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));
        });

        it("彩票结束后不能提交参与", async function () {
            await time.increase(86401); // 超过 24 小时

            await expect(
                timeVulnerable.connect(user1).submitEntry()
            ).to.be.revertedWith("Lottery ended");
        });

        it("应该能选择赢家", async function () {
            await timeVulnerable.connect(user1).submitEntry();
            await timeVulnerable.connect(user2).submitEntry();
            await timeVulnerable.connect(user3).submitEntry();

            await time.increase(86401); // 超过 24 小时

            await expect(timeVulnerable.selectWinner())
                .to.emit(timeVulnerable, "WinnerSelected");
        });

        it("修复后的合约应该使用承诺-揭示模式", async function () {
            const commitHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [12345, 67890]
            );

            await timeFixed.connect(user1).commitEntry(commitHash);
            await timeFixed.connect(user2).commitEntry(commitHash);

            // 提交阶段结束后不能提交
            await time.increase(86400 - 3600); // 24 小时 - 1 小时

            await expect(
                timeFixed.connect(user3).commitEntry(commitHash)
            ).to.be.revertedWith("Too late to commit");
        });

        it("应该能揭示随机值", async function () {
            const commitHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [12345, 67890]
            );

            await timeFixed.connect(user1).commitEntry(commitHash);

            // 等到彩票结束
            await time.increase(86400);

            // 揭示随机值
            await expect(timeFixed.connect(user1).revealEntry(12345, 67890))
                .to.emit(timeFixed, "EntryRevealed")
                .withArgs(user1.address, 12345);
        });

        it("应该拒绝无效的揭示", async function () {
            const commitHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [12345, 67890]
            );

            await timeFixed.connect(user1).commitEntry(commitHash);
            await time.increase(86400);

            // 使用错误的随机值
            await expect(
                timeFixed.connect(user1).revealEntry(11111, 67890)
            ).to.be.revertedWith("Invalid reveal");
        });

        it("应该限制揭示时间窗口", async function () {
            const commitHash = ethers.solidityPackedKeccak256(
                ["uint256", "uint256"],
                [12345, 67890]
            );

            await timeFixed.connect(user1).commitEntry(commitHash);
            await time.increase(86400 + 3601); // 24 小时 + 1 小时 + 1 秒

            await expect(
                timeFixed.connect(user1).revealEntry(12345, 67890)
            ).to.be.revertedWith("Too late to reveal");
        });
    });

    describe("综合安全金库测试", function () {
        it("应该能正常存款和取款", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("5.0");

            await comprehensiveVault.connect(user1).deposit({ value: depositAmount });
            expect(await comprehensiveVault.deposits(user1.address)).to.equal(depositAmount);

            await comprehensiveVault.connect(user1).withdraw(withdrawAmount);
            expect(await comprehensiveVault.deposits(user1.address)).to.equal((depositAmount - withdrawAmount));
        });

        it("应该能使用签名取款并防止重放", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await comprehensiveVault.connect(user1).deposit({ value: depositAmount });

            const nonce = await comprehensiveVault.getNonce(user1.address);

            // 创建签名
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [await comprehensiveVault.getAddress(), await comprehensiveVault.chainId(), withdrawAmount, nonce]
            );
            const ethSignedHash = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            const signature = await user1.signMessage(ethers.arrayify(ethSignedHash));

            // 第一次取款
            await comprehensiveVault.withdrawWithSignature(withdrawAmount, nonce, signature);

            // 尝试重放（应该失败）
            await expect(
                comprehensiveVault.withdrawWithSignature(withdrawAmount, nonce, signature)
            ).to.be.revertedWith("Signature already used");
        });

        it("应该正确实施时间锁", async function () {
            await comprehensiveVault.initiateOwnershipTransfer(user1.address);

            // 立即尝试接受（应该失败）
            await expect(
                comprehensiveVault.connect(user1).acceptOwnership()
            ).to.be.revertedWith("Timelock not expired");

            // 等待时间锁过期
            await time.increase(172801); // 2 天 + 1 秒

            // 现在应该成功
            await expect(comprehensiveVault.connect(user1).acceptOwnership())
                .to.emit(comprehensiveVault, "OwnershipTransferAccepted");

            expect(await comprehensiveVault.owner()).to.equal(user1.address);
        });

        it("应该能暂停和恢复合约", async function () {
            await expect(comprehensiveVault.pause())
                .to.emit(comprehensiveVault, "Paused")
                .withArgs(owner.address);

            expect(await comprehensiveVault.paused()).to.be.true;

            // 暂停后不能存款
            await expect(
                comprehensiveVault.connect(user1).deposit({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Paused");

            await comprehensiveVault.unpause();
            expect(await comprehensiveVault.paused()).to.be.false;

            // 恢复后可以存款
            await comprehensiveVault.connect(user1).deposit({ value: ethers.parseEther("1.0") });
            expect(await comprehensiveVault.deposits(user1.address)).to.equal(ethers.parseEther("1.0"));
        });

        it("应该能执行紧急取款", async function () {
            const depositAmount = ethers.parseEther("10.0");
            await comprehensiveVault.connect(user1).deposit({ value: depositAmount });

            // 暂停合约
            await comprehensiveVault.pause();

            // 紧急取款
            await comprehensiveVault.emergencyWithdraw(user1.address, depositAmount);
            expect(await comprehensiveVault.deposits(user1.address)).to.equal(0);
        });

        it("非所有者不能执行管理操作", async function () {
            await expect(
                comprehensiveVault.connect(user1).pause()
            ).to.be.revertedWith("Not owner");

            await expect(
                comprehensiveVault.connect(user1).initiateOwnershipTransfer(user2.address)
            ).to.be.revertedWith("Not owner");

            await expect(
                comprehensiveVault.connect(user1).emergencyWithdraw(user1.address, 100)
            ).to.be.revertedWith("Not owner");
        });

        it("应该正确处理多个用户", async function () {
            await comprehensiveVault.connect(user1).deposit({ value: ethers.parseEther("10.0") });
            await comprehensiveVault.connect(user2).deposit({ value: ethers.parseEther("20.0") });
            await comprehensiveVault.connect(user3).deposit({ value: ethers.parseEther("15.0") });

            expect(await comprehensiveVault.deposits(user1.address)).to.equal(ethers.parseEther("10.0"));
            expect(await comprehensiveVault.deposits(user2.address)).to.equal(ethers.parseEther("20.0"));
            expect(await comprehensiveVault.deposits(user3.address)).to.equal(ethers.parseEther("15.0"));
        });
    });

    describe("安全对比测试", function () {
        it("应该对比易受攻击和修复后的实现", async function () {
            const amount = ethers.parseEther("5.0");

            // 易受攻击的合约
            await sigVulnerable.connect(user1).deposit({ value: amount });
            const nonce1 = 0;
            const messageHash1 = ethers.solidityPackedKeccak256(["uint256"], [amount]);
            const signature1 = await user1.signMessage(ethers.arrayify(messageHash1));
            await sigVulnerable.withdrawWithSignature(amount, signature1);

            // 修复后的合约
            await sigFixed.connect(user1).deposit({ value: amount });
            const nonce2 = await sigFixed.getNonce(user1.address);
            const messageHash2 = ethers.solidityPackedKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [await sigFixed.getAddress(), await sigFixed.chainId(), amount, nonce2]
            );
            const ethSignedHash2 = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash2]
            );
            const signature2 = await user1.signMessage(ethers.arrayify(ethSignedHash2));
            await sigFixed.withdrawWithSignature(amount, nonce2, signature2);
        });

        it("应该展示不同安全措施的效果", async function () {
            // 测试暂停机制
            await comprehensiveVault.pause();
            await expect(
                comprehensiveVault.connect(user1).deposit({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Paused");

            // 测试时间锁
            await comprehensiveVault.initiateOwnershipTransfer(user1.address);
            await expect(
                comprehensiveVault.connect(user1).acceptOwnership()
            ).to.be.revertedWith("Timelock not expired");

            // 测试防重入
            await comprehensiveVault.unpause();
            await comprehensiveVault.connect(user1).deposit({ value: ethers.parseEther("5.0") });
            await comprehensiveVault.connect(user1).withdraw(ethers.parseEther("2.0"));
            expect(await comprehensiveVault.deposits(user1.address)).to.equal(ethers.parseEther("3.0"));
        });
    });
});

// 辅助合约：用于测试的 Mock 合约
const MockSecureOracleCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockSecureOracle {
    uint256 public price = 100;

    function getLatestPrice() external view returns (uint256) {
        return price;
    }

    function setPrice(uint256 _newPrice) public {
        price = _newPrice;
    }
}
`;

const MockRandomGeneratorCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockRandomGenerator {
    uint256 public randomValue = 12345;

    function getRandomNumber() external view returns (uint256) {
        return randomValue;
    }

    function setRandomValue(uint256 _newValue) public {
        randomValue = _newValue;
    }
}
`;

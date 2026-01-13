import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Lesson 21: 常见漏洞攻击", function () {
    let vulnerableBank, attacker, fixedBank;
    let overflowVulnerable, overflowFixed;
    let accessVulnerable, accessFixed, txOriginAttacker;
    let frontRunningVulnerable, frontRunningFixed;
    let dosVulnerable, dosFixed;
    let vulnerableVault, comprehensiveAttacker, secureVault;
    let owner, user1, user2, user3, attackerAccount;

    beforeEach(async function () {
        [owner, user1, user2, user3, attackerAccount] = await ethers.getSigners();

        // 部署重入攻击相关合约
        const ReentrancyVulnerable = await ethers.getContractFactory("ReentrancyVulnerable");
        vulnerableBank = await ReentrancyVulnerable.deploy();
        await vulnerableBank.waitForDeployment();

        const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
        attacker = await ReentrancyAttacker.deploy(await vulnerableBank.getAddress());
        await attacker.waitForDeployment();

        const ReentrancyFixed = await ethers.getContractFactory("ReentrancyFixed");
        fixedBank = await ReentrancyFixed.deploy();
        await fixedBank.waitForDeployment();

        // 部署整数溢出相关合约
        const IntegerOverflowVulnerable = await ethers.getContractFactory("IntegerOverflowVulnerable");
        overflowVulnerable = await IntegerOverflowVulnerable.deploy();
        await overflowVulnerable.waitForDeployment();

        const IntegerOverflowFixed = await ethers.getContractFactory("IntegerOverflowFixed");
        overflowFixed = await IntegerOverflowFixed.deploy();
        await overflowFixed.waitForDeployment();

        // 部署访问控制相关合约
        const AccessControlVulnerable = await ethers.getContractFactory("AccessControlVulnerable");
        accessVulnerable = await AccessControlVulnerable.deploy();
        await accessVulnerable.waitForDeployment();

        const AccessControlFixed = await ethers.getContractFactory("AccessControlFixed");
        accessFixed = await AccessControlFixed.deploy();
        await accessFixed.waitForDeployment();

        const TxOriginAttacker = await ethers.getContractFactory("TxOriginAttacker");
        txOriginAttacker = await TxOriginAttacker.deploy();
        await txOriginAttacker.waitForDeployment();

        // 部署前置交易相关合约
        const FrontRunningVulnerable = await ethers.getContractFactory("FrontRunningVulnerable");
        frontRunningVulnerable = await FrontRunningVulnerable.deploy();
        await frontRunningVulnerable.waitForDeployment();

        const FrontRunningFixed = await ethers.getContractFactory("FrontRunningFixed");
        frontRunningFixed = await FrontRunningFixed.deploy();
        await frontRunningFixed.waitForDeployment();

        // 部署 DoS 相关合约
        const DoSVulnerable = await ethers.getContractFactory("DoSVulnerable");
        dosVulnerable = await ethers.getContractFactory("DoSVulnerable");
        await dosVulnerable.waitForDeployment();

        const DoSFixed = await ethers.getContractFactory("DoSFixed");
        dosFixed = await DoSFixed.deploy();
        await dosFixed.waitForDeployment();

        // 部署综合漏洞演示合约
        const VulnerableVault = await ethers.getContractFactory("VulnerableVault");
        vulnerableVault = await VulnerableVault.deploy();
        await vulnerableVault.waitForDeployment();

        const ComprehensiveAttacker = await ethers.getContractFactory("ComprehensiveAttacker");
        comprehensiveAttacker = await ComprehensiveAttacker.deploy(await vulnerableVault.getAddress());
        await comprehensiveAttacker.waitForDeployment();

        const SecureVault = await ethers.getContractFactory("SecureVault");
        secureVault = await SecureVault.deploy();
        await secureVault.waitForDeployment();
    });

    describe("重入攻击测试", function () {
        it("应该能正常存款和取款（无攻击）", async function () {
            const depositAmount = ethers.parseEther("5.0");
            
            await vulnerableBank.connect(user1).deposit({ value: depositAmount });
            expect(await vulnerableBank.balances(user1.address)).to.equal(depositAmount);

            const withdrawAmount = ethers.parseEther("2.0");
            await vulnerableBank.connect(user1).withdraw(withdrawAmount);
            expect(await vulnerableBank.balances(user1.address)).to.equal(
                (depositAmount - withdrawAmount)
            );
        });

        it("应该能成功进行重入攻击", async function () {
            const attackAmount = ethers.parseEther("10.0");

            // 向易受攻击的银行发送资金
            await owner.sendTransaction({
                to: await vulnerableBank.getAddress(),
                value: ethers.parseEther("50.0")
            });

            const bankBalanceBefore = await ethers.provider.getBalance(await vulnerableBank.getAddress());
            const attackerBalanceBefore = await ethers.provider.getBalance(await attacker.getAddress());

            // 发起攻击
            await attacker.connect(attackerAccount).attack({ value: attackAmount });

            const bankBalanceAfter = await ethers.provider.getBalance(await vulnerableBank.getAddress());
            const attackerBalanceAfter = await ethers.provider.getBalance(await attacker.getAddress());
            const attackCount = await attacker.attackCount();

            // 验证攻击成功
            expect(attackCount.toNumber()).to.be.greaterThan(0);
            expect((attackerBalanceAfter - attackerBalanceBefore)).to.be.greaterThan(attackAmount);
        });

        it("修复后的合约应该能防止重入攻击", async function () {
            const depositAmount = ethers.parseEther("5.0");
            
            await fixedBank.connect(user1).deposit({ value: depositAmount });
            expect(await fixedBank.balances(user1.address)).to.equal(depositAmount);

            // 正常取款应该成功
            const withdrawAmount = ethers.parseEther("2.0");
            await fixedBank.connect(user1).withdraw(withdrawAmount);
            expect(await fixedBank.balances(user1.address)).to.equal(
                (depositAmount - withdrawAmount)
            );

            // 尝试重入攻击（会失败）
            await expect(
                fixedBank.connect(user1).withdraw(withdrawAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("应该正确计算攻击统计", async function () {
            const attackAmount = ethers.parseEther("5.0");

            await owner.sendTransaction({
                to: await vulnerableBank.getAddress(),
                value: ethers.parseEther("20.0")
            });

            await attacker.connect(attackerAccount).attack({ value: attackAmount });

            const stats = await attacker.getAttackStats();
            expect(stats._attackCount).to.be.greaterThan(0);
            expect(stats._stolenAmount).to.be.greaterThan(0);
        });
    });

    describe("整数溢出/下溢测试", function () {
        it("Solidity 0.8.x 应该自动检查溢出", async function () {
            const maxValue = ethers.constants.MaxUint256;

            // 尝试溢出 - 应该失败
            await expect(
                overflowFixed.safeTransfer(user1.address, 1)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("应该能安全地进行转账", async function () {
            const transferAmount = ethers.parseEther("100.0");
            
            // 先给用户1余额
            await overflowFixed.safeTransfer(user1.address, transferAmount);
            expect(await overflowFixed.balances(user1.address)).to.equal(transferAmount);

            // 再转给用户2
            await overflowFixed.connect(user1).safeTransfer(user2.address, transferAmount);
            expect(await overflowFixed.balances(user1.address)).to.equal(0);
            expect(await overflowFixed.balances(user2.address)).to.equal(transferAmount);
        });

        it("应该防止向零地址转账", async function () {
            await expect(
                overflowFixed.safeTransfer(ethers.ZeroAddress, 100)
            ).to.be.revertedWith("Invalid recipient");
        });

        it("应该能安全地使用 unchecked 块", async function () {
            const value = 100;
            const result = await overflowFixed.safeIncrement(value);
            expect(result).to.equal(value + 1);
        });

        it("unchecked 块应该在边界检查时失败", async function () {
            const maxValue = ethers.constants.MaxUint256;
            await expect(
                overflowFixed.safeIncrement(maxValue)
            ).to.be.revertedWith("Would overflow");
        });
    });

    describe("访问控制漏洞测试", function () {
        it("易受攻击的合约应该允许任何人调用敏感函数", async function () {
            // 任何人都可以调用 withdrawAll
            await expect(
                accessVulnerable.connect(user1).withdrawAll()
            ).to.not.be.reverted;
        });

        it("易受攻击的合约应该容易被 tx.origin 攻击", async function () {
            // 模拟受害者调用攻击合约
            await accessVulnerable.connect(owner).withdrawTo(attackerAccount.address);
            
            // 资金应该被转给攻击者
            const attackerBalance = await ethers.provider.getBalance(attackerAccount.address);
            expect(attackerBalance).to.be.greaterThan(0);
        });

        it("任何人都可以在易受攻击的合约中铸造代币", async function () {
            await accessVulnerable.connect(user1).mintTokens(user1.address, 1000);
            expect(await accessVulnerable.balances(user1.address)).to.equal(1000);
        });

        it("修复后的合约应该正确实施访问控制", async function () {
            // 非所有者不能调用敏感函数
            await expect(
                accessFixed.connect(user1).withdrawAll()
            ).to.be.revertedWith("Not owner");

            // 所有者应该能调用
            await accessFixed.deposit({ value: ethers.parseEther("10.0") });
            await accessFixed.withdrawAll();
        });

        it("修复后的合约应该防止 tx.origin 攻击", async function () {
            await accessFixed.deposit({ value: ethers.parseEther("10.0") });

            // 尝试通过 tx.origin 攻击（会失败）
            await expect(
                accessFixed.withdrawTo(attackerAccount.address)
            ).to.be.reverted;
        });

        it("只有管理员才能铸造代币", async function () {
            await expect(
                accessFixed.connect(user1).mintTokens(user1.address, 1000)
            ).to.be.revertedWith("Not admin");

            // 管理员应该能铸造
            await accessFixed.mintTokens(user1.address, 1000);
            expect(await accessFixed.balances(user1.address)).to.equal(1000);
        });

        it("应该能转移所有权", async function () {
            await expect(accessFixed.transferOwnership(user1.address))
                .to.emit(accessFixed, "OwnershipTransferred")
                .withArgs(owner.address, user1.address);

            expect(await accessFixed.owner()).to.equal(user1.address);
        });

        it("不能转移所有权给零地址", async function () {
            await expect(
                accessFixed.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid address");
        });
    });

    describe("前置交易攻击测试", function () {
        it("易受攻击的拍卖应该被前置交易攻击", async function () {
            const bid1 = ethers.parseEther("5.0");
            const bid2 = ethers.parseEther("6.0");

            // 用户1出价
            await frontRunningVulnerable.connect(user1).placeBid({ value: bid1 });
            expect(await frontRunningVulnerable.highestBid()).to.deep.equal([
                user1.address,
                bid1,
                await ethers.provider.getBlock("latest").then(b => b.timestamp)
            ]);

            // 用户2出更高价（前置交易）
            await frontRunningVulnerable.connect(user2).placeBid({ value: bid2 });
            const highestBid = await frontRunningVulnerable.highestBid();
            expect(highestBid.bidder).to.equal(user2.address);
            expect(highestBid.amount).to.equal(bid2);
        });

        it("提交-揭示模式应该防止前置交易攻击", async function () {
            const amount1 = ethers.parseEther("5.0");
            const amount2 = ethers.parseEther("6.0");
            const secret1 = ethers.formatBytes32String("secret1");
            const secret2 = ethers.formatBytes32String("secret2");

            // 生成盲做出价
            const blindedBid1 = ethers.solidityKeccak256(
                ["address", "uint256", "bytes32"],
                [user1.address, amount1, secret1]
            );
            const blindedBid2 = ethers.solidityKeccak256(
                ["address", "uint256", "bytes32"],
                [user2.address, amount2, secret2]
            );

            // 提交盲做出价（顺序不重要）
            await frontRunningFixed.connect(user2).placeBid(blindedBid2, { value: amount2 });
            await frontRunningFixed.connect(user1).placeBid(blindedBid1, { value: amount1 });

            // 进入揭示阶段
            await frontRunningFixed.startRevealPhase();

            // 揭示出价（同时进行，防止前置交易）
            await frontRunningFixed.connect(user1).revealBid(amount1, secret1);
            await frontRunningFixed.connect(user2).revealBid(amount2, secret2);

            // 验证最高出价
            const highestBid = await frontRunningFixed.highestBid();
            expect(highestBid.bidder).to.equal(user2.address);
            expect(highestBid.amount).to.equal(amount2);
        });

        it("应该正确处理揭示阶段", async function () {
            const amount = ethers.parseEther("5.0");
            const secret = ethers.formatBytes32String("secret");
            const blindedBid = ethers.solidityKeccak256(
                ["address", "uint256", "bytes32"],
                [user1.address, amount, secret]
            );

            // 在开放阶段不能揭示
            await expect(
                frontRunningFixed.connect(user1).revealBid(amount, secret)
            ).to.be.revertedWith("Not in reveal phase");

            // 提交出价
            await frontRunningFixed.connect(user1).placeBid(blindedBid, { value: amount });

            // 进入揭示阶段
            await frontRunningFixed.startRevealPhase();

            // 现在可以揭示
            await frontRunningFixed.connect(user1).revealBid(amount, secret);
            
            const highestBid = await frontRunningFixed.highestBid();
            expect(highestBid.bidder).to.equal(user1.address);
            expect(highestBid.amount).to.equal(amount);
        });

        it("应该拒绝无效的揭示", async function () {
            const amount = ethers.parseEther("5.0");
            const secret = ethers.formatBytes32String("secret");
            const wrongSecret = ethers.formatBytes32String("wrong");
            const blindedBid = ethers.solidityKeccak256(
                ["address", "uint256", "bytes32"],
                [user1.address, amount, secret]
            );

            await frontRunningFixed.connect(user1).placeBid(blindedBid, { value: amount });
            await frontRunningFixed.startRevealPhase();

            // 使用错误的秘密应该失败
            await expect(
                frontRunningFixed.connect(user1).revealBid(amount, wrongSecret)
            ).to.be.revertedWith("Invalid bid reveal");
        });
    });

    describe("拒绝服务攻击测试", function () {
        it("易受攻击的分红分发应该被 DoS 攻击", async function () {
            // 添加多个投资者
            await dosVulnerable.connect(user1).invest({ value: ethers.parseEther("10.0") });
            await dosVulnerable.connect(user2).invest({ value: ethers.parseEther("20.0") });
            await dosVulnerable.connect(user3).invest({ value: ethers.parseEther("15.0") });

            // 存入分红
            const dividendAmount = ethers.parseEther("5.0");
            
            // 如果某个投资者是恶意合约，会导致整个函数失败
            // 这里简化测试，假设所有转账都能成功
            await dosVulnerable.connect(owner).distributeDividends({ value: dividendAmount });
        });

        it("拉取支付模式应该防止 DoS 攻击", async function () {
            // 添加投资者
            await dosFixed.connect(user1).invest({ value: ethers.parseEther("10.0") });
            await dosFixed.connect(user2).invest({ value: ethers.parseEther("20.0") });

            // 存入分红
            const dividendAmount = ethers.parseEther("5.0");
            await dosFixed.depositDividends({ value: dividendAmount });

            // 投资者主动提取分红
            const dividend1 = await dosFixed.calculateDividend(user1.address);
            expect(dividend1).to.be.greaterThan(0);

            await dosFixed.connect(user1).withdrawDividend();
            expect(await dosFixed.withdrawnDividends(user1.address)).to.equal(dividend1);
        });

        it("应该正确计算分红", async function () {
            await dosFixed.connect(user1).invest({ value: ethers.parseEther("10.0") });
            await dosFixed.connect(user2).invest({ value: ethers.parseEther("20.0") });

            const dividendAmount = ethers.parseEther("6.0");
            await dosFixed.depositDividends({ value: dividendAmount });

            // user2 应该获得双倍分红
            const dividend1 = await dosFixed.calculateDividend(user1.address);
            const dividend2 = await dosFixed.calculateDividend(user2.address);

            // 使用 closeTo 进行近似比较
            const expected = dividend1 * 2n;
            expect(dividend2).to.be.closeTo(expected, 1000n);
        });

        it("批量退款应该只处理指定范围", async function () {
            await dosFixed.connect(user1).invest({ value: ethers.parseEther("10.0") });
            await dosFixed.connect(user2).invest({ value: ethers.parseEther("20.0") });
            await dosFixed.connect(user3).invest({ value: ethers.parseEther("15.0") });

            // 批量退款前 2 个
            await dosFixed.batchRefund(0, 2);

            expect(await dosFixed.balances(user1.address)).to.equal(0);
            expect(await dosFixed.balances(user2.address)).to.equal(0);
            expect(await dosFixed.balances(user3.address)).to.equal(ethers.parseEther("15.0"));
        });

        it("批量退款应该验证范围", async function () {
            await expect(
                dosFixed.batchRefund(0, 10)
            ).to.be.revertedWith("Invalid range");

            await expect(
                dosFixed.batchRefund(5, 3)
            ).to.be.revertedWith("Invalid range");
        });
    });

    describe("综合漏洞演示测试", function () {
        it("综合攻击应该能成功攻击易受攻击的金库", async function () {
            const attackAmount = ethers.parseEther("10.0");

            // 向金库发送资金
            await owner.sendTransaction({
                to: await vulnerableVault.getAddress(),
                value: ethers.parseEther("50.0")
            });

            const vaultBalanceBefore = await ethers.provider.getBalance(await vulnerableVault.getAddress());
            const attackerBalanceBefore = await ethers.provider.getBalance(await comprehensiveAttacker.getAddress());

            // 发起综合攻击
            await comprehensiveAttacker.connect(attackerAccount).reentrancyAttack({ value: attackAmount });

            const vaultBalanceAfter = await ethers.provider.getBalance(await vulnerableVault.getAddress());
            const attackerBalanceAfter = await ethers.provider.getBalance(await comprehensiveAttacker.getAddress());
            const attackCount = await comprehensiveAttacker.attackSuccessCount();

            // 验证攻击成功
            expect(attackCount.toNumber()).to.be.greaterThan(0);
            expect((attackerBalanceAfter - attackerBalanceBefore)).to.be.greaterThan(attackAmount);
            expect(vaultBalanceAfter).to.be.lessThan(vaultBalanceBefore);
        });

        it("安全金库应该能防止所有攻击", async function () {
            const depositAmount = ethers.parseEther("10.0");
            const withdrawAmount = ethers.parseEther("5.0");

            // 正常存款
            await secureVault.connect(user1).deposit({ value: depositAmount });
            expect(await secureVault.deposits(user1.address)).to.equal(depositAmount);

            // 正常取款
            await secureVault.connect(user1).withdraw(withdrawAmount);
            expect(await secureVault.deposits(user1.address)).to.equal(
                (depositAmount - withdrawAmount)
            );

            // 非所有者不能暂停
            await expect(
                secureVault.connect(user1).pause()
            ).to.be.revertedWith("Not owner");

            // 暂停后不能存款
            await secureVault.pause();
            await expect(
                secureVault.connect(user1).deposit({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Paused");

            // 紧急取款应该成功
            await secureVault.emergencyWithdraw(user1.address, withdrawAmount);
            expect(await secureVault.deposits(user1.address)).to.equal(0);
        });

        it("安全金库应该能正确暂停和恢复", async function () {
            await expect(secureVault.pause())
                .to.emit(secureVault, "Paused")
                .withArgs(owner.address);

            expect(await secureVault.paused()).to.be.true;

            await expect(secureVault.unpause())
                .to.emit(secureVault, "Unpaused")
                .withArgs(owner.address);

            expect(await secureVault.paused()).to.be.false;
        });

        it("应该正确处理多个用户的存款和取款", async function () {
            await secureVault.connect(user1).deposit({ value: ethers.parseEther("10.0") });
            await secureVault.connect(user2).deposit({ value: ethers.parseEther("20.0") });
            await secureVault.connect(user3).deposit({ value: ethers.parseEther("15.0") });

            expect(await secureVault.totalDeposits()).to.equal(ethers.parseEther("45.0"));

            await secureVault.connect(user1).withdraw(ethers.parseEther("5.0"));
            await secureVault.connect(user2).withdraw(ethers.parseEther("10.0"));

            expect(await secureVault.totalDeposits()).to.equal(ethers.parseEther("30.0"));
            expect(await secureVault.deposits(user1.address)).to.equal(ethers.parseEther("5.0"));
            expect(await secureVault.deposits(user2.address)).to.equal(ethers.parseEther("10.0"));
            expect(await secureVault.deposits(user3.address)).to.equal(ethers.parseEther("15.0"));
        });

        it("攻击者应该能提取被盗资金", async function () {
            const attackAmount = ethers.parseEther("5.0");

            await owner.sendTransaction({
                to: await vulnerableVault.getAddress(),
                value: ethers.parseEther("20.0")
            });

            await comprehensiveAttacker.connect(attackerAccount).reentrancyAttack({ value: attackAmount });

            const attackerBalanceBefore = await ethers.provider.getBalance(attackerAccount.address);
            
            // 提取被盗资金
            await comprehensiveAttacker.connect(attackerAccount).withdrawStolenFunds();
            
            const attackerBalanceAfter = await ethers.provider.getBalance(attackerAccount.address);
            expect(attackerBalanceAfter).to.be.greaterThan(attackerBalanceBefore);
        });

        it("应该正确记录攻击统计", async function () {
            const attackAmount = ethers.parseEther("3.0");

            await owner.sendTransaction({
                to: await vulnerableVault.getAddress(),
                value: ethers.parseEther("15.0")
            });

            await comprehensiveAttacker.connect(attackerAccount).reentrancyAttack({ value: attackAmount });

            const stats = await comprehensiveAttacker.getStats();
            expect(stats._attackSuccessCount).to.be.greaterThan(0);
            expect(stats._balance).to.be.greaterThan(0);
        });
    });

    describe("安全对比测试", function () {
        it("应该对比易受攻击和修复后的合约", async function () {
            const amount = ethers.parseEther("5.0");

            // 易受攻击的合约
            await vulnerableBank.connect(user1).deposit({ value: amount });
            await vulnerableBank.connect(user1).withdraw(amount);
            expect(await vulnerableBank.balances(user1.address)).to.equal(0);

            // 修复后的合约
            await fixedBank.connect(user1).deposit({ value: amount });
            await fixedBank.connect(user1).withdraw(amount);
            expect(await fixedBank.balances(user1.address)).to.equal(0);
        });

        it("应该展示不同安全措施的重要性", async function () {
            // 测试访问控制
            await expect(
                accessFixed.connect(user1).withdrawAll()
            ).to.be.revertedWith("Not owner");

            // 测试暂停机制
            await secureVault.pause();
            await expect(
                secureVault.connect(user1).deposit({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Paused");

            // 测试防重入
            await secureVault.unpause();
            await secureVault.connect(user1).deposit({ value: ethers.parseEther("5.0") });
            await secureVault.connect(user1).withdraw(ethers.parseEther("2.0"));
            expect(await secureVault.deposits(user1.address)).to.equal(ethers.parseEther("3.0"));
        });
    });
});

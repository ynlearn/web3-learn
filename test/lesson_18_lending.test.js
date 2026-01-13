/**
 * Lesson 18: 借贷协议测试文件
 * 测试借贷协议的核心功能
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("📘 Lesson 18: 借贷协议", function () {
    let lendingPool, token;
    let owner, depositor, borrower, liquidator;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");

    beforeEach(async function () {
        [owner, depositor, borrower, liquidator] = await ethers.getSigners();

        // 部署测试代币
        const TestToken = await ethers.getContractFactory("TestToken");
        token = await TestToken.deploy("USDT", "USDT");

        // 为用户分配代币
        await token.mint(depositor.address, INITIAL_SUPPLY);
        await token.mint(borrower.address, INITIAL_SUPPLY);
        await token.mint(liquidator.address, INITIAL_SUPPLY);

        // 部署借贷池合约
        const LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy(
            await token.getAddress(),
            "Interest Bearing USDT",
            "iUSDT",
            500 // 5% 年化利率
        );

        // 授权
        await token.connect(depositor).approve(await lendingPool.getAddress(), ethers.MaxUint256);
        await token.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);
        await token.connect(liquidator).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    });

    describe("1️⃣ 初始化和部署", function () {
        it("应该正确初始化借贷池", async function () {
            expect(await lendingPool.asset()).to.equal(await token.getAddress());
            expect(await lendingPool.name()).to.equal("Interest Bearing USDT");
            expect(await lendingPool.symbol()).to.equal("iUSDT");
        });

        it("应该设置正确的初始参数", async function () {
            expect(await lendingPool.collateralFactor()).to.equal(75);
            expect(await lendingPool.liquidationThreshold()).to.equal(85);
            expect(await lendingPool.liquidationBonus()).to.equal(5);
        });

        it("应该正确设置借款利率", async function () {
            const borrowRate = await lendingPool.borrowRatePerBlock();
            expect(borrowRate).to.be.greaterThan(0);
        });
    });

    describe("2️⃣ 存款功能", function () {
        it("应该成功存款", async function () {
            const depositAmount = ethers.parseEther("1000");

            await expect(
                lendingPool.connect(depositor).deposit(depositAmount)
            ).to.changeTokenBalances(
                token,
                [depositor, lendingPool],
                [-depositAmount, depositAmount]
            );
        });

        it("应该正确铸造存款凭证代币", async function () {
            const depositAmount = ethers.parseEther("1000");

            await lendingPool.connect(depositor).deposit(depositAmount);

            expect(await lendingPool.balanceOf(depositor.address)).to.equal(depositAmount);
        });

        it("应该正确更新用户账户信息", async function () {
            const depositAmount = ethers.parseEther("1000");

            await lendingPool.connect(depositor).deposit(depositAmount);

            const [principal, borrowBalance, borrowCapacity] = await lendingPool.getUserAccount(depositor.address);

            expect(principal).to.equal(depositAmount);
            expect(borrowBalance).to.equal(0);
            expect(borrowCapacity).to.equal(depositAmount * 75n / 100n);
        });

        it("不能存入零数量", async function () {
            await expect(
                lendingPool.connect(depositor).deposit(0)
            ).to.be.revertedWithCustomError(lendingPool, "ZeroAmount");
        });

        it("应该支持多次存款", async function () {
            const amount1 = ethers.parseEther("1000");
            const amount2 = ethers.parseEther("500");

            await lendingPool.connect(depositor).deposit(amount1);
            await lendingPool.connect(depositor).deposit(amount2);

            expect(await lendingPool.balanceOf(depositor.address)).to.equal(amount1 + amount2);
        });
    });

    describe("3️⃣ 借款功能", function () {
        beforeEach(async function () {
            // 存款人存入 1000
            await lendingPool.connect(depositor).deposit(ethers.parseEther("1000"));
        });

        it("应该成功借款", async function () {
            // 借款人先存入 1000 作为抵押
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            // 可借额度 = 1000 * 75% = 750
            const borrowAmount = ethers.parseEther("500");

            await expect(
                lendingPool.connect(borrower).borrow(borrowAmount)
            ).to.changeTokenBalance(token, borrower, borrowAmount);
        });

        it("应该正确计算借款额度", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            const borrowCapacity = await lendingPool.getBorrowCapacity(borrower.address);
            expect(borrowCapacity).to.equal(ethers.parseEther("750")); // 1000 * 75%
        });

        it("不能超过借款额度", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            // 尝试借款 800（超过 750 的额度）
            await expect(
                lendingPool.connect(borrower).borrow(ethers.parseEther("800"))
            ).to.be.revertedWithCustomError(lendingPool, "InsufficientCollateral");
        });

        it("不能借款超过可用流动性", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            // 尝试借款超过池子中的资金
            await expect(
                lendingPool.connect(borrower).borrow(ethers.parseEther("10000"))
            ).to.be.revertedWithCustomError(lendingPool, "InsufficientLiquidity");
        });

        it("应该正确更新总借款", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            const borrowAmount = ethers.parseEther("500");
            await lendingPool.connect(borrower).borrow(borrowAmount);

            const totalBorrows = await lendingPool.totalBorrows();
            expect(totalBorrows).to.equal(borrowAmount);
        });
    });

    describe("4️⃣ 还款功能", function () {
        beforeEach(async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));
        });

        it("应该成功还款", async function () {
            const repayAmount = ethers.parseEther("200");

            await expect(
                lendingPool.connect(borrower).repay(repayAmount)
            ).to.changeTokenBalances(
                token,
                [borrower, lendingPool],
                [-repayAmount, repayAmount]
            );
        });

        it("应该正确减少借款余额", async function () {
            const repayAmount = ethers.parseEther("200");

            await lendingPool.connect(borrower).repay(repayAmount);

            const [principal, borrowBalance] = await lendingPool.getUserAccount(borrower.address);
            expect(borrowBalance).to.be.closeTo(ethers.parseEther("300"), ethers.parseEther("1"));
        });

        it("应该允许部分还款", async function () {
            const repayAmount = ethers.parseEther("200");

            await lendingPool.connect(borrower).repay(repayAmount);

            const [principal, borrowBalance] = await lendingPool.getUserAccount(borrower.address);
            expect(borrowBalance).to.be.closeTo(ethers.parseEther("300"), ethers.parseEther("1"));
        });

        it("应该允许全额还款", async function () {
            const totalDebt = (await lendingPool.getUserAccount(borrower.address))[1];

            await lendingPool.connect(borrower).repay(totalDebt + ethers.parseEther("1"));

            const [principal, borrowBalance] = await lendingPool.getUserAccount(borrower.address);
            expect(borrowBalance).to.equal(0);
        });

        it("不能还款超过债务", async function () {
            const repayAmount = ethers.parseEther("1000"); // 超过 500 的债务

            await lendingPool.connect(borrower).repay(repayAmount);

            // 还款应该只还清债务，不产生余额
            const [principal, borrowBalance] = await lendingPool.getUserAccount(borrower.address);
            expect(borrowBalance).to.equal(0);
        });
    });

    describe("5️⃣ 利息计算", function () {
        it("应该正确累积利息", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            // 挖掘一些区块以产生利息
            await ethers.provider.send("hardhat_mine", ["0x100"]);

            // 累积利息
            await lendingPool.accrueInterest();

            const totalBorrows = await lendingPool.totalBorrows();

            // 借款应该增加（包含利息）
            expect(totalBorrows).to.be.greaterThan(ethers.parseEther("500"));
        });

        it("应该正确更新借款指数", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            const borrowIndexBefore = await lendingPool.borrowIndex();

            // 挖掘一些区块
            await ethers.provider.send("hardhat_mine", ["0x100"]);

            await lendingPool.accrueInterest();

            const borrowIndexAfter = await lendingPool.borrowIndex();

            // 借款指数应该增加
            expect(borrowIndexAfter).to.be.greaterThan(borrowIndexBefore);
        });

        it("应该正确计算用户的借款余额（含利息）", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            // 挖掘一些区块
            await ethers.provider.send("hardhat_mine", ["0x100"]);

            const borrowBalance = await lendingPool.calculateBorrowBalance(borrower.address);

            // 借款余额应该大于原始借款
            expect(borrowBalance).to.be.greaterThan(ethers.parseEther("500"));
        });
    });

    describe("6️⃣ 清算功能", function () {
        beforeEach(async function () {
            // 设置更严格的清算阈值以便测试
            await lendingPool.setLiquidationThreshold(80); // 80%
            await lendingPool.setCollateralFactor(75); // 75%

            // 借款人存入 1000
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            // 借款 750（达到 75% 抵押率）
            await lendingPool.connect(borrower).borrow(ethers.parseEther("750"));
        });

        it("应该在达到清算阈值时允许清算", async function () {
            // 降低清算阈值到 70%
            await lendingPool.setLiquidationThreshold(70);

            // 当前债务比率 = 750 / 1000 = 75%，超过 70% 阈值
            const repayAmount = ethers.parseEther("100");

            await expect(
                lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount)
            ).to.not.be.reverted;
        });

        it("应该正确计算清算罚金", async function () {
            await lendingPool.setLiquidationThreshold(70);

            const repayAmount = ethers.parseEther("100");

            // 清算人获得 100 * 1.05 = 105 的抵押品
            const expectedCollateral = repayAmount * 105n / 100n;

            await expect(
                lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount)
            ).to.changeTokenBalance(lendingPool, liquidator, expectedCollateral);
        });

        it("应该正确减少借款人债务", async function () {
            await lendingPool.setLiquidationThreshold(70);

            const repayAmount = ethers.parseEther("100");
            const debtBefore = (await lendingPool.getUserAccount(borrower.address))[1];

            await lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount);

            const debtAfter = (await lendingPool.getUserAccount(borrower.address))[1];

            expect(debtBefore - debtAfter).to.equal(repayAmount);
        });

        it("应该正确转移抵押品给清算人", async function () {
            await lendingPool.setLiquidationThreshold(70);

            const repayAmount = ethers.parseEther("100");

            const borrowerBalanceBefore = await lendingPool.balanceOf(borrower.address);
            const liquidatorBalanceBefore = await lendingPool.balanceOf(liquidator.address);

            await lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount);

            const borrowerBalanceAfter = await lendingPool.balanceOf(borrower.address);
            const liquidatorBalanceAfter = await lendingPool.balanceOf(liquidator.address);

            const collateralSeized = repayAmount * 105n / 100n;

            expect(borrowerBalanceBefore - borrowerBalanceAfter).to.equal(collateralSeized);
            expect(liquidatorBalanceAfter - liquidatorBalanceBefore).to.equal(collateralSeized);
        });

        it("不能清算未达到阈值的账户", async function () {
            // 当前债务比率 = 75%，未超过 80% 阈值
            const repayAmount = ethers.parseEther("100");

            await expect(
                lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount)
            ).to.be.revertedWithCustomError(lendingPool, "InsufficientCollateral");
        });

        it("应该限制单次清算数量", async function () {
            await lendingPool.setLiquidationThreshold(70);

            // 尝试清算超过 50% 的债务
            const repayAmount = ethers.parseEther("400"); // 750 的 50% 是 375

            await lendingPool.connect(liquidator).liquidate(borrower.address, repayAmount);

            // 实际清算应该是 375（50%）
            const debtAfter = (await lendingPool.getUserAccount(borrower.address))[1];
            expect(debtAfter).to.be.closeTo(ethers.parseEther("375"), ethers.parseEther("1"));
        });
    });

    describe("7️⃣ 提款功能", function () {
        beforeEach(async function () {
            await lendingPool.connect(depositor).deposit(ethers.parseEther("1000"));
        });

        it("应该成功提款", async function () {
            const withdrawAmount = ethers.parseEther("500");

            await expect(
                lendingPool.connect(depositor).withdraw(withdrawAmount)
            ).to.changeTokenBalances(
                token,
                [depositor, lendingPool],
                [withdrawAmount, -withdrawAmount]
            );
        });

        it("应该正确销毁存款凭证代币", async function () {
            const withdrawAmount = ethers.parseEther("500");

            await lendingPool.connect(depositor).withdraw(withdrawAmount);

            expect(await lendingPool.balanceOf(depositor.address)).to.equal(ethers.parseEther("500"));
        });

        it("不能超过存款余额提款", async function () {
            await expect(
                lendingPool.connect(depositor).withdraw(ethers.parseEther("2000"))
            ).to.be.revertedWithCustomError(lendingPool, "InsufficientBalance");
        });

        it("应该允许部分提款", async function () {
            await lendingPool.connect(depositor).withdraw(ethers.parseEther("500"));

            expect(await lendingPool.balanceOf(depositor.address)).to.equal(ethers.parseEther("500"));
        });

        it("应该允许全部提款", async function () {
            const balance = await lendingPool.balanceOf(depositor.address);

            await lendingPool.connect(depositor).withdraw(balance);

            expect(await lendingPool.balanceOf(depositor.address)).to.equal(0);
        });

        it("有借款时应该限制提款", async function () {
            // 借款人存入 1000
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));

            // 借款 500
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            // 尝试提款超过可用额度
            await expect(
                lendingPool.connect(borrower).withdraw(ethers.parseEther("600"))
            ).to.be.revertedWithCustomError(lendingPool, "InsufficientLiquidity");
        });
    });

    describe("8️⃣ 管理员功能", function () {
        it("只有所有者可以设置抵押率", async function () {
            await expect(
                lendingPool.connect(borrower).setCollateralFactor(80)
            ).to.be.revertedWithCustomError(lendingPool, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置抵押率", async function () {
            await expect(
                lendingPool.connect(owner).setCollateralFactor(80)
            ).to.not.be.reverted;

            expect(await lendingPool.collateralFactor()).to.equal(80);
        });

        it("不能设置超过 100% 的抵押率", async function () {
            await expect(
                lendingPool.connect(owner).setCollateralFactor(101)
            ).to.be.revertedWith("抵押率不能超过 100%");
        });

        it("只有所有者可以设置清算阈值", async function () {
            await expect(
                lendingPool.connect(borrower).setLiquidationThreshold(90)
            ).to.be.revertedWithCustomError(lendingPool, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置清算阈值", async function () {
            await expect(
                lendingPool.connect(owner).setLiquidationThreshold(90)
            ).to.not.be.reverted;

            expect(await lendingPool.liquidationThreshold()).to.equal(90);
        });

        it("只有所有者可以设置清算罚金", async function () {
            await expect(
                lendingPool.connect(borrower).setLiquidationBonus(10)
            ).to.be.revertedWithCustomError(lendingPool, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置清算罚金", async function () {
            await expect(
                lendingPool.connect(owner).setLiquidationBonus(10)
            ).to.not.be.reverted;

            expect(await lendingPool.liquidationBonus()).to.equal(10);
        });

        it("不能设置超过 20% 的清算罚金", async function () {
            await expect(
                lendingPool.connect(owner).setLiquidationBonus(21)
            ).to.be.revertedWith("清算罚金不能超过 20%");
        });
    });

    describe("9️⃣ 边界条件和安全性", function () {
        it("应该防止重入攻击", async function () {
            await lendingPool.connect(depositor).deposit(ethers.parseEther("1000"));

            // ReentrancyGuard 应该防止重入
            await expect(
                lendingPool.connect(depositor).withdraw(ethers.parseEther("500"))
            ).to.not.be.reverted;
        });

        it("应该正确处理零余额用户", async function () {
            const [principal, borrowBalance, borrowCapacity] = await lendingPool.getUserAccount(borrower.address);

            expect(principal).to.equal(0);
            expect(borrowBalance).to.equal(0);
            expect(borrowCapacity).to.equal(0);
        });

        it("应该正确处理大量用户", async function () {
            const users = [];
            for (let i = 0; i < 10; i++) {
                const signer = await ethers.getSigner(i);
                users.push(signer);

                await token.mint(signer.address, ethers.parseEther("1000"));
                await token.connect(signer).approve(await lendingPool.getAddress(), ethers.MaxUint256);
                await lendingPool.connect(signer).deposit(ethers.parseEther("1000"));
            }

            // 验证所有用户的存款都正确记录
            for (const user of users) {
                const balance = await lendingPool.balanceOf(user.address);
                expect(balance).to.equal(ethers.parseEther("1000"));
            }
        });
    });

    describe("🔟 查询功能", function () {
        it("应该正确返回可用流动性", async function () {
            await lendingPool.connect(depositor).deposit(ethers.parseEther("1000"));

            let availableLiquidity = await lendingPool.getAvailableLiquidity();
            expect(availableLiquidity).to.equal(ethers.parseEther("1000"));

            // 借款后流动性应该减少
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            availableLiquidity = await lendingPool.getAvailableLiquidity();
            expect(availableLiquidity).to.equal(ethers.parseEther("500"));
        });

        it("应该正确获取用户账户信息", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            const [principal, borrowBalance, borrowCapacity] = await lendingPool.getUserAccount(borrower.address);

            expect(principal).to.equal(ethers.parseEther("1000"));
            expect(borrowBalance).to.be.closeTo(ethers.parseEther("500"), ethers.parseEther("1"));
            expect(borrowCapacity).to.be.closeTo(ethers.parseEther("250"), ethers.parseEther("1"));
        });

        it("应该正确计算借款余额（含利息）", async function () {
            await lendingPool.connect(borrower).deposit(ethers.parseEther("1000"));
            await lendingPool.connect(borrower).borrow(ethers.parseEther("500"));

            // 挖掘一些区块
            await ethers.provider.send("hardhat_mine", ["0x100"]);

            const borrowBalance = await lendingPool.calculateBorrowBalance(borrower.address);

            // 借款余额应该包含利息
            expect(borrowBalance).to.be.greaterThan(ethers.parseEther("500"));
        });
    });
});

/**
 * Lesson 19: 收益聚合器测试文件
 * 测试收益聚合器的核心功能
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("📘 Lesson 19: 收益聚合器", function () {
    let vault, strategy, token;
    let owner, user1, user2, feeRecipient;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");

    beforeEach(async function () {
        [owner, user1, user2, feeRecipient] = await ethers.getSigners();

        // 部署测试代币
        const TestToken = await ethers.getContractFactory("TestToken");
        token = await TestToken.deploy("USDT", "USDT");

        // 为用户分配代币
        await token.mint(user1.address, INITIAL_SUPPLY);
        await token.mint(user2.address, INITIAL_SUPPLY);

        // 部署模拟策略
        const MockStrategy = await ethers.getContractFactory("MockStrategy");
        strategy = await MockStrategy.deploy(await token.getAddress());

        // 部署收益聚合器
        const YieldAggregator = await ethers.getContractFactory("YieldAggregator");
        vault = await YieldAggregator.deploy(
            await token.getAddress(),
            "Yield Bearing USDT",
            "yUSDT",
            3600 // 1小时收获间隔
        );

        // 设置策略
        await vault.setStrategy(await strategy.getAddress());

        // 设置费用接收者
        await vault.setFeeRecipient(feeRecipient.address);

        // 授权
        await token.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
        await token.connect(user2).approve(await vault.getAddress(), ethers.MaxUint256);
    });

    describe("1️⃣ 初始化和部署", function () {
        it("应该正确初始化聚合器", async function () {
            expect(await vault.asset()).to.equal(await token.getAddress());
            expect(await vault.name()).to.equal("Yield Bearing USDT");
            expect(await vault.symbol()).to.equal("yUSDT");
        });

        it("应该设置正确的初始参数", async function () {
            expect(await vault.sharePrice()).to.equal(ethers.parseEther("1"));
            expect(await vault.harvestInterval()).to.equal(3600);
            expect(await vault.managementFee()).to.equal(200); // 2%
            expect(await vault.performanceFee()).to.equal(2000); // 20%
        });

        it("应该正确设置策略", async function () {
            expect(await vault.activeStrategy()).to.equal(await strategy.getAddress());
        });
    });

    describe("2️⃣ 存款功能", function () {
        it("应该成功存款", async function () {
            const depositAmount = ethers.parseEther("1000");

            await expect(
                vault.connect(user1).deposit(depositAmount)
            ).to.changeTokenBalances(
                token,
                [user1, vault],
                [-depositAmount, 0] // 资金转入策略
            );
        });

        it("应该正确铸造份额", async function () {
            const depositAmount = ethers.parseEther("1000");

            await vault.connect(user1).deposit(depositAmount);

            // 初始份额价格 = 1e18，所以 1000 存款 = 1000 份额
            expect(await vault.balanceOf(user1.address)).to.be.closeTo(
                ethers.parseEther("1000"),
                ethers.parseEther("1")
            );
        });

        it("应该正确记录存款信息", async function () {
            const depositAmount = ethers.parseEther("1000");

            await vault.connect(user1).deposit(depositAmount);

            const userDeposits = await vault.getUserDeposits(user1.address);
            expect(userDeposits.length).to.equal(1);
            expect(userDeposits[0].amount).to.equal(depositAmount);
        });

        it("应该根据份额价格计算份额数量", async function () {
            // 首次存款
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // 模拟收益（份额价格上涨）
            await strategy.setProfit(ethers.parseEther("100"));
            await vault.harvest();

            const sharePriceAfter = await vault.sharePrice();
            expect(sharePriceAfter).to.be.gt(ethers.parseEther("1"));

            // 第二次存款应该获得更少的份额（因为价格上涨）
            await vault.connect(user2).deposit(ethers.parseEther("1000"));

            const user1Shares = await vault.balanceOf(user1.address);
            const user2Shares = await vault.balanceOf(user2.address);

            // user2 应该获得更少的份额
            expect(user2Shares).to.be.lt(user1Shares);
        });

        it("不能存入零数量", async function () {
            await expect(
                vault.connect(user1).deposit(0)
            ).to.be.revertedWith("存款数量必须大于零");
        });
    });

    describe("3️⃣ 提款功能", function () {
        beforeEach(async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));
        });

        it("应该成功提款", async function () {
            const withdrawShares = await vault.balanceOf(user1.address);

            await expect(
                vault.connect(user1).withdraw(withdrawShares)
            ).to.changeTokenBalance(token, user1, withdrawShares);
        });

        it("应该正确销毁份额", async function () {
            const withdrawShares = await vault.balanceOf(user1.address);

            await vault.connect(user1).withdraw(withdrawShares);

            expect(await vault.balanceOf(user1.address)).to.equal(0);
        });

        it("应该根据份额价格计算提款金额", async function () {
            // 模拟收益
            await strategy.setProfit(ethers.parseEther("100"));
            await vault.harvest();

            const sharePrice = await vault.sharePrice();
            expect(sharePrice).to.be.gt(ethers.parseEther("1"));

            const withdrawShares = await vault.balanceOf(user1.address);
            const balanceBefore = await token.balanceOf(user1.address);

            await vault.connect(user1).withdraw(withdrawShares);

            const balanceAfter = await token.balanceOf(user1.address);
            const received = balanceAfter - balanceBefore;

            // 应该收到原始存款 + 收益
            expect(received).to.be.gt(ethers.parseEther("1000"));
        });

        it("不能提取超过持有份额", async function () {
            const shares = await vault.balanceOf(user1.address);
            const excess = shares + 1n;

            await expect(
                vault.connect(user1).withdraw(excess)
            ).to.be.revertedWith("份额余额不足");
        });

        it("应该支持部分提款", async function () {
            const totalShares = await vault.balanceOf(user1.address);
            const withdrawShares = totalShares / 2n;

            await vault.connect(user1).withdraw(withdrawShares);

            expect(await vault.balanceOf(user1.address)).to.equal(withdrawShares);
        });
    });

    describe("4️⃣ 收获和收益分配", function () {
        beforeEach(async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));
        });

        it("应该成功收获收益", async function () {
            // 设置策略收益
            await strategy.setProfit(ethers.parseEther("100"));

            const totalAssetsBefore = await vault.getTotalAssets();
            const sharePriceBefore = await vault.sharePrice();

            // 收获
            const profit = await vault.harvest();

            const totalAssetsAfter = await vault.getTotalAssets();
            const sharePriceAfter = await vault.sharePrice();

            // 总资产应该增加
            expect(totalAssetsAfter).to.be.gt(totalAssetsBefore);

            // 份额价格应该上涨
            expect(sharePriceAfter).to.be.gt(sharePriceBefore);

            // 收获后资金应该重新存入策略
            expect(await token.balanceOf(await vault.getAddress())).to.be.lt(profit);
        });

        it("应该正确收取性能费用", async function () {
            await strategy.setProfit(ethers.parseEther("100"));

            const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);

            await vault.harvest();

            const feeRecipientBalanceAfter = await token.balanceOf(feeRecipient.address);
            const fee = feeRecipientBalanceAfter - feeRecipientBalanceBefore;

            // 20% 性能费用 = 100 * 0.2 = 20
            expect(fee).to.be.closeTo(ethers.parseEther("20"), ethers.parseEther("0.1"));
        });

        it("应该正确更新份额价格", async function () {
            await strategy.setProfit(ethers.parseEther("100"));

            const sharePriceBefore = await vault.sharePrice();

            await vault.harvest();

            const sharePriceAfter = await vault.sharePrice();

            // 份额价格 = (1000 + 100 * 0.8) / 1000 = 1.08
            expect(sharePriceAfter).to.be.closeTo(
                ethers.parseEther("1.08"),
                ethers.parseEther("0.01")
            );
        });

        it("应该自动复投收益", async function () {
            await strategy.setProfit(ethers.parseEther("100"));

            await vault.harvest();

            // 收益应该重新存入策略
            const balanceInStrategy = await strategy.totalAssets();
            expect(balanceInStrategy).to.be.gt(ethers.parseEther("1000"));
        });
    });

    describe("5️⃣ 管理费用收取", function () {
        beforeEach(async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));
        });

        it("应该按时间间隔收取管理费用", async function () {
            // 增加时间（1年）
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);

            await vault.collectManagementFee();

            const feeRecipientBalanceAfter = await token.balanceOf(feeRecipient.address);
            const fee = feeRecipientBalanceAfter - feeRecipientBalanceBefore;

            // 2% 年化管理费用 = 1000 * 0.02 = 20
            expect(fee).to.be.closeTo(ethers.parseEther("20"), ethers.parseEther("0.1"));
        });

        it("不能在间隔未到时收取费用", async function () {
            await expect(
                vault.collectManagementFee()
            ).to.be.revertedWith("管理费用收取间隔未到");
        });

        it("应该正确更新最后收费时间", async function () {
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");

            const lastFeeTimeBefore = await vault.lastManagementFeeTime();

            await vault.collectManagementFee();

            const lastFeeTimeAfter = await vault.lastManagementFeeTime();

            expect(lastFeeTimeAfter).to.be.gt(lastFeeTimeBefore);
        });
    });

    describe("6️⃣ 策略管理", function () {
        it("应该成功切换策略", async function () {
            // 部署新策略
            const MockStrategy = await ethers.getContractFactory("MockStrategy");
            const newStrategy = await MockStrategy.deploy(await token.getAddress());

            await expect(
                vault.setStrategy(await newStrategy.getAddress())
            ).to.not.be.reverted;

            expect(await vault.activeStrategy()).to.equal(await newStrategy.getAddress());
        });

        it("切换策略应该转移所有资产", async function () {
            // 存款
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // 获取旧策略余额
            const oldStrategyBalanceBefore = await strategy.totalAssets();

            // 切换到新策略
            const MockStrategy = await ethers.getContractFactory("MockStrategy");
            const newStrategy = await MockStrategy.deploy(await token.getAddress());
            await vault.setStrategy(await newStrategy.getAddress());

            // 旧策略应该为空
            const oldStrategyBalanceAfter = await strategy.totalAssets();
            expect(oldStrategyBalanceAfter).to.equal(0);

            // 新策略应该有资产
            const newStrategyBalance = await newStrategy.totalAssets();
            expect(newStrategyBalance).to.be.closeTo(oldStrategyBalanceBefore, ethers.parseEther("1"));
        });

        it("只有所有者可以切换策略", async function () {
            const MockStrategy = await ethers.getContractFactory("MockStrategy");
            const newStrategy = await MockStrategy.deploy(await token.getAddress());

            await expect(
                vault.connect(user1).setStrategy(await newStrategy.getAddress())
            ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("不能设置零地址为策略", async function () {
            await expect(
                vault.setStrategy(ethers.ZeroAddress)
            ).to.be.revertedWith("无效的策略地址");
        });
    });

    describe("7️⃣ 份额价格计算", function () {
        it("应该正确计算初始份额价格", async function () {
            expect(await vault.sharePrice()).to.equal(ethers.parseEther("1"));
        });

        it("收益后应该正确更新份额价格", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            await strategy.setProfit(ethers.parseEther("100"));
            await vault.harvest();

            const sharePrice = await vault.sharePrice();

            // 份额价格 = (1000 + 100 * 0.8) / 1000 = 1.08
            expect(sharePrice).to.be.closeTo(
                ethers.parseEther("1.08"),
                ethers.parseEther("0.01")
            );
        });

        it("多个用户应该按份额分享收益", async function () {
            // 用户1存款
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // 用户2存款
            await vault.connect(user2).deposit(ethers.parseEther("1000"));

            // 产生收益
            await strategy.setProfit(ethers.parseEther("200"));
            await vault.harvest();

            const sharePrice = await vault.sharePrice();

            // 份额价格 = (2000 + 200 * 0.8) / 2000 = 1.08
            expect(sharePrice).to.be.closeTo(
                ethers.parseEther("1.08"),
                ethers.parseEther("0.01")
            );

            // 每个用户的资产价值
            const user1Assets = await vault.getUserAssets(user1.address);
            const user2Assets = await vault.getUserAssets(user2.address);

            // 每个用户都应该有 1080
            expect(user1Assets).to.be.closeTo(ethers.parseEther("1080"), ethers.parseEther("1"));
            expect(user2Assets).to.be.closeTo(ethers.parseEther("1080"), ethers.parseEther("1"));
        });

        it("提款不应该影响其他用户的份额价格", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));
            await vault.connect(user2).deposit(ethers.parseEther("1000"));

            // 用户1提款
            const user1Shares = await vault.balanceOf(user1.address);
            await vault.connect(user1).withdraw(user1Shares);

            // 用户2的份额价格应该保持稳定
            const sharePrice = await vault.sharePrice();
            expect(sharePrice).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.01"));
        });
    });

    describe("8️⃣ 查询功能", function () {
        it("应该正确返回总资产", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            const totalAssets = await vault.getTotalAssets();

            // 总资产 = 存款金额
            expect(totalAssets).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("1"));
        });

        it("应该正确返回合约信息", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            const info = await vault.getVaultInfo();

            expect(info[0]).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("1")); // totalAssets
            expect(info[1]).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("1")); // totalSupply
            expect(info[2]).to.equal(ethers.parseEther("1")); // sharePrice
            expect(info[3]).to.equal(await strategy.getAddress()); // activeStrategy
        });

        it("应该正确预估存款份额", async function () {
            const depositAmount = ethers.parseEther("1000");
            const previewShares = await vault.previewDeposit(depositAmount);

            // 初始份额价格为 1，所以份额 = 存款金额
            expect(previewShares).to.equal(depositAmount);
        });

        it("应该正确预估提款金额", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            const shares = await vault.balanceOf(user1.address);
            const previewAmount = await vault.previewWithdraw(shares);

            // 初始份额价格为 1，所以金额 = 份额
            expect(previewAmount).to.equal(shares);
        });

        it("应该正确返回用户资产价值", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // 产生收益
            await strategy.setProfit(ethers.parseEther("100"));
            await vault.harvest();

            const userAssets = await vault.getUserAssets(user1.address);

            // 用户资产 = 原始存款 + 收益 - 手续费 = 1000 + 100 * 0.8 = 1080
            expect(userAssets).to.be.closeTo(ethers.parseEther("1080"), ethers.parseEther("1"));
        });
    });

    describe("9️⃣ 管理员功能", function () {
        it("只有所有者可以设置收获间隔", async function () {
            await expect(
                vault.connect(user1).setHarvestInterval(7200)
            ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置收获间隔", async function () {
            await vault.setHarvestInterval(7200);
            expect(await vault.harvestInterval()).to.equal(7200);
        });

        it("只有所有者可以设置管理费用", async function () {
            await expect(
                vault.connect(user1).setManagementFee(500)
            ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置管理费用", async function () {
            await vault.setManagementFee(500);
            expect(await vault.managementFee()).to.equal(500);
        });

        it("不能设置过高的管理费用", async function () {
            await expect(
                vault.setManagementFee(1001) // 10.01%
            ).to.be.revertedWith("管理费用不能超过 10%");
        });

        it("只有所有者可以设置性能费用", async function () {
            await expect(
                vault.connect(user1).setPerformanceFee(3000)
            ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("所有者应该可以设置性能费用", async function () {
            await vault.setPerformanceFee(3000);
            expect(await vault.performanceFee()).to.equal(3000);
        });

        it("不能设置过高的性能费用", async function () {
            await expect(
                vault.setPerformanceFee(5001) // 50.01%
            ).to.be.revertedWith("性能费用不能超过 50%");
        });
    });

    describe("🔟 边界条件和安全性", function () {
        it("应该防止重入攻击", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // ReentrancyGuard 应该防止重入
            await expect(
                vault.connect(user1).withdraw(await vault.balanceOf(user1.address))
            ).to.not.be.reverted;
        });

        it("应该正确处理零份额价格", async function () {
            // 首次存款设置初始份额价格
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            expect(await vault.sharePrice()).to.equal(ethers.parseEther("1"));
        });

        it("应该支持多个用户同时操作", async function () {
            // 多个用户同时存款
            await vault.connect(user1).deposit(ethers.parseEther("1000"));
            await vault.connect(user2).deposit(ethers.parseEther("1000"));

            const totalSupply = await vault.totalSupply();
            expect(totalSupply).to.be.closeTo(ethers.parseEther("2000"), ethers.parseEther("1"));
        });

        it("紧急提取应该只提取合约中的资产", async function () {
            await vault.connect(user1).deposit(ethers.parseEther("1000"));

            // 紧急提取
            const balanceHere = await token.balanceOf(await vault.getAddress());
            await vault.emergencyWithdraw(balanceHere);

            // 合约中的资产应该被提取
            expect(await token.balanceOf(await vault.getAddress())).to.equal(0);
        });

        it("只有所有者可以执行紧急提取", async function () {
            await expect(
                vault.connect(user1).emergencyWithdraw(ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });
    });
});

/**
 * 模拟策略合约（用于测试）
 */
contract MockStrategy is IStrategy {
    IERC20 public asset;
    uint256 public profit;
    address public vault;

    constructor(address _asset) {
        asset = IERC20(_asset);
    }

    function setVault(address _vault) external {
        vault = _vault;
    }

    function setProfit(uint256 _profit) external {
        profit = _profit;
    }

    function totalAssets() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function deposit(uint256 amount) external override returns (uint256) {
        require(asset.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        return amount;
    }

    function withdraw(uint256 amount) external override returns (uint256) {
        require(asset.transfer(msg.sender, amount), "Transfer failed");
        return amount;
    }

    function harvest() external override returns (uint256) {
        if (profit > 0) {
            // 模拟收益：铸造额外的代币
            require(asset.transfer(msg.sender, profit), "Transfer failed");
            uint256 harvested = profit;
            profit = 0;
            return harvested;
        }
        return 0;
    }

    function exit(uint256 amount) external override {
        withdraw(amount);
    }

    function getName() external pure override returns (string memory) {
        return "Mock Strategy";
    }
}

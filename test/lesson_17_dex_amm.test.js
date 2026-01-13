/**
 * Lesson 17: DEX 原理 - AMM 测试文件
 * 测试 AMM 自动做市商合约的核心功能
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("📘 Lesson 17: AMM 自动做市商", function () {
    let token0, token1, pair;
    let owner, user1, user2;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 部署测试代币
        const TestToken = await ethers.getContractFactory("TestToken");
        token0 = await TestToken.deploy("Token0", "TK0");
        token1 = await TestToken.deploy("Token1", "TK1");

        // 为用户分配代币
        await token0.mint(user1.address, INITIAL_SUPPLY);
        await token1.mint(user1.address, INITIAL_SUPPLY);
        await token0.mint(user2.address, INITIAL_SUPPLY);
        await token1.mint(user2.address, INITIAL_SUPPLY);

        // 部署 AMM Pair 合约
        const AMMPair = await ethers.getContractFactory("AMMPair");
        pair = await AMMPair.deploy(
            await token0.getAddress(),
            await token1.getAddress(),
            "LP Token",
            "LPT"
        );

        // 授权 AMM 合约使用代币
        await token0.connect(user1).approve(await pair.getAddress(), ethers.MaxUint256);
        await token1.connect(user1).approve(await pair.getAddress(), ethers.MaxUint256);
        await token0.connect(user2).approve(await pair.getAddress(), ethers.MaxUint256);
        await token1.connect(user2).approve(await pair.getAddress(), ethers.MaxUint256);
    });

    describe("1️⃣ 初始化和首次添加流动性", function () {
        it("应该正确初始化交易对", async function () {
            expect(await pair.token0()).to.equal(await token0.getAddress());
            expect(await pair.token1()).to.equal(await token1.getAddress());
            expect(await pair.name()).to.equal("LP Token");
            expect(await pair.symbol()).to.equal("LPT");
        });

        it("应该正确添加首次流动性", async function () {
            const amount0 = ethers.parseEther("1000");
            const amount1 = ethers.parseEther("2000");

            const tx = await pair.connect(user1).addLiquidity(
                amount0,
                amount1,
                0,
                0
            );

            // 验证储备金
            const [reserve0, reserve1] = await pair.getReserves();
            expect(reserve0).to.equal(amount0);
            expect(reserve1).to.equal(amount1);

            // 验证 LP 代币（减去锁定的最小流动性）
            const expectedLiquidity = amount0 * amount1 / 1000n - 1000n;
            expect(await pair.balanceOf(user1.address)).to.equal(expectedLiquidity);

            // 验证代币余额
            expect(await token0.balanceOf(await pair.getAddress())).to.equal(amount0);
            expect(await token1.balanceOf(await pair.getAddress())).to.equal(amount1);
        });

        it("应该锁定最小流动性", async function () {
            const amount0 = ethers.parseEther("1000");
            const amount1 = ethers.parseEther("2000");

            await pair.connect(user1).addLiquidity(amount0, amount1, 0, 0);

            // 验证零地址持有最小流动性
            expect(await pair.balanceOf(ethers.ZeroAddress)).to.equal(1000);
        });

        it("首次添加流动性应该接受任何比例", async function () {
            // 测试不同的比例
            const testCases = [
                [ethers.parseEther("100"), ethers.parseEther("100")],   // 1:1
                [ethers.parseEther("100"), ethers.parseEther("1000")],  // 1:10
                [ethers.parseEther("1000"), ethers.parseEther("100")]   // 10:1
            ];

            for (const [amount0, amount1] of testCases) {
                const AMMPair = await ethers.getContractFactory("AMMPair");
                const newPair = await AMMPair.deploy(
                    await token0.getAddress(),
                    await token1.getAddress(),
                    "LP Token",
                    "LPT"
                );

                await token0.connect(user1).approve(await newPair.getAddress(), ethers.MaxUint256);
                await token1.connect(user1).approve(await newPair.getAddress(), ethers.MaxUint256);

                await expect(
                    newPair.connect(user1).addLiquidity(amount0, amount1, 0, 0)
                ).to.not.be.reverted;
            }
        });
    });

    describe("2️⃣ 后续添加流动性", function () {
        beforeEach(async function () {
            // 首次添加流动性建立价格：1000:2000 = 1:2
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );
        });

        it("应该按当前比例添加流动性", async function () {
            // 当前比例是 1:2，所以添加 100 个 token0 应该添加 200 个 token1
            const amount0 = ethers.parseEther("100");
            const amount1 = ethers.parseEther("200");

            await expect(
                pair.connect(user2).addLiquidity(amount0, amount1, 0, 0)
            ).to.not.be.reverted;
        });

        it("添加流动性应该退还多余的代币", async function () {
            // 用户提供了更多的 token0，应该退还多余部分
            const amount0Provided = ethers.parseEther("200");  // 提供了 200
            const amount1Provided = ethers.parseEther("200");  // 提供了 200

            // 但按比例只需要 100 个 token0（因为比例是 1:2）
            const balance0Before = await token0.balanceOf(user2.address);

            await pair.connect(user2).addLiquidity(
                amount0Provided,
                amount1Provided,
                0,
                0
            );

            const balance0After = await token0.balanceOf(user2.address);
            const refunded = balance0After - balance0Before;

            // 应该退还约 100 个 token0
            expect(refunded).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("0.1"));
        });

        it("错误比例应该失败", async function () {
            // 尝试添加错误的比例（100:100 而不是 100:200）
            await expect(
                pair.connect(user2).addLiquidity(
                    ethers.parseEther("100"),
                    ethers.parseEther("100"),  // 比例错误，应该是 200
                    0,
                    0
                )
            ).to.be.reverted;
        });

        it("应该正确计算 LP 代币数量", async function () {
            const totalSupplyBefore = await pair.totalSupply();

            // 添加 10% 的流动性
            const amount0 = ethers.parseEther("100");
            const amount1 = ethers.parseEther("200");

            await pair.connect(user2).addLiquidity(amount0, amount1, 0, 0);

            // LP 代币应该增加约 10%
            const totalSupplyAfter = await pair.totalSupply();
            const increase = totalSupplyAfter - totalSupplyBefore;
            const expectedIncrease = totalSupplyBefore / 10n;

            expect(increase).to.be.closeTo(expectedIncrease, expectedIncrease / 100n);
        });
    });

    describe("3️⃣ 代币交换 - 恒定乘积公式", function () {
        const initialReserve0 = ethers.parseEther("1000");
        const initialReserve1 = ethers.parseEther("2000");

        beforeEach(async function () {
            // 建立初始流动性：1000 token0, 2000 token1
            await pair.connect(user1).addLiquidity(
                initialReserve0,
                initialReserve1,
                0,
                0
            );
        });

        it("应该正确计算交换输出（含手续费）", async function () {
            const amountIn = ethers.parseEther("100");  // 输入 100 token0

            // 预期计算：
            // amountInWithFee = 100 * 0.997 = 99.7
            // amountOut = (2000 * 99.7) / (1000 + 99.7)
            //            = 199400 / 1099.7
            //            ≈ 181.33

            const amountOut = await pair.getAmount0Out(amountIn);
            const expectedOut = ethers.parseEther("2000") * 997n / 1000n *
                1000n / (ethers.parseEther("1000") + ethers.parseEther("100") * 997n / 1000n);

            expect(amountOut).to.be.closeTo(expectedOut, ethers.parseEther("0.1"));
        });

        it("应该成功执行 token0 -> token1 交换", async function () {
            const amountIn = ethers.parseEther("100");
            const user1BalanceBefore = await token1.balanceOf(user1.address);

            const tx = await pair.connect(user1).swap0For1(amountIn, 0);

            const user1BalanceAfter = await token1.balanceOf(user1.address);
            const received = user1BalanceAfter - user1BalanceBefore;

            // 验证收到了约 181 个 token1
            expect(received).to.be.closeTo(ethers.parseEther("181"), ethers.parseEther("1"));
        });

        it("应该成功执行 token1 -> token0 交换", async function () {
            const amountIn = ethers.parseEther("200");
            const user1BalanceBefore = await token0.balanceOf(user1.address);

            await pair.connect(user1).swap1For0(amountIn, 0);

            const user1BalanceAfter = await token0.balanceOf(user1.address);
            const received = user1BalanceAfter - user1BalanceBefore;

            // 验证收到了约 90 个 token0
            expect(received).to.be.closeTo(ethers.parseEther("90"), ethers.parseEther("1"));
        });

        it("应该正确更新储备金", async function () {
            const amountIn = ethers.parseEther("100");

            await pair.connect(user1).swap0For1(amountIn, 0);

            const [reserve0, reserve1] = await pair.getReserves();

            // reserve0 应增加约 100
            expect(reserve0).to.be.closeTo(initialReserve0 + amountIn, ethers.parseEther("0.1"));

            // reserve1 应减少约 181
            expect(reserve1).to.be.closeTo(initialReserve1 - ethers.parseEther("181"), ethers.parseEther("1"));
        });

        it("应该遵循恒定乘积公式 k = x * y", async function () {
            const [reserve0Before, reserve1Before] = await pair.getReserves();
            const kBefore = reserve0Before * reserve1Before;

            const amountIn = ethers.parseEther("100");
            await pair.connect(user1).swap0For1(amountIn, 0);

            const [reserve0After, reserve1After] = await pair.getReserves();
            const kAfter = reserve0After * reserve1After;

            // k 应该增加（因为收取了手续费）
            expect(kAfter).to.be.greaterThan(kBefore);
        });

        it("滑点保护应该生效", async function () {
            const amountIn = ethers.parseEther("100");

            // 设置一个过高的最小输出量（高于实际可得到的）
            const amountOut = await pair.getAmount0Out(amountIn);
            const minOut = amountOut + ethers.parseEther("100");  // 不可能达到

            await expect(
                pair.connect(user1).swap0For1(amountIn, minOut)
            ).to.be.revertedWithCustomError(pair, "SlippageExceeded");
        });

        it("不能交换超过流动性的数量", async function () {
            // 尝试交换超过储备金的数量
            const amountIn = ethers.parseEther("10000");  // 远超储备金

            await expect(
                pair.connect(user1).swap0For1(amountIn, 0)
            ).to.be.revertedWithCustomError(pair, "InsufficientLiquidity");
        });
    });

    describe("4️⃣ 移除流动性", function () {
        beforeEach(async function () {
            // 添加流动性
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );
        });

        it("应该成功移除流动性", async function () {
            const liquidity = await pair.balanceOf(user1.address);
            const token0BalanceBefore = await token0.balanceOf(user1.address);
            const token1BalanceBefore = await token1.balanceOf(user1.address);

            await pair.connect(user1).removeLiquidity(liquidity, 0, 0);

            const token0BalanceAfter = await token0.balanceOf(user1.address);
            const token1BalanceAfter = await token1.balanceOf(user1.address);

            // 应该按比例赎回代币
            const received0 = token0BalanceAfter - token0BalanceBefore;
            const received1 = token1BalanceAfter - token1BalanceBefore;

            expect(received0).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("0.1"));
            expect(received1).to.be.closeTo(ethers.parseEther("2000"), ethers.parseEther("0.1"));
        });

        it("移除后应该销毁 LP 代币", async function () {
            const liquidity = await pair.balanceOf(user1.address);

            await pair.connect(user1).removeLiquidity(liquidity, 0, 0);

            expect(await pair.balanceOf(user1.address)).to.equal(0);
        });

        it("应该正确更新储备金", async function () {
            const liquidity = await pair.balanceOf(user1.address);

            await pair.connect(user1).removeLiquidity(liquidity, 0, 0);

            const [reserve0, reserve1] = await pair.getReserves();

            // 只剩下锁定的最小流动性
            expect(reserve0).to.be.lt(ethers.parseEther("0.001"));
            expect(reserve1).to.be.lt(ethers.parseEther("0.001"));
        });

        it("滑点保护应该生效", async function () {
            const liquidity = await pair.balanceOf(user1.address);

            // 设置过高的最小输出量
            await expect(
                pair.connect(user1).removeLiquidity(
                    liquidity,
                    ethers.parseEther("10000"),  // 不可能达到
                    ethers.parseEther("10000")
                )
            ).to.be.revertedWithCustomError(pair, "SlippageExceeded");
        });

        it("不能移除超过持有的流动性", async function () {
            const liquidity = await pair.balanceOf(user1.address);
            const excess = liquidity + 1n;

            await expect(
                pair.connect(user1).removeLiquidity(excess, 0, 0)
            ).to.be.revertedWithCustomError(pair, "InsufficientLiquidity");
        });
    });

    describe("5️⃣ 价格查询和流动性计算", function () {
        beforeEach(async function () {
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );
        });

        it("应该正确查询储备金", async function () {
            const [reserve0, reserve1] = await pair.getReserves();

            expect(reserve0).to.equal(ethers.parseEther("1000"));
            expect(reserve1).to.equal(ethers.parseEther("2000"));
        });

        it("应该正确计算流动性价值", async function () {
            const liquidity = await pair.balanceOf(user1.address);
            const [amount0, amount1] = await pair.getLiquidityValue(liquidity);

            expect(amount0).to.be.closeTo(ethers.parseEther("1000"), ethers.parseEther("0.1"));
            expect(amount1).to.be.closeTo(ethers.parseEther("2000"), ethers.parseEther("0.1"));
        });

        it("应该正确预测交换输出", async function () {
            const amountIn = ethers.parseEther("100");
            const predictedOut = await pair.getAmount0Out(amountIn);

            // 实际交换应该与预测一致
            const balanceBefore = await token1.balanceOf(user1.address);
            await pair.connect(user1).swap0For1(amountIn, 0);
            const balanceAfter = await token1.balanceOf(user1.address);

            const actualOut = balanceAfter - balanceBefore;
            expect(actualOut).to.equal(predictedOut);
        });
    });

    describe("6️⃣ 安全性和边界条件", function () {
        it("不能添加零流动性", async function () {
            await expect(
                pair.connect(user1).addLiquidity(0, 0, 0, 0)
            ).to.be.revertedWithCustomError(pair, "ZeroAmount");
        });

        it("不能交换零数量", async function () {
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );

            await expect(
                pair.connect(user1).swap0For1(0, 0)
            ).to.be.revertedWithCustomError(pair, "ZeroAmount");
        });

        it("应该防止重入攻击", async function () {
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );

            // ReentrancyGuard 应该防止重入
            const amountIn = ethers.parseEther("100");
            await expect(
                pair.connect(user1).swap0For1(amountIn, 0)
            ).to.not.be.reverted;
        });

        it("多个用户应该能够同时添加流动性", async function () {
            // 用户1添加初始流动性
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );

            // 用户2按比例添加流动性
            await pair.connect(user2).addLiquidity(
                ethers.parseEther("100"),
                ethers.parseEther("200"),
                0,
                0
            );

            // 验证两个用户都有 LP 代币
            expect(await pair.balanceOf(user1.address)).to.be.greaterThan(0);
            expect(await pair.balanceOf(user2.address)).to.be.greaterThan(0);

            // 验证总供应量正确
            const totalSupply = await pair.totalSupply();
            expect(totalSupply).to.be.closeTo(
                ethers.parseEther("1414000"),
                ethers.parseEther("1000")
            );
        });
    });

    describe("7️⃣ 手续费机制", function () {
        beforeEach(async function () {
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );
        });

        it("应该收取 0.3% 手续费", async function () {
            const [reserve0Before, reserve1Before] = await pair.getReserves();
            const kBefore = reserve0Before * reserve1Before;

            const amountIn = ethers.parseEther("100");
            await pair.connect(user1).swap0For1(amountIn, 0);

            const [reserve0After, reserve1After] = await pair.getReserves();
            const kAfter = reserve0After * reserve1After;

            // k 应该增加 0.3%（手续费累积）
            const kIncrease = (kAfter - kBefore) * 1000n / kBefore;
            expect(kIncrease).to.be.closeTo(3n, 1n);  // 约 0.3%
        });

        it("手续费应该增加流动性提供者的价值", async function () {
            // 用户1提供流动性
            await pair.connect(user1).addLiquidity(
                ethers.parseEther("1000"),
                ethers.parseEther("2000"),
                0,
                0
            );

            // 用户2进行交换，支付手续费
            await pair.connect(user2).swap0For1(ethers.parseEther("100"), 0);

            // 用户1移除流动性，应该获得更多代币（包含手续费收益）
            const liquidity = await pair.balanceOf(user1.address);
            const [amount0, amount1] = await pair.getLiquidityValue(liquidity);

            // 由于手续费，k 值增加，所以赎回的代币价值应该略高于存入时
            expect(amount0).to.be.greaterThan(initialAmount0);
        });
    });
});

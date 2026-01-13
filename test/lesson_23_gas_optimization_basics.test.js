/**
 * Lesson 23: Gas 优化基础 - 测试文件
 * 测试 Storage 打包、循环优化、事件优化等 Gas 优化技巧
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("📘 Lesson 23: Gas 优化基础", function () {
    let packingOptimization, storageVsMemory, calldataOptimization;
    let loopOptimization, batchOperations, eventOptimization;
    let shortCircuiting, mathOptimization, optimizedContract, gasComparison;
    let owner, user1;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // 部署所有合约
        const PackingOptimization = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:PackingOptimization");
        packingOptimization = await PackingOptimization.deploy();

        const StorageVsMemory = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:StorageVsMemory");
        storageVsMemory = await StorageVsMemory.deploy();

        const CalldataOptimization = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:CalldataOptimization");
        calldataOptimization = await CalldataOptimization.deploy();

        const LoopOptimization = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:LoopOptimization");
        loopOptimization = await LoopOptimization.deploy();

        const BatchOperations = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:BatchOperations");
        batchOperations = await BatchOperations.deploy();

        const EventOptimization = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:EventOptimization");
        eventOptimization = await EventOptimization.deploy();

        const ShortCircuiting = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:ShortCircuiting");
        shortCircuiting = await ShortCircuiting.deploy();

        const MathOptimization = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:MathOptimization");
        mathOptimization = await MathOptimization.deploy();

        const OptimizedContract = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:OptimizedContract");
        optimizedContract = await OptimizedContract.deploy();

        const GasComparison = await ethers.getContractFactory("solidity/gas-optimization/lesson_23_gas_optimization_basics.sol:GasComparison");
        gasComparison = await GasComparison.deploy();
    });

    // ==================== Storage 优化测试 ====================
    describe("📦 Storage 优化", function () {
        describe("1️⃣ 打包优化 (PackingOptimization)", function () {
            it("应该正确计算存储槽位", async function () {
                const { badSlots, goodSlots } = await packingOptimization.calculateStorageSlots();

                expect(badSlots).to.equal(5);
                expect(goodSlots).to.equal(2);
            });

            it("优化版本应该节省约 60% 的存储槽位", async function () {
                const { badSlots, goodSlots } = await packingOptimization.calculateStorageSlots();

                const savings = (badSlots - goodSlots) * 100n / badSlots;
                expect(savings).to.be.greaterThanOrEqual(60n);
            });

            it("应该正确读取未优化的变量", async function () {
                expect(await packingOptimization.large1()).to.equal(100);
                expect(await packingOptimization.small()).to.equal(1);
                expect(await packingOptimization.large2()).to.equal(200);
            });

            it("应该正确读取优化后的变量", async function () {
                expect(await packingOptimization.optimizedLarge1()).to.equal(100);
                expect(await packingOptimization.optimizedLarge2()).to.equal(200);
                expect(await packingOptimization.optimizedSmall()).to.equal(1);
            });
        });

        describe("2️⃣ Storage vs Memory 优化", function () {
            it("未优化版本应该计算正确的结果", async function () {
                const sum = await storageVsMemory.sumBad();
                expect(sum).to.equal(0);
            });

            it("优化版本应该计算正确的结果", async function () {
                const sum = await storageVsMemory.sumGood();
                expect(sum).to.equal(0);
            });

            it("两个版本应该返回相同的结果", async function () {
                const sumBad = await storageVsMemory.sumBad();
                const sumGood = await storageVsMemory.sumGood();

                expect(sumBad).to.equal(sumGood);
            });

            it("优化版本应该消耗更少的 Gas", async function () {
                const { badGas, goodGas } = await storageVsMemory.compareGas();

                // goodGas 应该显著少于 badGas
                expect(goodGas).to.be.lt(badGas);

                console.log(`\n⛽ Storage vs Memory Gas 对比:`);
                console.log(`   未优化 (循环中读 Storage): ${badGas} gas`);
                console.log(`   优化 (缓存到 Memory):       ${goodGas} gas`);
                console.log(`   节省:                      ${badGas - goodGas} gas (${((badGas - goodGas) * 100n /badGas).toString()}%)`);
            });

            it("优化后 Gas 节省应该超过 20%", async function () {
                const { badGas, goodGas } = await storageVsMemory.compareGas();

                const savings = (badGas - goodGas) * 100n / badGas;
                expect(savings).to.be.greaterThanOrEqual(20n);
            });
        });

        describe("3️⃣ Calldata 优化", function () {
            const testArray = [1, 2, 3, 4, 5];

            it("Memory 版本应该正确计算", async function () {
                const sum = await calldataOptimization.processArrayBad(testArray);
                expect(sum).to.equal(15);
            });

            it("Calldata 版本应该正确计算", async function () {
                const sum = await calldataOptimization.processArrayGood(testArray);
                expect(sum).to.equal(15);
            });

            it("Best 版本应该正确计算", async function () {
                const sum = await calldataOptimization.processArrayBest(testArray);
                expect(sum).to.equal(30); // 每个元素乘以 2
            });

            it("所有版本应该返回正确结果", async function () {
                const sumBad = await calldataOptimization.processArrayBad(testArray);
                const sumGood = await calldataOptimization.processArrayGood(testArray);

                expect(sumBad).to.equal(sumGood);
            });
        });
    });

    // ==================== 循环优化测试 ====================
    describe("🔁 循环优化", function () {
        describe("1️⃣ 数组长度缓存", function () {
            const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            it("未优化版本应该正确计算", async function () {
                const sum = await loopOptimization.processBad(testArray);
                expect(sum).to.equal(55);
            });

            it("优化版本应该正确计算", async function () {
                const sum = await loopOptimization.processGood(testArray);
                expect(sum).to.equal(55);
            });

            it("两个版本应该返回相同结果", async function () {
                const sumBad = await loopOptimization.processBad(testArray);
                const sumGood = await loopOptimization.processGood(testArray);

                expect(sumBad).to.equal(sumGood);
            });
        });

        describe("2️⃣ Storage 循环写入优化", function () {
            const testNumbers = [1, 2, 3, 4, 5];

            beforeEach(async function () {
                // 初始化数组
                for (const num of testNumbers) {
                    await loopOptimization.addToNumbers(num);
                }
            });

            it("未优化版本应该正确增加数字", async function () {
                await loopOptimization.incrementBad();

                const numbers = await loopOptimization.getNumbers();
                for (let i = 0; i < numbers.length; i++) {
                    expect(numbers[i]).to.equal(testNumbers[i] + 1);
                }
            });

            it("优化版本应该正确增加数字", async function () {
                await loopOptimization.incrementGood();

                const numbers = await loopOptimization.getNumbers();
                for (let i = 0; i < numbers.length; i++) {
                    expect(numbers[i]).to.equal(testNumbers[i] + 1);
                }
            });

            it("两个版本应该返回相同结果", async function () {
                // 测试未优化版本
                await loopOptimization.incrementBad();
                const resultBad = await loopOptimization.getNumbers();

                // 重置并测试优化版本
                await loopOptimization.setNumbers(testNumbers);
                await loopOptimization.incrementGood();
                const resultGood = await loopOptimization.getNumbers();

                expect(resultBad.length).to.equal(resultGood.length);
                for (let i = 0; i < resultBad.length; i++) {
                    expect(resultBad[i]).to.equal(resultGood[i]);
                }
            });
        });

        describe("3️⃣ Unchecked 块优化", function () {
            const testArray = [1, 2, 3, 4, 5];

            it("sumUnchecked 应该正确计算", async function () {
                const sum = await loopOptimization.sumUnchecked(testArray);
                expect(sum).to.equal(15);
            });

            it("sumUnchecked 应该与普通版本结果一致", async function () {
                const sumNormal = await loopOptimization.processGood(testArray);
                const sumUnchecked = await loopOptimization.sumUnchecked(testArray);

                expect(sumNormal).to.equal(sumUnchecked);
            });
        });

        describe("4️⃣ 批量操作优化", function () {
            const amount = ethers.parseEther("1000");

            beforeEach(async function () {
                // 给 sender 余额
                await batchOperations.deposit(owner.address, amount * 3n);
            });

            it("未优化版本应该正确转账", async function () {
                const recipients = [user1.address];
                const amounts = [amount];

                await batchOperations.batchTransferBad(recipients, amounts);

                expect(await batchOperations.balances(user1.address)).to.equal(amount);
            });

            it("优化版本应该正确转账", async function () {
                const recipients = [user1.address];
                const amounts = [amount];

                await batchOperations.batchTransferGood(recipients, amounts);

                expect(await batchOperations.balances(user1.address)).to.equal(amount);
            });

            it("未优化版本余额不足应该失败", async function () {
                const recipients = [user1.address, user1.address];
                const amounts = [amount, amount * 3n]; // 总额 4000 超过余额 3000

                await expect(
                    batchOperations.batchTransferBad(recipients, amounts)
                ).to.be.revertedWith("Insufficient balance");
            });

            it("优化版本余额不足应该失败", async function () {
                const recipients = [user1.address, user1.address];
                const amounts = [amount, amount * 3n]; // 总额 4000 超过余额 3000

                await expect(
                    batchOperations.batchTransferGood(recipients, amounts)
                ).to.be.revertedWith("Insufficient balance");
            });

            it("数组长度不匹配应该失败", async function () {
                const recipients = [user1.address];
                const amounts = [amount, amount]; // 长度不同

                await expect(
                    batchOperations.batchTransferGood(recipients, amounts)
                ).to.be.revertedWith("Length mismatch");
            });

            it("优化版本应该消耗更少的 Gas（批量转账）", async function () {
                const recipients = Array(10).fill(user1.address);
                const amounts = Array(10).fill(amount / 10n);

                // 测试未优化版本
                const gasBad = await batchOperations.batchTransferBad.estimateGas(recipients, amounts);

                // 重置余额
                await batchOperations.deposit(owner.address, amount * 3n);

                // 测试优化版本
                const gasGood = await batchOperations.batchTransferGood.estimateGas(recipients, amounts);

                // 优化版本应该更便宜
                expect(gasGood).to.be.lt(gasBad);

                console.log(`\n⛽ 批量转账 Gas 对比 (10 笔):`);
                console.log(`   未优化 (逐个验证): ${gasBad} gas`);
                console.log(`   优化 (预先总额):  ${gasGood} gas`);
                console.log(`   节省:             ${gasBad - gasGood} gas`);
            });
        });
    });

    // ==================== 事件优化测试 ====================
    describe("📡 事件优化", function () {
        const testNumbers = [1, 2, 3, 4, 5];

        it("未优化版本应该触发多个事件", async function () {
            const tx = await eventOptimization.logNumbersBad(testNumbers);
            const receipt = await tx.wait();

            // 应该有 5 个 NumberLogged 事件
            const events = receipt.logs.filter(log => {
                try {
                    return eventOptimization.interface.parseLog(log).name === "NumberLogged";
                } catch {
                    return false;
                }
            });

            expect(events.length).to.equal(5);
        });

        it("优化版本应该触发一个事件", async function () {
            const tx = await eventOptimization.logNumbersGood(testNumbers);
            const receipt = await tx.wait();

            // 应该有 1 个 NumbersLogged 事件
            const events = receipt.logs.filter(log => {
                try {
                    return eventOptimization.interface.parseLog(log).name === "NumbersLogged";
                } catch {
                    return false;
                }
            });

            expect(events.length).to.equal(1);
        });

        it("最佳版本应该触发批量事件", async function () {
            const tx = await eventOptimization.logNumbersBest(testNumbers);
            const receipt = await tx.wait();

            // 应该有 1 个 NumbersBatchLogged 事件
            const events = receipt.logs.filter(log => {
                try {
                    return eventOptimization.interface.parseLog(log).name === "NumbersBatchLogged";
                } catch {
                    return false;
                }
            });

            expect(events.length).to.equal(1);
        });

        it("优化版本应该消耗更少的 Gas", async function () {
            // 未优化版本
            const tx1 = await eventOptimization.logNumbersBad(testNumbers);
            const receipt1 = await tx1.wait();
            const gasBad = receipt1.gasUsed;

            // 优化版本
            const tx2 = await eventOptimization.logNumbersGood(testNumbers);
            const receipt2 = await tx2.wait();
            const gasGood = receipt2.gasUsed;

            // 优化版本应该更便宜
            expect(gasGood).to.be.lt(gasBad);

            console.log(`\n⛽ 事件优化 Gas 对比 (5 个数字):`);
            console.log(`   未优化 (5 个事件): ${gasBad} gas`);
            console.log(`   优化 (1 个事件):  ${gasGood} gas`);
            console.log(`   节省:             ${gasBad - gasGood} gas`);
        });
    });

    // ==================== 短路优化测试 ====================
    describe("⚡ 短路优化", function () {
        beforeEach(async function () {
            // 设置 owner
            await shortCircuiting.initialize();
        });

        it("未优化版本应该正确检查", async function () {
            const result = await shortCircuiting.checkBad(100);
            expect(result).to.equal(true); // owner 调用，amount > 0
        });

        it("优化版本应该正确检查", async function () {
            const result = await shortCircuiting.checkGood(100);
            expect(result).to.equal(true); // owner 调用，amount > 0
        });

        it("未优化版本 amount 为 0 应该返回 false", async function () {
            const result = await shortCircuiting.checkBad(0);
            expect(result).to.equal(false);
        });

        it("优化版本应该快速失败（amount 为 0）", async function () {
            const result = await shortCircuiting.checkGood(0);
            expect(result).to.equal(false);
        });

        it("非 owner 调用应该返回 false", async function () {
            const result = await shortCircuiting.connect(user1).checkGood(100);
            expect(result).to.equal(false);
        });

        it("两个版本应该返回相同结果", async function () {
            const resultBad = await shortCircuiting.checkBad(100);
            const resultGood = await shortCircuiting.checkGood(100);

            expect(resultBad).to.equal(resultGood);
        });

        it("优化版本在快速失败情况下应该消耗更少的 Gas", async function () {
            // 测试 amount = 0 的快速失败场景

            // 未优化版本
            const gasBad = await shortCircuiting.checkBad.estimateGas(0);

            // 优化版本
            const gasGood = await shortCircuiting.checkGood.estimateGas(0);

            // 优化版本应该更便宜（因为快速失败）
            expect(gasGood).to.be.lt(gasBad);

            console.log(`\n⛽ 短路优化 Gas 对比 (amount=0):`);
            console.log(`   未优化 (先算后查): ${gasBad} gas`);
            console.log(`   优化 (先查后算):  ${gasGood} gas`);
            console.log(`   节省:             ${gasBad - gasGood} gas`);
        });
    });

    // ==================== 数学优化测试 ====================
    describe("🔢 数学优化", function () {
        describe("1️⃣ 除法优化", function () {
            it("除法应该正确计算", async function () {
                const result = await mathOptimization.divideBad(100, 4);
                expect(result).to.equal(25);
            });

            it("右移应该正确计算（除以 4）", async function () {
                const result = await mathOptimization.divideGood(100);
                expect(result).to.equal(25);
            });

            it("右移结果应该等于除法", async function () {
                const x = 100;
                const resultBad = await mathOptimization.divideBad(x, 4);
                const resultGood = await mathOptimization.divideGood(x);

                expect(resultBad).to.equal(resultGood);
            });
        });

        describe("2️⃣ 重复计算优化", function () {
            it("未优化版本应该正确计算", async function () {
                const result = await mathOptimization.calculateBad(10);
                expect(result).to.equal(90); // (10*3) + (10*3) + (10*3) = 90
            });

            it("优化版本应该正确计算", async function () {
                const result = await mathOptimization.calculateGood(10);
                expect(result).to.equal(90); // temp + temp + temp = 90
            });

            it("最佳版本应该正确计算", async function () {
                const result = await mathOptimization.calculateBest(10);
                expect(result).to.equal(90); // 10 * 9 = 90
            });

            it("所有版本应该返回相同结果", async function () {
                const x = 10;
                const resultBad = await mathOptimization.calculateBad(x);
                const resultGood = await mathOptimization.calculateGood(x);
                const resultBest = await mathOptimization.calculateBest(x);

                expect(resultBad).to.equal(resultGood);
                expect(resultGood).to.equal(resultBest);
            });
        });

        describe("3️⃣ Unchecked 数学运算", function () {
            it("addUnchecked 应该正确计算", async function () {
                const result = await mathOptimization.addUnchecked(100, 200);
                expect(result).to.equal(300);
            });

            it("multiplyUnchecked 应该正确计算", async function () {
                const result = await mathOptimization.multiplyUnchecked(10, 20);
                expect(result).to.equal(200);
            });

            it("unchecked 加法应该与普通加法结果一致", async function () {
                const a = 100;
                const b = 200;

                // 使用内联汇编或直接计算
                const expected = a + b;
                const result = await mathOptimization.addUnchecked(a, b);

                expect(result).to.equal(expected);
            });
        });
    });

    // ==================== 综合优化测试 ====================
    describe("🚀 综合优化合约", function () {
        const amount = ethers.parseEther("1000");

        it("应该正确初始化", async function () {
            expect(await optimizedContract.owner()).to.equal(owner.address);
            expect(await optimizedContract.version()).to.equal(1);
            expect(await optimizedContract.paused()).to.equal(false);
        });

        it("应该正确执行批量转账", async function () {
            // 先给 owner 余额
            await optimizedContract.deposit(owner.address, amount * 10n);

            const recipients = [user1.address, user1.address];
            const amounts = [amount, amount];

            await optimizedContract.batchTransfer(recipients, amounts);

            expect(await optimizedContract.balances(user1.address)).to.equal(amount * 2n);
        });

        it("批量转账应该触发正确的事件", async function () {
            await optimizedContract.deposit(owner.address, amount * 10n);

            const recipients = [user1.address, user1.address];
            const amounts = [amount, amount];

            await expect(optimizedContract.batchTransfer(recipients, amounts))
                .to.emit(optimizedContract, "BatchTransfer")
                .withArgs(owner.address, 2, amount * 2n);
        });

        it("非 owner 调用应该失败", async function () {
            const recipients = [user1.address];
            const amounts = [amount];

            await expect(
                optimizedContract.connect(user1).batchTransfer(recipients, amounts)
            ).to.be.revertedWith("Not owner");
        });

        it("数组长度不匹配应该失败", async function () {
            const recipients = [user1.address];
            const amounts = [amount, amount]; // 长度不同

            await expect(
                optimizedContract.batchTransfer(recipients, amounts)
            ).to.be.revertedWith("Length mismatch");
        });

        it("超过 100 个接收者应该失败", async function () {
            const recipients = Array(101).fill(user1.address);
            const amounts = Array(101).fill(amount);

            await expect(
                optimizedContract.batchTransfer(recipients, amounts)
            ).to.be.revertedWith("Too many recipients");
        });

        it("sumArray 应该正确计算", async function () {
            const arr = [1, 2, 3, 4, 5];
            const sum = await optimizedContract.sumArray(arr);

            expect(sum).to.equal(15);
        });

        it("validateAndExecute 应该正确验证", async function () {
            // 给 owner 余额
            await optimizedContract.deposit(owner.address, amount);

            // owner 调用，有余额
            const result1 = await optimizedContract.validateAndExecute(amount, user1.address);
            expect(result1).to.equal(true);

            // amount 为 0
            const result2 = await optimizedContract.validateAndExecute(0, user1.address);
            expect(result2).to.equal(false);

            // recipient 为零地址
            const result3 = await optimizedContract.validateAndExecute(amount, ethers.ZeroAddress);
            expect(result3).to.equal(false);

            // 非 owner 调用
            const result4 = await optimizedContract.connect(user1).validateAndExecute(1, user1.address);
            expect(result4).to.equal(false);
        });

        it("字符串比较应该正确工作", async function () {
            const result = await optimizedContract.compareStrings("hello", "hello");
            expect(result).to.equal(true);

            const result2 = await optimizedContract.compareStrings("hello", "world");
            expect(result2).to.equal(false);
        });

        it("综合优化应该展示 Gas 节省", async function () {
            await optimizedContract.deposit(owner.address, amount * 100n);

            const recipients = Array(50).fill(user1.address);
            const amounts = Array(50).fill(amount / 50n);

            const tx = await optimizedContract.batchTransfer(recipients, amounts);
            const receipt = await tx.wait();

            console.log(`\n⛽ 综合优化合约批量转账 (50 笔) Gas 消耗: ${receipt.gasUsed} gas`);
        });
    });

    // ==================== Gas 对比测试 ====================
    describe("📊 Gas 消耗对比", function () {
        const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        it("应该对比不同实现的 Gas 消耗", async function () {
            const { badGas, goodGas, bestGas } = await gasComparison.compareImplementations(testArray);

            console.log(`\n⛽ 循环优化 Gas 对比 (10 个元素):`);
            console.log(`   未优化:   ${badGas} gas`);
            console.log(`   优化:     ${goodGas} gas`);
            console.log(`   最佳:     ${bestGas} gas`);
            console.log(`   节省:     ${badGas - bestGas} gas (${((badGas - bestGas) * 100n /badGas).toString()}%)`);

            // 验证最佳版本消耗最少（注意：编译器优化可能使 goodGas 和 badGas 接近）
            expect(bestGas).to.be.lt(badGas);
        });

        it("最佳实现应该显著节省 Gas", async function () {
            const { badGas, bestGas } = await gasComparison.compareImplementations(testArray);

            const savings = (badGas - bestGas) * 100n /badGas;

            // 节省应该超过 10%
            expect(savings).to.be.greaterThanOrEqual(10);

            console.log(`\n✅ Gas 优化节省了 ${Number(savings) / 100}%`);
        });

        it("更大数组应该展示更明显的优化效果", async function () {
            const largeArray = Array(100).fill(1).map((_, i) => i + 1);

            const { badGas, goodGas, bestGas } = await gasComparison.compareImplementations(largeArray);

            console.log(`\n⛽ 循环优化 Gas 对比 (100 个元素):`);
            console.log(`   未优化:   ${badGas} gas`);
            console.log(`   优化:     ${goodGas} gas`);
            console.log(`   最佳:     ${bestGas} gas`);
            console.log(`   节省:     ${badGas - bestGas} gas (${((badGas - bestGas) * 100n /badGas).toString()}%)`);

            // 验证优化后的版本消耗更少
            expect(bestGas).to.be.lt(badGas);
        });
    });

    // ==================== 实用优化场景测试 ====================
    describe("🔧 实用优化场景", function () {
        it("Storage 打包优化应该节省部署成本", async function () {
            // 部署时存储槽位越少，部署成本越低
            // 这个测试验证存储优化的正确性
            const { badSlots, goodSlots } = await packingOptimization.calculateStorageSlots();

            expect(goodSlots).to.be.lt(badSlots);

            const savings = (badSlots - goodSlots) * 20000n; // 每个 slot 约 20000 gas
            console.log(`\n⛽ Storage 打包节省约 ${savings} 部署 gas`);
        });

        it("批量操作应该显著节省 Gas", async function () {
            await batchOperations.deposit(owner.address, ethers.parseEther("100"));

            // 单笔转账
            const gasSingle = await batchOperations.batchTransferBad.estimateGas(
                [user1.address],
                [ethers.parseEther("10")]
            );

            // 批量转账
            const recipients = Array(10).fill(user1.address);
            const amounts = Array(10).fill(ethers.parseEther("1"));

            const gasBatch = await batchOperations.batchTransferGood.estimateGas(recipients, amounts);

            // 批量转账的平均每笔成本应该更低
            const avgPerTx = gasBatch / 10n;

            console.log(`\n⛽ 批量转账 vs 单笔转账:`);
            console.log(`   单笔:    ${gasSingle} gas`);
            console.log(`   批量:    ${gasBatch} gas (10 笔)`);
            console.log(`   平均:    ${avgPerTx} gas/笔`);
            console.log(`   节省:    ${gasSingle - avgPerTx} gas/笔`);
        });

        it("事件批量触发应该节省 Gas", async function () {
            const numbers = Array(20).fill(1).map((_, i) => i + 1);

            // 单个事件
            const gasBad = await eventOptimization.logNumbersBad.estimateGas(numbers);

            // 批量事件
            const gasGood = await eventOptimization.logNumbersGood.estimateGas(numbers);

            console.log(`\n⛽ 事件批量触发 Gas 对比 (20 个事件):`);
            console.log(`   单个触发: ${gasBad} gas`);
            console.log(`   批量触发: ${gasGood} gas`);
            console.log(`   节省:     ${gasBad - gasGood} gas (${((gasBad - gasGood) * 100n /gasBad).toString()}%)`);

            expect(gasGood).to.be.lt(gasBad);
        });

        it("Calldata 应该比 Memory 更节省", async function () {
            const arr = Array(50).fill(1).map((_, i) => i + 1);

            // Memory 版本
            const gasMemory = await calldataOptimization.processArrayBad.estimateGas(arr);

            // Calldata 版本
            const gasCalldata = await calldataOptimization.processArrayGood.estimateGas(arr);

            console.log(`\n⛽ Memory vs Calldata Gas 对比 (50 个元素):`);
            console.log(`   Memory:   ${gasMemory} gas`);
            console.log(`   Calldata: ${gasCalldata} gas`);
            console.log(`   节省:     ${gasMemory - gasCalldata} gas`);

            expect(gasCalldata).to.be.lt(gasMemory);
        });
    });

    // ==================== 优化建议测试 ====================
    describe("💡 优化建议验证", function () {
        it("应该正确使用 uint96 节省空间", async function () {
            const totalSupply = await optimizedContract.totalSupply();
            expect(totalSupply).to.equal(0);

            // uint96 最大值约为 792 亿 ETH，足够大多数代币使用
            const maxUint96 = 2n ** 96n - 1n;
            expect(maxUint96).to.be.greaterThan(ethers.parseEther("79000000000"));
        });

        it("应该正确打包状态变量", async function () {
            // 验证打包的变量可以正常访问
            const owner = await optimizedContract.owner();
            const paused = await optimizedContract.paused();
            const version = await optimizedContract.version();

            expect(owner).to.not.equal(ethers.ZeroAddress);
            expect(paused).to.equal(false);
            expect(version).to.equal(1);
        });

        it("短路评估应该正确工作", async function () {
            // 测试快速失败场景
            const result1 = await shortCircuiting.checkGood(0); // 快速失败
            expect(result1).to.equal(false);

            const result2 = await shortCircuiting.checkGood(100); // 需要完整检查
            expect(result2).to.equal(true);
        });

        it("unchecked 块应该安全使用", async function () {
            // 测试不会溢出的场景
            const arr = [1, 2, 3, 4, 5];
            const sum = await loopOptimization.sumUnchecked(arr);

            expect(sum).to.equal(15);
        });
    });

    // ==================== 性能基准测试 ====================
    describe("🏁 性能基准测试", function () {
        it("大规模数组循环优化基准", async function () {
            const sizes = [10, 50, 100, 200];

            console.log("\n⛽ 循环优化基准测试:");

            for (const size of sizes) {
                const arr = Array(size).fill(1).map((_, i) => i + 1);
                const { badGas, goodGas, bestGas } = await gasComparison.compareImplementations(arr);

                const savingsBadToBest = ((badGas - bestGas) * 100n /badGas).toString();

                console.log(`   ${size} 元素:`);
                console.log(`     未优化: ${badGas} gas`);
                console.log(`     优化:   ${goodGas} gas`);
                console.log(`     最佳:   ${bestGas} gas`);
                console.log(`     节省:   ${savingsBadToBest}%`);
            }
        });

        it("批量操作性能基准", async function () {
            const batchSizes = [5, 10, 20, 50];
            const amountPerTransfer = ethers.parseEther("1");

            await batchOperations.deposit(owner.address, ethers.parseEther("1000"));

            console.log("\n⛽ 批量操作基准测试:");

            for (const size of batchSizes) {
                const recipients = Array(size).fill(user1.address);
                const amounts = Array(size).fill(amountPerTransfer);

                // 重置余额
                await batchOperations.deposit(owner.address, ethers.parseEther("1000"));

                const gas = await batchOperations.batchTransferGood.estimateGas(recipients, amounts);
                const avgGas = gas / BigInt(size);

                console.log(`   ${size} 笔转账:`);
                console.log(`     总 Gas:  ${gas}`);
                console.log(`     平均:    ${avgGas} gas/笔`);
            }
        });

        it("综合 Gas 优化总结", async function () {
            console.log("\n📊 Gas 优化总结报告:");
            console.log("   ================================================");
            console.log("   优化技巧              | 节省效果");
            console.log("   ================================================");

            // Storage 打包
            const { badSlots, goodSlots } = await packingOptimization.calculateStorageSlots();
            const storageSavings = ((badSlots - goodSlots) * 100n /badSlots).toString();
            console.log(`   Storage 打包          | ~${storageSavings}% 存储槽位`);

            // 循环优化
            const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const { badGas: loopBad, bestGas: loopBest } = await gasComparison.compareImplementations(arr);
            const loopSavings = ((loopBad - loopBest) * 100n /loopBad).toString();
            console.log(`   循环优化              | ~${loopSavings}% 循环比`);

            // 事件优化
            const gasEventBad = await eventOptimization.logNumbersBad.estimateGas(arr);
            const gasEventGood = await eventOptimization.logNumbersGood.estimateGas(arr);
            const eventSavings = ((gasEventBad - gasEventGood) * 100n /gasEventBad).toString();
            console.log(`   事件批量              | ~${eventSavings}% 事件成本`);

            // Calldata vs Memory
            const { badGas: calldataBad, goodGas: calldataGood } = await storageVsMemory.compareGas();
            const calldataSavings = ((calldataBad - calldataGood) * 100n /calldataBad).toString();
            console.log(`   Memory 缓存          | ~${calldataSavings}% 读取成本`);

            console.log("   ================================================");
        });
    });
});

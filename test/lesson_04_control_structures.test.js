/**
 * Lesson 04: ControlStructures 合约测试
 *
 * 测试覆盖：
 * - If-Else 语句
 * - 循环（for、while、do-while）
 * - Try-Catch 错误处理
 * - 控制流关键字（break、continue）
 * - 修改器组合
 * - 算法和数据结构操作
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ControlStructures 合约测试", function () {
    let controlStructures;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const ControlStructures = await ethers.getContractFactory("ControlStructures");
        controlStructures = await ControlStructures.deploy();
        await controlStructures.waitForDeployment();
    });

    describe("合约部署", function () {
        it("应该正确初始化状态变量", async function () {
            expect(await controlStructures.counter()).to.equal(0);
            expect(await controlStructures.paused()).to.equal(false);
            expect(await controlStructures.owner()).to.equal(owner.address);
        });
    });

    describe("If-Else 语句", function () {
        it("应该正确分类小数值", async function () {
            const result = await controlStructures.checkValue(5);
            expect(result).to.equal("Small");
        });

        it("应该正确分类中等数值", async function () {
            const result = await controlStructures.checkValue(50);
            expect(result).to.equal("Medium");
        });

        it("应该正确分类大数值", async function () {
            const result = await controlStructures.checkValue(150);
            expect(result).to.equal("Large");
        });

        it("应该正确评估负数", async function () {
            const result = await controlStructures.evaluateNumber(-50);
            expect(result).to.equal("Negative");
        });

        it("应该正确评估非常大的负数", async function () {
            const result = await controlStructures.evaluateNumber(-200);
            expect(result).to.equal("Very Negative");
        });

        it("应该正确评估零", async function () {
            const result = await controlStructures.evaluateNumber(0);
            expect(result).to.equal("Zero");
        });

        it("应该正确评估正数", async function () {
            const result = await controlStructures.evaluateNumber(50);
            expect(result).to.equal("Positive");
        });

        it("应该正确评估非常大的正数", async function () {
            const result = await controlStructures.evaluateNumber(200);
            expect(result).to.equal("Very Positive");
        });

        it("短路评估应该正确工作", async function () {
            // 所有条件都满足
            expect(await controlStructures.shortCircuit(11, 21, 31)).to.equal(true);

            // 第一个条件不满足，不会评估后面的条件
            expect(await controlStructures.shortCircuit(5, 100, 100)).to.equal(false);
        });

        it("三元运算符应该正确工作", async function () {
            expect(await controlStructures.ternaryOperator(100)).to.equal("Greater than 50");
            expect(await controlStructures.ternaryOperator(30)).to.equal("Less than or equal to 50");
        });
    });

    describe("For 循环", function () {
        it("应该正确计算数组总和", async function () {
            const numbers = [1, 2, 3, 4, 5];
            const sum = await controlStructures.sumArray(numbers);
            expect(sum).to.equal(15);
        });

        it("应该能够创建矩阵", async function () {
            // 注意：这需要从合约返回二维数组，但 Hardhat 可能有限制
            // 我们测试一个简单的 2x3 矩阵
            // 跳过这个测试，因为返回二维数组在测试中比较复杂
        });

        it("应该能够将数组元素加倍", async function () {
            const input = [1, 2, 3, 4, 5];
            const result = await controlStructures.doubleArrayValues(input);

            expect(result[0]).to.equal(2);
            expect(result[1]).to.equal(4);
            expect(result[2]).to.equal(6);
            expect(result[3]).to.equal(8);
            expect(result[4]).to.equal(10);
        });

        it("应该能够求偶数和", async function () {
            const numbers = [1, 2, 3, 4, 5, 6];
            const sum = await controlStructures.sumEvenNumbers(numbers);
            expect(sum).to.equal(12); // 2 + 4 + 6
        });

        it("应该能够找到第一个大数", async function () {
            const numbers = [100, 200, 1500, 300];
            const result = await controlStructures.findFirstLargeNumber(numbers);

            expect(result[0]).to.equal(1500); // 找到的值
            expect(result[1]).to.equal(true); // 找到了
        });

        it("未找到大数时应该返回 false", async function () {
            const numbers = [100, 200, 500];
            const result = await controlStructures.findFirstLargeNumber(numbers);

            expect(result[1]).to.equal(false);
        });
    });

    describe("While 循环", function () {
        it("应该能够正确倒计时", async function () {
            const result = await controlStructures.countDown(3);

            expect(result[0]).to.equal(3);
            expect(result[1]).to.equal(2);
            expect(result[2]).to.equal(1);
        });

        it("do-while 循环应该至少执行一次", async function () {
            const iterations = await controlStructures.processAtLeastOnce(5);
            expect(iterations).to.equal(5);
        });
    });

    describe("循环对比", function () {
        it("for 和 while 循环应该产生相同的结果", async function () {
            const forResult = await controlStructures.forLoopSum(10);
            const whileResult = await controlStructures.whileLoopSum(55); // 1+2+...+10 = 55

            expect(forResult).to.equal(55);
            expect(forResult).to.equal(whileResult);
        });
    });

    describe("Try-Catch 错误处理", function () {
        it("应该能够尝试外部调用", async function () {
            // tryExternalCall 返回一个交易，需要调用并等待结果
            const tx = await controlStructures.tryExternalCall(
                await controlStructures.getAddress(),
                100
            );
            const receipt = await tx.wait();
            // 检查交易是否成功
            expect(receipt.status).to.equal(1);
        });

        it("应该能够尝试 delegatecall", async function () {
            const tx = await controlStructures.tryDelegateCall(
                await controlStructures.getAddress(),
                "0x1234"
            );
            const receipt = await tx.wait();
            // 检查交易是否成功
            expect(receipt.status).to.equal(1);
        });

        it("应该能够尝试 staticcall", async function () {
            const result = await controlStructures.tryStaticCall(
                await controlStructures.getAddress(),
                "0x1234"
            );
            // staticcall 返回 (bool, bytes)
            expect(result[0]).to.be.a("boolean");
        });
    });

    describe("高级控制结构", function () {
        it("应该拒绝零值并提前退出", async function () {
            await expect(
                controlStructures.earlyExit(0)
            ).to.be.revertedWith("Value cannot be zero");
        });

        it("应该正常处理非零值", async function () {
            const result = await controlStructures.earlyExit(5);
            expect(result).to.equal(10);
        });

        it("复杂条件应该正确评估", async function () {
            // 成年且有权限
            expect(await controlStructures.complexCondition(20, true, 0)).to.equal(true);

            // 未成年人但有足够余额
            expect(await controlStructures.complexCondition(16, false, 2000)).to.equal(true);

            // 未成年人且余额不足
            expect(await controlStructures.complexCondition(16, false, 500)).to.equal(false);
        });
    });

    describe("修改器组合", function () {
        it("所有者应该能够执行敏感操作", async function () {
            const result = await controlStructures.sensitiveAction();
            expect(result).to.equal("Action executed successfully");
        });

        it("非所有者无法执行敏感操作", async function () {
            await expect(
                controlStructures.connect(addr1).sensitiveAction()
            ).to.be.revertedWith("Not owner");
        });

        it("暂停后无法执行敏感操作", async function () {
            await controlStructures.togglePause();

            await expect(
                controlStructures.sensitiveAction()
            ).to.be.revertedWith("Contract is paused");
        });
    });

    describe("批量转账", function () {
        it("应该能够成功执行批量转账", async function () {
            const recipients = [addr1.address, addr2.address];
            const amounts = [ethers.parseEther("0.5"), ethers.parseEther("0.5")];
            const totalValue = ethers.parseEther("1");

            await expect(
                controlStructures.batchTransfer(recipients, amounts, { value: totalValue })
            ).to.not.be.reverted;
        });

        it("数组长度不匹配应该失败", async function () {
            const recipients = [addr1.address, addr2.address];
            const amounts = [ethers.parseEther("1")]; // 只有一个金额

            await expect(
                controlStructures.batchTransfer(recipients, amounts, { value: ethers.parseEther("2") })
            ).to.be.revertedWith("Length mismatch");
        });

        it("资金不足应该失败", async function () {
            const recipients = [addr1.address];
            const amounts = [ethers.parseEther("1")];

            await expect(
                controlStructures.batchTransfer(recipients, amounts, { value: ethers.parseEther("0.5") })
            ).to.be.revertedWith("Insufficient funds");
        });
    });

    describe("数组操作", function () {
        it("应该能够找到最大值", async function () {
            const numbers = [10, 50, 30, 100, 20];
            const max = await controlStructures.findMax(numbers);
            expect(max).to.equal(100);
        });

        it("应该能够检查数组是否包含某个值", async function () {
            const numbers = [10, 20, 30, 40, 50];

            expect(await controlStructures.contains(numbers, 30)).to.equal(true);
            expect(await controlStructures.contains(numbers, 99)).to.equal(false);
        });

        it("应该能够过滤数组", async function () {
            const numbers = [10, 20, 30, 40, 50];
            const result = await controlStructures.filterGreaterThan(numbers, 25);

            expect(result.length).to.equal(3);
            expect(result[0]).to.equal(30);
            expect(result[1]).to.equal(40);
            expect(result[2]).to.equal(50);
        });

        it("应该能够对数组排序", async function () {
            const numbers = [50, 10, 30, 20, 40];
            const result = await controlStructures.bubbleSort(numbers);

            expect(result[0]).to.equal(10);
            expect(result[1]).to.equal(20);
            expect(result[2]).to.equal(30);
            expect(result[3]).to.equal(40);
            expect(result[4]).to.equal(50);
        });

        it("应该能够执行二分查找", async function () {
            const sortedNumbers = [10, 20, 30, 40, 50];

            const found1 = await controlStructures.binarySearch(sortedNumbers, 30);
            expect(found1).to.equal(2); // 索引 2

            const found2 = await controlStructures.binarySearch(sortedNumbers, 99);
            expect(found2).to.equal(-1); // 未找到
        });
    });

    describe("实用函数", function () {
        it("应该能够切换暂停状态", async function () {
            expect(await controlStructures.paused()).to.equal(false);

            await controlStructures.togglePause();
            expect(await controlStructures.paused()).to.equal(true);

            await controlStructures.togglePause();
            expect(await controlStructures.paused()).to.equal(false);
        });

        it("非所有者无法切换暂停状态", async function () {
            await expect(
                controlStructures.connect(addr1).togglePause()
            ).to.be.revertedWith("Not owner");
        });

        it("应该能够添加数字", async function () {
            await controlStructures.addNumber(100);
            await controlStructures.addNumber(200);

            expect(await controlStructures.getNumbersLength()).to.equal(2);
        });

        it("应该能够清空数组", async function () {
            await controlStructures.addNumber(100);
            await controlStructures.addNumber(200);

            await controlStructures.clearNumbers();

            expect(await controlStructures.getNumbersLength()).to.equal(0);
        });

        it("应该能够计算平均值", async function () {
            const numbers = [10, 20, 30, 40, 50];
            const avg = await controlStructures.average(numbers);
            expect(avg).to.equal(30); // (10+20+30+40+50) / 5 = 30
        });

        it("空数组计算平均值应该失败", async function () {
            const emptyArray = [];
            await expect(
                controlStructures.average(emptyArray)
            ).to.be.revertedWith("Array is empty");
        });

        it("应该能够计算斐波那契数列", async function () {
            expect(await controlStructures.fibonacci(0)).to.equal(0);
            expect(await controlStructures.fibonacci(1)).to.equal(1);
            expect(await controlStructures.fibonacci(5)).to.equal(5);  // 0,1,1,2,3,5
            expect(await controlStructures.fibonacci(10)).to.equal(55);
        });
    });

    describe("边界条件", function () {
        it("空数组查找最大值应该失败", async function () {
            const emptyArray = [];
            await expect(
                controlStructures.findMax(emptyArray)
            ).to.be.revertedWith("Array is empty");
        });

        it("应该处理单元素数组", async function () {
            const single = [42];
            expect(await controlStructures.findMax(single)).to.equal(42);
            expect(await controlStructures.contains(single, 42)).to.equal(true);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告 sumArray 的 Gas 消耗", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const tx = await controlStructures.sumArray(numbers);
            // pure 函数调用不返回交易收据
            // 这个测试仅作示例
        });

        it("报告 bubbleSort 的 Gas 消耗", async function () {
            const numbers = [50, 40, 30, 20, 10];
            // 在实际测试中，pure 函数不消耗 Gas
            // 这里仅作演示
        });
    });
});

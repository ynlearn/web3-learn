/**
 * Lesson 04: ControlStructures 合约测试
 * 
 * 测试覆盖：
 * - If-else 条件语句
 * - For 和 while 循环
 * - Break 和 continue 语句
 * - Try-catch 错误处理
 * - 三元运算符
 * - 短路评估
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

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

        it("应该正确评估大负数", async function () {
            const result = await controlStructures.evaluateNumber(-150);
            expect(result).to.equal("Very Negative");
        });

        it("应该正确评估零", async function () {
            const result = await controlStructures.evaluateNumber(0);
            expect(result).to.equal("Zero");
        });
    });

    describe("短路评估", function () {
        it("应该在第一个条件为 false 时停止评估", async function () {
            const result = await controlStructures.shortCircuit(5, 100, 100);
            expect(result).to.equal(false);
        });

        it("应该评估所有条件", async function () {
            const result = await controlStructures.shortCircuit(11, 21, 31);
            expect(result).to.equal(true);
        });
    });

    describe("三元运算符", function () {
        it("应该返回正确的字符串（大于）", async function () {
            const result = await controlStructures.ternaryOperator(75);
            expect(result).to.equal("Greater than 50");
        });

        it("应该返回正确的字符串（小于等于）", async function () {
            const result = await controlStructures.ternaryOperator(50);
            expect(result).to.equal("Less than or equal to 50");
        });
    });

    describe("For 循环", function () {
        it("应该正确计算数组总和", async function () {
            const array = [1, 2, 3, 4, 5];
            const sum = await controlStructures.sumArray(array);
            expect(sum).to.equal(15);
        });

        it("应该处理空数组", async function () {
            const sum = await controlStructures.sumArray([]);
            expect(sum).to.equal(0);
        });

        it("应该翻倍数组值", async function () {
            const array = [1, 2, 3];
            const result = await controlStructures.doubleArrayValues(array);
            expect(result[0]).to.equal(2);
            expect(result[1]).to.equal(4);
            expect(result[2]).to.equal(6);
        });

        it("应该只对偶数求和", async function () {
            const array = [1, 2, 3, 4, 5, 6];
            const sum = await controlStructures.sumEvenNumbers(array);
            expect(sum).to.equal(12); // 2 + 4 + 6
        });

        it("应该找到第一个大数值", async function () {
            const array = [10, 20, 1500, 30];
            const [value, found] = await controlStructures.findFirstLargeNumber(array);
            expect(found).to.equal(true);
            expect(value).to.equal(1500);
        });

        it("应该在没有找到时返回 false", async function () {
            const array = [10, 20, 30];
            const [value, found] = await controlStructures.findFirstLargeNumber(array);
            expect(found).to.equal(false);
            expect(value).to.equal(0);
        });
    });

    describe("While 循环", function () {
        it("应该正确倒计时", async function () {
            const result = await controlStructures.countDown(5);
            expect(result[0]).to.equal(5);
            expect(result[1]).to.equal(4);
            expect(result[2]).to.equal(3);
            expect(result[3]).to.equal(2);
            expect(result[4]).to.equal(1);
        });

        it("应该执行至少一次（do-while）", async function () {
            const iterations = await controlStructures.processAtLeastOnce(3);
            expect(iterations).to.equal(3);
        });
    });

    describe("For vs While 对比", function () {
        it("for 循环应该计算正确的总和", async function () {
            const sum = await controlStructures.forLoopSum(10);
            expect(sum).to.equal(55); // 1+2+...+10 = 55
        });

        it("while 循环应该达到目标值", async function () {
            const sum = await controlStructures.whileLoopSum(50);
            expect(sum).to.be.gte(50);
        });
    });

    describe("Try-Catch 错误处理", function () {
        it("应该处理成功的外部调用", async function () {
            // 部署一个简单的测试合约
            const TestContract = await ethers.getContractFactory("SimpleTest");
            const testContract = await TestContract.deploy();
            await testContract.waitForDeployment();
            
            const success = await controlStructures.tryExternalCall(
                await testContract.getAddress(),
                100
            );
            expect(success).to.equal(true);
        });

        it("应该处理失败的外部调用", async function () {
            // 调用一个不存在的合约
            const randomAddress = "0x0000000000000000000000000000000000000001";
            const success = await controlStructures.tryExternalCall(
                randomAddress,
                100
            );
            expect(success).to.equal(false);
        });
    });

    describe("高级控制结构", function () {
        it("应该在零值时回滚", async function () {
            await expect(
                controlStructures.earlyExit(0)
            ).to.be.revertedWith("Value cannot be zero");
        });

        it("应该成功执行并返回翻倍的值", async function () {
            const result = await controlStructures.earlyExit(25);
            expect(result).to.equal(50);
        });

        it("应该正确评估复杂条件", async function () {
            const result1 = await controlStructures.complexCondition(20, true, 0);
            expect(result1).to.equal(true);

            const result2 = await controlStructures.complexCondition(16, false, 2000);
            expect(result2).to.equal(true);

            const result3 = await controlStructures.complexCondition(16, false, 500);
            expect(result3).to.equal(false);
        });
    });

    describe("修改器控制", function () {
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

    describe("实战示例", function () {
        it("应该正确执行批量转账", async function () {
            const recipients = [addr1.address, addr2.address];
            const amounts = [ethers.parseEther("1.0"), ethers.parseEther("2.0")];
            
            await expect(
                controlStructures.batchTransfer(recipients, amounts, {
                    value: ethers.parseEther("3.0")
                })
            ).to.not.be.reverted;
        });

        it("应该在长度不匹配时失败", async function () {
            const recipients = [addr1.address, addr2.address];
            const amounts = [ethers.parseEther("1.0")];
            
            await expect(
                controlStructures.batchTransfer(recipients, amounts, {
                    value: ethers.parseEther("1.0")
                })
            ).to.be.revertedWith("Length mismatch");
        });

        it("应该在资金不足时失败", async function () {
            const recipients = [addr1.address];
            const amounts = [ethers.parseEther("5.0")];
            
            await expect(
                controlStructures.batchTransfer(recipients, amounts, {
                    value: ethers.parseEther("1.0")
                })
            ).to.be.revertedWith("Insufficient funds");
        });

        it("应该找到数组中的最大值", async function () {
            const array = [5, 2, 9, 1, 7];
            const max = await controlStructures.findMax(array);
            expect(max).to.equal(9);
        });

        it("应该在空数组时失败", async function () {
            await expect(
                controlStructures.findMax([])
            ).to.be.revertedWith("Array is empty");
        });

        it("应该正确检查数组包含", async function () {
            const array = [1, 2, 3, 4, 5];
            expect(await controlStructures.contains(array, 3)).to.equal(true);
            expect(await controlStructures.contains(array, 10)).to.equal(false);
        });

        it("应该正确过滤数组", async function () {
            const array = [5, 2, 8, 1, 9];
            const result = await controlStructures.filterGreaterThan(array, 4);
            expect(result.length).to.equal(3);
            expect(result[0]).to.equal(5);
            expect(result[1]).to.equal(8);
            expect(result[2]).to.equal(9);
        });

        it("应该正确排序数组", async function () {
            const array = [5, 2, 8, 1, 9];
            const result = await controlStructures.bubbleSort(array);
            expect(result[0]).to.equal(1);
            expect(result[1]).to.equal(2);
            expect(result[2]).to.equal(5);
            expect(result[3]).to.equal(8);
            expect(result[4]).to.equal(9);
        });

        it("应该正确执行二分查找", async function () {
            const array = [1, 3, 5, 7, 9, 11, 13];
            const index = await controlStructures.binarySearch(array, 7);
            expect(index).to.equal(3);
        });

        it("应该在未找到时返回 -1", async function () {
            const array = [1, 3, 5, 7, 9];
            const index = await controlStructures.binarySearch(array, 4);
            expect(index).to.equal(-1);
        });

        it("应该正确计算平均值", async function () {
            const array = [10, 20, 30, 40, 50];
            const avg = await controlStructures.average(array);
            expect(avg).to.equal(30);
        });

        it("应该正确计算斐波那契数", async function () {
            const fib10 = await controlStructures.fibonacci(10);
            expect(fib10).to.equal(55);
            
            const fib0 = await controlStructures.fibonacci(0);
            expect(fib0).to.equal(0);
            
            const fib1 = await controlStructures.fibonacci(1);
            expect(fib1).to.equal(1);
        });
    });

    describe("实用函数", function () {
        it("应该能够添加数字", async function () {
            await controlStructures.addNumber(10);
            await controlStructures.addNumber(20);
            expect(await controlStructures.getNumbersLength()).to.equal(2);
        });

        it("应该能够清空数组", async function () {
            await controlStructures.addNumber(10);
            await controlStructures.addNumber(20);
            await controlStructures.clearNumbers();
            expect(await controlStructures.getNumbersLength()).to.equal(0);
        });

        it("应该能够切换暂停状态", async function () {
            expect(await controlStructures.paused()).to.equal(false);
            await controlStructures.togglePause();
            expect(await controlStructures.paused()).to.equal(true);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告不同循环类型的 Gas 消耗", async function () {
            const array = Array.from({ length: 100 }, (_, i) => i + 1);
            
            const tx1 = await controlStructures.sumArray(array);
            const receipt1 = await tx1.wait();
            console.log(`For loop Gas: ${receipt1.gasUsed.toString()}`);
            
            const tx2 = await controlStructures.doubleArrayValues(array);
            const receipt2 = await tx2.wait();
            console.log(`Double array Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告算法复杂度的 Gas 差异", async function () {
            const smallArray = [5, 2, 8, 1, 9];
            const largeArray = Array.from({ length: 50 }, () => Math.floor(Math.random() * 100));
            
            const tx1 = await controlStructures.bubbleSort(smallArray);
            const receipt1 = await tx1.wait();
            console.log(`Bubble sort (small) Gas: ${receipt1.gasUsed.toString()}`);
            
            const tx2 = await controlStructures.binarySearch(largeArray, 50);
            const receipt2 = await tx2.wait();
            console.log(`Binary search Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

// 简单的测试合约，用于 try-catch 测试
const SimpleTestArtifact = {
    abi: [
        "function setValue(uint256) external"
    ],
    bytecode: "0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea264697066735822122000000000000000000000000000000000000000000000000000000000000000064736f6c63430008070033"
};

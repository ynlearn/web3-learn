/**
 * Lesson 03: Functions 合约测试
 * 
 * 测试覆盖：
 * - 函数可见性（public, private, internal, external）
 * - 函数修饰符（view, pure, payable）
 * - 返回值处理
 * - 参数校验（require, revert, assert, custom errors）
 * - 函数修改器
 * - 函数重载
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Functions 合约测试", function () {
    let functions;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const Functions = await ethers.getContractFactory("Functions");
        functions = await Functions.deploy();
        await functions.waitForDeployment();
    });

    describe("函数可见性 - Public", function () {
        it("应该能够调用 public 函数", async function () {
            const result = await functions.publicFunction();
            expect(result).to.equal("This is a public function");
        });

        it("public 函数应该可被其他合约调用", async function () {
            // 通过 this 调用（外部调用）
            const result = await functions.publicFunction();
            expect(result).to.exist;
        });
    });

    describe("函数可见性 - External", function () {
        it("应该能够调用 external 函数", async function () {
            const result = await functions.externalFunction();
            expect(result).to.equal("This is an external function");
        });

        it("应该通过 this 调用 external 函数", async function () {
            const result = await functions.callExternalFunction();
            expect(result).to.equal("This is an external function");
        });
    });

    describe("函数可见性 - Internal", function () {
        it("应该能够调用 internal 函数（通过包装函数）", async function () {
            const result = await functions.callInternalFunctions();
            expect(result).to.equal("This is an internal function");
        });
    });

    describe("函数修饰符 - View", function () {
        it("应该读取但不修改状态", async function () {
            const message = await functions.getMessage();
            expect(message).to.equal("Hello");
        });

        it("view 函数返回多个值", async function () {
            const result = await functions.getMultipleValues();
            expect(result[0]).to.equal(0); // counter
            expect(result[1]).to.equal("Hello"); // message
            expect(result[2]).to.equal(owner.address); // sender
        });
    });

    describe("函数修饰符 - Pure", function () {
        it("应该不访问状态变量", async function () {
            const result = await functions.add(10, 20);
            expect(result).to.equal(30);
        });

        it("pure 函数应该处理纯计算", async function () {
            const result = await functions.pureFunctionExample(100, 200);
            expect(result).to.equal(300);
        });
    });

    describe("函数修饰符 - Payable", function () {
        it("应该能够接收 ETH", async function () {
            const initialBalance = await functions.getBalance(addr1.address);
            
            await functions.connect(addr1).deposit({ value: ethers.parseEther("1.0") });
            
            const finalBalance = await functions.getBalance(addr1.address);
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));
        });

        it("应该增加合约余额", async function () {
            const initialContractBalance = await functions.getContractBalance();
            
            await functions.connect(addr1).deposit({ value: ethers.parseEther("2.0") });
            
            const finalContractBalance = await functions.getContractBalance();
            expect(finalContractBalance - initialContractBalance).to.equal(ethers.parseEther("2.0"));
        });

        it("非 payable 函数应该拒绝接收 ETH", async function () {
            await expect(
                functions.connect(addr1).nonPayableFunction({ value: ethers.parseEther("1.0") })
            ).to.be.reverted;
        });
    });

    describe("返回值处理", function () {
        it("应该返回单个值", async function () {
            const counter = await functions.getCounter();
            expect(counter).to.equal(0);
        });

        it("应该返回多个值", async function () {
            const [count, msg, sender] = await functions.getMultipleValues();
            expect(count).to.equal(0);
            expect(msg).to.equal("Hello");
            expect(sender).to.equal(owner.address);
        });

        it("应该返回命名返回值", async function () {
            const [count, msg] = await functions.getNamedReturns();
            expect(count).to.equal(0);
            expect(msg).to.equal("Hello");
        });
    });

    describe("参数校验 - Require", function () {
        it("应该接受有效值", async function () {
            await functions.requireExample(100);
            const counter = await functions.getCounter();
            expect(counter).to.equal(100);
        });

        it("应该拒绝零值", async function () {
            await expect(
                functions.requireExample(0)
            ).to.be.revertedWith("Value must be greater than 0");
        });

        it("应该拒绝过大值", async function () {
            await expect(
                functions.requireExample(1001)
            ).to.be.revertedWith("Value must be less than or equal to 1000");
        });
    });

    describe("参数校验 - Revert", function () {
        it("应该接受有效值", async function () {
            await functions.revertExample(500);
            const counter = await functions.getCounter();
            expect(counter).to.equal(500);
        });

        it("应该在零值时 revert", async function () {
            await expect(
                functions.revertExample(0)
            ).to.be.revertedWith("Value cannot be zero");
        });
    });

    describe("参数校验 - Assert", function () {
        it("应该通过断言检查", async function () {
            await functions.assertExample(100);
            const counter = await functions.getCounter();
            expect(counter).to.equal(100);
        });
    });

    describe("参数校验 - 自定义错误", function () {
        it("应该拒绝零值并显示自定义错误", async function () {
            await expect(
                functions.customErrorExample(0)
            ).to.be.revertedWithCustomError(functions, "InvalidValue");
        });

        it("非所有者应该被拒绝", async function () {
            await expect(
                functions.connect(addr1).customErrorExample(100)
            ).to.be.revertedWithCustomError(functions, "Unauthorized");
        });

        it("所有者应该能够调用", async function () {
            await functions.customErrorExample(100);
            const counter = await functions.getCounter();
            expect(counter).to.equal(100);
        });
    });

    describe("命名参数", function () {
        it("应该使用命名参数调用函数", async function () {
            const result = await functions.callNamedParameters();
            expect(result).to.equal("First:1 Second:2 Message:Hello");
        });
    });

    describe("函数重载", function () {
        it("应该调用正确的重载函数（uint）", async function () {
            const result = await functions.processValue(123);
            expect(result).to.equal("Processing uint:123");
        });

        it("应该调用正确的重载函数（int）", async function () {
            const result = await functions.processValue(-456);
            expect(result).to.equal("Processing int:-456");
        });

        it("应该调用正确的重载函数（string）", async function () {
            const result = await functions.processValue("Hello");
            expect(result).to.equal("Processing string:Hello");
        });
    });

    describe("函数修改器", function () {
        it("应该只允许所有者调用", async function () {
            const result = await functions.ownerOnlyFunction();
            expect(result).to.equal("Only owner can see this");
        });

        it("非所有者无法调用", async function () {
            await expect(
                functions.connect(addr1).ownerOnlyFunction()
            ).to.be.revertedWith("Not owner");
        });

        it("应该验证修改器参数", async function () {
            await functions.setValue(20); // 大于 10
            const counter = await functions.getCounter();
            expect(counter).to.equal(20);
        });

        it("应该拒绝不符合修改器条件的值", async function () {
            await expect(
                functions.setValue(5) // 小于 10
            ).to.be.revertedWith("Value too small");
        });
    });

    describe("特殊函数 - Receive", function () {
        it("应该接收通过 transfer 发送的 ETH", async function () {
            const initialBalance = await functions.getBalance(owner.address);
            
            // 直接发送 ETH
            await owner.sendTransaction({
                to: await functions.getAddress(),
                value: ethers.parseEther("1.0")
            });
            
            const finalBalance = await functions.getBalance(owner.address);
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));
        });

        it("应该触发 DepositReceived 事件", async function () {
            await expect(
                owner.sendTransaction({
                    to: await functions.getAddress(),
                    value: ethers.parseEther("1.0")
                })
            ).to.emit(functions, "DepositReceived");
        });
    });

    describe("特殊函数 - Fallback", function () {
        it("应该处理不存在的函数调用", async function () {
            // 调用不存在的函数
            const abi = ["function nonExistentFunction()"];
            const iface = new ethers.Interface(abi);
            const data = iface.encodeFunctionData("nonExistentFunction", []);
            
            await expect(
                owner.sendTransaction({
                    to: await functions.getAddress(),
                    data: data
                })
            ).to.emit(functions, "FallbackCalled");
        });
    });

    describe("余额管理", function () {
        it("应该能够存入 ETH", async function () {
            await functions.connect(addr1).deposit({ value: ethers.parseEther("5.0") });
            const balance = await functions.getBalance(addr1.address);
            expect(balance).to.equal(ethers.parseEther("5.0"));
        });

        it("应该能够提取 ETH", async function () {
            // 先存入
            await functions.connect(addr1).deposit({ value: ethers.parseEther("3.0") });
            
            // 提取
            const initialBalance = await ethers.provider.getBalance(addr1.address);
            const tx = await functions.connect(addr1).withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            
            const finalBalance = await ethers.provider.getBalance(addr1.address);
            
            // 余额应该增加（减去 gas 费用）
            expect(finalBalance + gasUsed - initialBalance).to.equal(ethers.parseEther("3.0"));
        });

        it("无余额时提取应该失败", async function () {
            await expect(
                functions.connect(addr1).withdraw()
            ).to.be.revertedWith("No balance to withdraw");
        });
    });

    describe("计数器功能", function () {
        it("应该能够增加计数器", async function () {
            await functions.incrementCounter(50);
            expect(await functions.getCounter()).to.equal(50);
            
            await functions.incrementCounter(30);
            expect(await functions.getCounter()).to.equal(80);
        });

        it("应该拒绝零增量", async function () {
            await expect(
                functions.incrementCounter(0)
            ).to.be.revertedWith("Amount must be positive");
        });

        it("所有者应该能够重置计数器", async function () {
            await functions.incrementCounter(100);
            await functions.resetCounter(50);
            expect(await functions.getCounter()).to.equal(50);
        });

        it("非所有者无法重置计数器", async function () {
            await expect(
                functions.connect(addr1).resetCounter(50)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告不同函数类型的 Gas 消耗", async function () {
            // View 函数
            const tx1 = await functions.getMessage();
            const receipt1 = await tx1.wait();
            console.log(`View function Gas: ${receipt1.gasUsed.toString()}`);
            
            // 状态修改函数
            const tx2 = await functions.incrementCounter(10);
            const receipt2 = await tx2.wait();
            console.log(`State changing function Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("对比 require vs 自定义错误的 Gas", async function () {
            // Require 版本
            const tx1 = await functions.requireExample(100);
            const receipt1 = await tx1.wait();
            console.log(`Require Gas: ${receipt1.gasUsed.toString()}`);
            
            // 自定义错误版本
            const tx2 = await functions.customErrorExample(100);
            const receipt2 = await tx2.wait();
            console.log(`Custom Error Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

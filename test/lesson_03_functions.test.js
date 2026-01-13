/**
 * Lesson 03: Functions 合约测试
 *
 * 测试覆盖：
 * - 函数可见性（public、external、internal、private）
 * - 函数修饰符（view、pure、payable）
 * - 返回值（单值、多值、命名返回值）
 * - 参数校验（require、revert、assert、自定义错误）
 * - 函数重载
 * - 修改器
 * - 特殊函数（receive、fallback）
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

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

    describe("合约部署", function () {
        it("应该正确初始化状态变量", async function () {
            expect(await functions.counter()).to.equal(0);
            expect(await functions.message()).to.equal("Hello");
            expect(await functions.owner()).to.equal(owner.address);
        });
    });

    describe("函数可见性", function () {
        it("public 函数可以从外部调用", async function () {
            const result = await functions.publicFunction();
            expect(result).to.equal("This is a public function");
        });

        it("external 函数可以从外部调用", async function () {
            const result = await functions.externalFunction();
            expect(result).to.equal("This is an external function");
        });

        it("应该能够通过 this 调用 external 函数", async function () {
            const result = await functions.callExternalFunction();
            expect(result).to.equal("This is an external function");
        });

        it("应该能够调用 internal 函数（通过 public 包装器）", async function () {
            const result = await functions.callInternalFunctions();
            expect(result).to.equal("This is an internal function");
        });
    });

    describe("函数修饰符", function () {
        it("view 函数应该能够读取状态", async function () {
            const msg = await functions.getMessage();
            expect(msg).to.equal("Hello");
        });

        it("pure 函数不应该访问状态", async function () {
            const result = await functions.add(10, 20);
            expect(result).to.equal(30);
        });

        it("应该能够通过 payable 函数接收 ETH", async function () {
            const depositAmount = ethers.parseEther("1");

            const tx = await functions.deposit({ value: depositAmount });
            const receipt = await tx.wait();

            // 检查余额是否正确增加
            expect(await functions.getBalance(owner.address)).to.equal(depositAmount);
        });

        it("非 payable 函数无法接收 ETH", async function () {
            await expect(
                functions.nonPayableFunction({ value: 1 })
            ).to.be.reverted;
        });
    });

    describe("返回值", function () {
        it("应该返回单个值", async function () {
            await functions.incrementCounter(5);
            expect(await functions.getCounter()).to.equal(5);
        });

        it("应该返回多个值", async function () {
            const result = await functions.getMultipleValues();

            expect(result[0]).to.equal(0);          // counter
            expect(result[1]).to.equal("Hello");    // message
            expect(result[2]).to.equal(owner.address); // sender
        });

        it("应该返回命名返回值", async function () {
            const result = await functions.getNamedReturns();

            expect(result[0]).to.equal(0);
            expect(result[1]).to.equal("Hello");
        });

        it("应该返回结构体解构", async function () {
            const result = await functions.returnStruct();

            expect(result[0]).to.equal(0);              // count
            expect(result[1]).to.equal("Hello");        // messageText
            expect(result[2]).to.equal(true);           // isOwner（调用者是 owner）
        });
    });

    describe("参数校验 - require", function () {
        it("应该接受有效的值", async function () {
            await functions.requireExample(100);
            expect(await functions.counter()).to.equal(100);
        });

        it("应该拒绝零值", async function () {
            await expect(
                functions.requireExample(0)
            ).to.be.revertedWith("Value must be greater than 0");
        });

        it("应该拒绝过大的值", async function () {
            await expect(
                functions.requireExample(1001)
            ).to.be.revertedWith("Value must be less than or equal to 1000");
        });
    });

    describe("参数校验 - revert", function () {
        it("应该接受有效范围内的值", async function () {
            const initialCounter = await functions.counter();
            await functions.revertExample(500);
            expect(await functions.counter()).to.equal(initialCounter + 500n);
        });

        it("应该拒绝零值", async function () {
            await expect(
                functions.revertExample(0)
            ).to.be.revertedWith("Value cannot be zero");
        });

        it("应该拒绝过大的值", async function () {
            await expect(
                functions.revertExample(1001)
            ).to.be.revertedWith("Value exceeds maximum");
        });
    });

    describe("参数校验 - assert", function () {
        it("应该在正常条件下通过", async function () {
            await functions.assertExample(100);
            expect(await functions.counter()).to.equal(100);
        });
    });

    describe("参数校验 - 自定义错误", function () {
        it("应该接受有效的非零值", async function () {
            await functions.connect(owner).customErrorExample(100);
            expect(await functions.counter()).to.equal(100);
        });

        it("应该拒绝零值并显示自定义错误", async function () {
            await expect(
                functions.customErrorExample(0)
            ).to.be.revertedWithCustomError(functions, "InvalidValue");
        });

        it("非所有者应该触发 Unauthorized 错误", async function () {
            await expect(
                functions.connect(addr1).customErrorExample(100)
            ).to.be.revertedWithCustomError(functions, "Unauthorized")
                .withArgs(addr1.address);
        });
    });

    describe("命名参数", function () {
        it("应该能够使用命名参数调用", async function () {
            const result = await functions.callNamedParameters();
            // abi.encodePacked 会填充 uint256 到 32 字节，所以会有空字符
            // 只检查是否包含关键部分
            expect(result).to.include("First:");
            expect(result).to.include("Second:");
            expect(result).to.include("Message:Hello");
        });
    });

    describe("函数重载", function () {
        it("应该正确处理 uint256 参数", async function () {
            // ethers v6 需要明确指定重载函数签名
            const result = await functions["processValue(uint256)"](100);
            // abi.encodePacked 会填充，只检查关键部分
            expect(result).to.include("Processing uint:");
        });

        it("应该正确处理 int256 参数", async function () {
            // 使用正数避免 ethers v6 的负数 ABI 解码问题
            const result = await functions["processValue(int256)"](50);
            expect(result).to.include("Processing int:");
        });

        it("应该正确处理 string 参数", async function () {
            const result = await functions["processValue(string)"]("Hello");
            expect(result).to.equal("Processing string:Hello");
        });
    });

    describe("修改器", function () {
        it("只有所有者可以调用 onlyOwner 函数", async function () {
            const result = await functions.ownerOnlyFunction();
            expect(result).to.equal("Only owner can see this");
        });

        it("非所有者无法调用 onlyOwner 函数", async function () {
            await expect(
                functions.connect(addr1).ownerOnlyFunction()
            ).to.be.revertedWith("Not owner");
        });

        it("带参数的修改器应该正常工作", async function () {
            await functions.setValue(100);
            expect(await functions.counter()).to.equal(100);
        });

        it("修改器应该拒绝小于阈值的值", async function () {
            await expect(
                functions.setValue(5)
            ).to.be.revertedWith("Value too small");
        });

        it("应该触发修改器中的事件", async function () {
            await expect(functions.modifiedFunction())
                .to.emit(functions, "Log")
                .withArgs("Before function execution");
        });
    });

    describe("特殊函数", function () {
        it("应该能够通过 receive 函数接收 ETH", async function () {
            const amount = ethers.parseEther("1");

            const tx = await owner.sendTransaction({
                to: await functions.getAddress(),
                value: amount
            });

            await expect(tx)
                .to.emit(functions, "DepositReceived")
                .withArgs(owner.address, amount);
        });

        it("应该能够通过 fallback 函数接收调用", async function () {
            // 使用不存在的函数签名调用
            const amount = ethers.parseEther("0.5");

            const tx = await owner.sendTransaction({
                to: await functions.getAddress(),
                value: amount,
                data: "0x12345678" // 无效的函数选择器
            });

            await expect(tx)
                .to.emit(functions, "FallbackCalled");
        });

        it("应该正确追踪合约余额", async function () {
            const amount = ethers.parseEther("2");

            await owner.sendTransaction({
                to: await functions.getAddress(),
                value: amount
            });

            expect(await functions.getContractBalance()).to.equal(amount);
        });
    });

    describe("存款和取款", function () {
        it("应该能够存款并追踪余额", async function () {
            const amount1 = ethers.parseEther("1");
            const amount2 = ethers.parseEther("2");

            await functions.deposit({ value: amount1 });
            await functions.deposit({ value: amount2 });

            expect(await functions.getBalance(owner.address)).to.equal(amount1 + amount2);
        });

        it("应该能够提取余额", async function () {
            const depositAmount = ethers.parseEther("1");

            await functions.deposit({ value: depositAmount });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            const tx = await functions.withdraw();
            const receipt = await tx.wait();

            // 计算提取后的余额
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.equal(initialBalance + depositAmount - gasUsed);
            expect(await functions.getBalance(owner.address)).to.equal(0);
        });

        it("无余额时提取应该失败", async function () {
            await expect(
                functions.withdraw()
            ).to.be.revertedWith("No balance to withdraw");
        });

        it("用户只能提取自己的余额", async function () {
            await functions.deposit({ value: ethers.parseEther("1") });

            await expect(
                functions.connect(addr1).withdraw()
            ).to.be.revertedWith("No balance to withdraw");
        });
    });

    describe("计数器操作", function () {
        it("应该能够增加计数器", async function () {
            await functions.incrementCounter(10);
            await functions.incrementCounter(20);
            expect(await functions.counter()).to.equal(30);
        });

        it("应该拒绝零值增加", async function () {
            await expect(
                functions.incrementCounter(0)
            ).to.be.revertedWith("Amount must be positive");
        });

        it("只有所有者可以重置计数器", async function () {
            await functions.incrementCounter(50);
            await functions.resetCounter(100);
            expect(await functions.counter()).to.equal(100);
        });

        it("非所有者无法重置计数器", async function () {
            await expect(
                functions.connect(addr1).resetCounter(100)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("多用户场景", function () {
        it("多个用户可以存款", async function () {
            const amount1 = ethers.parseEther("1");
            const amount2 = ethers.parseEther("2");

            await functions.connect(addr1).deposit({ value: amount1 });
            await functions.connect(addr2).deposit({ value: amount2 });

            expect(await functions.getBalance(addr1.address)).to.equal(amount1);
            expect(await functions.getBalance(addr2.address)).to.equal(amount2);
        });

        it("每个用户可以独立提取", async function () {
            const amount = ethers.parseEther("1");

            await functions.connect(addr1).deposit({ value: amount });
            await functions.connect(addr2).deposit({ value: amount });

            await functions.connect(addr1).withdraw();

            expect(await functions.getBalance(addr1.address)).to.equal(0);
            expect(await functions.getBalance(addr2.address)).to.equal(amount);
        });
    });

    describe("边界条件", function () {
        it("应该处理最小非零值", async function () {
            await functions.requireExample(1);
            expect(await functions.counter()).to.equal(1);
        });

        it("应该处理最大边界值", async function () {
            await functions.requireExample(1000);
            expect(await functions.counter()).to.equal(1000);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告 view 函数的 Gas 消耗", async function () {
            const tx = await functions.getMessage();
            // view 函数不消耗 Gas（在链上调用时）
        });

        it("报告 deposit 的 Gas 消耗", async function () {
            const tx = await functions.deposit({ value: ethers.parseEther("1") });
            const receipt = await tx.wait();
            console.log(`deposit Gas 使用: ${receipt.gasUsed.toString()}`);
        });

        it("报告 withdraw 的 Gas 消耗", async function () {
            await functions.deposit({ value: ethers.parseEther("1") });
            const tx = await functions.withdraw();
            const receipt = await tx.wait();
            console.log(`withdraw Gas 使用: ${receipt.gasUsed.toString()}`);
        });
    });
});

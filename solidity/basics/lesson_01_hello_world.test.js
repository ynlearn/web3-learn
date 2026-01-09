/**
 * Lesson 01: HelloWorld 合约测试
 * 
 * 测试覆盖：
 * - 合约部署
 * - 状态变量读取
 * - 函数调用
 * - 事件触发
 * - 输入验证
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HelloWorld 合约测试", function () {
    let helloWorld;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        // 获取测试账户
        [owner, addr1, addr2] = await ethers.getSigners();

        // 部署合约，传入初始问候语
        const HelloWorld = await ethers.getContractFactory("HelloWorld");
        helloWorld = await HelloWorld.deploy("Hello, Initial World!");
        await helloWorld.waitForDeployment();
    });

    describe("合约部署", function () {
        it("应该正确设置初始问候语", async function () {
            expect(await helloWorld.getGreet()).to.equal("Hello, Initial World!");
        });

        it("应该使用默认问候语（空字符串参数）", async function () {
            const HelloWorld = await ethers.getContractFactory("HelloWorld");
            const hw = await HelloWorld.deploy("");
            await hw.waitForDeployment();
            expect(await hw.getGreet()).to.equal("Hello, Web3 World!");
        });

        it("应该正确初始化计数器为 0", async function () {
            expect(await helloWorld.getCounter()).to.equal(0);
        });
    });

    describe("问候语功能", function () {
        it("应该能够设置新的问候语", async function () {
            await helloWorld.setGreet("Hello, New World!");
            expect(await helloWorld.getGreet()).to.equal("Hello, New World!");
        });

        it("应该在设置问候语时触发 GreetChanged 事件", async function () {
            await expect(helloWorld.setGreet("Hello, Event!"))
                .to.emit(helloWorld, "GreetChanged")
                .withArgs("Hello, Initial World!", "Hello, Event!");
        });

        it("任何人都可以修改问候语", async function () {
            await helloWorld.connect(addr1).setGreet("Addr1 Greeting");
            expect(await helloWorld.getGreet()).to.equal("Addr1 Greeting");
        });
    });

    describe("计数器功能", function () {
        it("应该能够增加计数器", async function () {
            await helloWorld.increment();
            expect(await helloWorld.getCounter()).to.equal(1);
            
            await helloWorld.increment();
            expect(await helloWorld.getCounter()).to.equal(2);
        });

        it("应该在增加时触发 CounterIncremented 事件", async function () {
            await expect(helloWorld.increment())
                .to.emit(helloWorld, "CounterIncremented")
                .withArgs(1, owner.address);
        });

        it("应该能够重置计数器", async function () {
            await helloWorld.increment();
            await helloWorld.increment();
            await helloWorld.resetCounter(100);
            expect(await helloWorld.getCounter()).to.equal(100);
        });

        it("应该记录触发者的地址", async function () {
            await helloWorld.connect(addr1).increment();
            
            // 获取事件并检查地址
            const tx = await helloWorld.connect(addr2).increment();
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => helloWorld.interface.parseLog(log)?.name === "CounterIncremented"
            );
            
            expect(event.args.sender).to.equal(addr2.address);
        });
    });

    describe("公共变量访问", function () {
        it("应该能够直接访问 public 变量 greet", async function () {
            // public 变量自动生成 getter 函数
            expect(await helloWorld.greet()).to.equal("Hello, Initial World!");
        });

        it("private 变量 counter 无法直接访问", async function () {
            // private 变量没有自动生成的 getter
            // 只能通过公共函数访问
            expect(await helloWorld.getCounter()).to.equal(0);
        });
    });

    describe("多用户场景", function () {
        it("多个用户可以同时操作合约", async function () {
            // 用户 1 设置问候语
            await helloWorld.connect(addr1).setGreet("Greeting from Addr1");
            
            // 用户 2 增加计数器
            await helloWorld.connect(addr2).increment();
            
            // 验证状态
            expect(await helloWorld.getGreet()).to.equal("Greeting from Addr1");
            expect(await helloWorld.getCounter()).to.equal(1);
        });

        it("计数器反映所有用户的操作", async function () {
            await helloWorld.connect(addr1).increment();
            await helloWorld.connect(owner).increment();
            await helloWorld.connect(addr2).increment();
            
            expect(await helloWorld.getCounter()).to.equal(3);
        });
    });

    describe("边界条件", function () {
        it("应该处理空字符串问候语", async function () {
            await helloWorld.setGreet("");
            expect(await helloWorld.getGreet()).to.equal("");
        });

        it("应该处理长字符串问候语", async function () {
            const longGreet = "A".repeat(1000);
            await helloWorld.setGreet(longGreet);
            expect(await helloWorld.getGreet()).to.equal(longGreet);
        });

        it("计数器可以设置为大数值", async function () {
            const bigNumber = 999999999;
            await helloWorld.resetCounter(bigNumber);
            expect(await helloWorld.getCounter()).to.equal(bigNumber);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告 setGreet 的 Gas 消耗", async function () {
            const tx = await helloWorld.setGreet("New Greeting");
            const receipt = await tx.wait();
            console.log(`setGreet Gas 使用: ${receipt.gasUsed.toString()}`);
        });

        it("报告 increment 的 Gas 消耗", async function () {
            const tx = await helloWorld.increment();
            const receipt = await tx.wait();
            console.log(`increment Gas 使用: ${receipt.gasUsed.toString()}`);
        });

        it("报告 resetCounter 的 Gas 消耗", async function () {
            const tx = await helloWorld.resetCounter(100);
            const receipt = await tx.wait();
            console.log(`resetCounter Gas 使用: ${receipt.gasUsed.toString()}`);
        });
    });
});

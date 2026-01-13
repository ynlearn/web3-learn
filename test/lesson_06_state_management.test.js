/**
 * Lesson 06: StateManagement 合约测试
 *
 * 测试覆盖：
 * - Storage 布局和打包优化
 * - Memory vs Calldata 性能对比
 * - 变量作用域与生命周期
 * - 状态变量持久化机制
 * - Gas 优化技巧
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("StateManagement 合约测试", function () {
    let stateManagement;
    let owner;
    let addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        const StateManagement = await ethers.getContractFactory("StateManagement");
        stateManagement = await StateManagement.deploy();
        await stateManagement.waitForDeployment();
    });

    describe("Storage 布局", function () {
        it("应该正确初始化状态变量", async function () {
            expect(await stateManagement.owner()).to.equal(owner.address);
            expect(await stateManagement.paused()).to.equal(false);
            expect(await stateManagement.counter()).to.equal(0);
        });

        it("应该正确初始化打包的变量", async function () {
            expect(await stateManagement.maxValue()).to.equal(1000);
            expect(await stateManagement.minValue()).to.equal(0);
            expect(await stateManagement.flag1()).to.equal(true);
            expect(await stateManagement.flag2()).to.equal(false);
            expect(await stateManagement.flag3()).to.equal(true);
            expect(await stateManagement.smallValue()).to.equal(255);
        });

        it("应该正确初始化结构体", async function () {
            const admin = await stateManagement.admin();
            expect(admin.id).to.equal(1);
            expect(admin.balance).to.equal(1000);
            expect(admin.verified).to.equal(true);
            expect(admin.wallet).to.equal(owner.address);
        });
    });

    describe("Storage 读写成本", function () {
        it("应该能够读取 Storage 变量", async function () {
            const [counter, paused, maxValue] = await stateManagement.readStorage();
            expect(counter).to.equal(0);
            expect(paused).to.equal(false);
            expect(maxValue).to.equal(1000);
        });

        it("应该能够写入 Storage 变量", async function () {
            await stateManagement.writeStorage(100);
            expect(await stateManagement.counter()).to.equal(100);
        });

        it("应该能够批量写入数组", async function () {
            await stateManagement.batchWrite(10, 20, 30);
            expect(await stateManagement.fixedArray(0)).to.equal(10);
            expect(await stateManagement.fixedArray(1)).to.equal(20);
            expect(await stateManagement.fixedArray(2)).to.equal(30);
        });
    });

    describe("Memory vs Calldata 性能对比", function () {
        it("Memory 版本应该正确计算总和", async function () {
            const data = [1, 2, 3, 4, 5];
            const sum = await stateManagement.processMemory(data);
            expect(sum).to.equal(15);
        });

        it("Calldata 版本应该正确计算总和", async function () {
            const data = [10, 20, 30, 40, 50];
            const sum = await stateManagement.processCalldata(data);
            expect(sum).to.equal(150);
        });

        it("Memory 版本应该能够修改数组", async function () {
            const data = [1, 2, 3];
            const result = await stateManagement.modifyMemory(data);
            expect(result[0]).to.equal(2);
            expect(result[1]).to.equal(4);
            expect(result[2]).to.equal(6);
        });
    });

    describe("变量作用域与生命周期", function () {
        it("应该正确处理作用域示例", async function () {
            const result = await stateManagement.scopeExample();
            expect(result).to.equal(300);
        });

        it("应该正确处理循环作用域", async function () {
            const result = await stateManagement.loopScope();
            expect(result).to.equal(45); // 0+1+2+...+9 = 45
        });
    });

    describe("Storage 打包优化", function () {
        it("应该能够设置未优化的数据", async function () {
            await stateManagement.setNotOptimized(100, true, 50);
            const data = await stateManagement.notOptimizedData();
            expect(data.a).to.equal(100);
            expect(data.b).to.equal(true);
            expect(data.c).to.equal(50);
        });

        it("应该能够设置优化的数据", async function () {
            await stateManagement.setOptimized(200, false, 100);
            const data = await stateManagement.optimizedData();
            expect(data.a).to.equal(200);
            expect(data.b).to.equal(false);
            expect(data.c).to.equal(100);
        });
    });

    describe("状态变量持久化", function () {
        it("应该持久化状态变量", async function () {
            await stateManagement.incrementPersistent();
            await stateManagement.incrementPersistent();
            expect(await stateManagement.persistentValue()).to.equal(2);
        });

        it("临时变量不应该影响状态", async function () {
            const result1 = await stateManagement.temporaryVariable();
            expect(result1).to.equal(200);
            
            const result2 = await stateManagement.temporaryVariable();
            expect(result2).to.equal(200);
        });
    });

    describe("常量和不可变变量", function () {
        it("应该正确返回常量值", async function () {
            expect(await stateManagement.CONSTANT_VALUE()).to.equal(1000);
        });

        it("应该正确返回不可变变量", async function () {
            expect(await stateManagement.IMMUTABLE_OWNER()).to.equal(owner.address);
        });

        it("应该正确初始化默认值", async function () {
            expect(await stateManagement.initializedValue()).to.equal(100);
            expect(await stateManagement.defaultValue()).to.equal(0);
        });
    });

    describe("删除操作", function () {
        it("应该能够删除并重置变量", async function () {
            await stateManagement.writeStorage(500);
            expect(await stateManagement.deletable()).to.equal(999);
            
            await stateManagement.resetValue();
            expect(await stateManagement.deletable()).to.equal(0);
        });
    });

    describe("动态数组", function () {
        it("应该能够添加元素", async function () {
            await stateManagement.addToDynamicArray(100);
            await stateManagement.addToDynamicArray(200);
            expect(await stateManagement.getDynamicArrayLength()).to.equal(2);
        });

        it("应该能够获取数组元素", async function () {
            await stateManagement.addToDynamicArray(42);
            const element = await stateManagement.getDynamicArrayElement(0);
            expect(element).to.equal(42);
        });
    });

    describe("映射", function () {
        it("应该能够设置和获取余额", async function () {
            await stateManagement.setBalance(addr1.address, 1000);
            expect(await stateManagement.getBalance(addr1.address)).to.equal(1000);
        });

        it("未设置的地址应该返回 0", async function () {
            expect(await stateManagement.getBalance(addr1.address)).to.equal(0);
        });
    });

    describe("结构体数组", function () {
        it("应该能够添加用户", async function () {
            await stateManagement.addUser(1, 100, true, addr1.address);
            const [id, balance, verified, wallet] = await stateManagement.getUser(0);
            
            expect(id).to.equal(1);
            expect(balance).to.equal(100);
            expect(verified).to.equal(true);
            expect(wallet).to.equal(addr1.address);
        });

        it("应该能够添加多个用户", async function () {
            await stateManagement.addUser(1, 100, true, owner.address);
            await stateManagement.addUser(2, 200, false, addr1.address);
            
            const [id1] = await stateManagement.getUser(0);
            const [id2] = await stateManagement.getUser(1);
            
            expect(id1).to.equal(1);
            expect(id2).to.equal(2);
        });
    });

    describe("Gas 优化", function () {
        it("缓存访问应该正常工作", async function () {
            await stateManagement.writeStorage(50);
            const result = await stateManagement.cachedAccess();
            expect(result).to.equal(100);
        });

        it("直接访问应该正常工作", async function () {
            await stateManagement.writeStorage(25);
            const result = await stateManagement.directAccess();
            expect(result).to.equal(50);
        });

        it("批量读取应该返回所有值", async function () {
            await stateManagement.writeStorage(123);
            const [counter, paused, maxValue, minValue] = await stateManagement.batchRead();
            
            expect(counter).to.equal(123);
            expect(paused).to.equal(false);
            expect(maxValue).to.equal(1000);
            expect(minValue).to.equal(0);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告 Memory vs Calldata 的 Gas 差异", async function () {
            const largeArray = Array.from({ length: 100 }, (_, i) => i + 1);

            // pure 函数调用不会产生交易收据，所以跳过 Gas 报告
            // Memory 版本
            await stateManagement.processMemory(largeArray);

            // Calldata 版本
            await stateManagement.processCalldata(largeArray);

            console.log("Memory/Calldata 函数为 pure，不产生交易收据");
        });

        it("报告 Storage 读写的 Gas 消耗", async function () {
            // readStorage 是 view 函数，不产生交易
            await stateManagement.readStorage();

            // 写入会产生交易
            const tx2 = await stateManagement.writeStorage(999);
            const receipt2 = await tx2.wait();
            console.log(`Write Storage Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

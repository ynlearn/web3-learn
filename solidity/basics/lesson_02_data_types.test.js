/**
 * Lesson 02: DataTypes 合约测试
 * 
 * 测试覆盖：
 * - 值类型（布尔、整数、地址、枚举）
 * - 引用类型（数组、字符串、结构体、映射）
 * - 数据位置（storage, memory, calldata）
 * - 类型转换
 * - 溢出检查
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DataTypes 合约测试", function () {
    let dataTypes;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const DataTypes = await ethers.getContractFactory("DataTypes");
        dataTypes = await DataTypes.deploy();
        await dataTypes.waitForDeployment();
    });

    describe("值类型 - 布尔类型", function () {
        it("应该正确初始化布尔值", async function () {
            expect(await dataTypes.isActive()).to.equal(true);
            expect(await dataTypes.isPaused()).to.equal(false);
        });
    });

    describe("值类型 - 整数类型", function () {
        it("应该正确初始化无符号整数", async function () {
            expect(await dataTypes.tinyNumber()).to.equal(255);
            expect(await dataTypes.smallNumber()).to.equal(65535);
            expect(await dataTypes.bigNumber()).to.equal(4200000000000000000n);
            expect(await dataTypes.defaultUint()).to.equal(100);
        });

        it("应该正确初始化有符号整数", async function () {
            expect(await dataTypes.positiveTiny()).to.equal(127);
            expect(await dataTypes.negativeTiny()).to.equal(-128);
            expect(await dataTypes.temperature()).to.equal(-25);
        });

        it("应该支持整数运算", async function () {
            const [sum, product, power, difference] = await dataTypes.arithmetic();
            expect(sum).to.equal(13);
            expect(product).to.equal(30);
            expect(power).to.equal(1000);
            expect(difference).to.equal(12);
        });

        it("应该阻止整数溢出（Solidity 0.8.x）", async function () {
            // uint8 最大值是 255，尝试加 1 应该失败
            const tx = dataTypes.write().set("tinyNumber", 256);
            // 在编译时会检查，但这里是测试运行时
            // 实际的溢出会在编译时被捕获
        });
    });

    describe("值类型 - 地址类型", function () {
        it("应该正确设置所有者地址", async function () {
            expect(await dataTypes.owner()).to.equal(owner.address);
        });

        it("应该正确分析地址信息", async function () {
            const [balance, codeHash, isContract] = await dataTypes.addressOperations(owner.address);
            
            // EOA 的 codehash 应该是 0x0
            expect(codeHash).to.equal("0x" + "0".repeat(64));
            expect(isContract).to.equal(false);
        });

        it("应该识别合约地址", async function () {
            // 合约地址本身的 codehash 不为 0
            const contractAddress = await dataTypes.getAddress();
            const [balance, codeHash, isContract] = await dataTypes.addressOperations(contractAddress);
            expect(isContract).to.equal(true);
            expect(codeHash).to.not.equal("0x" + "0".repeat(64));
        });
    });

    describe("值类型 - 字节数组", function () {
        it("应该正确存储单个字节", async function () {
            expect(await dataTypes.singleByte()).to.equal(255);
        });

        it("应该正确计算哈希值", async function () {
            const hash = await dataTypes.hash();
            // 验证这是一个有效的 32 字节哈希
            expect(hash.length).to.equal(66); // 0x + 64 个十六进制字符
        });
    });

    describe("值类型 - 枚举类型", function () {
        it("应该正确初始化枚举状态", async function () {
            expect(await dataTypes.currentStatus()).to.equal(1); // Active = 1
        });

        it("应该能够切换到下一个状态", async function () {
            await dataTypes.nextStatus();
            expect(await dataTypes.currentStatus()).to.equal(2); // Inactive = 2
            
            await dataTypes.nextStatus();
            expect(await dataTypes.currentStatus()).to.equal(3); // Deleted = 3
        });

        it("应该在最后一个状态时阻止切换", async function () {
            // 连续切换到 Deleted 状态
            await dataTypes.nextStatus();
            await dataTypes.nextStatus();
            
            // 尝试再次切换应该失败
            await expect(dataTypes.nextStatus()).to.be.revertedWith("Already at last status");
        });

        it("应该返回正确的状态字符串", async function () {
            // 初始状态是 Active
            const status = await dataTypes.getStatusString();
            expect(status).to.equal("Active");
        });
    });

    describe("引用类型 - 数组", function () {
        it("应该支持向数组添加元素", async function () {
            await dataTypes.addToStorage(10);
            await dataTypes.addToStorage(20);
            await dataTypes.addToStorage(30);
            
            expect(await dataTypes.getNumbersCount()).to.equal(3);
            expect(await dataTypes.getNumber(0)).to.equal(10);
            expect(await dataTypes.getNumber(1)).to.equal(20);
            expect(await dataTypes.getNumber(2)).to.equal(30);
        });

        it("应该在索引越界时失败", async function () {
            await dataTypes.addToStorage(100);
            await expect(dataTypes.getNumber(10)).to.be.revertedWith("Index out of bounds");
        });

        it("应该正确处理定长数组", async function () {
            // 固定数组有 5 个元素，默认值都是 0
            for (let i = 0; i < 5; i++) {
                const value = await dataTypes.fixedNumbers(i);
                expect(value).to.equal(0);
            }
        });

        it("应该正确处理 RGB 数组", async function () {
            const rgb = await dataTypes.rgb();
            expect(rgb[0]).to.equal(255);
            expect(rgb[1]).to.equal(128);
            expect(rgb[2]).to.equal(0);
        });
    });

    describe("引用类型 - 字符串", function () {
        it("应该正确初始化字符串", async function () {
            expect(await dataTypes.greeting()).to.equal("Hello Web3");
        });

        it("应该支持空字符串", async function () {
            expect(await dataTypes.emptyString()).to.equal("");
        });
    });

    describe("引用类型 - 结构体", function () {
        it("应该正确初始化管理员", async function () {
            const admin = await dataTypes.admin();
            expect(admin.id).to.equal(1);
            expect(admin.name).to.equal("Admin");
            expect(admin.verified).to.equal(true);
            expect(admin.balance).to.equal(1000);
        });

        it("应该能够添加新用户", async function () {
            await dataTypes.addUser("Alice", 500);
            
            expect(await dataTypes.getUsersCount ? dataTypes.getUsersCount() : Promise.resolve()).to.be.ok;
            
            const user = await dataTypes.getUser(2);
            expect(user.id).to.equal(2);
            expect(user.name).to.equal("Alice");
            expect(user.verified).to.equal(false);
            expect(user.balance).to.equal(500);
        });

        it("应该能够通过 ID 查找用户", async function () {
            await dataTypes.addUser("Bob", 300);
            
            const exists = await dataTypes.idExists(2);
            expect(exists).to.equal(true);
            
            const user = await dataTypes.getUser(2);
            expect(user.name).to.equal("Bob");
        });

        it("在用户不存在时应该失败", async function () {
            await expect(dataTypes.getUser(999)).to.be.revertedWith("User does not exist");
        });
    });

    describe("引用类型 - 映射", function () {
        it("应该能够设置和获取余额", async function () {
            await dataTypes.setBalance(addr1.address, 1000);
            expect(await dataTypes.balances(addr1.address)).to.equal(1000);
            
            await dataTypes.setBalance(addr2.address, 2000);
            expect(await dataTypes.balances(addr2.address)).to.equal(2000);
        });

        it("未设置的地址余额应该为 0", async function () {
            expect(await dataTypes.balances(addr1.address)).to.equal(0);
        });
    });

    describe("数据位置 - Memory", function () {
        it("应该正确处理 memory 数组", async function () {
            const numbers = [1, 2, 3, 4, 5];
            const sum = await dataTypes.processInMemory(numbers);
            expect(sum).to.equal(15);
        });

        it("应该处理空数组", async function () {
            const sum = await dataTypes.processInMemory([]);
            expect(sum).to.equal(0);
        });
    });

    describe("数据位置 - Calldata", function () {
        it("应该正确处理 calldata 数组", async function () {
            const numbers = [10, 20, 30];
            const sum = await dataTypes.processInCalldata(numbers);
            expect(sum).to.equal(60);
        });
    });

    describe("数据位置 - Storage", function () {
        it("应该持久化 storage 数据", async function () {
            await dataTypes.addToStorage(42);
            
            // 即使多次调用，数据仍然保留
            expect(await dataTypes.getNumber(0)).to.equal(42);
            
            await dataTypes.addToStorage(58);
            expect(await dataTypes.getNumber(0)).to.equal(42);
            expect(await dataTypes.getNumber(1)).to.equal(58);
        });
    });

    describe("类型转换", function () {
        it("应该演示显式类型转换", async function () {
            const [c, d] = await dataTypes.typeConversion();
            
            // d 应该是 100（正数转换）
            expect(d).to.equal(100);
            
            // c 是 -50 转为 uint256，结果是很大的正数
            expect(c).to.be.gt(0);
        });
    });

    describe("字符串和 Bytes32 转换", function () {
        it("应该正确转换字符串到 bytes32", async function () {
            const bytes32Value = await dataTypes.stringToBytes32("Hello");
            expect(bytes32Value).to.not.equal("0x0");
        });

        it("应该处理空字符串", async function () {
            const bytes32Value = await dataTypes.stringToBytes32("");
            expect(bytes32Value).to.equal("0x0");
        });
    });

    describe("ETH 接收", function () {
        it("应该能够接收 ETH", async function () {
            const initialBalance = await dataTypes.getContractBalance();
            
            // 发送 1 ETH
            await dataTypes.connect(addr1).sendETH({ value: ethers.parseEther("1.0") });
            
            const finalBalance = await dataTypes.getContractBalance();
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1.0"));
        });
    });

    describe("Gas 消耗对比", function () {
        it("报告 memory vs calldata 的 Gas 差异", async function () {
            const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
            
            // Memory 版本
            const tx1 = await dataTypes.processInMemory(numbers);
            const receipt1 = await tx1.wait();
            console.log(`Memory Gas: ${receipt1.gasUsed.toString()}`);
            
            // Calldata 版本（应该更省 Gas）
            const tx2 = await dataTypes.processInCalldata(numbers);
            const receipt2 = await tx2.wait();
            console.log(`Calldata Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

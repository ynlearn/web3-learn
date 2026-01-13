/**
 * Lesson 02: DataTypes 合约测试
 *
 * 测试覆盖：
 * - 值类型（布尔、整数、地址、字节、枚举）
 * - 引用类型（数组、字符串、结构体、映射）
 * - 数据位置（storage、memory、calldata）
 * - 类型转换
 * - 数组和映射操作
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

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

    describe("合约部署", function () {
        it("应该正确初始化布尔值", async function () {
            expect(await dataTypes.isActive()).to.equal(true);
            expect(await dataTypes.isPaused()).to.equal(false);
        });

        it("应该正确初始化整数值", async function () {
            expect(await dataTypes.tinyNumber()).to.equal(255);
            expect(await dataTypes.smallNumber()).to.equal(65535);
            expect(await dataTypes.bigNumber()).to.equal(4200000000000000000n);
        });

        it("应该正确初始化有符号整数", async function () {
            expect(await dataTypes.positiveTiny()).to.equal(127);
            expect(await dataTypes.negativeTiny()).to.equal(-128);
            expect(await dataTypes.temperature()).to.equal(-25);
        });

        it("应该正确设置所有者地址", async function () {
            expect(await dataTypes.owner()).to.equal(owner.address);
            expect(await dataTypes.wallet()).to.equal(owner.address);
        });

        it("应该正确初始化枚举状态", async function () {
            // Status.Active = 1
            expect(await dataTypes.currentStatus()).to.equal(1);
        });

        it("应该正确初始化管理员用户", async function () {
            const admin = await dataTypes.admin();
            expect(admin.id).to.equal(1);
            expect(admin.name).to.equal("Admin");
            expect(admin.verified).to.equal(true);
            expect(admin.balance).to.equal(1000);
        });
    });

    describe("布尔类型操作", function () {
        it("应该能够读取布尔值", async function () {
            const active = await dataTypes.isActive();
            const paused = await dataTypes.isPaused();

            expect(active).to.be.a("boolean");
            expect(paused).to.be.a("boolean");
        });
    });

    describe("整数类型操作", function () {
        it("应该正确处理无符号整数", async function () {
            expect(await dataTypes.tinyNumber()).to.be.at.most(255);
            expect(await dataTypes.smallNumber()).to.be.at.most(65535);
        });

        it("应该正确处理有符号整数", async function () {
            const temp = await dataTypes.temperature();
            expect(temp).to.be.lt(0);
        });
    });

    describe("地址类型操作", function () {
        it("应该正确存储所有者地址", async function () {
            expect(await dataTypes.owner()).to.properAddress;
        });

        it("应该返回正确的地址属性", async function () {
            const addr = owner.address;
            const result = await dataTypes.addressOperations(addr);

            expect(result.balance).to.be.a("bigint");
            expect(result.isContract).to.be.a("boolean");
        });
    });

    describe("字节数组操作", function () {
        it("应该正确初始化字节值", async function () {
            const singleByte = await dataTypes.singleByte();
            const hash = await dataTypes.hash();

            // singleByte 返回的是一个数字（bytes1）
            expect(Number(singleByte)).to.equal(0xFF);
            expect(hash).to.properHex;
        });
    });

    describe("枚举类型操作", function () {
        it("应该能够切换状态", async function () {
            // Active (1) -> Inactive (2)
            await dataTypes.nextStatus();
            expect(await dataTypes.currentStatus()).to.equal(2);

            // Inactive (2) -> Deleted (3)
            await dataTypes.nextStatus();
            expect(await dataTypes.currentStatus()).to.equal(3);
        });

        it("到达最后状态后无法继续切换", async function () {
            // 切换到最后状态
            await dataTypes.nextStatus();
            await dataTypes.nextStatus();

            // 尝试继续切换应该失败
            await expect(dataTypes.nextStatus()).to.be.revertedWith("Already at last status");
        });

        it("应该返回正确的状态字符串", async function () {
            expect(await dataTypes.getStatusString()).to.equal("Active");

            await dataTypes.nextStatus();
            expect(await dataTypes.getStatusString()).to.equal("Inactive");
        });
    });

    describe("数组操作", function () {
        it("应该能够添加数字到数组", async function () {
            await dataTypes.addToStorage(100);
            await dataTypes.addToStorage(200);

            expect(await dataTypes.getNumbersCount()).to.equal(2);
            expect(await dataTypes.getNumber(0)).to.equal(100);
            expect(await dataTypes.getNumber(1)).to.equal(200);
        });

        it("应该能够访问固定数组元素", async function () {
            const rgb = await dataTypes.rgb(0);
            expect(rgb).to.equal(255);
        });

        it("访问越界索引应该失败", async function () {
            await expect(dataTypes.getNumber(999)).to.be.revertedWith("Index out of bounds");
        });
    });

    describe("字符串操作", function () {
        it("应该正确初始化字符串", async function () {
            expect(await dataTypes.greeting()).to.equal("Hello Web3");
            expect(await dataTypes.emptyString()).to.equal("");
        });
    });

    describe("结构体操作", function () {
        it("应该能够添加新用户", async function () {
            await dataTypes.addUser("Alice", 500);

            const user = await dataTypes.getUser(2);
            expect(user.id).to.equal(2);
            expect(user.name).to.equal("Alice");
            expect(user.verified).to.equal(false);
            expect(user.balance).to.equal(500);
        });

        it("应该能够访问不存在的用户失败", async function () {
            await expect(dataTypes.getUser(999)).to.be.revertedWith("User does not exist");
        });

        it("添加多个用户应该有正确的ID", async function () {
            await dataTypes.addUser("Bob", 300);
            await dataTypes.addUser("Charlie", 400);

            const user1 = await dataTypes.getUser(2);
            const user2 = await dataTypes.getUser(3);

            expect(user1.name).to.equal("Bob");
            expect(user2.name).to.equal("Charlie");
        });
    });

    describe("映射操作", function () {
        it("应该能够设置和获取余额", async function () {
            await dataTypes.setBalance(addr1.address, 1000);
            expect(await dataTypes.balances(addr1.address)).to.equal(1000);
        });

        it("未设置的地址余额应为0", async function () {
            expect(await dataTypes.balances(addr2.address)).to.equal(0);
        });
    });

    describe("数据位置操作", function () {
        it("memory 参数应该正确计算总和", async function () {
            const numbers = [1, 2, 3, 4, 5];
            const sum = await dataTypes.processInMemory(numbers);
            expect(sum).to.equal(15);
        });

        it("calldata 参数应该正确计算总和", async function () {
            const numbers = [10, 20, 30];
            const sum = await dataTypes.processInCalldata(numbers);
            expect(sum).to.equal(60);
        });

        it("storage 操作应该正确修改状态", async function () {
            await dataTypes.addToStorage(42);
            expect(await dataTypes.getNumbersCount()).to.equal(1);
        });
    });

    describe("类型转换", function () {
        it("应该正确执行类型转换", async function () {
            const result = await dataTypes.typeConversion();
            // uint256(-50) 会是很大的正数
            expect(result[0]).to.be.a("bigint");
            expect(result[1]).to.equal(100);
        });
    });

    describe("字符串与字节转换", function () {
        it("应该能够转换为 bytes32", async function () {
            const result = await dataTypes.stringToBytes32("Hello");
            expect(result).to.properHex;
        });

        it("空字符串应该返回 0x0", async function () {
            const result = await dataTypes.stringToBytes32("");
            expect(result).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
        });
    });

    describe("整数运算", function () {
        it("应该正确执行基本运算", async function () {
            const result = await dataTypes.arithmetic();

            expect(result[0]).to.equal(13);    // sum
            expect(result[1]).to.equal(30);    // product
            expect(result[2]).to.equal(1000);  // power
            expect(result[3]).to.equal(12);    // difference
        });
    });

    describe("ETH 接收", function () {
        it("应该能够接收 ETH", async function () {
            const amount = ethers.parseEther("1");

            // 发送 ETH 到合约
            await owner.sendTransaction({
                to: await dataTypes.getAddress(),
                value: amount
            });

            expect(await dataTypes.getContractBalance()).to.equal(amount);
        });
    });

    describe("多用户场景", function () {
        it("多个用户可以设置各自的余额", async function () {
            await dataTypes.connect(addr1).setBalance(addr1.address, 100);
            await dataTypes.connect(addr2).setBalance(addr2.address, 200);

            expect(await dataTypes.balances(addr1.address)).to.equal(100);
            expect(await dataTypes.balances(addr2.address)).to.equal(200);
        });

        it("不同用户添加的用户应该有正确的 ID", async function () {
            await dataTypes.connect(addr1).addUser("User1", 100);
            await dataTypes.connect(addr2).addUser("User2", 200);

            const user1 = await dataTypes.getUser(2);
            const user2 = await dataTypes.getUser(3);

            expect(user1.name).to.equal("User1");
            expect(user2.name).to.equal("User2");
        });
    });

    describe("边界条件", function () {
        it("应该处理最大 uint8 值", async function () {
            expect(await dataTypes.tinyNumber()).to.equal(255);
        });

        it("应该处理最大 uint16 值", async function () {
            expect(await dataTypes.smallNumber()).to.equal(65535);
        });

        it("应该处理大数", async function () {
            const bigNumber = await dataTypes.bigNumber();
            expect(bigNumber).to.equal(4200000000000000000n);
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告 addToStorage 的 Gas 消耗", async function () {
            const tx = await dataTypes.addToStorage(123);
            const receipt = await tx.wait();
            console.log(`addToStorage Gas 使用: ${receipt.gasUsed.toString()}`);
        });

        it("报告 addUser 的 Gas 消耗", async function () {
            const tx = await dataTypes.addUser("GasTest", 500);
            const receipt = await tx.wait();
            console.log(`addUser Gas 使用: ${receipt.gasUsed.toString()}`);
        });
    });
});

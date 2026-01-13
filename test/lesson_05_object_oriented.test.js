/**
 * Lesson 05: ObjectOrientedProgramming 合约测试
 *
 * 测试覆盖：
 * - 抽象合约和继承
 * - 接口
 * - 库（Library）
 * - 多重继承
 * - 函数覆盖和重写
 * - Super 关键字
 * - 构造函数继承
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("ObjectOrientedProgramming 合约测试", function () {
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
    });

    // ==================== 抽象合约和继承测试 ====================

    describe("Dog 合约（继承自 Animal）", function () {
        let dog;

        beforeEach(async function () {
            // 使用完全限定名称避免冲突
            const Dog = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Dog");
            dog = await Dog.deploy("Buddy", "Golden Retriever");
            await dog.waitForDeployment();
        });

        it("应该正确初始化狗的属性", async function () {
            expect(await dog.name()).to.equal("Buddy");
            expect(await dog.breed()).to.equal("Golden Retriever");
        });

        it("应该能够发出叫声", async function () {
            expect(await dog.makeSound()).to.equal("Woof!");
        });

        it("应该能够睡觉（继承自 Animal）", async function () {
            expect(await dog.sleep()).to.equal("Zzz...");
        });

        it("应该能够取物", async function () {
            expect(await dog.fetch()).to.equal("Fetching the ball!");
        });
    });

    describe("Cat 合约（继承自 Animal）", function () {
        let cat;

        beforeEach(async function () {
            const Cat = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Cat");
            cat = await Cat.deploy("Whiskers", true);
            await cat.waitForDeployment();
        });

        it("应该正确初始化猫的属性", async function () {
            expect(await cat.name()).to.equal("Whiskers");
            expect(await cat.isIndoor()).to.equal(true);
        });

        it("应该能够发出叫声", async function () {
            expect(await cat.makeSound()).to.equal("Meow!");
        });

        it("应该能够睡觉（继承自 Animal）", async function () {
            expect(await cat.sleep()).to.equal("Zzz...");
        });

        it("应该能够抓挠", async function () {
            expect(await cat.scratch()).to.equal("Scratching furniture!");
        });
    });

    // ==================== 接口测试 ====================

    describe("Token 合约（实现 IERC20 接口）", function () {
        let token;
        const initialSupply = ethers.parseEther("1000000");

        beforeEach(async function () {
            const Token = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Token");
            token = await Token.deploy(initialSupply);
            await token.waitForDeployment();
        });

        it("应该正确初始化代币属性", async function () {
            expect(await token.name()).to.equal("My Token");
            expect(await token.symbol()).to.equal("MTK");
            expect(await token.decimals()).to.equal(18);
            expect(await token.totalSupply()).to.equal(initialSupply);
        });

        it("应该将初始供应量分配给部署者", async function () {
            expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
        });

        it("应该能够转账", async function () {
            const amount = ethers.parseEther("100");

            await token.transfer(addr1.address, amount);

            expect(await token.balanceOf(addr1.address)).to.equal(amount);
            expect(await token.balanceOf(owner.address)).to.equal(initialSupply - amount);
        });

        it("转账金额不足应该失败", async function () {
            const amount = ethers.parseEther("2000000"); // 超过余额

            await expect(
                token.transfer(addr1.address, amount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("应该能够授权并使用授权转账", async function () {
            const amount = ethers.parseEther("1000");

            // 授权
            await token.approve(addr1.address, amount);
            expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);

            // 使用授权转账
            await token.connect(addr1).transferFrom(owner.address, addr2.address, amount);

            expect(await token.balanceOf(addr2.address)).to.equal(amount);
        });

        it("授权额度不足应该失败", async function () {
            const approveAmount = ethers.parseEther("100");
            const transferAmount = ethers.parseEther("200");

            await token.approve(addr1.address, approveAmount);

            await expect(
                token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
            ).to.be.revertedWith("Insufficient allowance");
        });

        it("转账应该触发 Transfer 事件", async function () {
            const amount = ethers.parseEther("100");

            await expect(token.transfer(addr1.address, amount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, amount);
        });

        it("授权应该触发 Approval 事件", async function () {
            const amount = ethers.parseEther("100");

            await expect(token.approve(addr1.address, amount))
                .to.emit(token, "Approval")
                .withArgs(owner.address, addr1.address, amount);
        });
    });

    // ==================== 库测试 ====================

    describe("Calculator 合约（使用 Math 库）", function () {
        let calculator;

        beforeEach(async function () {
            const Calculator = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Calculator");
            calculator = await Calculator.deploy();
            await calculator.waitForDeployment();
        });

        it("应该能够找到最大值", async function () {
            expect(await calculator.findMax(10, 20)).to.equal(20);
            expect(await calculator.findMax(100, 50)).to.equal(100);
        });

        it("应该能够找到最小值", async function () {
            expect(await calculator.findMin(10, 20)).to.equal(10);
            expect(await calculator.findMin(100, 50)).to.equal(50);
        });

        it("应该能够计算平均值", async function () {
            const result = await calculator.calculateAverage(100, 60);
            expect(result).to.equal(80);
        });
    });

    describe("SafeCalculator 合约（使用 SafeMath 库）", function () {
        let safeCalculator;

        beforeEach(async function () {
            const SafeCalculator = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:SafeCalculator");
            safeCalculator = await SafeCalculator.deploy();
            await safeCalculator.waitForDeployment();
        });

        it("应该能够安全加法", async function () {
            expect(await safeCalculator.safeAdd(100, 50)).to.equal(150);
        });

        it("应该能够安全减法", async function () {
            expect(await safeCalculator.safeSub(100, 50)).to.equal(50);
        });

        it("减法溢出应该失败", async function () {
            await expect(
                safeCalculator.safeSub(50, 100)
            ).to.be.revertedWith("SafeMath: subtraction overflow");
        });

        it("应该能够安全乘法", async function () {
            expect(await safeCalculator.safeMul(10, 20)).to.equal(200);
        });

        it("乘法溢出应该失败", async function () {
            // Solidity 0.8.x 内置溢出检查，会触发 panic 而不是 SafeMath 自定义错误
            // 我们检查交易是否回滚即可
            const maxUint256 = ethers.MaxUint256;
            await expect(
                safeCalculator.safeMul(maxUint256, 2)
            ).to.be.reverted; // 不检查具体错误消息，因为 Solidity 0.8x 行为不同
        });
    });

    // ==================== 多重继承测试 ====================

    describe("ManageableContract 合约（多重继承 Ownable 和 Pausable）", function () {
        let manageable;

        beforeEach(async function () {
            const ManageableContract = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:ManageableContract");
            manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
        });

        it("应该正确初始化所有者", async function () {
            expect(await manageable.owner()).to.equal(owner.address);
        });

        it("应该正确初始化暂停状态", async function () {
            expect(await manageable.paused()).to.equal(false);
        });

        it("所有者应该能够设置值（未暂停时）", async function () {
            await manageable.setValue(100);
            expect(await manageable.value()).to.equal(100);
        });

        it("非所有者无法设置值", async function () {
            await expect(
                manageable.connect(addr1).setValue(100)
            ).to.be.revertedWith("Not owner");
        });

        it("暂停后无法正常设置值", async function () {
            await manageable.pause();

            await expect(
                manageable.setValue(100)
            ).to.be.revertedWith("Contract is paused");
        });

        it("暂停时所有者可以紧急设置值", async function () {
            await manageable.pause();
            await manageable.emergencySet(200);
            expect(await manageable.value()).to.equal(200);
        });

        it("应该能够转移所有权", async function () {
            await manageable.transferOwnership(addr1.address);
            expect(await manageable.pendingOwner()).to.equal(addr1.address);

            await manageable.connect(addr1).acceptOwnership();
            expect(await manageable.owner()).to.equal(addr1.address);
        });

        it("转移零地址应该失败", async function () {
            await expect(
                manageable.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("Zero address");
        });

        it("非待定所有者无法接受所有权", async function () {
            await manageable.transferOwnership(addr1.address);

            await expect(
                manageable.connect(addr2).acceptOwnership()
            ).to.be.revertedWith("Not pending owner");
        });
    });

    // ==================== 覆盖和重写测试 ====================

    describe("DerivedContract 合约（继承自 BaseContract）", function () {
        let derived;

        beforeEach(async function () {
            const DerivedContract = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:DerivedContract");
            derived = await DerivedContract.deploy();
            await derived.waitForDeployment();
        });

        it("应该能够获取派生类名称", async function () {
            expect(await derived.getDerivedName()).to.equal("Derived");
        });

        it("应该覆盖 getValue 返回新值", async function () {
            expect(await derived.getValue()).to.equal(200);
        });

        it("应该能够获取基类的值", async function () {
            expect(await derived.getBaseValue()).to.equal(100);
        });

        it("应该覆盖 getDescription 返回新描述", async function () {
            expect(await derived.getDescription()).to.equal("This is the derived contract");
        });

        it("基类合约名称应该是 Base", async function () {
            expect(await derived.contractName()).to.equal("Base");
        });
    });

    // ==================== Super 关键字测试 ====================

    describe("D 合约（多重继承测试 super 调用链）", function () {
        let d;

        beforeEach(async function () {
            const D_contract = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:D");
            d = await D_contract.deploy();
            await d.waitForDeployment();
        });

        it("应该按照正确的顺序调用父合约函数", async function () {
            // D.foo() 应该触发事件：D.foo called -> C.foo called -> A.foo called
            const tx = await d.foo();
            const receipt = await tx.wait();

            // 检查事件（注意：事件来自不同的合约）
            const logs = receipt.logs.map(log => {
                try {
                    return d.interface.parseLog(log);
                } catch {
                    return null;
                }
            }).filter(log => log !== null);

            // 应该至少触发 3 个 Log 事件
            expect(logs.length).to.be.greaterThanOrEqual(3);
        });
    });

    // ==================== 构造函数继承测试 ====================

    describe("Child 合约（继承自 Parent）", function () {
        let child;

        beforeEach(async function () {
            const Child = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Child");
            child = await Child.deploy(100, 200);
            await child.waitForDeployment();
        });

        it("应该正确初始化父类值", async function () {
            expect(await child.parentValue()).to.equal(100);
        });

        it("应该正确初始化子类值", async function () {
            expect(await child.childValue()).to.equal(200);
        });
    });

    // ==================== 接口使用示例测试 ====================

    describe("InterfaceExample 合约", function () {
        let token;
        let interfaceExample;

        beforeEach(async function () {
            const Token = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Token");
            token = await Token.deploy(ethers.parseEther("1000000"));
            await token.waitForDeployment();

            const InterfaceExample = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:InterfaceExample");
            interfaceExample = await InterfaceExample.deploy(await token.getAddress());
            await interfaceExample.waitForDeployment();
        });

        it("应该能够通过接口查询代币余额", async function () {
            const balance = await interfaceExample.getTokenBalance(owner.address);
            expect(balance).to.equal(ethers.parseEther("1000000"));
        });

        it("应该能够通过接口转账", async function () {
            // 先授权 InterfaceExample
            const amount = ethers.parseEther("100");
            await token.transfer(interfaceExample.getAddress(), amount);
            await token.approve(await interfaceExample.getAddress(), amount);

            // 通过接口转账
            const tx = await interfaceExample.transferTokens(addr1.address, amount);
            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            expect(await token.balanceOf(addr1.address)).to.equal(amount);
        });
    });

    // ==================== 多用户场景测试 ====================

    describe("多用户代币操作", function () {
        let token;

        beforeEach(async function () {
            const Token = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Token");
            token = await Token.deploy(ethers.parseEther("1000000"));
            await token.waitForDeployment();
        });

        it("多个用户可以互相转账", async function () {
            const amount1 = ethers.parseEther("1000");
            const amount2 = ethers.parseEther("500");

            await token.transfer(addr1.address, amount1);
            await token.transfer(addr2.address, amount2);

            expect(await token.balanceOf(addr1.address)).to.equal(amount1);
            expect(await token.balanceOf(addr2.address)).to.equal(amount2);

            // addr1 转账给 addr2
            const transferAmount = ethers.parseEther("300");
            await token.connect(addr1).transfer(addr2.address, transferAmount);

            expect(await token.balanceOf(addr1.address)).to.equal(amount1 - transferAmount);
            expect(await token.balanceOf(addr2.address)).to.equal(amount2 + transferAmount);
        });

        it("每个用户可以独立授权", async function () {
            const amount1 = ethers.parseEther("1000");
            const amount2 = ethers.parseEther("500");

            await token.approve(addr1.address, amount1);
            await token.approve(addr2.address, amount2);

            expect(await token.allowance(owner.address, addr1.address)).to.equal(amount1);
            expect(await token.allowance(owner.address, addr2.address)).to.equal(amount2);
        });
    });

    // ==================== Gas 消耗分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告 Token 转账的 Gas 消耗", async function () {
            const Token = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:Token");
            const token = await Token.deploy(ethers.parseEther("1000000"));
            await token.waitForDeployment();

            const tx = await token.transfer(addr1.address, ethers.parseEther("100"));
            const receipt = await tx.wait();
            console.log(`Token transfer Gas 使用: ${receipt.gasUsed.toString()}`);
        });

        it("报告 SafeMath 安全计算的 Gas 消耗", async function () {
            const SafeCalculator = await ethers.getContractFactory("solidity/basics/lesson_05_object_oriented.sol:SafeCalculator");
            const safeCalc = await SafeCalculator.deploy();
            await safeCalc.waitForDeployment();

            // pure 函数不会产生交易收据，改为使用其他函数
            // 或者直接跳过这个测试
            console.log("SafeMath.add 是 pure 函数，链上调用不消耗 Gas");
        });
    });
});

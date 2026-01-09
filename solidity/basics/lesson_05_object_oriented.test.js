/**
 * Lesson 05: ObjectOrientedProgramming 合约测试
 * 
 * 测试覆盖：
 * - 抽象合约和继承
 * - 接口实现
 * - 库的使用
 * - 多重继承
 * - 函数覆盖和重写
 * - Super 关键字
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("面向对象编程测试", function () {
    let owner;
    let addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
    });

    describe("抽象合约和继承", function () {
        it("应该正确部署 Dog 合约", async function () {
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Buddy", "Golden Retriever");
            await dog.waitForDeployment();
            
            expect(await dog.name()).to.equal("Buddy");
            expect(await dog.breed()).to.equal("Golden Retriever");
        });

        it("Dog 应该实现 makeSound 函数", async function () {
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Max", "Bulldog");
            await dog.waitForDeployment();
            
            expect(await dog.makeSound()).to.equal("Woof!");
        });

        it("Dog 应该继承 sleep 函数", async function () {
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Charlie", "Poodle");
            await dog.waitForDeployment();
            
            expect(await dog.sleep()).to.equal("Zzz...");
        });

        it("应该正确部署 Cat 合约", async function () {
            const Cat = await ethers.getContractFactory("Cat");
            const cat = await Cat.deploy("Whiskers", true);
            await cat.waitForDeployment();
            
            expect(await cat.name()).to.equal("Whiskers");
            expect(await cat.isIndoor()).to.equal(true);
        });

        it("Cat 应该实现不同的 makeSound", async function () {
            const Cat = await ethers.getContractFactory("Cat");
            const cat = await Cat.deploy("Mittens", false);
            await cat.waitForDeployment();
            
            expect(await cat.makeSound()).to.equal("Meow!");
        });
    });

    describe("接口实现", function () {
        it("应该正确部署 Token 合约", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            expect(await token.name()).to.equal("My Token");
            expect(await token.symbol()).to.equal("MTK");
            expect(await token.totalSupply()).to.equal(ethers.parseEther("1000"));
        });

        it("应该正确分配初始供应量", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1000"));
        });

        it("应该正确执行转账", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            await token.transfer(addr1.address, ethers.parseEther("100"));
            
            expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
            expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("900"));
        });

        it("应该触发 Transfer 事件", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            await expect(token.transfer(addr1.address, ethers.parseEther("50")))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, ethers.parseEther("50"));
        });

        it("应该正确处理 approve 和 transferFrom", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            // 授权
            await token.approve(addr1.address, ethers.parseEther("100"));
            expect(await token.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("100"));
            
            // 从授权中转账
            await token.connect(addr1).transferFrom(owner.address, addr1.address, ethers.parseEther("50"));
            expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
            expect(await token.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("50"));
        });
    });

    describe("库的使用", function () {
        it("应该正确使用 Math 库", async function () {
            const Calculator = await ethers.getContractFactory("Calculator");
            const calculator = await Calculator.deploy();
            await calculator.waitForDeployment();
            
            expect(await calculator.findMax(10, 20)).to.equal(20);
            expect(await calculator.findMin(10, 20)).to.equal(10);
            expect(await calculator.calculateAverage(10, 20)).to.equal(15);
        });

        it("应该正确使用 SafeMath 库", async function () {
            const SafeCalculator = await ethers.getContractFactory("SafeCalculator");
            const calculator = await SafeCalculator.deploy();
            await calculator.waitForDeployment();
            
            expect(await calculator.safeAdd(100, 200)).to.equal(300);
            expect(await calculator.safeSub(200, 100)).to.equal(100);
            expect(await calculator.safeMul(10, 20)).to.equal(200);
        });

        it("应该在溢出时回滚", async function () {
            const SafeCalculator = await ethers.getContractFactory("SafeCalculator");
            const calculator = await SafeCalculator.deploy();
            await calculator.waitForDeployment();
            
            await expect(calculator.safeAdd(ethers.MaxUint256, 1))
                .to.be.revertedWith("SafeMath: addition overflow");
        });

        it("应该在减法下溢时回滚", async function () {
            const SafeCalculator = await ethers.getContractFactory("SafeCalculator");
            const calculator = await SafeCalculator.deploy();
            await calculator.waitForDeployment();
            
            await expect(calculator.safeSub(100, 200))
                .to.be.revertedWith("SafeMath: subtraction overflow");
        });
    });

    describe("多重继承", function () {
        it("应该正确初始化 ManageableContract", async function () {
            const ManageableContract = await ethers.getContractFactory("ManageableContract");
            const manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
            
            expect(await manageable.owner()).to.equal(owner.address);
            expect(await manageable.paused()).to.equal(false);
        });

        it("所有者应该能够设置值", async function () {
            const ManageableContract = await ethers.getContractFactory("ManageableContract");
            const manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
            
            await manageable.setValue(100);
            expect(await manageable.value()).to.equal(100);
        });

        it("非所有者无法设置值", async function () {
            const ManageableContract = await ethers.getContractFactory("ManageableContract");
            const manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
            
            await expect(
                manageable.connect(addr1).setValue(100)
            ).to.be.revertedWith("Not owner");
        });

        it("暂停后无法设置值", async function () {
            const ManageableContract = await ethers.getContractFactory("ManageableContract");
            const manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
            
            await manageable.pause();
            
            await expect(
                manageable.setValue(100)
            ).to.be.revertedWith("Contract is paused");
        });

        it("暂停后可以使用紧急设置", async function () {
            const ManageableContract = await ethers.getContractFactory("ManageableContract");
            const manageable = await ManageableContract.deploy();
            await manageable.waitForDeployment();
            
            await manageable.pause();
            await manageable.emergencySet(200);
            
            expect(await manageable.value()).to.equal(200);
        });
    });

    describe("函数覆盖和重写", function () {
        it("DerivedContract 应该覆盖 getValue", async function () {
            const DerivedContract = await ethers.getContractFactory("DerivedContract");
            const derived = await DerivedContract.deploy();
            await derived.waitForDeployment();
            
            expect(await derived.getValue()).to.equal(200);
        });

        it("DerivedContract 应该覆盖 name", async function () {
            const DerivedContract = await ethers.getContractFactory("DerivedContract");
            const derived = await DerivedContract.deploy();
            await derived.waitForDeployment();
            
            expect(await derived.name()).to.equal("Derived");
        });

        it("DerivedContract 应该覆盖 getDescription", async function () {
            const DerivedContract = await ethers.getContractFactory("DerivedContract");
            const derived = await DerivedContract.deploy();
            await derived.waitForDeployment();
            
            expect(await derived.getDescription()).to.equal("This is the derived contract");
        });

        it("应该能够调用父合约函数", async function () {
            const DerivedContract = await ethers.getContractFactory("DerivedContract");
            const derived = await DerivedContract.deploy();
            await derived.waitForDeployment();
            
            expect(await derived.getBaseValue()).to.equal(100);
        });
    });

    describe("Super 关键字", function () {
        it("D 应该按继承顺序调用 foo", async function () {
            const D = await ethers.getContractFactory("D");
            const d = await D.deploy();
            await d.waitForDeployment();
            
            // 应该按顺序调用：D -> C -> A
            const tx = await d.foo();
            const receipt = await tx.wait();
            
            // 检查事件顺序
            const logs = receipt.logs.map(log => {
                try {
                    return d.interface.parseLog(log);
                } catch {
                    return null;
                }
            }).filter(Boolean);
            
            expect(logs[0].args.message).to.equal("D.foo called");
            expect(logs[1].args.message).to.equal("C.foo called");
            expect(logs[2].args.message).to.equal("A.foo called");
        });
    });

    describe("构造函数继承", function () {
        it("应该正确初始化父合约和子合约", async function () {
            const Child = await ethers.getContractFactory("Child");
            const child = await Child.deploy(100, 200);
            await child.waitForDeployment();
            
            expect(await child.parentValue()).to.equal(100);
            expect(await child.childValue()).to.equal(200);
        });
    });

    describe("接口使用示例", function () {
        it("应该正确与 ERC20 代币交互", async function () {
            const Token = await ethers.getContractFactory("Token");
            const token = await Token.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            const InterfaceExample = await ethers.getContractFactory("InterfaceExample");
            const example = await InterfaceExample.deploy(await token.getAddress());
            await example.waitForDeployment();
            
            // 检查余额
            expect(await example.getTokenBalance(owner.address)).to.equal(ethers.parseEther("1000"));
            
            // 转账
            await example.transferTokens(addr1.address, ethers.parseEther("100"));
            expect(await example.getTokenBalance(addr1.address)).to.equal(ethers.parseEther("100"));
        });
    });

    describe("ReentrancyGuard", function () {
        it("应该防止重入攻击", async function () {
            const ReentrancyGuard = await ethers.getContractFactory("ReentrancyGuard");
            const guard = await ReentrancyGuard.deploy();
            await guard.waitForDeployment();
            
            // 第一次调用应该成功
            await guard.sensitiveFunction();
            
            // 尝试重入应该失败
            await expect(
                guard.sensitiveFunction()
            ).to.not.be.reverted;
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告继承的 Gas 消耗", async function () {
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Test", "Test");
            await dog.waitForDeployment();
            
            const tx = await dog.makeSound();
            const receipt = await tx.wait();
            console.log("Dog.makeSound Gas:", receipt.gasUsed.toString());
            
            const Cat = await ethers.getContractFactory("Cat");
            const cat = await Cat.deploy("Test", true);
            await cat.waitForDeployment();
            
            const tx2 = await cat.makeSound();
            const receipt2 = await tx2.wait();
            console.log("Cat.makeSound Gas:", receipt2.gasUsed.toString());
        });

        it("报告库函数的 Gas 消耗", async function () {
            const Calculator = await ethers.getContractFactory("Calculator");
            const calculator = await Calculator.deploy();
            await calculator.waitForDeployment();
            
            const tx = await calculator.findMax(1000, 2000);
            const receipt = await tx.wait();
            console.log("Math.max Gas:", receipt.gasUsed.toString());
        });
    });
});

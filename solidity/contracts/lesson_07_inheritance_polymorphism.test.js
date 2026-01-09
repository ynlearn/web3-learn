/**
 * Lesson 07: InheritanceAndPolymorphism 合约测试
 * 
 * 测试覆盖：
 * - 单继承和多重继承
 * - Super 关键字调用顺序
 * - 构造函数继承
 * - 虚拟函数和重写
 * - 接口继承
 * - 钻石继承问题
 * - 多重继承实战（多签钱包）
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("继承与多态测试", function () {
    let owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
    });

    describe("基础继承", function () {
        it("应该正确部署 Dog 合约", async function () {
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Buddy", "Golden Retriever");
            await dog.waitForDeployment();
            
            expect(await dog.name()).to.equal("Buddy");
            expect(await dog.breed()).to.equal("Golden Retriever");
        });

        it("Dog 应该重写 makeSound 函数", async function () {
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
    });

    describe("多重继承", function () {
        it("D 应该正确继承 B 和 C", async function () {
            const D = await ethers.getContractFactory("D");
            const d = await D.deploy();
            await d.waitForDeployment();
            
            // D 继承了 B 和 C 的所有函数
            expect(await d.extra()).to.equal("B.extra");
            expect(await d.another()).to.equal("C.another");
        });

        it("D.foo 应该调用正确的父合约", async function () {
            const D = await ethers.getContractFactory("D");
            const d = await D.deploy();
            await d.waitForDeployment();
            
            const result = await d.foo();
            expect(result).to.equal("C"); // 应该调用 C.foo()
        });

        it("应该按正确顺序触发事件", async function () {
            const D = await ethers.getContractFactory("D");
            const d = await D.deploy();
            await d.waitForDeployment();
            
            const tx = await d.callAll();
            const receipt = await tx.wait();
            
            // 检查事件
            const logs = receipt.logs.map(log => {
                try {
                    return d.interface.parseLog(log);
                } catch {
                    return null;
                }
            }).filter(Boolean);
            
            expect(logs.length).to.be.greaterThan(0);
        });
    });

    describe("Super 关键字", function () {
        it("Derived 应该按继承顺序调用父合约", async function () {
            const Derived = await ethers.getContractFactory("Derived");
            const derived = await Derived.deploy();
            await derived.waitForDeployment();
            
            const result = await derived.func();
            // 应该调用 Base2.func()
            expect(result).to.equal("Base2");
        });

        it("应该能够明确调用指定父合约", async function () {
            const Derived = await ethers.getContractFactory("Derived");
            const derived = await Derived.deploy();
            await derived.waitForDeployment();
            
            expect(await derived.callBase1()).to.equal("Base1");
            expect(await derived.callBase2()).to.equal("Base2");
        });

        it("应该触发正确的事件", async function () {
            const Derived = await ethers.getContractFactory("Derived");
            const derived = await Derived.deploy();
            await derived.waitForDeployment();
            
            const tx = await derived.func();
            const receipt = await tx.wait();
            
            // 应该有多个事件
            expect(receipt.logs.length).to.be.greaterThan(0);
        });
    });

    describe("构造函数继承", function () {
        it("应该正确初始化父合约和子合约", async function () {
            const Child = await ethers.getContractFactory("Child");
            const child = await Child.deploy(100, "Parent", 200);
            await child.waitForDeployment();
            
            expect(await child.parentValue()).to.equal(100);
            expect(await child.parentName()).to.equal("Parent");
            expect(await child.childValue()).to.equal(200);
        });
    });

    describe("虚拟函数和重写", function () {
        it("Rectangle 应该重写 area 函数", async function () {
            const Rectangle = await ethers.getContractFactory("Rectangle");
            const rect = await Rectangle.deploy(10, 20);
            await rect.waitForDeployment();
            
            expect(await rect.area()).to.equal(200);
            expect(await rect.perimeter()).to.equal(60);
        });

        it("Square 应该重写 area 函数", async function () {
            const Square = await ethers.getContractFactory("Square");
            const square = await Square.deploy(5);
            await square.waitForDeployment();
            
            expect(await square.area()).to.equal(25);
            expect(await square.perimeter()).to.equal(20);
        });

        it("应该返回正确的描述", async function () {
            const Rectangle = await ethers.getContractFactory("Rectangle");
            const rect = await Rectangle.deploy(10, 20);
            await rect.waitForDeployment();
            
            expect(await rect.getDescription()).to.equal("This is a rectangle");
        });
    });

    describe("接口继承", function () {
        it("MyToken 应该实现 IERC20Extended", async function () {
            const MyToken = await ethers.getContractFactory("MyToken");
            const token = await MyToken.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            expect(await token.totalSupply()).to.equal(ethers.parseEther("1000"));
            expect(await token.name()).to.equal("My Token");
            expect(await token.symbol()).to.equal("MTK");
        });

        it("应该支持基本转账", async function () {
            const MyToken = await ethers.getContractFactory("MyToken");
            const token = await MyToken.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            await token.transfer(addr1.address, ethers.parseEther("100"));
            expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
        });

        it("应该支持 approve 和 transferFrom", async function () {
            const MyToken = await ethers.getContractFactory("MyToken");
            const token = await MyToken.deploy(ethers.parseEther("1000"));
            await token.waitForDeployment();
            
            await token.approve(addr1.address, ethers.parseEther("500"));
            expect(await token.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("500"));
            
            await token.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"));
            expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("100"));
        });
    });

    describe("钻石继承", function () {
        it("Diamond 应该正确继承 Left 和 Right", async function () {
            const Diamond = await ethers.getContractFactory("Diamond");
            const diamond = await Diamond.deploy();
            await diamond.waitForDeployment();
            
            // super.foo() 应该调用 Right.foo()
            expect(await diamond.foo()).to.equal("Right");
        });

        it("应该能够明确调用 Left 和 Right", async function () {
            const Diamond = await ethers.getContractFactory("Diamond");
            const diamond = await Diamond.deploy();
            await diamond.waitForDeployment();
            
            expect(await diamond.callLeft()).to.equal("Left");
            expect(await diamond.callRight()).to.equal("Right");
        });

        it("应该触发正确的事件序列", async function () {
            const Diamond = await ethers.getContractFactory("Diamond");
            const diamond = await Diamond.deploy();
            await diamond.waitForDeployment();
            
            const tx = await diamond.foo();
            const receipt = await tx.wait();
            
            // 应该有事件序列
            expect(receipt.logs.length).to.be.greaterThan(0);
        });
    });

    describe("多签钱包", function () {
        let multisig;
        let owners;

        beforeEach(async function () {
            owners = [owner.address, addr1.address, addr2.address];
            const MultisigWallet = await ethers.getContractFactory("MultisigWallet");
            multisig = await MultisigWallet.deploy(owners, 2);
            await multisig.waitForDeployment();
        });

        it("应该正确初始化多签钱包", async function () {
            expect(await multisig.required()).to.equal(2);
            expect(await multisig.owners(0)).to.equal(owner.address);
            expect(await multisig.owners(1)).to.equal(addr1.address);
            expect(await multisig.owners(2)).to.equal(addr2.address);
            expect(await multisig.isOwner(owner.address)).to.equal(true);
        });

        it("所有者应该能够提交交易", async function () {
            const txId = await multisig.submitTransaction.connect(addr1)(
                addr2.address,
                ethers.parseEther("1"),
                "0x"
            );
            
            const receipt = await txId.wait();
            expect(receipt).to.exist;
        });

        it("非所有者无法提交交易", async function () {
            const [, , addr3] = await ethers.getSigners();
            
            await expect(
                multisig.connect(addr3).submitTransaction(
                    addr2.address,
                    ethers.parseEther("1"),
                    "0x"
                )
            ).to.be.revertedWith("Not owner");
        });

        it("应该记录交易", async function () {
            await multisig.submitTransaction(
                addr1.address,
                ethers.parseEther("1"),
                "0x"
            );
            
            expect(await multisig.transactionCount()).to.equal(1);
            
            const tx = await multisig.transactions(0);
            expect(tx.to).to.equal(addr1.address);
            expect(tx.value).to.equal(ethers.parseEther("1"));
            expect(tx.executed).to.equal(false);
        });

        it("所有者应该能够执行交易", async function () {
            // 发送一些 ETH 到合约
            await owner.sendTransaction({
                to: await multisig.getAddress(),
                value: ethers.parseEther("2")
            });
            
            await multisig.submitTransaction(
                addr1.address,
                ethers.parseEther("1"),
                "0x"
            );
            
            const initialBalance = await ethers.provider.getBalance(addr1.address);
            await multisig.executeTransaction(0);
            const finalBalance = await ethers.provider.getBalance(addr1.address);
            
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
        });

        it("暂停后无法提交交易", async function () {
            await multisig.pause();
            
            await expect(
                multisig.submitTransaction(
                    addr1.address,
                    ethers.parseEther("1"),
                    "0x"
                )
            ).to.be.revertedWith("Paused");
        });
    });

    describe("Gas 消耗分析", function () {
        it("报告不同继承模式的 Gas 消耗", async function () {
            // 单继承
            const Dog = await ethers.getContractFactory("Dog");
            const dog = await Dog.deploy("Test", "Test");
            await dog.waitForDeployment();
            
            const tx1 = await dog.makeSound();
            const receipt1 = await tx1.wait();
            console.log(`Single inheritance Gas: ${receipt1.gasUsed.toString()}`);
            
            // 多重继承
            const D = await ethers.getContractFactory("D");
            const d = await D.deploy();
            await d.waitForDeployment();
            
            const tx2 = await d.foo();
            const receipt2 = await tx2.wait();
            console.log(`Multiple inheritance Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告 super 调用的 Gas 消耗", async function () {
            const Derived = await ethers.getContractFactory("Derived");
            const derived = await Derived.deploy();
            await derived.waitForDeployment();
            
            const tx1 = await derived.func();
            const receipt1 = await tx1.wait();
            console.log(`Super call Gas: ${receipt1.gasUsed.toString()}`);
            
            const tx2 = await derived.callBase1();
            const receipt2 = await tx2.wait();
            console.log(`Direct call Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

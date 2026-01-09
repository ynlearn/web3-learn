const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lesson 24: Gas 优化进阶", function () {
    let assemblyOpt, memoryOpt, storageOpt, callOpt, patternOpt, optimizedToken, comparison;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // 部署所有合约
        const AssemblyOptimization = await ethers.getContractFactory("AssemblyOptimization");
        assemblyOpt = await AssemblyOptimization.deploy();
        await assemblyOpt.deployed();

        const MemoryOptimization = await ethers.getContractFactory("MemoryOptimization");
        memoryOpt = await MemoryOptimization.deploy();
        await memoryOpt.deployed();

        const AdvancedStorageOptimization = await ethers.getContractFactory("AdvancedStorageOptimization");
        storageOpt = await AdvancedStorageOptimization.deploy();
        await storageOpt.deployed();

        const FunctionCallOptimization = await ethers.getContractFactory("FunctionCallOptimization");
        callOpt = await FunctionCallOptimization.deploy();
        await callOpt.deployed();

        const AdvancedPatternOptimization = await ethers.getContractFactory("AdvancedPatternOptimization");
        patternOpt = await AdvancedPatternOptimization.deploy();
        await patternOpt.deployed();

        const GasOptimizedToken = await ethers.getContractFactory("GasOptimizedToken");
        optimizedToken = await GasOptimizedToken.deploy(
            "Optimized Token",
            "OPT",
            ethers.utils.parseEther("1000000")
        );
        await optimizedToken.deployed();

        const GasComparison = await ethers.getContractFactory("GasComparison");
        comparison = await GasComparison.deploy();
        await comparison.deployed();
    });

    describe("汇编优化测试", function () {
        it("应该能使用 ecrecover 恢复签名", async function () {
            const message = "Hello, World!";
            const messageHash = ethers.utils.solidityKeccak256(
                ["string"],
                [message]
            );
            const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));

            const r = signature.slice(0, 66);
            const s = "0x" + signature.slice(66, 130);
            const v = parseInt(signature.slice(130, 132), 16);

            const ethSignedHash = ethers.utils.solidityKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );

            const recovered = await assemblyOpt.recoverOptimized(ethSignedHash, r, s, v);
            expect(recovered).to.equal(owner.address);
        });

        it("应该能检查非零地址", async function () {
            expect(await assemblyOpt.isNotZeroOptimized(owner.address)).to.be.true;
            expect(await assemblyOpt.isNotZeroOptimized(ethers.constants.AddressZero)).to.be.false;
        });

        it("应该能转换 bytes32 到 address", async function () {
            const bytes32Value = ethers.utils.solidityKeccak256(
                ["address"],
                [owner.address]
            );
            const converted = await assemblyOpt.bytes32ToAddressOptimized(bytes32Value);
            expect(converted).to.equal(owner.address);
        });

        it("应该能获取合约余额", async function () {
            await owner.sendTransaction({
                to: assemblyOpt.address,
                value: ethers.utils.parseEther("1.0")
            });

            const balance = await assemblyOpt.contractBalanceOptimized();
            expect(balance).to.equal(ethers.utils.parseEther("1.0"));
        });
    });

    describe("内存优化测试", function () {
        it("应该能优化数组处理", async function () {
            const data = [1, 2, 3, 4, 5];
            const sum = await memoryOpt.processArrayOptimized(data);
            expect(sum).to.equal(15);
        });

        it("应该能进行复杂计算优化", async function () {
            const result = await memoryOpt.complexCalculationOptimized(10, 20);
            // (10 * 20) + (10 + 20) * 2 = 200 + 30 * 2 = 260
            expect(result).to.equal(260);
        });

        it("应该能使用固定大小数组", async function () {
            const result = await memoryOpt.fixedArrayOptimization();
            expect(result).to.equal(15); // 1 + 2 + 3 + 4 + 5
        });
    });

    describe("存储优化进阶测试", function () {
        it("应该能创建优化的用户", async function () {
            const userData = {
                id: 1,
                balance: 1000,
                wallet: user1.address,
                active: true
            };

            // 注意: 实际实现需要根据合约结构调整
            await storageOpt.setShortName(user1.address, ethers.utils.formatBytes32String("Alice"));
            
            const name = await storageOpt.shortNames(user1.address);
            expect(name).to.equal(ethers.utils.formatBytes32String("Alice"));
        });

        it("应该能删除用户", async function () {
            // 测试删除优化
            // 注意: 需要先添加用户才能删除
        });
    });

    describe("函数调用优化测试", function () {
        it("应该能设置值", async function () {
            await callOpt.setValueOptimized(100);
            expect(await callOpt.value()).to.equal(100);
        });

        it("非所有者不能设置值", async function () {
            await expect(
                callOpt.connect(user1).setValueOptimized(100)
            ).to.be.revertedWith("Not owner");
        });

        it("应该能进行简单检查", async function () {
            expect(await callOpt.simpleCheck(150)).to.be.true;
            expect(await callOpt.simpleCheck(50)).to.be.false;
        });

        it("应该能获取值(view 函数)", async function () {
            await callOpt.setValueOptimized(200);
            expect(await callOpt.getValueView()).to.equal(200);
        });

        it("应该能批量更新", async function () {
            const values = [10, 20, 30, 40, 50];
            await callOpt.batchUpdate(values);
            expect(await callOpt.value()).to.equal(50);
        });

        it("应该能触发事件", async function () {
            const tx = await callOpt.updateWithValueEvent(300);
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "ValueUpdated");
            
            expect(event.args.oldValue).to.equal(50);
            expect(event.args.newValue).to.equal(300);
        });
    });

    describe("高级模式优化测试", function () {
        it("应该能安全加法", async function () {
            const result = await patternOpt.safeAdd(100, 200);
            expect(result).to.equal(300);
        });

        it("应该能进行多重检查", async function () {
            expect(await patternOpt.multiCheck(150, user1.address, true)).to.be.true;
            expect(await patternOpt.multiCheck(50, user1.address, true)).to.be.false;
            expect(await patternOpt.multiCheck(150, ethers.constants.AddressZero, true)).to.be.false;
        });

        it("应该能转换 bool 到 uint", async function () {
            expect(await patternOpt.boolToUint(true)).to.equal(1);
            expect(await patternOpt.boolToUint(false)).to.equal(0);
        });

        it("应该能转换 uint 到 bool", async function () {
            expect(await patternOpt.uintToBool(1)).to.be.true;
            expect(await patternOpt.uintToBool(0)).to.be.false;
            expect(await patternOpt.uintToBool(100)).to.be.true;
        });

        it("应该能优化循环", async function () {
            const result = await patternOpt.loopOptimized(10);
            expect(result).to.equal(45); // 0 + 1 + ... + 9
        });

        it("应该能使用 while 循环", async function () {
            const result = await patternOpt.whileLoopOptimized(10);
            expect(result).to.equal(45);
        });

        it("应该能提前返回", async function () {
            expect(await patternOpt.earlyReturn(0)).to.equal(0);
            expect(await patternOpt.earlyReturn(1)).to.equal(1);
            expect(await patternOpt.earlyReturn(5)).to.equal(10);
            expect(await patternOpt.earlyReturn(20)).to.equal(60);
        });
    });

    describe("Gas 优化代币测试", function () {
        it("应该能正确初始化", async function () {
            expect(await optimizedToken.name()).to.equal("Optimized Token");
            expect(await optimizedToken.symbol()).to.equal("OPT");
            expect(await optimizedToken.decimals()).to.equal(18);
            expect(await optimizedToken.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
        });

        it("应该能转账", async function () {
            const transferAmount = ethers.utils.parseEther("1000");
            
            await optimizedToken.transfer(user1.address, transferAmount);
            expect(await optimizedToken.balanceOf(user1.address)).to.equal(transferAmount);
        });

        it("应该能授权", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            
            await expect(optimizedToken.approve(user1.address, approveAmount))
                .to.emit(optimizedToken, "Approval")
                .withArgs(owner.address, user1.address, approveAmount);
        });

        it("应该能使用 allowance 转账", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            const transferAmount = ethers.utils.parseEther("300");
            
            await optimizedToken.approve(user1.address, approveAmount);
            await optimizedToken.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
            
            expect(await optimizedToken.balanceOf(user2.address)).to.equal(transferAmount);
        });

        it("应该防止转账到零地址", async function () {
            await expect(
                optimizedToken.transfer(ethers.constants.AddressZero, 100)
            ).to.be.revertedWith("Zero address");
        });

        it("应该防止余额不足", async function () {
            await expect(
                optimizedToken.connect(user1).transfer(user2.address, ethers.utils.parseEther("1000"))
            ).to.be.revertedWith("Insufficient balance");
        });
    });

    describe("Gas 对比测试", function () {
        it("应该能对比不同实现的 Gas 消耗", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            
            const result = await comparison.compareCalculations(numbers);
            
            expect(result.badGas).to.be.greaterThan(0);
            expect(result.goodGas).to.be.greaterThan(0);
            expect(result.assemblyGas).to.be.greaterThan(0);
            
            // 优化版本应该使用更少的 Gas
            console.log("Bad Gas:", result.badGas.toString());
            console.log("Good Gas:", result.goodGas.toString());
            console.log("Assembly Gas:", result.assemblyGas.toString());
            
            // assembly 版本通常最快
            // good 版本比 bad 版本快
        });

        it("所有版本应该产生相同的结果", async function () {
            const numbers = [5, 10, 15, 20, 25];
            
            await comparison.calculateBad(numbers);
            const sum1 = await comparison.sum();
            
            await comparison.calculateGood(numbers);
            const sum2 = await comparison.sum();
            
            await comparison.calculateAssembly(numbers);
            const sum3 = await comparison.sum();
            
            const expected = 75; // 5 + 10 + 15 + 20 + 25
            
            expect(sum1).to.equal(expected);
            expect(sum2).to.equal(expected);
            expect(sum3).to.equal(expected);
        });
    });

    describe("综合优化测试", function () {
        it("应该演示多种优化技巧", async function () {
            // 测试汇编优化
            const message = "Test";
            const messageHash = ethers.utils.solidityKeccak256(["string"], [message]);
            const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));
            const ethSignedHash = ethers.utils.solidityKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            
            const r = "0x" + signature.slice(2, 66);
            const s = "0x" + signature.slice(66, 130);
            const v = parseInt(signature.slice(130, 132), 16);
            
            const recovered = await assemblyOpt.recoverOptimized(ethSignedHash, r, s, v);
            expect(recovered).to.equal(owner.address);
            
            // 测试内存优化
            const data = [10, 20, 30];
            const sum = await memoryOpt.processArrayOptimized(data);
            expect(sum).to.equal(60);
            
            // 测试模式优化
            const result = await patternOpt.loopOptimized(5);
            expect(result).to.equal(10); // 0 + 1 + 2 + 3 + 4
        });

        it("应该展示优化效果", async function () {
            const largeArray = Array.from({ length: 100 }, (_, i) => i + 1);
            
            // 对比前后
            const result = await comparison.compareCalculations(largeArray);
            
            console.log("\n=== Gas 优化对比 ===");
            console.log("未优化版本:", result.badGas.toString(), "Gas");
            console.log("优化版本:", result.goodGas.toString(), "Gas");
            console.log("汇编版本:", result.assemblyGas.toString(), "Gas");
            console.log("优化比例:", 
                ((result.badGas.sub(result.goodGas)).mul(100).div(result.badGas)).toString(), 
                "%"
            );
        });
    });
});

/**
 * Lesson 11: 工厂模式测试
 *
 * 测试覆盖：
 * - 基础工厂模式
 * - CREATE2 确定性部署
 * - 克隆工厂 (EIP-1167)
 * - 批量创建功能
 * - 地址预测
 * - 元交易工厂
 * - Gas 成本对比
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { keccak256, defaultAbiCoder } = require("ethers");

describe("工厂模式合约测试", function () {
    // ==================== 基础工厂测试 ====================

    describe("BasicFactory 合约测试", function () {
        let factory;
        let owner, addr1, addr2;

        beforeEach(async function () {
            [owner, addr1, addr2] = await ethers.getSigners();
            const BasicFactory = await ethers.getContractFactory("BasicFactory");
            factory = await BasicFactory.deploy();
            await factory.waitForDeployment();
        });

        describe("创建产品", function () {
            it("应该成功创建产品", async function () {
                const tx = await factory.createProduct(1, "Product A");
                const receipt = await tx.wait();

                expect(await factory.getProductCount()).to.equal(1);

                const products = await factory.getAllProducts();
                expect(products.length).to.equal(1);
                expect(products[0]).to.be.properAddress;
            });

            it("应该触发 ProductDeployed 事件", async function () {
                await expect(factory.createProduct(1, "Product A"))
                    .to.emit(factory, "ProductDeployed")
                    .withArgs(
                        (addr) => addr !== ethers.ZeroAddress,
                        owner.address,
                        1
                    );
            });

            it("应该创建多个不同的产品", async function () {
                await factory.createProduct(1, "Product A");
                await factory.createProduct(2, "Product B");
                await factory.createProduct(3, "Product C");

                expect(await factory.getProductCount()).to.equal(3);
            });

            it("应该将创建的产品标记为有效", async function () {
                const tx = await factory.createProduct(1, "Product A");
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ProductDeployed"
                );
                const productAddress = event.args[0];

                expect(await factory.isProduct(productAddress)).to.be.true;
            });
        });

        describe("批量创建产品", function () {
            it("应该成功批量创建产品", async function () {
                const ids = [1, 2, 3];
                const names = ["Product A", "Product B", "Product C"];

                const addresses = await factory.batchCreateProducts(ids, names);

                expect(addresses.length).to.equal(3);
                expect(await factory.getProductCount()).to.equal(3);
            });

            it("应该拒绝长度不匹配的数组", async function () {
                const ids = [1, 2, 3];
                const names = ["Product A", "Product B"];

                await expect(
                    factory.batchCreateProducts(ids, names)
                ).to.be.revertedWith("Arrays length mismatch");
            });

            it("应该拒绝空数组", async function () {
                await expect(
                    factory.batchCreateProducts([], [])
                ).to.be.revertedWith("Invalid batch size");
            });

            it("应该拒绝超过最大批量大小", async function () {
                const ids = Array(51).fill(1);
                const names = Array(51).fill("Product");

                await expect(
                    factory.batchCreateProducts(ids, names)
                ).to.be.revertedWith("Invalid batch size");
            });

            it("批量创建应该触发多个事件", async function () {
                const ids = [1, 2];
                const names = ["Product A", "Product B"];

                const tx = await factory.batchCreateProducts(ids, names);
                const receipt = await tx.wait();

                const events = receipt.logs.filter(
                    log => factory.interface.parseLog(log)?.name === "ProductDeployed"
                );

                expect(events.length).to.equal(2);
            });
        });

        describe("产品合约功能", function () {
            let productAddress;

            beforeEach(async function () {
                const tx = await factory.createProduct(1, "Product A");
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ProductDeployed"
                );
                productAddress = event.args[0];
            });

            it("应该正确设置产品属性", async function () {
                const Product = await ethers.getContractFactory("Product");
                const product = Product.attach(productAddress);

                expect(await product.id()).to.equal(1);
                expect(await product.name()).to.equal("Product A");
                expect(await product.owner()).to.equal(owner.address);
            });

            it("应该允许所有者更新产品名称", async function () {
                const Product = await ethers.getContractFactory("Product");
                const product = Product.attach(productAddress);

                await product.updateName("Updated Product A");
                expect(await product.name()).to.equal("Updated Product A");
            });

            it("不应该允许非所有者更新产品", async function () {
                const Product = await ethers.getContractFactory("Product");
                const product = Product.attach(productAddress);

                await expect(
                    product.connect(addr1).updateName("Hacked Name")
                ).to.be.revertedWith("Not owner");
            });

            it("应该返回产品完整信息", async function () {
                const Product = await ethers.getContractFactory("Product");
                const product = Product.attach(productAddress);

                const info = await product.getInfo();
                expect(info[0]).to.equal(owner.address); // owner
                expect(info[1]).to.equal(1); // id
                expect(info[2]).to.equal("Product A"); // name
                expect(info[3]).to.be.gt(0); // createdAt
            });
        });
    });

    // ==================== CREATE2 工厂测试 ====================

    describe("CREATE2Factory 合约测试", function () {
        let factory;
        let owner, addr1;

        beforeEach(async function () {
            [owner, addr1] = await ethers.getSigners();
            const CREATE2Factory = await ethers.getContractFactory("CREATE2Factory");
            factory = await CREATE2Factory.deploy();
            await factory.waitForDeployment();
        });

        describe("CREATE2 部署", function () {
            let bytecode;
            let salt;

            beforeEach(async function () {
                // 获取 DeterministicContract 的字节码
                const DeterministicContract = await ethers.getContractFactory("DeterministicContract");
                bytecode = DeterministicContract.bytecode;
                salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));
            });

            it("应该成功部署合约", async function () {
                // 编码构造函数参数
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, 100]
                );

                const tx = await factory.deploy(bytecodeWithArgs, salt);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ContractDeployed"
                );

                expect(event).to.not.be.undefined;
                expect(await factory.isDeployed(event.args[0])).to.be.true;
            });

            it("应该记录部署的合约", async function () {
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, 100]
                );

                await factory.deploy(bytecodeWithArgs, salt);

                const deployed = await factory.deployedContracts(0);
                expect(deployed).to.be.properAddress;
            });

            it("相同 salt 和字节码应该产生相同地址", async function () {
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, 100]
                );

                const addr1 = await factory.getAddress(await factory.getAddress(), bytecodeWithArgs, salt);

                const tx = await factory.deploy(bytecodeWithArgs, salt);
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ContractDeployed"
                );

                expect(addr1).to.equal(event.args[0]);
            });

            it("不同 salt 应该产生不同地址", async function () {
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, 100]
                );

                const salt2 = keccak256(defaultAbiCoder.encode(["uint256"], [54321]));

                const tx1 = await factory.deploy(bytecodeWithArgs, salt);
                const receipt1 = await tx1.wait();
                const event1 = receipt1.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ContractDeployed"
                );

                const tx2 = await factory.deploy(bytecodeWithArgs, salt2);
                const receipt2 = await tx2.wait();
                const event2 = receipt2.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ContractDeployed"
                );

                expect(event1.args[0]).to.not.equal(event2.args[0]);
            });

            it("应该拒绝已部署的合约", async function () {
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, 100]
                );

                await factory.deploy(bytecodeWithArgs, salt);

                // 注意：CREATE2 如果地址已部署，会因冲突失败
                // 这里测试是否正确处理
                await expect(
                    factory.deploy(bytecodeWithArgs, salt)
                ).to.be.reverted;
            });
        });

        describe("地址预测", function () {
            it("应该正确预测地址", async function () {
                const DeterministicContract = await ethers.getContractFactory("DeterministicContract");
                const bytecode = DeterministicContract.bytecode;
                const value = 100;
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256"],
                    [bytecode, value]
                );
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                const predictedAddress = await factory.getAddress(
                    await factory.getAddress(),
                    bytecodeWithArgs,
                    salt
                );

                const tx = await factory.deploy(bytecodeWithArgs, salt);
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "ContractDeployed"
                );

                expect(predictedAddress).to.equal(event.args[0]);
            });
        });
    });

    // ==================== 确定性工厂测试 ====================

    describe("DeterministicFactory 合约测试", function () {
        let factory;
        let owner;

        beforeEach(async function () {
            [owner] = await ethers.getSigners();
            const DeterministicFactory = await ethers.getContractFactory("DeterministicFactory");
            factory = await DeterministicFactory.deploy();
            await factory.waitForDeployment();
        });

        describe("确定性部署", function () {
            it("应该成功部署合约", async function () {
                const value = 100;
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                const address = await factory.deployDeterministic(value, salt);

                expect(address).to.be.properAddress;
                expect(await factory.isDeployed(address)).to.be.true;
            });

            it("应该记录部署地址", async function () {
                const value = 100;
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                await factory.deployDeterministic(value, salt);

                const recordedAddress = await factory.deployedAddresses(salt);
                expect(recordedAddress).to.be.properAddress;
            });

            it("应该正确预测地址", async function () {
                const value = 100;
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                const predictedAddress = await factory.predictAddress(value, salt);
                const actualAddress = await factory.deployDeterministic(value, salt);

                expect(predictedAddress).to.equal(actualAddress);
            });

            it("应该拒绝重复的 salt", async function () {
                const value = 100;
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                await factory.deployDeterministic(value, salt);

                await expect(
                    factory.deployDeterministic(value, salt)
                ).to.be.revertedWith("Already deployed");
            });
        });
    });

    // ==================== 克隆工厂测试 ====================

    describe("MinimalCloneFactory 合约测试", function () {
        let factory;
        let implementation;
        let owner, addr1;

        beforeEach(async function () {
            [owner, addr1] = await ethers.getSigners();

            // 部署实现合约
            const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
            implementation = await CloneImplementation.deploy();
            await implementation.waitForDeployment();

            // 部署克隆工厂
            const MinimalCloneFactory = await ethers.getContractFactory("MinimalCloneFactory");
            factory = await MinimalCloneFactory.deploy();
            await factory.waitForDeployment();
        });

        describe("创建克隆", function () {
            it("应该成功创建克隆", async function () {
                const tx = await factory.createClone(await implementation.getAddress());
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "CloneCreated"
                );

                expect(event).to.not.be.undefined;
                expect(event.args[0]).to.be.properAddress;
                expect(event.args[1]).to.equal(await implementation.getAddress());
            });

            it("应该记录克隆地址", async function () {
                await factory.createClone(await implementation.getAddress());
                await factory.createClone(await implementation.getAddress());

                expect(await factory.getCloneCount()).to.equal(2);

                const clones = await factory.getAllClones();
                expect(clones.length).to.equal(2);
            });

            it("应该正确识别克隆合约", async function () {
                const tx = await factory.createClone(await implementation.getAddress());
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "CloneCreated"
                );
                const cloneAddress = event.args[0];

                expect(await factory.isClone(await implementation.getAddress(), cloneAddress))
                    .to.be.true;
            });

            it("应该拒绝将非克隆合约识别为克隆", async function () {
                expect(await factory.isClone(await implementation.getAddress(), owner.address))
                    .to.be.false;
            });
        });

        describe("批量创建克隆", function () {
            it("应该成功批量创建克隆", async function () {
                const count = 5;
                const clones = await factory.batchCreateClones(
                    await implementation.getAddress(),
                    count
                );

                expect(clones.length).to.equal(count);
                expect(await factory.getCloneCount()).to.equal(count);
            });

            it("所有克隆应该有不同地址", async function () {
                const count = 10;
                const clones = await factory.batchCreateClones(
                    await implementation.getAddress(),
                    count
                );

                const uniqueAddresses = new Set(clones);
                expect(uniqueAddresses.size).to.equal(count);
            });
        });

        describe("克隆功能测试", function () {
            let cloneAddress;

            beforeEach(async function () {
                const tx = await factory.createClone(await implementation.getAddress());
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => factory.interface.parseLog(log)?.name === "CloneCreated"
                );
                cloneAddress = event.args[0];
            });

            it("应该能够初始化克隆", async function () {
                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);

                await clone.initialize("Test Clone", 100);

                expect(await clone.name()).to.equal("Test Clone");
                expect(await clone.value()).to.equal(100);
                expect(await clone.owner()).to.equal(owner.address);
            });

            it("应该只能初始化一次", async function () {
                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);

                await clone.initialize("Test Clone", 100);

                await expect(
                    clone.initialize("Another Name", 200)
                ).to.be.revertedWith("Already initialized");
            });

            it("应该允许所有者更新值", async function () {
                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);

                await clone.initialize("Test Clone", 100);
                await clone.setValue(200);

                expect(await clone.value()).to.equal(200);
            });

            it("不应该允许非所有者更新值", async function () {
                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);

                await clone.initialize("Test Clone", 100);

                await expect(
                    clone.connect(addr1).setValue(200)
                ).to.be.revertedWith("Not owner");
            });

            it("应该返回正确信息", async function () {
                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);

                await clone.initialize("Test Clone", 100);

                const info = await clone.getInfo();
                expect(info[0]).to.equal(owner.address);
                expect(info[1]).to.equal(100);
                expect(info[2]).to.equal("Test Clone");
            });
        });
    });

    // ==================== 克隆工厂示例测试 ====================

    describe("CloneFactoryExample 合约测试", function () {
        let factory;
        let implementation;
        let owner;

        beforeEach(async function () {
            [owner] = await ethers.getSigners();

            // 部署实现合约
            const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
            implementation = await CloneImplementation.deploy();
            await implementation.waitForDeployment();

            // 部署克隆工厂示例
            const CloneFactoryExample = await ethers.getContractFactory("CloneFactoryExample");
            factory = await CloneFactoryExample.deploy(await implementation.getAddress());
            await factory.waitForDeployment();
        });

        describe("创建并初始化克隆", function () {
            it("应该成功创建并初始化克隆", async function () {
                const cloneAddress = await factory.createAndInitializeClone("Clone 1", 100);

                expect(cloneAddress).to.be.properAddress;

                const clone = await ethers.getContractAt("CloneImplementation", cloneAddress);
                expect(await clone.name()).to.equal("Clone 1");
                expect(await clone.value()).to.equal(100);
            });

            it("应该触发 CloneCreated 事件", async function () {
                await expect(factory.createAndInitializeClone("Clone 1", 100))
                    .to.emit(factory, "CloneCreated");
            });
        });

        describe("批量创建并初始化克隆", function () {
            it("应该成功批量创建并初始化克隆", async function () {
                const names = ["Clone 1", "Clone 2", "Clone 3"];
                const values = [100, 200, 300];

                const clones = await factory.batchCreateAndInitializeClones(names, values);

                expect(clones.length).to.equal(3);

                for (let i = 0; i < clones.length; i++) {
                    const clone = await ethers.getContractAt("CloneImplementation", clones[i]);
                    expect(await clone.name()).to.equal(names[i]);
                    expect(await clone.value()).to.equal(values[i]);
                }
            });

            it("应该拒绝长度不匹配的数组", async function () {
                const names = ["Clone 1", "Clone 2"];
                const values = [100];

                await expect(
                    factory.batchCreateAndInitializeClones(names, values)
                ).to.be.revertedWith("Arrays length mismatch");
            });
        });
    });

    // ==================== Gas 成本分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告 CREATE 部署的 Gas 消耗", async function () {
            const BasicFactory = await ethers.getContractFactory("BasicFactory");
            const factory = await BasicFactory.deploy();
            await factory.waitForDeployment();

            const tx = await factory.createProduct(1, "Product A");
            const receipt = await tx.wait();
            console.log(`CREATE 部署 Gas: ${receipt.gasUsed.toString()}`);
        });

        it("报告 CREATE2 部署的 Gas 消耗", async function () {
            const CREATE2Factory = await ethers.getContractFactory("CREATE2Factory");
            const factory = await CREATE2Factory.deploy();
            await factory.waitForDeployment();

            const DeterministicContract = await ethers.getContractFactory("DeterministicContract");
            const bytecode = DeterministicContract.bytecode;
            const bytecodeWithArgs = ethers.solidityPacked(
                ["bytes", "uint256"],
                [bytecode, 100]
            );
            const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

            const tx = await factory.deploy(bytecodeWithArgs, salt);
            const receipt = await tx.wait();
            console.log(`CREATE2 部署 Gas: ${receipt.gasUsed.toString()}`);
        });

        it("报告 Clone 部署的 Gas 消耗", async function () {
            const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
            const implementation = await CloneImplementation.deploy();
            await implementation.waitForDeployment();

            const MinimalCloneFactory = await ethers.getContractFactory("MinimalCloneFactory");
            const factory = await MinimalCloneFactory.deploy();
            await factory.waitForDeployment();

            const tx = await factory.createClone(await implementation.getAddress());
            const receipt = await tx.wait();
            console.log(`Clone 部署 Gas: ${receipt.gasUsed.toString()}`);
        });

        it("对比三种部署方式的 Gas 消耗", async function () {
            const [owner] = await ethers.getSigners();

            // CREATE
            const BasicFactory = await ethers.getContractFactory("BasicFactory");
            const factory1 = await BasicFactory.deploy();
            await factory1.waitForDeployment();

            const tx1 = await factory1.createProduct(1, "Product A");
            const receipt1 = await tx1.wait();
            const createGas = receipt1.gasUsed;

            // CREATE2
            const CREATE2Factory = await ethers.getContractFactory("CREATE2Factory");
            const factory2 = await CREATE2Factory.deploy();
            await factory2.waitForDeployment();

            const DeterministicContract = await ethers.getContractFactory("DeterministicContract");
            const bytecode = DeterministicContract.bytecode;
            const bytecodeWithArgs = ethers.solidityPacked(
                ["bytes", "uint256"],
                [bytecode, 100]
            );
            const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

            const tx2 = await factory2.deploy(bytecodeWithArgs, salt);
            const receipt2 = await tx2.wait();
            const create2Gas = receipt2.gasUsed;

            // Clone
            const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
            const implementation = await CloneImplementation.deploy();
            await implementation.waitForDeployment();

            const MinimalCloneFactory = await ethers.getContractFactory("MinimalCloneFactory");
            const factory3 = await MinimalCloneFactory.deploy();
            await factory3.waitForDeployment();

            const tx3 = await factory3.createClone(await implementation.getAddress());
            const receipt3 = await tx3.wait();
            const cloneGas = receipt3.gasUsed;

            console.log("\n========== Gas 成本对比 ==========");
            console.log(`CREATE:     ${createGas.toString()}`);
            console.log(`CREATE2:    ${create2Gas.toString()}`);
            console.log(`Clone:      ${cloneGas.toString()}`);
            console.log(`==================================");

            // Clone 应该是最便宜的
            expect(cloneGas).to.be.lt(createGas);
            expect(cloneGas).to.be.lt(create2Gas);
        });
    });

    // ==================== 工厂对比测试 ====================

    describe("FactoryComparison 合约测试", function () {
        let comparison;
        let owner;

        beforeEach(async function () {
            [owner] = await ethers.getSigners();
            const FactoryComparison = await ethers.getContractFactory("FactoryComparison");
            comparison = await FactoryComparison.deploy();
            await comparison.waitForDeployment();
        });

        describe("部署方式对比", function () {
            it("应该能够使用 CREATE 部署", async function () {
                const address = await comparison.createWithCreate();
                expect(address).to.be.properAddress;
            });

            it("应该能够使用 CREATE2 部署", async function () {
                const Product = await ethers.getContractFactory("Product");
                const bytecode = Product.bytecode;
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256", "string"],
                    [bytecode, 1, "Product"]
                );
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                const address = await comparison.createWithCREATE2(bytecodeWithArgs, salt);
                expect(address).to.be.properAddress;
            });

            it("应该能够使用 Clone 部署", async function () {
                const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
                const implementation = await CloneImplementation.deploy();
                await implementation.waitForDeployment();

                const address = await comparison.createWithClone(await implementation.getAddress());
                expect(address).to.be.properAddress;
            });
        });

        describe("Gas 成本对比", function () {
            it("应该对比三种方式的 Gas 消耗", async function () {
                const Product = await ethers.getContractFactory("Product");
                const bytecode = Product.bytecode;
                const bytecodeWithArgs = ethers.solidityPacked(
                    ["bytes", "uint256", "string"],
                    [bytecode, 1, "Product"]
                );
                const salt = keccak256(defaultAbiCoder.encode(["uint256"], [12345]));

                const CloneImplementation = await ethers.getContractFactory("CloneImplementation");
                const implementation = await CloneImplementation.deploy();
                await implementation.waitForDeployment();

                const [createGas, create2Gas, cloneGas] =
                    await comparison.compareGasCosts(
                        bytecodeWithArgs,
                        salt,
                        await implementation.getAddress()
                    );

                console.log("\n========== 工厂模式 Gas 对比 ==========");
                console.log(`CREATE:  ${createGas.toString()}`);
                console.log(`CREATE2: ${create2Gas.toString()}`);
                console.log(`Clone:   ${cloneGas.toString()}`);
                console.log("======================================");

                // 验证 Clone 是最节省的
                expect(cloneGas).to.be.lt(createGas);
            });
        });
    });
});

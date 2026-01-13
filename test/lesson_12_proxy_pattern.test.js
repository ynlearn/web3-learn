/**
 * Lesson 12: 代理模式测试
 *
 * 测试覆盖：
 * - 透明可升级代理 (Transparent Proxy)
 * - UUPS 代理模式
 * - 信标代理 (Beacon Proxy)
 * - 代理升级功能
 * - 存储槽位管理
 * - 委托调用机制
 * - 初始化流程
 * - 代理管理员
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
const { keccak256 } = ethers;

describe("代理模式合约测试", function () {
    // ==================== 透明代理测试 ====================

    describe("TransparentUpgradeableProxy 合约测试", function () {
        let logicV1, logicV2, proxy, proxyAdmin;
        let owner, admin, user;

        beforeEach(async function () {
            [owner, admin, user] = await ethers.getSigners();

            // 部署逻辑合约 V1
            const StorageV1 = await ethers.getContractFactory("StorageV1");
            logicV1 = await StorageV1.deploy();
            await logicV1.waitForDeployment();

            // 部署代理管理员
            const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
            proxyAdmin = await ProxyAdmin.deploy();
            await proxyAdmin.waitForDeployment();

            // 部署代理合约
            const TransparentUpgradeableProxy = await ethers.getContractFactory(
                "TransparentUpgradeableProxy"
            );
            const initData = logicV1.interface.encodeFunctionData("initialize", [100]);

            proxy = await TransparentUpgradeableProxy.deploy(
                await logicV1.getAddress(),
                admin.address,
                initData
            );
            await proxy.waitForDeployment();
        });

        describe("代理部署和初始化", function () {
            it("应该正确初始化代理", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                expect(await proxyAsV1.owner()).to.equal(owner.address);
                expect(await proxyAsV1.getValue()).to.equal(100);
            });

            it("应该正确设置实现合约地址", async function () {
                expect(await proxy.getImplementation()).to.equal(await logicV1.getAddress());
            });

            it("应该正确设置管理员", async function () {
                expect(await proxy.admin()).to.equal(admin.address);
            });

            it("不应该允许重复初始化", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                await expect(
                    proxyAsV1.initialize(200)
                ).to.be.revertedWith("Already initialized");
            });
        });

        describe("通过代理调用逻辑合约", function () {
            it("应该能够调用 setValue", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                await proxyAsV1.setValue(200);
                expect(await proxyAsV1.getValue()).to.equal(200);
            });

            it("应该能够调用 getValue", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                expect(await proxyAsV1.getValue()).to.equal(100);
            });

            it("状态应该存储在代理合约中", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                await proxyAsV1.setValue(300);

                // 直接查询逻辑合约，值应该不同
                expect(await logicV1.getValue()).to.not.equal(300);
                // 通过代理查询，值应该是 300
                expect(await proxyAsV1.getValue()).to.equal(300);
            });
        });

        describe("升级代理", function () {
            beforeEach(async function () {
                // 部署 V2 逻辑合约
                const StorageV2 = await ethers.getContractFactory("StorageV2");
                logicV2 = await StorageV2.deploy();
                await logicV2.waitForDeployment();
            });

            it("管理员应该能够升级代理", async function () {
                await proxy.connect(admin).upgradeTo(await logicV2.getAddress());

                expect(await proxy.getImplementation()).to.equal(await logicV2.getAddress());
            });

            it("非管理员不应该能够升级代理", async function () {
                await expect(
                    proxy.connect(user).upgradeTo(await logicV2.getAddress())
                ).to.be.revertedWith("Only admin");
            });

            it("升级后应该保留之前的状态", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                await proxyAsV1.setValue(500);

                // 升级
                await proxy.connect(admin).upgradeTo(await logicV2.getAddress());

                // 通过 V2 接口查询，值应该保留
                const proxyAsV2 = await ethers.getContractAt("StorageV2", await proxy.getAddress());
                expect(await proxyAsV2.getValue()).to.equal(500);
            });

            it("升级后应该能够使用新功能", async function () {
                // 升级
                await proxy.connect(admin).upgradeTo(await logicV2.getAddress());

                const proxyAsV2 = await ethers.getContractAt("StorageV2", await proxy.getAddress());

                // 调用 V2 新增的功能
                await proxyAsV2.setName("New Name");
                expect(await proxyAsV2.getName()).to.equal("New Name");
            });

            it("升级并调用应该成功", async function () {
                const initData = logicV2.interface.encodeFunctionData("setName", ["V2 Name"]);

                await proxy.connect(admin).upgradeToAndCall(
                    await logicV2.getAddress(),
                    initData
                );

                const proxyAsV2 = await ethers.getContractAt("StorageV2", await proxy.getAddress());
                expect(await proxyAsV2.getName()).to.equal("V2 Name");
            });
        });

        describe("更改管理员", function () {
            it("管理员应该能够更改管理员", async function () {
                await proxy.connect(admin).changeAdmin(user.address);

                expect(await proxy.admin()).to.equal(user.address);
            });

            it("非管理员不应该能够更改管理员", async function () {
                await expect(
                    proxy.connect(user).changeAdmin(user.address)
                ).to.be.revertedWith("Only admin");
            });

            it("不应该允许将管理员设置为零地址", async function () {
                await expect(
                    proxy.connect(admin).changeAdmin(ethers.ZeroAddress)
                ).to.be.revertedWith("Admin is zero");
            });
        });

        describe("管理员调用限制", function () {
            it("管理员不应该能够通过 fallback 调用逻辑合约", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                // 管理员调用应该被拒绝
                await expect(
                    proxyAsV1.connect(admin).setValue(200)
                ).to.be.revertedWith("Proxy: admin cannot fallback to proxy");
            });

            it("普通用户应该能够正常调用", async function () {
                const proxyAsV1 = await ethers.getContractAt("StorageV1", await proxy.getAddress());

                await expect(proxyAsV1.setValue(200)).to.not.be.reverted;
            });
        });
    });

    // ==================== UUPS 代理测试 ====================

    describe("UUPS 代理模式测试", function () {
        let proxy, counterV1, counterV2;
        let owner, user;

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();

            // 部署 Counter V1
            const CounterV1 = await ethers.getContractFactory("CounterV1");
            counterV1 = await CounterV1.deploy();
            await counterV1.waitForDeployment();

            // 部署 UUPS 代理
            const UUPSProxy = await ethers.getContractFactory("UUPSProxy");
            const initData = counterV1.interface.encodeFunctionData("initialize", []);

            proxy = await UUPSProxy.deploy(
                await counterV1.getAddress(),
                initData
            );
            await proxy.waitForDeployment();
        });

        describe("UUPS 代理初始化", function () {
            it("应该正确初始化", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                expect(await proxyAsV1.owner()).to.equal(owner.address);
                expect(await proxyAsV1.count()).to.equal(0);
            });

            it("不应该允许重复初始化", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await expect(
                    proxyAsV1.initialize()
                ).to.be.revertedWith("Already initialized");
            });
        });

        describe("UUPS 功能调用", function () {
            it("应该能够调用 increment", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await proxyAsV1.increment();
                expect(await proxyAsV1.count()).to.equal(1);

                await proxyAsV1.increment();
                expect(await proxyAsV1.count()).to.equal(2);
            });
        });

        describe("UUPS 升级", function () {
            beforeEach(async function () {
                // 部署 Counter V2
                const CounterV2 = await ethers.getContractFactory("CounterV2");
                counterV2 = await CounterV2.deploy();
                await counterV2.waitForDeployment();
            });

            it("所有者应该能够升级", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await proxyAsV1.upgradeTo(await counterV2.getAddress());

                const proxyAsV2 = await ethers.getContractAt("CounterV2", await proxy.getAddress());
                expect(await proxyAsV2.count()).to.equal(0);
            });

            it("非所有者不应该能够升级", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await expect(
                    proxyAsV1.connect(user).upgradeTo(await counterV2.getAddress())
                ).to.be.revertedWith("Only owner");
            });

            it("升级后应该保留状态", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await proxyAsV1.increment();
                await proxyAsV1.increment();
                expect(await proxyAsV1.count()).to.equal(2);

                // 升级到 V2
                await proxyAsV1.upgradeTo(await counterV2.getAddress());

                const proxyAsV2 = await ethers.getContractAt("CounterV2", await proxy.getAddress());
                expect(await proxyAsV2.count()).to.equal(2);
            });

            it("升级后应该能够使用新功能", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                await proxyAsV1.upgradeTo(await counterV2.getAddress());

                const proxyAsV2 = await ethers.getContractAt("CounterV2", await proxy.getAddress());

                // 调用 V2 新增的功能
                await proxyAsV2.addValue(100);
                expect(await proxyAsV2.addedValue()).to.equal(100);

                // V1 的功能仍然可用
                await proxyAsV2.increment();
                expect(await proxyAsV2.count()).to.equal(1);
            });

            it("升级并调用应该成功", async function () {
                const proxyAsV1 = await ethers.getContractAt("CounterV1", await proxy.getAddress());

                // 调用 increment 来测试状态保留
                await proxyAsV1.increment();
                expect(await proxyAsV1.count()).to.equal(1);

                // 使用 upgradeToAndCall 升级并调用 increment (而不是 initialize，因为已经初始化过了)
                const callData = counterV2.interface.encodeFunctionData("increment", []);
                await proxyAsV1.upgradeToAndCall(
                    await counterV2.getAddress(),
                    callData
                );

                const proxyAsV2 = await ethers.getContractAt("CounterV2", await proxy.getAddress());
                // count 应该是 2 (之前 increment 1 次，upgradeToAndCall 时又 increment 1 次)
                expect(await proxyAsV2.count()).to.equal(2);
                expect(await proxyAsV2.owner()).to.equal(owner.address);
            });
        });
    });

    // ==================== 信标代理测试 ====================

    describe("Beacon 代理模式测试", function () {
        let beacon, proxy1, proxy2, implV1, implV2;
        let owner, user;

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();

            // 部署实现合约 V1
            const StorageV1 = await ethers.getContractFactory("StorageV1");
            implV1 = await StorageV1.deploy();
            await implV1.waitForDeployment();

            // 部署信标
            const UpgradeableBeacon = await ethers.getContractFactory("UpgradeableBeacon");
            beacon = await UpgradeableBeacon.deploy(await implV1.getAddress());
            await beacon.waitForDeployment();

            // 部署两个代理
            const BeaconProxy = await ethers.getContractFactory("BeaconProxy");
            const initData1 = implV1.interface.encodeFunctionData("initialize", [100]);
            const initData2 = implV1.interface.encodeFunctionData("initialize", [200]);

            proxy1 = await BeaconProxy.deploy(await beacon.getAddress(), initData1);
            await proxy1.waitForDeployment();

            proxy2 = await BeaconProxy.deploy(await beacon.getAddress(), initData2);
            await proxy2.waitForDeployment();
        });

        describe("信标代理初始化", function () {
            it("应该正确初始化代理", async function () {
                const proxy1AsV1 = await ethers.getContractAt("StorageV1", await proxy1.getAddress());
                const proxy2AsV1 = await ethers.getContractAt("StorageV1", await proxy2.getAddress());

                expect(await proxy1AsV1.getValue()).to.equal(100);
                expect(await proxy2AsV1.getValue()).to.equal(200);
            });

            it("两个代理应该有独立的状态", async function () {
                const proxy1AsV1 = await ethers.getContractAt("StorageV1", await proxy1.getAddress());
                const proxy2AsV1 = await ethers.getContractAt("StorageV1", await proxy2.getAddress());

                await proxy1AsV1.setValue(150);

                expect(await proxy1AsV1.getValue()).to.equal(150);
                expect(await proxy2AsV1.getValue()).to.equal(200);
            });
        });

        describe("信标升级", function () {
            beforeEach(async function () {
                // 部署实现合约 V2
                const StorageV2 = await ethers.getContractFactory("StorageV2");
                implV2 = await StorageV2.deploy();
                await implV2.waitForDeployment();
            });

            it("所有者应该能够升级信标", async function () {
                await beacon.upgrade(await implV2.getAddress());

                expect(await beacon.implementation()).to.equal(await implV2.getAddress());
            });

            it("非所有者不应该能够升级信标", async function () {
                await expect(
                    beacon.connect(user).upgrade(await implV2.getAddress())
                ).to.be.revertedWith("Only owner");
            });

            it("升级信标应该影响所有代理", async function () {
                const proxy1AsV1 = await ethers.getContractAt("StorageV1", await proxy1.getAddress());
                const proxy2AsV1 = await ethers.getContractAt("StorageV1", await proxy2.getAddress());

                await proxy1AsV1.setValue(300);
                await proxy2AsV1.setValue(400);

                // 升级信标
                await beacon.upgrade(await implV2.getAddress());

                // 所有代理现在都应该指向新的实现
                const proxy1AsV2 = await ethers.getContractAt("StorageV2", await proxy1.getAddress());
                const proxy2AsV2 = await ethers.getContractAt("StorageV2", await proxy2.getAddress());

                expect(await proxy1AsV2.getValue()).to.equal(300);
                expect(await proxy2AsV2.getValue()).to.equal(400);

                // 新功能应该可用
                await proxy1AsV2.setName("Proxy1");
                await proxy2AsV2.setName("Proxy2");

                expect(await proxy1AsV2.getName()).to.equal("Proxy1");
                expect(await proxy2AsV2.getName()).to.equal("Proxy2");
            });

            it("升级应该触发事件", async function () {
                await expect(beacon.upgrade(await implV2.getAddress()))
                    .to.emit(beacon, "Upgraded")
                    .withArgs(await implV2.getAddress());
            });
        });

        describe("代理管理员功能", function () {
            let proxyAdmin;

            beforeEach(async function () {
                const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
                proxyAdmin = await ProxyAdmin.deploy();
                await proxyAdmin.waitForDeployment();

                // 转移所有权
                await beacon.transferOwnership(await proxyAdmin.getAddress());
            });

            it("代理管理员应该能够升级信标", async function () {
                const StorageV2 = await ethers.getContractFactory("StorageV2");
                implV2 = await StorageV2.deploy();
                await implV2.waitForDeployment();

                await proxyAdmin.upgradeBeacon(
                    await beacon.getAddress(),
                    await implV2.getAddress()
                );

                expect(await beacon.implementation()).to.equal(await implV2.getAddress());
            });
        });
    });

    // ==================== 代理管理员测试 ====================

    describe("ProxyAdmin 合约测试", function () {
        let proxyAdmin, proxy, logicV1, logicV2, beacon;
        let owner, user;

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();

            // 部署 ProxyAdmin
            const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
            proxyAdmin = await ProxyAdmin.deploy();
            await proxyAdmin.waitForDeployment();

            // 部署逻辑合约
            const StorageV1 = await ethers.getContractFactory("StorageV1");
            logicV1 = await StorageV1.deploy();
            await logicV1.waitForDeployment();

            const StorageV2 = await ethers.getContractFactory("StorageV2");
            logicV2 = await StorageV2.deploy();
            await logicV2.waitForDeployment();

            // 部署代理
            const TransparentUpgradeableProxy = await ethers.getContractFactory(
                "TransparentUpgradeableProxy"
            );
            const initData = logicV1.interface.encodeFunctionData("initialize", [100]);

            proxy = await TransparentUpgradeableProxy.deploy(
                await logicV1.getAddress(),
                await proxyAdmin.getAddress(),
                initData
            );
            await proxy.waitForDeployment();

            // 部署信标
            const UpgradeableBeacon = await ethers.getContractFactory("UpgradeableBeacon");
            beacon = await UpgradeableBeacon.deploy(await logicV1.getAddress());
            await beacon.waitForDeployment();

            // 转移信标所有权给 ProxyAdmin
            await beacon.transferOwnership(await proxyAdmin.getAddress());
        });

        describe("ProxyAdmin 权限", function () {
            it("应该正确设置所有者", async function () {
                expect(await proxyAdmin.owner()).to.equal(owner.address);
            });

            it("非所有者不应该能够调用管理函数", async function () {
                await expect(
                    proxyAdmin.connect(user).upgrade(
                        await proxy.getAddress(),
                        await logicV2.getAddress()
                    )
                ).to.be.revertedWith("Only owner");
            });
        });

        describe("升级透明代理", function () {
            it("应该能够升级代理", async function () {
                await proxyAdmin.upgrade(
                    await proxy.getAddress(),
                    await logicV2.getAddress()
                );

                expect(await proxy.getImplementation()).to.equal(await logicV2.getAddress());
            });

            it("应该能够升级并调用", async function () {
                const initData = logicV2.interface.encodeFunctionData("setName", ["Admin"]);

                await proxyAdmin.upgradeAndCall(
                    await proxy.getAddress(),
                    await logicV2.getAddress(),
                    initData
                );

                const proxyAsV2 = await ethers.getContractAt("StorageV2", await proxy.getAddress());
                expect(await proxyAsV2.getName()).to.equal("Admin");
            });
        });

        describe("更改代理管理员", function () {
            it("应该能够更改代理管理员", async function () {
                await proxyAdmin.changeProxyAdmin(
                    await proxy.getAddress(),
                    user.address
                );

                expect(await proxy.admin()).to.equal(user.address);
            });
        });

        describe("升级信标", function () {
            it("应该能够升级信标", async function () {
                await proxyAdmin.upgradeBeacon(
                    await beacon.getAddress(),
                    await logicV2.getAddress()
                );

                expect(await beacon.implementation()).to.equal(await logicV2.getAddress());
            });
        });
    });

    // ==================== 代理模式对比测试 ====================

    describe("ProxyComparison 合约测试", function () {
        let comparison;

        beforeEach(async function () {
            const ProxyComparison = await ethers.getContractFactory("ProxyComparison");
            comparison = await ProxyComparison.deploy();
            await comparison.waitForDeployment();
        });

        describe("模式选择", function () {
            it("单个代理应该推荐 UUPS", async function () {
                expect(await comparison.getRecommendedMode(1)).to.equal("UUPS Proxy");
            });

            it("少量代理应该推荐 Transparent", async function () {
                expect(await comparison.getRecommendedMode(5)).to.equal("Transparent Proxy");
            });

            it("大量代理应该推荐 Beacon", async function () {
                expect(await comparison.getRecommendedMode(20)).to.equal("Beacon Proxy");
            });
        });

        describe("模式对比常量", function () {
            it("应该定义三种模式", async function () {
                expect(await comparison.TRANSPARENT()).to.equal("Transparent Proxy");
                expect(await comparison.UUPS()).to.equal("UUPS Proxy");
                expect(await comparison.BEACON()).to.equal("Beacon Proxy");
            });
        });
    });

    // ==================== Gas 消耗分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告透明代理的 Gas 消耗", async function () {
            const [owner, admin] = await ethers.getSigners();

            // 部署逻辑合约
            const StorageV1 = await ethers.getContractFactory("StorageV1");
            const logicV1 = await StorageV1.deploy();
            await logicV1.waitForDeployment();

            // 部署代理
            const TransparentUpgradeableProxy = await ethers.getContractFactory(
                "TransparentUpgradeableProxy"
            );
            const initData = logicV1.interface.encodeFunctionData("initialize", [100]);

            const deployTx = await TransparentUpgradeableProxy.deploy(
                await logicV1.getAddress(),
                admin.address,
                initData
            );
            const deployReceipt = await deployTx.waitForDeployment();
            const deployTxReceipt = await deployTx.deploymentTransaction().wait();

            console.log(`Transparent Proxy 部署 Gas: ${deployTxReceipt.gasUsed.toString()}`);

            const proxy = await ethers.getContractAt("StorageV1", await deployTx.getAddress());

            const callTx = await proxy.setValue(200);
            const callReceipt = await callTx.wait();

            console.log(`Transparent Proxy 调用 Gas: ${callReceipt.gasUsed.toString()}`);
        });

        it("报告 UUPS 代理的 Gas 消耗", async function () {
            const [owner] = await ethers.getSigners();

            // 部署逻辑合约
            const CounterV1 = await ethers.getContractFactory("CounterV1");
            const counterV1 = await CounterV1.deploy();
            await counterV1.waitForDeployment();

            // 部署代理
            const UUPSProxy = await ethers.getContractFactory("UUPSProxy");
            const initData = counterV1.interface.encodeFunctionData("initialize", []);

            const deployTx = await UUPSProxy.deploy(
                await counterV1.getAddress(),
                initData
            );
            const deployReceipt = await deployTx.waitForDeployment();
            const deployTxReceipt = await deployTx.deploymentTransaction().wait();

            console.log(`UUPS Proxy 部署 Gas: ${deployTxReceipt.gasUsed.toString()}`);

            const proxy = await ethers.getContractAt("CounterV1", await deployTx.getAddress());

            const callTx = await proxy.increment();
            const callReceipt = await callTx.wait();

            console.log(`UUPS Proxy 调用 Gas: ${callReceipt.gasUsed.toString()}`);
        });

        it("对比不同代理模式的 Gas 消耗", async function () {
            const [owner, admin] = await ethers.getSigners();

            // Transparent Proxy
            const StorageV1 = await ethers.getContractFactory("StorageV1");
            const logicV1 = await StorageV1.deploy();
            await logicV1.waitForDeployment();

            const TransparentUpgradeableProxy = await ethers.getContractFactory(
                "TransparentUpgradeableProxy"
            );
            const initData1 = logicV1.interface.encodeFunctionData("initialize", [100]);

            const transparentProxy = await TransparentUpgradeableProxy.deploy(
                await logicV1.getAddress(),
                admin.address,
                initData1
            );
            await transparentProxy.waitForDeployment();

            const transparentProxyAsV1 = await ethers.getContractAt(
                "StorageV1",
                await transparentProxy.getAddress()
            );

            const tx1 = await transparentProxyAsV1.setValue(200);
            const receipt1 = await tx1.wait();

            // UUPS Proxy
            const CounterV1 = await ethers.getContractFactory("CounterV1");
            const counterV1 = await CounterV1.deploy();
            await counterV1.waitForDeployment();

            const UUPSProxy = await ethers.getContractFactory("UUPSProxy");
            const initData2 = counterV1.interface.encodeFunctionData("initialize", []);

            const uupsProxy = await UUPSProxy.deploy(
                await counterV1.getAddress(),
                initData2
            );
            await uupsProxy.waitForDeployment();

            const uupsProxyAsV1 = await ethers.getContractAt(
                "CounterV1",
                await uupsProxy.getAddress()
            );

            const tx2 = await uupsProxyAsV1.increment();
            const receipt2 = await tx2.wait();

            console.log("\n========== 代理模式 Gas 对比 ==========");
            console.log(`Transparent: ${receipt1.gasUsed.toString()}`);
            console.log(`UUPS:       ${receipt2.gasUsed.toString()}`);
            console.log("======================================");

            // UUPS 通常比 Transparent 更节省 Gas
            // 因为没有管理员检查开销
        });
    });
});

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Lesson 09: 事件与日志", function () {
    let eventContract, nftContract, defiContract;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const EventContract = await ethers.getContractFactory("EventContract");
        eventContract = await EventContract.deploy();
        await eventContract.waitForDeployment();

        const NFTContract = await ethers.getContractFactory("NFTContract");
        nftContract = await NFTContract.deploy();
        await nftContract.waitForDeployment();

        const DeFiProtocol = await ethers.getContractFactory("DeFiProtocol");
        defiContract = await DeFiProtocol.deploy();
        await defiContract.waitForDeployment();
    });

    describe("基础事件测试", function () {
        it("应该触发存款事件", async function () {
            const depositAmount = ethers.parseEther("1.0");

            await expect(
                eventContract.connect(user1).deposit("Test deposit", { value: depositAmount })
            )
                .to.emit(eventContract, "Deposit")
                .withArgs(user1.address, depositAmount, depositAmount, "Test deposit");
        });

        it("应该触发转账事件", async function () {
            const depositAmount = ethers.parseEther("2.0");
            await eventContract.connect(user1).deposit("Initial deposit", { value: depositAmount });

            const transferAmount = ethers.parseEther("1.0");

            await expect(
                eventContract.connect(user1).transfer(user2.address, transferAmount)
            )
                .to.emit(eventContract, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);
        });

        it("应该触发批量转账事件", async function () {
            const depositAmount = ethers.parseEther("10.0");
            await eventContract.connect(user1).deposit("Batch deposit", { value: depositAmount });

            const recipients = [user2.address, owner.address];
            const amounts = [
                ethers.parseEther("3.0"),
                ethers.parseEther("2.0")
            ];

            await expect(
                eventContract.connect(user1).batchTransfer(recipients, amounts)
            )
                .to.emit(eventContract, "BatchTransfer")
                .withArgs(
                    user1.address,
                    recipients,
                    amounts,
                    ethers.parseEther("5.0")
                );
        });

        it("应该触发用户验证事件", async function () {
            await expect(
                eventContract.connect(owner).verifyUser(user1.address, true)
            )
                .to.emit(eventContract, "UserVerified")
                .withArgs(user1.address, true);
        });

        it("应该触发管理员操作事件", async function () {
            const actionType = 0; // AdminAction.Pause

            await expect(
                eventContract.connect(owner).performAdminAction(actionType, "Emergency pause")
            )
                .to.emit(eventContract, "AdminAction")
                .withArgs(owner.address, actionType);
        });

        it("应该触发所有权转移事件", async function () {
            await expect(
                eventContract.connect(owner).transferOwnership(user1.address)
            )
                .to.emit(eventContract, "OwnershipTransferred")
                .withArgs(owner.address, user1.address);
        });
    });

    describe("错误事件测试", function () {
        it("应该触发错误事件（无效参数）", async function () {
            await expect(
                eventContract.connect(user1).conditionalTransfer(address(0), ethers.parseEther("1.0"), 0)
            )
                .to.emit(eventContract, "ErrorOccurred")
                .withArgs(user1.address, "Invalid transfer parameters", 400);
        });

        it("应该触发错误事件（余额不足）", async function () {
            await expect(
                eventContract.connect(user1).conditionalTransfer(user2.address, ethers.parseEther("1.0"), 0)
            )
                .to.emit(eventContract, "ErrorOccurred")
                .withArgs(user1.address, "Insufficient balance", 401);
        });
    });

    describe("NFT 事件测试", function () {
        it("应该触发铸造事件", async function () {
            const uri = "ipfs://QmTest123";

            await expect(
                nftContract.connect(user1).mint(uri)
            )
                .to.emit(nftContract, "Minted")
                .withArgs(1, user1.address, uri);
        });

        it("应该触发销毁事件", async function () {
            const uri = "ipfs://QmTest123";
            await nftContract.connect(user1).mint(uri);

            await expect(
                nftContract.connect(user1).burn(1)
            )
                .to.emit(nftContract, "Burned")
                .withArgs(1, user1.address);
        });

        it("应该触发元数据更新事件", async function () {
            const oldUri = "ipfs://QmOld123";
            const newUri = "ipfs://QmNew456";

            await nftContract.connect(user1).mint(oldUri);

            await expect(
                nftContract.connect(user1).updateMetadata(1, newUri)
            )
                .to.emit(nftContract, "MetadataUpdated")
                .withArgs(1, oldUri, newUri);
        });
    });

    describe("DeFi 事件测试", function () {
        it("应该触发添加流动性事件", async function () {
            const poolAddress = user2.address;
            const amountA = ethers.parseEther("10.0");
            const amountB = ethers.parseEther("20.0");

            await expect(
                defiContract.connect(user1).addLiquidity(poolAddress, amountA, amountB)
            )
                .to.emit(defiContract, "LiquidityAdded")
                .withArgs(
                    user1.address,
                    poolAddress,
                    amountA,
                    amountB,
                    (amountA + amountB)
                );
        });

        it("应该触发 Swap 事件", async function () {
            const poolAddress = user2.address;
            const tokenIn = owner.address;
            const tokenOut = user1.address;
            const amountIn = ethers.parseEther("10.0");

            await expect(
                defiContract.connect(user1).swap(poolAddress, tokenIn, tokenOut, amountIn)
            )
                .to.emit(defiContract, "Swapped")
                .withArgs(
                    user1.address,
                    poolAddress,
                    tokenIn,
                    tokenOut,
                    amountIn,
                    (amountIn * 95).div(100)
                );
        });
    });

    describe("事件监听测试", function () {
        it("应该能查询历史事件", async function () {
            // 执行多个操作
            await eventContract.connect(user1).deposit("First", { value: ethers.parseEther("1.0") });
            await eventContract.connect(user2).deposit("Second", { value: ethers.parseEther("2.0") });
            await eventContract.connect(user1).deposit("Third", { value: ethers.parseEther("1.5") });

            // 查询所有 Deposit 事件
            const depositFilter = eventContract.filters.Deposit();
            const events = await eventContract.queryFilter(depositFilter);

            expect(events.length).to.equal(3);
            expect(events[0].args.account).to.equal(user1.address);
            expect(events[1].args.account).to.equal(user2.address);
            expect(events[2].args.account).to.equal(user1.address);
        });

        it("应该能按地址过滤事件", async function () {
            await eventContract.connect(user1).deposit("User1 deposit", { value: ethers.parseEther("1.0") });
            await eventContract.connect(user2).deposit("User2 deposit", { value: ethers.parseEther("2.0") });

            // 只查询 user1 的存款
            const filter = eventContract.filters.Deposit(user1.address);
            const events = await eventContract.queryFilter(filter);

            expect(events.length).to.equal(1);
            expect(events[0].args.account).to.equal(user1.address);
        });

        it("应该能实时监听事件", async function () {
            let eventCaptured = false;

            // 监听 Transfer 事件
            eventContract.on("Transfer", (from, to, value) => {
                if (from === user1.address) {
                    eventCaptured = true;
                }
            });

            // 执行转账
            await eventContract.connect(user1).deposit("Deposit", { value: ethers.parseEther("2.0") });
            await eventContract.connect(user1).transfer(user2.address, ethers.parseEther("1.0"));

            // 等待事件被捕获
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(eventCaptured).to.be.true;

            // 清理监听器
            eventContract.removeAllListeners();
        });
    });

    describe("Gas 优化测试", function () {
        it("批量操作应该节省 Gas", async function () {
            const depositAmount = ethers.parseEther("50.0");
            await eventContract.connect(user1).deposit("Large deposit", { value: depositAmount });

            const recipients = new Array(10).fill(user2.address);
            const amounts = new Array(10).fill(ethers.parseEther("1.0"));

            // 测试批量转账
            const tx = await eventContract.connect(user1).batchTransfer(recipients, amounts);
            const receipt = await tx.wait();

            console.log("Batch transfer Gas:", receipt.gasUsed.toString());

            // 批量操作应该比单独操作节省 Gas
            expect(receipt.gasUsed.toNumber()).to.be.lessThan(500000);
        });
    });

    describe("复杂事件测试", function () {
        it("应该触发状态变更事件", async function () {
            const key = ethers.formatBytes32String("testKey");
            const newValue = ethers.formatBytes32String("testValue");

            await expect(
                eventContract.connect(owner).updateState(key, newValue)
            )
                .to.emit(eventContract, "StateChanged")
                .withArgs(key, ethers.formatBytes32String(""), newValue);
        });

        it("应该触发复杂操作事件", async function () {
            await expect(
                eventContract.connect(owner).complexOperation(
                    user1.address,
                    ethers.parseEther("1.0"),
                    ethers.parseEther("2.0"),
                    "Test operation"
                )
            )
                .to.emit(eventContract, "UserVerified")
                .withArgs(user1.address, true);
        });
    });

    describe("Receive/Fallback 事件测试", function () {
        it("应该通过 receive 函数触发存款事件", async function () {
            const amount = ethers.parseEther("1.5");

            await expect(
                user1.sendTransaction({ to: eventContract.address, value: amount })
            )
                .to.emit(eventContract, "Deposit")
                .withArgs(user1.address, amount, 0, "Received ETH");
        });

        it("应该通过 fallback 函数触发错误事件", async function () {
            // 调用不存在的函数
            await expect(
                user1.sendTransaction({
                    to: eventContract.address,
                    data: "0x12345678"
                })
            )
                .to.emit(eventContract, "ErrorOccurred")
                .withArgs(user1.address, "Fallback called", 404);
        });
    });
});

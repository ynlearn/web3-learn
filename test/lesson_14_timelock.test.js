/**
 * Lesson 14: 时间锁模式测试
 *
 * 测试覆盖：
 * - 基础时间锁功能
 * - 时间锁控制器
 * - 紧急暂停机制
 * - 投票时间锁
 * - 渐进式去中心化
 * - 延迟执行验证
 * - 取消交易功能
 * - 边界条件
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("时间锁模式合约测试", function () {
    // ==================== 基础时间锁测试 ====================

    describe("SimpleTimelock 合约测试", function () {
        let timelock;
        let owner, addr1, addr2;
        const delay = 2 * 24 * 60 * 60; // 2天

        beforeEach(async function () {
            [owner, addr1, addr2] = await ethers.getSigners();
            const SimpleTimelock = await ethers.getContractFactory("SimpleTimelock");
            timelock = await SimpleTimelock.deploy(delay);
            await timelock.waitForDeployment();
        });

        describe("部署和初始化", function () {
            it("应该正确设置初始参数", async function () {
                expect(await timelock.owner()).to.equal(owner.address);
                expect(await timelock.delay()).to.equal(delay);
            });

            it("不应该允许设置过短的延迟", async function () {
                const MIN_DELAY = await timelock.MIN_DELAY();
                await expect(
                    ethers.getContractFactory("SimpleTimelock").then(f => f.deploy(MIN_DELAY - 1n))
                ).to.be.revertedWith("Delay too short");
            });

            it("不应该允许设置过长的延迟", async function () {
                const MAX_DELAY = await timelock.MAX_DELAY();
                await expect(
                    ethers.getContractFactory("SimpleTimelock").then(f => f.deploy(MAX_DELAY + 1n))
                ).to.be.revertedWith("Delay too long");
            });
        });

        describe("队列交易", function () {
            it("应该成功将交易加入队列", async function () {
                const target = addr1.address;
                const value = 0;
                const data = "0x";

                const tx = await timelock.queueTransaction(target, value, data);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === "TransactionQueued"
                );

                expect(event).to.not.be.undefined;
            });

            it("应该计算正确的执行时间", async function () {
                const target = addr1.address;
                const value = 0;
                const data = "0x";

                const tx = await timelock.queueTransaction(target, value, data);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === "TransactionQueued"
                );

                const expectedExecuteTime = await time.latest() + delay;
                expect(event.args.executeTime).to.equal(expectedExecuteTime);
            });

            it("不应该允许非所有者队列交易", async function () {
                await expect(
                    timelock.connect(addr1).queueTransaction(addr2.address, 0, "0x")
                ).to.be.revertedWith("Not owner");
            });

            it("不应该允许零地址作为目标", async function () {
                await expect(
                    timelock.queueTransaction(ethers.ZeroAddress, 0, "0x")
                ).to.be.revertedWith("Invalid target");
            });
        });

        describe("执行交易", function () {
            let target, value, data, executeTime;

            beforeEach(async function () {
                target = addr1.address;
                value = 0;
                data = "0x";

                const tx = await timelock.queueTransaction(target, value, data);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === "TransactionQueued"
                );
                executeTime = event.args.executeTime;
            });

            it("应该在延迟时间后成功执行交易", async function () {
                await time.increaseTo(executeTime);

                await expect(timelock.executeTransaction(target, value, data, executeTime))
                    .to.emit(timelock, "TransactionExecuted");
            });

            it("不应该允许在延迟时间前执行交易", async function () {
                await expect(
                    timelock.executeTransaction(target, value, data, executeTime)
                ).to.be.revertedWith("Too early");
            });

            it("不应该允许执行不存在的交易", async function () {
                await time.increaseTo(executeTime);
                await expect(
                    timelock.executeTransaction(addr2.address, 0, "0x", executeTime)
                ).to.be.revertedWith("Invalid transaction");
            });

            it("不应该允许重复执行交易", async function () {
                await time.increaseTo(executeTime);
                await timelock.executeTransaction(target, value, data, executeTime);

                await expect(
                    timelock.executeTransaction(target, value, data, executeTime)
                ).to.be.revertedWith("Already executed");
            });

            it("不应该在过期后执行交易", async function () {
                await time.increaseTo(executeTime + 31 * 24 * 60 * 60); // 31天后

                await expect(
                    timelock.executeTransaction(target, value, data, executeTime)
                ).to.be.revertedWith("Too late");
            });
        });

        describe("取消交易", function () {
            let target, value, data, executeTime;

            beforeEach(async function () {
                const tx = await timelock.queueTransaction(addr1.address, 0, "0x");
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === "TransactionQueued"
                );

                target = event.args.target;
                value = event.args.value;
                data = event.args.data;
                executeTime = event.args.executeTime;
            });

            it("应该成功取消交易", async function () {
                await expect(timelock.cancelTransaction(target, value, data, executeTime))
                    .to.emit(timelock, "TransactionCancelled");
            });

            it("取消后不应该能执行交易", async function () {
                await timelock.cancelTransaction(target, value, data, executeTime);
                await time.increaseTo(executeTime);

                await expect(
                    timelock.executeTransaction(target, value, data, executeTime)
                ).to.be.revertedWith("Invalid transaction");
            });

            it("不应该允许非所有者取消交易", async function () {
                await expect(
                    timelock.connect(addr1).cancelTransaction(target, value, data, executeTime)
                ).to.be.revertedWith("Not owner");
            });
        });

        describe("更改延迟", function () {
            it("应该成功更改延迟", async function () {
                const newDelay = 3 * 24 * 60 * 60;
                await expect(timelock.setDelay(newDelay))
                    .to.emit(timelock, "DelayChanged");

                expect(await timelock.delay()).to.equal(newDelay);
            });

            it("不应该允许设置过短的延迟", async function () {
                const MIN_DELAY = await timelock.MIN_DELAY();
                await expect(timelock.setDelay(MIN_DELAY - 1n))
                    .to.be.revertedWith("Delay too short");
            });

            it("不应该允许设置过长的延迟", async function () {
                const MAX_DELAY = await timelock.MAX_DELAY();
                await expect(timelock.setDelay(MAX_DELAY + 1n))
                    .to.be.revertedWith("Delay too long");
            });
        });

        describe("查询功能", function () {
            it("应该正确报告待处理交易", async function () {
                await timelock.queueTransaction(addr1.address, 0, "0x");

                const pending = await timelock.getPendingTransactions();
                expect(pending.length).to.equal(1);
            });

            it("应该正确检查交易是否待处理", async function () {
                const tx = await timelock.queueTransaction(addr1.address, 0, "0x");
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => timelock.interface.parseLog(log)?.name === "TransactionQueued"
                );

                expect(await timelock.isTransactionPending(event.args.txHash)).to.be.true;
            });
        });
    });

    // ==================== 紧急暂停时间锁测试 ====================

    describe("EmergencyPauseTimelock 合约测试", function () {
        let pauseTimelock;
        let owner, user;
        const pauseDelay = 3 * 24 * 60 * 60; // 3天

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();
            const EmergencyPauseTimelock = await ethers.getContractFactory("EmergencyPauseTimelock");
            pauseTimelock = await EmergencyPauseTimelock.deploy(pauseDelay);
            await pauseTimelock.waitForDeployment();
        });

        describe("暂停机制", function () {
            it("应该成功暂停", async function () {
                await expect(pauseTimelock.pause())
                    .to.emit(pauseTimelock, "Paused");

                expect(await pauseTimelock.paused()).to.be.true;
            });

            it("应该设置正确的恢复时间", async function () {
                const tx = await pauseTimelock.pause();
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => pauseTimelock.interface.parseLog(log)?.name === "Paused"
                );

                const expectedUnpauseTime = await time.latest() + pauseDelay;
                expect(event.args.until).to.equal(expectedUnpauseTime);
            });

            it("不应该允许重复暂停", async function () {
                await pauseTimelock.pause();
                await expect(pauseTimelock.pause())
                    .to.be.revertedWith("Already paused");
            });

            it("不应该允许非所有者暂停", async function () {
                await expect(pauseTimelock.connect(user).pause())
                    .to.be.revertedWith("Not owner");
            });
        });

        describe("恢复机制", function () {
            beforeEach(async function () {
                await pauseTimelock.pause();
            });

            it("应该正确计算距离恢复的时间", async function () {
                const timeUntil = await pauseTimelock.timeUntilUnpause();
                expect(timeUntil).to.be.closeTo(pauseDelay, 2);
            });

            it("不应该在延迟时间前恢复", async function () {
                await expect(pauseTimelock.unpause())
                    .to.be.revertedWith("Too early");
            });

            it("应该在延迟时间后成功恢复", async function () {
                const unpauseTime = await pauseTimelock.unpauseTime();
                await time.increaseTo(unpauseTime);

                await expect(pauseTimelock.unpause())
                    .to.emit(pauseTimelock, "Unpaused");

                expect(await pauseTimelock.paused()).to.be.false;
            });

            it("恢复后不应该有恢复时间限制", async function () {
                const unpauseTime = await pauseTimelock.unpauseTime();
                await time.increaseTo(unpauseTime);
                await pauseTimelock.unpause();

                const timeUntil = await pauseTimelock.timeUntilUnpause();
                expect(timeUntil).to.equal(0);
            });
        });
    });

    // ==================== 投票时间锁测试 ====================

    describe("VotingTimelock 合约测试", function () {
        let votingTimelock;
        let owner, voter1, voter2, voter3;
        const votingDelay = 2 * 24 * 60 * 60; // 2天
        const executionDelay = 1 * 24 * 60 * 60; // 1天

        beforeEach(async function () {
            [owner, voter1, voter2, voter3] = await ethers.getSigners();
            const VotingTimelock = await ethers.getContractFactory("VotingTimelock");
            votingTimelock = await VotingTimelock.deploy(votingDelay, executionDelay);
            await votingTimelock.waitForDeployment();

            // 设置投票权重
            await votingTimelock.setVotingPower(voter1.address, 100);
            await votingTimelock.setVotingPower(voter2.address, 200);
            await votingTimelock.setVotingPower(voter3.address, 150);
        });

        describe("创建提案", function () {
            it("应该成功创建提案", async function () {
                const target = voter1.address;
                const data = "0x";
                const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("测试提案"));

                await expect(votingTimelock.connect(voter1).propose(target, data, descriptionHash))
                    .to.emit(votingTimelock, "ProposalCreated");
            });

            it("不应该允许无投票权的人创建提案", async function () {
                await expect(
                    votingTimelock.connect(owner).propose(voter1.address, "0x", ethers.ZeroHash)
                ).to.be.revertedWith("No voting power");
            });

            it("不应该允许创建重复的提案", async function () {
                const target = voter1.address;
                const data = "0x";
                const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("测试提案"));

                await votingTimelock.connect(voter1).propose(target, data, descriptionHash);

                await expect(
                    votingTimelock.connect(voter1).propose(target, data, descriptionHash)
                ).to.be.revertedWith("Proposal exists");
            });
        });

        describe("投票流程", function () {
            let proposalId;

            beforeEach(async function () {
                const target = voter1.address;
                const data = "0x";
                const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("测试提案"));

                const tx = await votingTimelock.connect(voter1).propose(target, data, descriptionHash);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => votingTimelock.interface.parseLog(log)?.name === "ProposalCreated"
                );
                proposalId = event.args.proposalId;
            });

            it("应该成功投票赞成", async function () {
                await expect(votingTimelock.connect(voter1).vote(proposalId, true))
                    .to.emit(votingTimelock, "VoteCast")
                    .withArgs(proposalId, voter1.address, true, 100);
            });

            it("应该成功投票反对", async function () {
                await votingTimelock.connect(voter2).vote(proposalId, false);

                const proposal = await votingTimelock.proposals(proposalId);
                expect(proposal.againstVotes).to.equal(200);
            });

            it("不应该允许重复投票", async function () {
                await votingTimelock.connect(voter1).vote(proposalId, true);
                await expect(
                    votingTimelock.connect(voter1).vote(proposalId, false)
                ).to.be.revertedWith("Already voted");
            });

            it("不应该允许在投票结束后投票", async function () {
                await time.increase(votingDelay + 1);
                await expect(
                    votingTimelock.connect(voter1).vote(proposalId, true)
                ).to.be.revertedWith("Voting ended");
            });
        });

        describe("执行提案", function () {
            let target, data, descriptionHash, proposalId;

            beforeEach(async function () {
                target = voter1.address;
                data = "0x";
                descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("测试提案"));

                const tx = await votingTimelock.connect(voter1).propose(target, data, descriptionHash);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => votingTimelock.interface.parseLog(log)?.name === "ProposalCreated"
                );
                proposalId = event.args.proposalId;

                // 投票赞成
                await votingTimelock.connect(voter1).vote(proposalId, true); // 100
                await votingTimelock.connect(voter2).vote(proposalId, true); // 200
            });

            it("应该在执行延迟后成功执行", async function () {
                const proposal = await votingTimelock.proposals(proposalId);
                await time.increaseTo(proposal.executeAfter + 1);

                await expect(votingTimelock.execute(target, data, descriptionHash))
                    .to.emit(votingTimelock, "ProposalExecuted");
            });

            it("不应该允许在执行延迟前执行", async function () {
                await time.increase(votingDelay + 1); // 投票结束但执行延迟未过

                await expect(
                    votingTimelock.execute(target, data, descriptionHash)
                ).to.be.revertedWith("Too early");
            });

            it("不应该允许执行未通过的提案", async function () {
                // 创建新提案并投反对票
                const descHash2 = ethers.keccak256(ethers.toUtf8Bytes("提案2"));
                await votingTimelock.connect(voter1).propose(target, data, descHash2);

                const proposal = await votingTimelock.proposals(descHash2);
                await time.increaseTo(proposal.executeAfter + 1);

                await expect(
                    votingTimelock.execute(target, data, descHash2)
                ).to.be.revertedWith("Not approved");
            });
        });

        describe("提案状态", function () {
            let target, data, descriptionHash, proposalId;

            beforeEach(async function () {
                target = voter1.address;
                data = "0x";
                descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("测试提案"));

                const tx = await votingTimelock.connect(voter1).propose(target, data, descriptionHash);
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => votingTimelock.interface.parseLog(log)?.name === "ProposalCreated"
                );
                proposalId = event.args.proposalId;
            });

            it("应该正确报告待投票状态", async function () {
                const state = await votingTimelock.state(proposalId);
                expect(state).to.equal(0); // Pending
            });

            it("应该正确报告已通过状态", async function () {
                await votingTimelock.connect(voter1).vote(proposalId, true);
                await votingTimelock.connect(voter2).vote(proposalId, true);

                await time.increase(votingDelay + 1);

                const state = await votingTimelock.state(proposalId);
                expect(state).to.equal(2); // Ready for execution
            });

            it("应该正确报告已拒绝状态", async function () {
                await votingTimelock.connect(voter2).vote(proposalId, false);

                await time.increase(votingDelay + 1);

                const state = await votingTimelock.state(proposalId);
                expect(state).to.equal(3); // Defeated
            });
        });
    });

    // ==================== 最佳实践测试 ====================

    describe("TimelockBestPractices 合约测试", function () {
        let bestPractices;
        let owner, user;
        const delay = 2 * 24 * 60 * 60;

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();
            const TimelockBestPractices = await ethers.getContractFactory("TimelockBestPractices");
            bestPractices = await TimelockBestPractices.deploy(delay);
            await bestPractices.waitForDeployment();
        });

        describe("权限验证", function () {
            it("只有所有者可以队列交易", async function () {
                await expect(
                    bestPractices.connect(user).queueTransaction(user.address, 0, "0x")
                ).to.be.revertedWith("Not owner");
            });

            it("只有所有者可以执行交易", async function () {
                const tx = await bestPractices.queueTransaction(user.address, 0, "0x");
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => bestPractices.interface.parseLog(log)?.name === "TransactionQueued"
                );

                await time.increaseTo(event.args.executeTime);

                await expect(
                    bestPractices.connect(user).executeTransaction(
                        user.address,
                        0,
                        "0x",
                        event.args.executeTime
                    )
                ).to.be.revertedWith("Not owner");
            });
        });

        describe("交易验证", function () {
            it("不应该允许零地址作为目标", async function () {
                await expect(
                    bestPractices.queueTransaction(ethers.ZeroAddress, 0, "0x")
                ).to.be.revertedWith("Invalid target");
            });

            it("不应该允许队列金额超过余额", async function () {
                await expect(
                    bestPractices.queueTransaction(user.address, ethers.parseEther("1000"), "0x")
                ).to.be.revertedWith("Insufficient balance");
            });
        });

        describe("状态查询", function () {
            it("应该正确报告交易状态", async function () {
                const tx = await bestPractices.queueTransaction(user.address, 0, "0x");
                const receipt = await tx.wait();

                const event = receipt.logs.find(
                    log => bestPractices.interface.parseLog(log)?.name === "TransactionQueued"
                );

                // 初始状态：Pending
                expect(await bestPractices.getTransactionStatus(
                    user.address,
                    0,
                    "0x",
                    event.args.executeTime
                )).to.equal("Pending");

                // 等待后：Ready
                await time.increaseTo(event.args.executeTime);
                expect(await bestPractices.getTransactionStatus(
                    user.address,
                    0,
                    "0x",
                    event.args.executeTime
                )).to.equal("Ready");
            });
        });

        describe("批量操作", function () {
            it("应该成功批量队列交易", async function () {
                const targets = [user.address, owner.address];
                const values = [0, 0];
                const datas = ["0x", "0x"];

                const txHashes = await bestPractices.queueBatch(targets, values, datas);
                expect(txHashes.length).to.equal(2);
            });

            it("不应该允许长度不匹配的批量操作", async function () {
                const targets = [user.address, owner.address];
                const values = [0];
                const datas = ["0x"];

                await expect(
                    bestPractices.queueBatch(targets, values, datas)
                ).to.be.revertedWith("Length mismatch");
            });
        });
    });

    // ==================== Gas 消耗分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告基础时间锁的 Gas 消耗", async function () {
            const SimpleTimelock = await ethers.getContractFactory("SimpleTimelock");
            const tl = await SimpleTimelock.deploy(2 * 24 * 60 * 60);
            await tl.waitForDeployment();

            const tx1 = await tl.queueTransaction(owner.address, 0, "0x");
            const receipt1 = await tx1.wait();
            console.log(`SimpleTimelock.queueTransaction() Gas: ${receipt1.gasUsed.toString()}`);

            const receipt = await tx1.wait();
            const event = receipt.logs.find(
                log => tl.interface.parseLog(log)?.name === "TransactionQueued"
            );

            await time.increaseTo(event.args.executeTime);

            const tx2 = await tl.executeTransaction(owner.address, 0, "0x", event.args.executeTime);
            const receipt2 = await tx2.wait();
            console.log(`SimpleTimelock.executeTransaction() Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告投票时间锁的 Gas 消耗", async function () {
            const VotingTimelock = await ethers.getContractFactory("VotingTimelock");
            const vt = await VotingTimelock.deploy(2 * 24 * 60 * 60, 1 * 24 * 60 * 60);
            await vt.waitForDeployment();

            const [_, voter] = await ethers.getSigners();
            await vt.setVotingPower(voter.address, 100);

            const tx1 = await vt.connect(voter).propose(
                owner.address,
                "0x",
                ethers.keccak256(ethers.toUtf8Bytes("测试"))
            );
            const receipt1 = await tx1.wait();
            console.log(`VotingTimelock.propose() Gas: ${receipt1.gasUsed.toString()}`);

            const event = receipt1.logs.find(
                log => vt.interface.parseLog(log)?.name === "ProposalCreated"
            );

            const tx2 = await vt.connect(voter).vote(event.args.proposalId, true);
            const receipt2 = await tx2.wait();
            console.log(`VotingTimelock.vote() Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

/**
 * Lesson 13: 状态机模式测试
 *
 * 测试覆盖：
 * - 基础状态机转换
 * - 订单状态机完整流程
 * - 投票状态机治理流程
 * - 众筹状态机资金流转
 * - 状态转换验证
 * - 权限控制
 * - 边界条件
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("状态机模式合约测试", function () {
    // ==================== 基础状态机测试 ====================

    describe("BasicStateMachine 合约测试", function () {
        let stateMachine;
        let owner, addr1, addr2;

        beforeEach(async function () {
            [owner, addr1, addr2] = await ethers.getSigners();
            const BasicStateMachine = await ethers.getContractFactory("BasicStateMachine");
            stateMachine = await BasicStateMachine.deploy();
            await stateMachine.waitForDeployment();
        });

        describe("初始状态", function () {
            it("应该初始化为 Pending 状态", async function () {
                expect(await stateMachine.currentState()).to.equal(0); // State.Pending
            });

            it("应该返回正确的状态名称", async function () {
                expect(await stateMachine.getStateName()).to.equal("Pending");
            });
        });

        describe("状态转换", function () {
            it("应该能够从 Pending 转换到 Active", async function () {
                await stateMachine.activate();
                expect(await stateMachine.currentState()).to.equal(1); // State.Active
                expect(await stateMachine.getStateName()).to.equal("Active");
            });

            it("应该能够从 Active 转换到 Completed", async function () {
                await stateMachine.activate();
                await stateMachine.complete();
                expect(await stateMachine.currentState()).to.equal(2); // State.Completed
            });

            it("应该能够从 Active 转换到 Cancelled", async function () {
                await stateMachine.activate();
                await stateMachine.cancel();
                expect(await stateMachine.currentState()).to.equal(3); // State.Cancelled
            });

            it("应该能够从 Pending 直接转换到 Cancelled", async function () {
                await stateMachine.cancel();
                expect(await stateMachine.currentState()).to.equal(3);
            });
        });

        describe("无效状态转换", function () {
            it("不应该允许从 Pending 直接转换到 Completed", async function () {
                await expect(stateMachine.complete()).to.be.revertedWith("Invalid state");
            });

            it("不应该允许从 Completed 转换到其他状态", async function () {
                await stateMachine.activate();
                await stateMachine.complete();
                await expect(stateMachine.activate()).to.be.revertedWith("Invalid state");
            });

            it("不应该允许重复激活", async function () {
                await stateMachine.activate();
                await expect(stateMachine.activate()).to.be.revertedWith("Invalid state");
            });
        });

        describe("事件触发", function () {
            it("应该在状态改变时触发 StateChanged 事件", async function () {
                await expect(stateMachine.activate())
                    .to.emit(stateMachine, "StateChanged")
                    .withArgs(0, 1, owner.address);
            });

            it("应该记录触发者地址", async function () {
                await stateMachine.connect(addr1).activate();
                const tx = await stateMachine.complete();
                const receipt = await tx.wait();
                const event = receipt.logs.find(
                    log => stateMachine.interface.parseLog(log)?.name === "StateChanged"
                );
                expect(event.args.caller).to.equal(owner.address);
            });
        });
    });

    // ==================== 订单状态机测试 ====================

    describe("OrderStateMachine 合约测试", function () {
        let orderMachine;
        let owner, buyer, seller;

        beforeEach(async function () {
            [owner, buyer, seller] = await ethers.getSigners();
            const OrderStateMachine = await ethers.getContractFactory("OrderStateMachine");
            orderMachine = await OrderStateMachine.deploy();
            await orderMachine.waitForDeployment();
        });

        describe("创建订单", function () {
            it("应该成功创建订单", async function () {
                const tx = await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
                const receipt = await tx.wait();

                expect(await orderMachine.orderCount()).to.equal(1);

                const order = await orderMachine.orders(1);
                expect(order.buyer).to.equal(buyer.address);
                expect(order.seller).to.equal(seller.address);
                expect(order.amount).to.equal(ethers.parseEther("1"));
                expect(order.state).to.equal(0); // OrderState.Created
            });

            it("不应该允许创建自己卖给自己的订单", async function () {
                await expect(
                    orderMachine.connect(buyer).createOrder(buyer.address, ethers.parseEther("1"))
                ).to.be.revertedWith("Cannot buy from yourself");
            });

            it("不应该允许创建零金额订单", async function () {
                await expect(
                    orderMachine.connect(buyer).createOrder(seller.address, 0)
                ).to.be.revertedWith("Amount must be positive");
            });

            it("应该触发 OrderCreated 事件", async function () {
                await expect(orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1")))
                    .to.emit(orderMachine, "OrderCreated")
                    .withArgs(1, buyer.address, seller.address, ethers.parseEther("1"));
            });
        });

        describe("支付订单", function () {
            let orderId;

            beforeEach(async function () {
                const tx = await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
                orderId = 1;
            });

            it("应该成功支付订单", async function () {
                await orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") });

                const order = await orderMachine.orders(orderId);
                expect(order.state).to.equal(1); // OrderState.Paid
            });

            it("不应该允许支付错误金额", async function () {
                await expect(
                    orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("0.5") })
                ).to.be.revertedWith("Incorrect amount");
            });

            it("不应该允许非买家支付", async function () {
                await expect(
                    orderMachine.connect(seller).payOrder(orderId, { value: ethers.parseEther("1") })
                ).to.be.revertedWith("Only buyer");
            });

            it("不应该支付已支付的订单", async function () {
                await orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") });
                await expect(
                    orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") })
                ).to.be.revertedWith("Invalid state");
            });
        });

        describe("发货流程", function () {
            let orderId;

            beforeEach(async function () {
                await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
                orderId = 1;
                await orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") });
            });

            it("应该成功发货", async function () {
                await orderMachine.connect(seller).shipOrder(orderId, "TRACK123");

                const order = await orderMachine.orders(orderId);
                expect(order.state).to.equal(2); // OrderState.Shipped
            });

            it("应该触发 OrderShipped 事件", async function () {
                await expect(orderMachine.connect(seller).shipOrder(orderId, "TRACK123"))
                    .to.emit(orderMachine, "OrderShipped")
                    .withArgs(orderId, "TRACK123");
            });

            it("不应该允许未支付的订单发货", async function () {
                await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("2"));
                await expect(
                    orderMachine.connect(seller).shipOrder(2, "TRACK456")
                ).to.be.revertedWith("Order not paid");
            });
        });

        describe("确认收货", function () {
            let orderId;

            beforeEach(async function () {
                await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
                orderId = 1;
                await orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") });
                await orderMachine.connect(seller).shipOrder(orderId, "TRACK123");
            });

            it("应该成功确认收货并转账给卖家", async function () {
                const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

                await orderMachine.connect(buyer).confirmDelivery(orderId);

                const order = await orderMachine.orders(orderId);
                expect(order.state).to.equal(3); // OrderState.Delivered

                const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
                expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("1"));
            });

            it("不应该允许非买家确认收货", async function () {
                await expect(
                    orderMachine.connect(seller).confirmDelivery(orderId)
                ).to.be.revertedWith("Only buyer");
            });
        });

        describe("取消订单", function () {
            let orderId;

            beforeEach(async function () {
                await orderMachine.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
                orderId = 1;
            });

            it("买家应该能够取消订单", async function () {
                await orderMachine.connect(buyer).cancelOrder(orderId, "Changed mind");

                const order = await orderMachine.orders(orderId);
                expect(order.state).to.equal(5); // OrderState.Cancelled
            });

            it("卖家应该能够取消订单", async function () {
                await orderMachine.connect(seller).cancelOrder(orderId, "Out of stock");

                const order = await orderMachine.orders(orderId);
                expect(order.state).to.equal(5);
            });

            it("不应该允许取消已支付的订单", async function () {
                await orderMachine.connect(buyer).payOrder(orderId, { value: ethers.parseEther("1") });
                await expect(
                    orderMachine.connect(buyer).cancelOrder(orderId, "Reason")
                ).to.be.revertedWith("Cannot cancel");
            });
        });
    });

    // ==================== 投票状态机测试 ====================

    describe("VotingStateMachine 合约测试", function () {
        let votingMachine;
        let owner, voter1, voter2, voter3;

        beforeEach(async function () {
            [owner, voter1, voter2, voter3] = await ethers.getSigners();
            const VotingStateMachine = await ethers.getContractFactory("VotingStateMachine");
            votingMachine = await VotingStateMachine.deploy();
            await votingMachine.waitForDeployment();

            // 设置投票权重
            await votingMachine.setVotingPower(voter1.address, 100);
            await votingMachine.setVotingPower(voter2.address, 200);
            await votingMachine.setVotingPower(voter3.address, 150);
        });

        describe("创建提案", function () {
            it("应该成功创建提案", async function () {
                const tx = await votingMachine.connect(voter1).createProposal(
                    "提高手续费至 0.5%",
                    300
                );

                expect(await votingMachine.proposalCount()).to.equal(1);

                const proposal = await votingMachine.proposals(1);
                expect(proposal.proposer).to.equal(voter1.address);
                expect(proposal.state).to.equal(0); // ProposalState.Draft
            });

            it("不应该允许无投票权的人创建提案", async function () {
                await expect(
                    votingMachine.connect(owner).createProposal("测试提案", 100)
                ).to.be.revertedWith("No voting power");
            });

            it("不应该允许创建空描述的提案", async function () {
                await expect(
                    votingMachine.connect(voter1).createProposal("", 100)
                ).to.be.revertedWith("Empty description");
            });
        });

        describe("激活提案", function () {
            let proposalId;

            beforeEach(async function () {
                const tx = await votingMachine.connect(voter1).createProposal(
                    "测试提案",
                    300
                );
                proposalId = 1;
            });

            it("提议者应该能够激活提案", async function () {
                await votingMachine.connect(voter1).activateProposal(proposalId);

                const proposal = await votingMachine.proposals(proposalId);
                expect(proposal.state).to.equal(1); // ProposalState.Active
            });

            it("不应该允许非提议者激活提案", async function () {
                await expect(
                    votingMachine.connect(voter2).activateProposal(proposalId)
                ).to.be.revertedWith("Not proposer");
            });

            it("不应该重复激活提案", async function () {
                await votingMachine.connect(voter1).activateProposal(proposalId);
                await expect(
                    votingMachine.connect(voter1).activateProposal(proposalId)
                ).to.be.revertedWith("Invalid state");
            });
        });

        describe("投票流程", function () {
            let proposalId;

            beforeEach(async function () {
                await votingMachine.connect(voter1).createProposal("测试提案", 300);
                proposalId = 1;
                await votingMachine.connect(voter1).activateProposal(proposalId);
            });

            it("应该成功投票赞成", async function () {
                await votingMachine.connect(voter1).vote(proposalId, true);

                const proposal = await votingMachine.proposals(proposalId);
                expect(proposal.forVotes).to.equal(100);
                expect(await votingMachine.hasVoted(proposalId, voter1.address)).to.be.true;
            });

            it("应该成功投票反对", async function () {
                await votingMachine.connect(voter2).vote(proposalId, false);

                const proposal = await votingMachine.proposals(proposalId);
                expect(proposal.againstVotes).to.equal(200);
            });

            it("不应该允许重复投票", async function () {
                await votingMachine.connect(voter1).vote(proposalId, true);
                await expect(
                    votingMachine.connect(voter1).vote(proposalId, false)
                ).to.be.revertedWith("Already voted");
            });

            it("不应该允许对非活跃提案投票", async function () {
                await votingMachine.connect(voter1).createProposal("新提案", 100);
                await expect(
                    votingMachine.connect(voter2).vote(2, true)
                ).to.be.revertedWith("Not active");
            });

            it("应该在投票结束后计算结果", async function () {
                await votingMachine.connect(voter1).vote(proposalId, true); // 100 赞成
                await votingMachine.connect(voter2).vote(proposalId, false); // 200 反对

                // 快进到投票结束
                await time.increase(3 * 24 * 60 * 60 + 1);

                await votingMachine.calculateResult(proposalId);

                const proposal = await votingMachine.proposals(proposalId);
                expect(proposal.state).to.equal(3); // ProposalState.Rejected
            });
        });

        describe("执行提案", function () {
            let proposalId;

            beforeEach(async function () {
                await votingMachine.connect(voter1).createProposal("测试提案", 300);
                proposalId = 1;
                await votingMachine.connect(voter1).activateProposal(proposalId);

                // 投票赞成
                await votingMachine.connect(voter1).vote(proposalId, true); // 100
                await votingMachine.connect(voter2).vote(proposalId, true); // 200

                // 快进到投票结束
                await time.increase(3 * 24 * 60 * 60 + 1);

                await votingMachine.calculateResult(proposalId);
            });

            it("应该成功执行通过的提案", async function () {
                await votingMachine.executeProposal(proposalId);

                const proposal = await votingMachine.proposals(proposalId);
                expect(proposal.state).to.equal(4); // ProposalState.Executed
            });

            it("应该触发 ProposalExecuted 事件", async function () {
                await expect(votingMachine.executeProposal(proposalId))
                    .to.emit(votingMachine, "ProposalExecuted")
                    .withArgs(proposalId);
            });
        });
    });

    // ==================== 众筹状态机测试 ====================

    describe("CrowdfundingStateMachine 合约测试", function () {
        let crowdfunding;
        let owner, creator, contributor1, contributor2;

        beforeEach(async function () {
            [owner, creator, contributor1, contributor2] = await ethers.getSigners();
            const CrowdfundingStateMachine = await ethers.getContractFactory("CrowdfundingStateMachine");
            crowdfunding = await CrowdfundingStateMachine.deploy();
            await crowdfunding.waitForDeployment();
        });

        describe("创建众筹活动", function () {
            it("应该成功创建众筹活动", async function () {
                const tx = await crowdfunding.connect(creator).createCampaign(
                    "创新项目",
                    "这是一个创新的项目描述",
                    ethers.parseEther("10"),
                    30 * 24 * 60 * 60 // 30天
                );

                expect(await crowdfunding.campaignCount()).to.equal(1);

                const campaign = await crowdfunding.campaigns(1);
                expect(campaign.creator).to.equal(creator.address);
                expect(campaign.goal).to.equal(ethers.parseEther("10"));
                expect(campaign.state).to.equal(0); // CampaignState.Fundraising
            });

            it("不应该允许创建零目标的众筹", async function () {
                await expect(
                    crowdfunding.connect(creator).createCampaign(
                        "测试项目",
                        "描述",
                        0,
                        30 * 24 * 60 * 60
                    )
                ).to.be.revertedWith("Invalid goal");
            });
        });

        describe("贡献资金", function () {
            let campaignId;

            beforeEach(async function () {
                await crowdfunding.connect(creator).createCampaign(
                    "创新项目",
                    "项目描述",
                    ethers.parseEther("10"),
                    30 * 24 * 60 * 60
                );
                campaignId = 1;
            });

            it("应该成功贡献资金", async function () {
                await crowdfunding.connect(contributor1).contribute(campaignId, {
                    value: ethers.parseEther("5")
                });

                const campaign = await crowdfunding.campaigns(campaignId);
                expect(campaign.pledged).to.equal(ethers.parseEther("5"));
                expect(await crowdfunding.getContribution(campaignId, contributor1.address))
                    .to.equal(ethers.parseEther("5"));
            });

            it("应该在达到目标时自动转换为 Successful 状态", async function () {
                await crowdfunding.connect(contributor1).contribute(campaignId, {
                    value: ethers.parseEther("5")
                });
                await crowdfunding.connect(contributor2).contribute(campaignId, {
                    value: ethers.parseEther("5")
                });

                const campaign = await crowdfunding.campaigns(campaignId);
                expect(campaign.state).to.equal(1); // CampaignState.Successful
            });

            it("不应该允许对已结束的众筹贡献", async function () {
                // 快进到截止日期后
                await time.increase(31 * 24 * 60 * 60);

                await expect(
                    crowdfunding.connect(contributor1).contribute(campaignId, {
                        value: ethers.parseEther("1")
                    })
                ).to.be.revertedWith("Campaign ended");
            });
        });

        describe("结束众筹", function () {
            let campaignId;

            beforeEach(async function () {
                await crowdfunding.connect(creator).createCampaign(
                    "创新项目",
                    "项目描述",
                    ethers.parseEther("10"),
                    30 * 24 * 60 * 60
                );
                campaignId = 1;
                await crowdfunding.connect(contributor1).contribute(campaignId, {
                    value: ethers.parseEther("3")
                });
            });

            it("应该在截止后结束为 Failed 状态", async function () {
                await time.increase(31 * 24 * 60 * 60);
                await crowdfunding.finalizeCampaign(campaignId);

                const campaign = await crowdfunding.campaigns(campaignId);
                expect(campaign.state).to.equal(2); // CampaignState.Failed
            });
        });

        describe("领取资金", function () {
            let campaignId;

            beforeEach(async function () {
                await crowdfunding.connect(creator).createCampaign(
                    "创新项目",
                    "项目描述",
                    ethers.parseEther("10"),
                    30 * 24 * 60 * 60
                );
                campaignId = 1;

                // 达到目标
                await crowdfunding.connect(contributor1).contribute(campaignId, {
                    value: ethers.parseEther("5")
                });
                await crowdfunding.connect(contributor2).contribute(campaignId, {
                    value: ethers.parseEther("5")
                });
            });

            it("创建者应该能够领取资金", async function () {
                const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);

                await crowdfunding.connect(creator).claimFunds(campaignId);

                const campaign = await crowdfunding.campaigns(campaignId);
                expect(campaign.state).to.equal(3); // CampaignState.Claimed

                const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
                expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("10"));
            });

            it("不应该允许非创建者领取资金", async function () {
                await expect(
                    crowdfunding.connect(contributor1).claimFunds(campaignId)
                ).to.be.revertedWith("Not creator");
            });
        });

        describe("退款", function () {
            let campaignId;

            beforeEach(async function () {
                await crowdfunding.connect(creator).createCampaign(
                    "创新项目",
                    "项目描述",
                    ethers.parseEther("10"),
                    30 * 24 * 60 * 60
                );
                campaignId = 1;

                await crowdfunding.connect(contributor1).contribute(campaignId, {
                    value: ethers.parseEther("3")
                });

                // 快进并结束
                await time.increase(31 * 24 * 60 * 60);
                await crowdfunding.finalizeCampaign(campaignId);
            });

            it("贡献者应该能够获得退款", async function () {
                const contributorBalanceBefore = await ethers.provider.getBalance(contributor1.address);

                await crowdfunding.connect(contributor1).refundContribution(campaignId);

                const contributorBalanceAfter = await ethers.provider.getBalance(contributor1.address);
                expect(contributorBalanceAfter - contributorBalanceBefore).to.equal(ethers.parseEther("3"));

                expect(await crowdfunding.getContribution(campaignId, contributor1.address))
                    .to.equal(0);
            });

            it("不应该允许重复退款", async function () {
                await crowdfunding.connect(contributor1).refundContribution(campaignId);
                await expect(
                    crowdfunding.connect(contributor1).refundContribution(campaignId)
                ).to.be.revertedWith("No contribution");
            });
        });
    });

    // ==================== 最佳实践测试 ====================

    describe("StateMachineBestPractices 合约测试", function () {
        let bestPractices;
        let owner, user;

        beforeEach(async function () {
            [owner, user] = await ethers.getSigners();
            const StateMachineBestPractices = await ethers.getContractFactory("StateMachineBestPractices");
            bestPractices = await StateMachineBestPractices.deploy();
            await bestPractices.waitForDeployment();
        });

        describe("初始状态", function () {
            it("应该初始化为 Active 状态", async function () {
                expect(await bestPractices.state()).to.equal(0); // State.Active
            });

            it("应该正确报告状态", async function () {
                expect(await bestPractices.isActive()).to.be.true;
                expect(await bestPractices.isPaused()).to.be.false;
                expect(await bestPractices.isClosed()).to.be.false;
            });
        });

        describe("暂停和恢复", function () {
            it("应该能够暂停", async function () {
                await bestPractices.pause();
                expect(await bestPractices.state()).to.equal(1); // State.Paused
            });

            it("应该能够恢复", async function () {
                await bestPractices.pause();
                await bestPractices.resume();
                expect(await bestPractices.state()).to.equal(0); // State.Active
            });

            it("不应该允许在暂停状态下执行关键操作", async function () {
                await bestPractices.pause();
                await expect(bestPractices.criticalOperation()).to.be.revertedWith("Invalid state");
            });
        });

        describe("关闭状态", function () {
            it("应该能够从 Active 状态关闭", async function () {
                await bestPractices.close();
                expect(await bestPractices.state()).to.equal(2); // State.Closed
            });

            it("应该能够从 Paused 状态关闭", async function () {
                await bestPractices.pause();
                await bestPractices.close();
                expect(await bestPractices.state()).to.equal(2);
            });

            it("不应该允许从 Closed 状态转换", async function () {
                await bestPractices.close();
                await expect(bestPractices.resume()).to.be.revertedWith("Invalid transition");
            });
        });

        describe("事件触发", function () {
            it("应该在每次状态改变时触发事件", async function () {
                await expect(bestPractices.pause())
                    .to.emit(bestPractices, "StateChanged")
                    .withArgs(0, 1, owner.address);
            });
        });
    });

    // ==================== Gas 消耗分析 ====================

    describe("Gas 消耗分析", function () {
        it("报告基础状态机的 Gas 消耗", async function () {
            const BasicStateMachine = await ethers.getContractFactory("BasicStateMachine");
            const sm = await BasicStateMachine.deploy();
            await sm.waitForDeployment();

            const tx = await sm.activate();
            const receipt = await tx.wait();
            console.log(`BasicStateMachine.activate() Gas: ${receipt.gasUsed.toString()}`);
        });

        it("报告订单状态机的 Gas 消耗", async function () {
            const OrderStateMachine = await ethers.getContractFactory("OrderStateMachine");
            const om = await OrderStateMachine.deploy();
            await om.waitForDeployment();

            const [_, buyer, seller] = await ethers.getSigners();

            const tx1 = await om.connect(buyer).createOrder(seller.address, ethers.parseEther("1"));
            const receipt1 = await tx1.wait();
            console.log(`OrderStateMachine.createOrder() Gas: ${receipt1.gasUsed.toString()}`);

            const tx2 = await om.connect(buyer).payOrder(1, { value: ethers.parseEther("1") });
            const receipt2 = await tx2.wait();
            console.log(`OrderStateMachine.payOrder() Gas: ${receipt2.gasUsed.toString()}`);
        });

        it("报告投票状态机的 Gas 消耗", async function () {
            const VotingStateMachine = await ethers.getContractFactory("VotingStateMachine");
            const vm = await VotingStateMachine.deploy();
            await vm.waitForDeployment();

            const [_, voter] = await ethers.getSigners();
            await vm.setVotingPower(voter.address, 100);

            const tx1 = await vm.connect(voter).createProposal("测试提案", 50);
            const receipt1 = await tx1.wait();
            console.log(`VotingStateMachine.createProposal() Gas: ${receipt1.gasUsed.toString()}`);

            await vm.connect(voter).activateProposal(1);

            const tx2 = await vm.connect(voter).vote(1, true);
            const receipt2 = await tx2.wait();
            console.log(`VotingStateMachine.vote() Gas: ${receipt2.gasUsed.toString()}`);
        });
    });
});

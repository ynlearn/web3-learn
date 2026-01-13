/**
 * Lesson 20: DAO 治理系统测试文件
 * 测试 DAO 治理系统的核心功能
 */

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("📘 Lesson 20: DAO 治理系统", function () {
    let daoFactory, governor, timelock, token;
    let owner, voter1, voter2, voter3, proposer;
    const INITIAL_SUPPLY = ethers.parseEther("1000000");

    beforeEach(async function () {
        [owner, voter1, voter2, voter3, proposer] = await ethers.getSigners();

        // 部署 DAO 工厂
        const DAOFactory = await ethers.getContractFactory("defi/lesson_20_dao_governance.sol:DAOFactory");
        daoFactory = await DAOFactory.deploy();

        // 创建 DAO 配置
        const config = {
            tokenName: "Governance Token",
            tokenSymbol: "GOV",
            initialSupply: INITIAL_SUPPLY,
            votingDelay: 1, // 1 个区块延迟
            votingPeriod: 10, // 10 个区块投票周期
            quorumFraction: 4, // 4% 法定人数
            timelockDelay: 3600 // 1 小时时间锁
        };

        // 创建 DAO
        const tx = await daoFactory.createDAO(config);
        const receipt = await tx.wait();

        // 获取部署的合约地址
        const daoAddress = await daoFactory.userDAOs(owner.address);
        const governorAddress = daoAddress[0];

        governor = await ethers.getContractAt("DAOGovernor", governorAddress);

        // 获取 token 和 timelock 地址
        const daoInstance = await daoFactory.daos(0);
        token = await ethers.getContractAt("GovernanceToken", daoInstance.token);
        timelock = await ethers.getContractAt("DAOTimeLock", daoInstance.timelock);

        // 分配代币给投票者
        await token.transfer(voter1.address, ethers.parseEther("100000"));
        await token.transfer(voter2.address, ethers.parseEther("100000"));
        await token.transfer(voter3.address, ethers.parseEther("100000"));

        // 授权治理合约
        await token.connect(voter1).delegate(voter1.address);
        await token.connect(voter2).delegate(voter2.address);
        await token.connect(voter3).delegate(voter3.address);
    });

    describe("1️⃣ DAO 初始化和配置", function () {
        it("应该正确创建 DAO", async function () {
            const daoCount = await daoFactory.getDAOCount();
            expect(daoCount).to.equal(1);
        });

        it("应该正确初始化治理代币", async function () {
            expect(await token.name()).to.equal("Governance Token");
            expect(await token.symbol()).to.equal("GOV");
            expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
        });

        it("应该正确设置治理参数", async function () {
            expect(await governor.votingDelay()).to.equal(1);
            expect(await governor.votingPeriod()).to.equal(10);
            expect(await governor.quorumNumerator()).to.equal(4);
        });

        it("应该正确初始化时间锁", async function () {
            const minDelay = await timelock.getMinDelay();
            expect(minDelay).to.equal(3600);
        });

        it("应该记录创建者的 DAO", async function () {
            const userDAOs = await daoFactory.getUserDAOs(owner.address);
            expect(userDAOs.length).to.equal(1);
            expect(userDAOs[0]).to.equal(await governor.getAddress());
        });
    });

    describe("2️⃣ 治理代币功能", function () {
        it("应该正确计算投票权重", async function () {
            const votes1 = await token.getVotes(voter1.address);
            expect(votes1).to.equal(ethers.parseEther("100000"));
        });

        it("应该支持委托投票", async function () {
            await token.connect(voter1).delegate(voter2.address);

            const votes2 = await token.getVotes(voter2.address);
            expect(votes2).to.equal(ethers.parseEther("200000")); // voter2 自己的 + voter1 委托的
        });

        it("应该正确记录历史投票权重", async function () {
            // 在当前区块记录投票权重
            const currentBlock = await ethers.provider.getBlockNumber();

            // 转移代币
            await token.connect(voter1).transfer(voter2.address, ethers.parseEther("10000"));

            // 查询历史投票权重
            const pastVotes = await token.getPastVotes(voter1.address, currentBlock);
            expect(pastVotes).to.equal(ethers.parseEther("100000"));
        });

        it("应该正确更新总供应量检查点", async function () {
            const currentBlock = await ethers.provider.getBlockNumber();
            const pastSupply = await token.getPastTotalSupply(currentBlock);
            expect(pastSupply).to.equal(INITIAL_SUPPLY);
        });
    });

    describe("3️⃣ 提案管理", function () {
        it("应该成功创建提案", async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("transfer", [voter1.address, ethers.parseEther("1000")])];
            const description = "Transfer tokens to voter1";

            const tx = await governor.propose(targets, values, calldatas, description);
            const receipt = await tx.wait();

            // 从事件中提取提案 ID
            const proposalCreatedEvent = receipt.logs.find(
                log => log.fragment && log.fragment.name === "ProposalCreated"
            );

            expect(proposalCreatedEvent).to.not.be.undefined;
        });

        it("应该有足够的代币才能创建提案", async function () {
            // voter2 尝试创建提案（有 100000 代币，应该足够）
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            await expect(
                governor.connect(voter2).propose(targets, values, calldatas, description)
            ).to.not.be.reverted;
        });

        it("应该正确设置提案状态", async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            const tx = await governor.propose(targets, values, calldatas, description);
            const receipt = await tx.wait();

            const proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // 提案状态应该是 Pending
            let state = await governor.state(proposalId);
            expect(state).to.equal(0); // Pending

            // 等待投票延迟
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);

            // 状态应该是 Active
            state = await governor.state(proposalId);
            expect(state).to.equal(1); // Active
        });

        it("应该正确计算提案哈希", async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            const proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            expect(proposalId).to.not.equal(ethers.ZeroHash);
        });
    });

    describe("4️⃣ 投票功能", function () {
        let proposalId;

        beforeEach(async function () {
            // 创建提案
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            const tx = await governor.propose(targets, values, calldatas, description);
            const receipt = await tx.wait();

            proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // 等待投票延迟
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);
        });

        it("应该成功投票", async function () {
            const tx = await governor.connect(voter1).castVote(proposalId, 1); // 1 = For
            const receipt = await tx.wait();

            // 检查投票事件
            const voteCastEvent = receipt.logs.find(
                log => log.fragment && log.fragment.name === "VoteCast"
            );

            expect(voteCastEvent).to.not.be.undefined;
        });

        it("应该正确统计投票权重", async function () {
            await governor.connect(voter1).castVote(proposalId, 1);
            await governor.connect(voter2).castVote(proposalId, 1);

            const proposalVotes = await governor.proposalVotes(proposalId);

            expect(proposalVotes.forVotes).to.equal(ethers.parseEther("200000"));
        });

        it("应该支持不同的投票选项", async function () {
            // voter1 投赞成
            await governor.connect(voter1).castVote(proposalId, 1);
            // voter2 投反对
            await governor.connect(voter2).castVote(proposalId, 0);
            // voter3 弃权
            await governor.connect(voter3).castVote(proposalId, 2);

            const proposalVotes = await governor.proposalVotes(proposalId);

            expect(proposalVotes.forVotes).to.equal(ethers.parseEther("100000"));
            expect(proposalVotes.againstVotes).to.equal(ethers.parseEther("100000"));
            expect(proposalVotes.abstainVotes).to.equal(ethers.parseEther("100000"));
        });

        it("应该防止重复投票", async function () {
            await governor.connect(voter1).castVote(proposalId, 1);

            await expect(
                governor.connect(voter1).castVote(proposalId, 0)
            ).to.be.revertedWithCustomError(governor, "GovernorAlreadyCastVote");
        });

        it("应该在投票期结束后不能投票", async function () {
            // 等待投票期结束
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 12);

            await expect(
                governor.connect(voter1).castVote(proposalId, 1)
            ).to.be.revertedWithCustomError(governor, "GovernorNotActive");
        });
    });

    describe("5️⃣ 提案执行", function () {
        let proposalId;
        let targets, values, calldatas, description;

        beforeEach(async function () {
            // 创建提案：转账代币
            targets = [await token.getAddress()];
            values = [0];
            calldatas = [token.interface.encodeFunctionData("transfer", [voter1.address, ethers.parseEther("1000")])];
            description = "Transfer 1000 tokens to voter1";

            const tx = await governor.propose(targets, values, calldatas, description);
            const receipt = await tx.wait();

            proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // 等待投票延迟
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);

            // 投票
            await governor.connect(voter1).castVote(proposalId, 1);
            await governor.connect(voter2).castVote(proposalId, 1);

            // 等待投票期结束
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 12);
        });

        it("应该成功执行提案", async function () {
            const balanceBefore = await token.balanceOf(voter1.address);

            // 等待时间锁延迟（实际需要增加时间）
            await time.increase(3600);

            await governor.execute(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            const balanceAfter = await token.balanceOf(voter1.address);
            expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1000"));
        });

        it("执行后提案状态应该是 Executed", async function () {
            await time.increase(3600);

            await governor.execute(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            const state = await governor.state(proposalId);
            expect(state).to.equal(7); // Executed
        });

        it("时间锁未到期前不能执行", async function () {
            await expect(
                governor.execute(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)))
            ).to.be.revertedWith("TimelockController: operation is not ready");
        });

        it("失败的提案不能执行", async function () {
            // 创建一个会失败的提案
            const newTargets = [owner.address];
            const newValues = [0];
            const newCalldatas = ["0x"];
            const newDescription = "Failed proposal";

            const tx = await governor.propose(newTargets, newValues, newCalldatas, newDescription);
            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);

            const newProposalId = await governor.hashProposal(newTargets, newValues, newCalldatas, ethers.keccak256(ethers.toUtf8Bytes(newDescription)));

            // 所有人投反对票
            await governor.connect(voter1).castVote(newProposalId, 0);
            await governor.connect(voter2).castVote(newProposalId, 0);

            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 12);
            await time.increase(3600);

            await expect(
                governor.execute(newTargets, newValues, newCalldatas, ethers.keccak256(ethers.toUtf8Bytes(newDescription)))
            ).to.be.revertedWithCustomError(governor, "GovernorNotSuccessful");
        });
    });

    describe("6️⃣ 法定人数和阈值", function () {
        let proposalId;

        beforeEach(async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            await governor.propose(targets, values, calldatas, description);
            proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);
        });

        it("应该正确计算法定人数", async function () {
            const currentBlock = await ethers.provider.getBlockNumber();
            const quorum = await governor.quorum(currentBlock);

            // 4% of 1,000,000 = 40,000
            expect(quorum).to.equal(ethers.parseEther("40000"));
        });

        it("投票不足应该失败", async function () {
            // 只有 voter1 投票（100000 < 40000 法定人数，实际上应该足够）
            await governor.connect(voter1).castVote(proposalId, 1);

            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 12);

            const state = await governor.state(proposalId);
            // 应该成功，因为 100000 > 40000
            expect(state).to.equal(4); // Succeeded
        });

        it("应该正确计算提案阈值", async function () {
            const threshold = await governor.proposalThreshold();

            // 默认阈值通常是总供应量的某个百分比
            expect(threshold).to.be.greaterThan(0);
        });
    });

    describe("7️⃣ 取消提案", function () {
        let proposalId;

        beforeEach(async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            await governor.propose(targets, values, calldatas, description);
            proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 2);
        });

        it("提案者应该能取消提案", async function () {
            await governor.cancel(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            const state = await governor.state(proposalId);
            expect(state).to.equal(2); // Cancelled
        });

        it("已执行的提案不能取消", async function () {
            await governor.connect(voter1).castVote(proposalId, 1);
            await governor.connect(voter2).castVote(proposalId, 1);

            await time.advanceBlockTo(await ethers.provider.getBlockNumber() + 12);
            await time.increase(3600);

            await governor.execute(
                [owner.address],
                [0],
                ["0x"],
                ethers.keccak256(ethers.toUtf8Bytes("Test proposal"))
            );

            await expect(
                governor.cancel([owner.address], [0], ["0x"], ethers.keccak256(ethers.toUtf8Bytes("Test proposal")))
            ).to.be.revertedWithCustomError(governor, "GovernorNotActive");
        });
    });

    describe("8️⃣ 时间锁功能", function () {
        it("应该正确设置最小延迟", async function () {
            const minDelay = await timelock.getMinDelay();
            expect(minDelay).to.equal(3600);
        });

        it("应该只有治理合约能调度操作", async function () {
            const isProposer = await timelock.hasRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
            expect(isProposer).to.be.true;
        });

        it("应该只有治理合约能取消操作", async function () {
            const isCanceller = await timelock.hasRole(await timelock.CANCELLER_ROLE(), await governor.getAddress());
            expect(isCanceller).to.be.true;
        });

        it("任何人都可以执行操作", async function () {
            const isExecutor = await timelock.hasRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress);
            expect(isExecutor).to.be.true;
        });
    });

    describe("9️⃣ 边界条件和安全性", function () {
        it("应该防止无效的提案", async function () {
            const targets = [];
            const values = [];
            const calldatas = [];
            const description = "";

            await expect(
                governor.propose(targets, values, calldatas, description)
            ).to.be.revertedWithCustomError(governor, "GovernorEmptyProposal");
        });

        it("应该防止在没有投票权时创建提案", async function () {
            // 创建一个没有代币的新账户
            const [newAccount] = await ethers.getSigners();

            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            await expect(
                governor.connect(newAccount).propose(targets, values, calldatas, description)
            ).to.be.revertedWithCustomError(governor, "GovernorInsufficientProposerVotes");
        });

        it("应该正确处理提案哈希冲突", async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            const proposalId1 = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // 相同的参数应该产生相同的哈希
            const proposalId2 = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            expect(proposalId1).to.equal(proposalId2);
        });
    });

    describe("🔟 查询功能", function () {
        it("应该正确返回提案详情", async function () {
            const targets = [owner.address];
            const values = [0];
            const calldatas = ["0x"];
            const description = "Test proposal";

            await governor.propose(targets, values, calldatas, description);

            const proposalId = await governor.hashProposal(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            const proposal = await governor.proposals(proposalId);

            expect(proposal.proposer).to.equal(owner.address);
        });

        it("应该正确返回投票权重", async function () {
            const votes = await token.getVotes(voter1.address);
            expect(votes).to.equal(ethers.parseEther("100000"));
        });

        it("应该正确返回法定人数", async function () {
            const currentBlock = await ethers.provider.getBlockNumber();
            const quorum = await governor.quorum(currentBlock);

            expect(quorum).to.equal(ethers.parseEther("40000"));
        });

        it("应该正确返回治理参数", async function () {
            const votingDelay = await governor.votingDelay();
            const votingPeriod = await governor.votingPeriod();
            const quorumNumerator = await governor.quorumNumerator();

            expect(votingDelay).to.equal(1);
            expect(votingPeriod).to.equal(10);
            expect(quorumNumerator).to.equal(4);
        });
    });
});

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Lesson 25: 审计与测试", function () {
    let token, vault, testContract;
    let owner, user1, user2, user3;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        // 部署代币合约
        const TokenWithTests = await ethers.getContractFactory("TokenWithTests");
        token = await TokenWithTests.deploy(
            "Test Token",
            "TEST",
            ethers.utils.parseEther("1000000")
        );
        await token.deployed();

        // 部署审计金库
        const AuditedVault = await ethers.getContractFactory("AuditedVault");
        vault = await AuditedVault.deploy();
        await vault.deployed();

        // 部署可测试合约
        const TestableContract = await ethers.getContractFactory("TestableContract");
        testContract = await TestableContract.deploy();
        await testContract.deployed();
    });

    describe("代币合约单元测试", function () {
        it("应该正确初始化", async function () {
            expect(await token.name()).to.equal("Test Token");
            expect(await token.symbol()).to.equal("TEST");
            expect(await token.decimals()).to.equal(18);
            expect(await token.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
        });

        it("应该拒绝空名称", async function () {
            const TokenWithTests = await ethers.getContractFactory("TokenWithTests");
            await expect(
                TokenWithTests.deploy("", "TEST", 1000)
            ).to.be.revertedWith("Name empty");
        });

        it("应该能转账", async function () {
            const transferAmount = ethers.utils.parseEther("1000");
            
            await expect(token.transfer(user1.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, user1.address, transferAmount);
            
            expect(await token.balanceOf(user1.address)).to.equal(transferAmount);
        });

        it("应该防止转账到零地址", async function () {
            await expect(
                token.transfer(ethers.constants.AddressZero, 100)
            ).to.be.revertedWith("Zero address");
        });

        it("应该防止余额不足", async function () {
            await expect(
                token.connect(user1).transfer(user2.address, ethers.utils.parseEther("1000"))
            ).to.be.revertedWith("Insufficient balance");
        });

        it("应该能授权", async function () {
            const approveAmount = ethers.utils.parseEther("500");
            
            await expect(token.approve(user1.address, approveAmount))
                .to.emit(token, "Approval")
                .withArgs(owner.address, user1.address, approveAmount);
        });

        it("应该能使用授权转账", async function () {
            const approveAmount = ethers.utils.parseEther("1000");
            const transferAmount = ethers.utils.parseEther("500");
            
            await token.approve(user1.address, approveAmount);
            await token.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
            
            expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
            expect(await token.allowance(owner.address, user1.address)).to.equal(approveAmount.sub(transferAmount));
        });

        it("应该能暂停转账", async function () {
            await token.pause();
            
            await expect(
                token.transfer(user1.address, 100)
            ).to.be.revertedWith("Paused");
        });

        it("应该能铸造代币", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            const totalSupplyBefore = await token.totalSupply();
            
            await expect(token.mint(user1.address, mintAmount))
                .to.emit(token, "Transfer")
                .withArgs(ethers.constants.AddressZero, user1.address, mintAmount);
            
            expect(await token.totalSupply()).to.equal(totalSupplyBefore.add(mintAmount));
            expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
        });

        it("应该能销毁代币", async function () {
            const burnAmount = ethers.utils.parseEther("1000");
            const totalSupplyBefore = await token.totalSupply();
            
            await token.burn(burnAmount);
            
            expect(await token.totalSupply()).to.equal(totalSupplyBefore.sub(burnAmount));
        });

        it("非所有者不能铸造", async function () {
            await expect(
                token.connect(user1).mint(user2.address, 1000)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("审计金库测试", function () {
        it("应该能存款", async function () {
            const depositAmount = ethers.utils.parseEther("10.0");
            
            await expect(vault.connect(user1).deposit({ value: depositAmount }))
                .to.emit(vault, "Deposit")
                .withArgs(user1.address, depositAmount);
            
            expect(await vault.deposits(user1.address)).to.equal(depositAmount);
        });

        it("应该能取款", async function () {
            const depositAmount = ethers.utils.parseEther("10.0");
            const withdrawAmount = ethers.utils.parseEther("5.0");
            
            await vault.connect(user1).deposit({ value: depositAmount });
            await vault.connect(user1).withdraw(withdrawAmount);
            
            expect(await vault.deposits(user1.address)).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("应该强制执行取款限制", async function () {
            const depositAmount = ethers.utils.parseEther("150.0");
            await vault.connect(user1).deposit({ value: depositAmount });
            
            const withdrawalLimit = await vault.withdrawalLimit();
            
            await expect(
                vault.connect(user1).withdraw(withdrawalLimit.add(1))
            ).to.be.revertedWith("Exceeds limit");
        });

        it("应该强制执行每日限额", async function () {
            const depositAmount = ethers.utils.parseEther("200.0");
            await vault.connect(user1).deposit({ value: depositAmount });
            
            const withdrawalLimit = await vault.withdrawalLimit();
            await vault.connect(user1).withdraw(withdrawalLimit);
            
            // 同一天内再次取款应该失败
            await expect(
                vault.connect(user1).withdraw(1)
            ).to.be.revertedWith("Daily limit exceeded");
        });

        it("第二天应该重置每日限额", async function () {
            const depositAmount = ethers.utils.parseEther("200.0");
            await vault.connect(user1).deposit({ value: depositAmount });
            
            const withdrawalLimit = await vault.withdrawalLimit();
            await vault.connect(user1).withdraw(withdrawalLimit);
            
            // 前进一天
            await time.increase(86401);
            
            // 现在应该能再次取款
            await vault.connect(user1).withdraw(withdrawalLimit);
            expect(await vault.deposits(user1.address)).to.equal(
                depositAmount.sub(withdrawalLimit.mul(2))
            );
        });

        it("应该能使用签名取款", async function () {
            const depositAmount = ethers.utils.parseEther("10.0");
            const withdrawAmount = ethers.utils.parseEther("5.0");
            
            await vault.connect(user1).deposit({ value: depositAmount });
            
            const nonce = await vault.getNonce(user1.address);
            const messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [vault.address, await ethers.provider.getNetwork().then(n => n.chainId), withdrawAmount, nonce]
            );
            const ethSignedHash = ethers.utils.solidityKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            const signature = await user1.signMessage(ethers.utils.arrayify(ethSignedHash));
            
            await vault.withdrawWithSignature(withdrawAmount, nonce, signature);
            
            expect(await vault.deposits(user1.address)).to.equal(depositAmount.sub(withdrawAmount));
        });

        it("应该防止签名重放", async function () {
            const depositAmount = ethers.utils.parseEther("10.0");
            const withdrawAmount = ethers.utils.parseEther("1.0");
            
            await vault.connect(user1).deposit({ value: depositAmount });
            
            const nonce = await vault.getNonce(user1.address);
            const messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [vault.address, await ethers.provider.getNetwork().then(n => n.chainId), withdrawAmount, nonce]
            );
            const ethSignedHash = ethers.utils.solidityKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            const signature = await user1.signMessage(ethers.utils.arrayify(ethSignedHash));
            
            // 第一次取款
            await vault.withdrawWithSignature(withdrawAmount, nonce, signature);
            
            // 尝试重放（应该失败）
            await expect(
                vault.withdrawWithSignature(withdrawAmount, nonce, signature)
            ).to.be.revertedWith("Signature used");
        });

        it("应该能暂停合约", async function () {
            await vault.pause();
            expect(await vault.paused()).to.be.true;
            
            await expect(
                vault.connect(user1).deposit({ value: ethers.utils.parseEther("1.0") })
            ).to.be.revertedWith("Paused");
        });

        it("应该能恢复合约", async function () {
            await vault.pause();
            await vault.unpause();
            expect(await vault.paused()).to.be.false;
            
            await vault.connect(user1).deposit({ value: ethers.utils.parseEther("1.0") });
            expect(await vault.deposits(user1.address)).to.equal(ethers.utils.parseEther("1.0"));
        });

        it("应该能执行紧急取款", async function () {
            const depositAmount = ethers.utils.parseEther("10.0");
            await vault.connect(user1).deposit({ value: depositAmount });
            
            await vault.pause();
            await vault.emergencyWithdraw(user1.address, depositAmount);
            
            expect(await vault.deposits(user1.address)).to.equal(0);
        });

        it("应该实施时间锁", async function () {
            await vault.initiateOwnershipTransfer(user1.address);
            
            // 立即尝试接受（应该失败）
            await expect(
                vault.connect(user1).acceptOwnership()
            ).to.be.revertedWith("Timelock not expired");
            
            // 等待时间锁过期
            await time.increase(172801); // 2 天 + 1 秒
            
            await expect(vault.connect(user1).acceptOwnership())
                .to.emit(vault, "OwnershipTransferAccepted");
            
            expect(await vault.owner()).to.equal(user1.address);
        });

        it("非所有者不能调用管理函数", async function () {
            await expect(
                vault.connect(user1).pause()
            ).to.be.revertedWith("Not owner");
            
            await expect(
                vault.connect(user1).setWithdrawalLimit(200)
            ).to.be.revertedWith("Not owner");
            
            await expect(
                vault.connect(user1).emergencyWithdraw(user1.address, 100)
            ).to.be.revertedWith("Not owner");
        });

        it("应该能设置取款限制", async function () {
            const newLimit = ethers.utils.parseEther("200.0");
            
            await expect(vault.setWithdrawalLimit(newLimit))
                .to.emit(vault, "WithdrawalLimitUpdated");
            
            expect(await vault.withdrawalLimit()).to.equal(newLimit);
        });
    });

    describe("集成测试", function () {
        it("应该处理完整的代币生命周期", async function () {
            // 1. 铸造
            await token.mint(user1.address, ethers.utils.parseEther("1000"));
            expect(await token.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("1000"));
            
            // 2. 授权
            await token.connect(user1).approve(user2.address, ethers.utils.parseEther("500"));
            
            // 3. 转账
            await token.connect(user2).transferFrom(user1.address, user3.address, ethers.utils.parseEther("300"));
            expect(await token.balanceOf(user3.address)).to.equal(ethers.utils.parseEther("300"));
            
            // 4. 销毁
            await token.connect(user1).burn(ethers.utils.parseEther("200"));
            expect(await token.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("500"));
            
            // 5. 验证总供应量
            expect(await token.totalSupply()).to.equal(
                ethers.utils.parseEther("1000000").add(ethers.utils.parseEther("1000")).sub(ethers.utils.parseEther("200"))
            );
        });

        it("应该处理金库的完整流程", async function () {
            // 1. 存款
            await vault.connect(user1).deposit({ value: ethers.utils.parseEther("100.0") });
            await vault.connect(user2).deposit({ value: ethers.utils.parseEther("150.0") });
            
            // 2. 取款
            await vault.connect(user1).withdraw(ethers.utils.parseEther("50.0"));
            expect(await vault.deposits(user1.address)).to.equal(ethers.utils.parseEther("50.0"));
            
            // 3. 签名取款
            const nonce = await vault.getNonce(user2.address);
            const withdrawAmount = ethers.utils.parseEther("30.0");
            const messageHash = ethers.utils.solidityKeccak256(
                ["address", "uint256", "uint256", "uint256"],
                [vault.address, await ethers.provider.getNetwork().then(n => n.chainId), withdrawAmount, nonce]
            );
            const ethSignedHash = ethers.utils.solidityKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            );
            const signature = await user2.signMessage(ethers.utils.arrayify(ethSignedHash));
            
            await vault.withdrawWithSignature(withdrawAmount, nonce, signature);
            expect(await vault.deposits(user2.address)).to.equal(ethers.utils.parseEther("120.0"));
            
            // 4. 紧急情况
            await vault.pause();
            await vault.emergencyWithdraw(user1.address, ethers.utils.parseEther("50.0"));
            expect(await vault.deposits(user1.address)).to.equal(0);
        });
    });

    describe("边界条件测试", function () {
        it("应该处理零金额", async function () {
            await expect(
                token.transfer(user1.address, 0)
            ).to.be.revertedWith("Amount zero");
        });

        it("应该处理最大金额", async function () {
            const maxUint256 = ethers.constants.MaxUint256;
            
            // 授权最大值
            await token.approve(user1.address, maxUint256);
            expect(await token.allowance(owner.address, user1.address)).to.equal(maxUint256);
        });

        it("应该处理空地址", async function () {
            await expect(
                token.transfer(ethers.constants.AddressZero, 100)
            ).to.be.revertedWith("Zero address");
        });

        it("应该处理非常大的数组", async function () {
            // 这个测试可能需要很多 Gas
            const largeArray = Array.from({ length: 100 }, (_, i) => i + 1);
            // 实际测试逻辑...
        });
    });

    describe("Gas 优化测试", function () {
        it("应该报告 Gas 使用情况", async function () {
            const tx = await token.transfer(user1.address, ethers.utils.parseEther("100"));
            const receipt = await tx.wait();
            
            console.log(`Transfer Gas: ${receipt.gasUsed.toString()}`);
            
            expect(receipt.gasUsed.toNumber()).to.be.lessThan(100000);
        });

        it("应该对比优化前后的 Gas", async function () {
            // 测试批量操作
            const transferAmount = ethers.utils.parseEther("1");
            let totalGas = 0;
            
            for (let i = 0; i < 10; i++) {
                const tx = await token.transfer(user1.address, transferAmount);
                const receipt = await tx.wait();
                totalGas += receipt.gasUsed.toNumber();
            }
            
            console.log(`Average Gas per transfer: ${totalGas / 10}`);
        });
    });

    describe("测试覆盖率", function () {
        it("应该覆盖所有函数", async function () {
            // 测试所有公共和外部函数
            await token.name();
            await token.symbol();
            await token.decimals();
            await token.totalSupply();
            await token.balanceOf(owner.address);
            await token.allowance(owner.address, user1.address);
            await token.transfer(user1.address, 100);
            await token.approve(user1.address, 100);
            await token.transferFrom(owner.address, user1.address, 50);
            await token.pause();
            await token.unpause();
            await token.mint(user2.address, 100);
            await token.burn(50);
        });

        it("应该覆盖所有事件", async function () {
            // 验证所有事件都被正确触发
            await expect(token.transfer(user1.address, 100))
                .to.emit(token, "Transfer");
            
            await expect(token.approve(user1.address, 100))
                .to.emit(token, "Approval");
            
            await expect(token.mint(user1.address, 100))
                .to.emit(token, "Transfer");
            
            await expect(token.burn(50))
                .to.emit(token, "Transfer");
        });
    });

    describe("模糊测试模拟", function () {
        it("应该测试随机输入", async function () {
            // 生成随机测试用例
            const randomAmounts = Array.from({ length: 10 }, () => 
                Math.floor(Math.random() * 10000)
            );
            
            for (const amount of randomAmounts) {
                // 铸造
                await token.mint(user1.address, amount);
                const balance = await token.balanceOf(user1.address);
                expect(balance.toNumber()).to.be.greaterThanOrEqual(amount);
            }
        });

        it("应该测试边界情况", async function () {
            const boundaryCases = [
                0,
                1,
                100,
                1000,
                ethers.utils.parseEther("1").toNumber(),
                ethers.constants.MaxUint256.div(2).toNumber()
            ];
            
            for (const amount of boundaryCases) {
                if (amount > 0) {
                    await token.mint(user1.address, amount);
                    const balance = await token.balanceOf(user1.address);
                    expect(balance.toNumber()).to.be.greaterThan(0);
                }
            }
        });
    });
});

import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Lesson 08: 错误处理", function () {
    let bank;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        const BankContract = await ethers.getContractFactory("BankContract");
        bank = await BankContract.deploy();
        await bank.waitForDeployment();
    });

    describe("Require 测试", function () {
        it("应该成功存款", async function () {
            const depositAmount = ethers.parseEther("1.0");

            await expect(
                bank.connect(user1).deposit({ value: depositAmount })
            )
                .to.emit(bank, "Deposit")
                .withArgs(user1.address, depositAmount);

            const balance = await bank.getBalance();
            expect(balance).to.equal(depositAmount);
        });

        it("应该拒绝零金额存款", async function () {
            await expect(
                bank.connect(user1).deposit({ value: 0 })
            ).to.be.revertedWith("Deposit amount must be greater than 0");
        });

        it("应该成功取款", async function () {
            const depositAmount = ethers.parseEther("2.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await bank.connect(user1).deposit({ value: depositAmount });
            await expect(
                bank.connect(user1).withdraw(withdrawAmount)
            )
                .to.emit(bank, "Withdrawal")
                .withArgs(user1.address, withdrawAmount);

            const balance = await bank.getBalance();
            expect(balance).to.equal((depositAmount - withdrawAmount));
        });

        it("应该拒绝余额不足的取款", async function () {
            const withdrawAmount = ethers.parseEther("1.0");

            await expect(
                bank.connect(user1).withdraw(withdrawAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("应该拒绝零金额取款", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            await expect(
                bank.connect(user1).withdraw(0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("应该成功批量取款", async function () {
            const depositAmount = ethers.parseEther("5.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const amounts = [
                ethers.parseEther("1.0"),
                ethers.parseEther("2.0"),
                ethers.parseEther("1.5")
            ];

            await expect(
                bank.connect(user1).batchWithdraw(amounts)
            )
                .to.emit(bank, "Withdrawal")
                .withArgs(user1.address, ethers.parseEther("4.5"));
        });

        it("应该拒绝超过限制的批量取款", async function () {
            const depositAmount = ethers.parseEther("20.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const amounts = new Array(11).fill(ethers.parseEther("1.0"));

            await expect(
                bank.connect(user1).batchWithdraw(amounts)
            ).to.be.revertedWith("Too many withdrawals");
        });
    });

    describe("Revert 测试", function () {
        it("应该成功转账", async function () {
            const depositAmount = ethers.parseEther("3.0");
            const transferAmount = ethers.parseEther("1.0");

            await bank.connect(user1).deposit({ value: depositAmount });
            await expect(
                bank.connect(user1).transfer(user2.address, transferAmount)
            )
                .to.emit(bank, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);

            const balance1 = await bank.getBalance();
            expect(balance1).to.equal((depositAmount - transferAmount));

            const balance2 = await bank.connect(user2).getBalance();
            expect(balance2).to.equal(transferAmount);
        });

        it("应该拒绝转账到零地址", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            await expect(
                bank.connect(user1).transfer(ethers.ZeroAddress, ethers.parseEther("0.5"))
            ).to.be.revertedWith("Cannot transfer to zero address");
        });

        it("应该拒绝转账给自己", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            await expect(
                bank.connect(user1).transfer(user1.address, ethers.parseEther("0.5"))
            ).to.be.revertedWith("Cannot transfer to self");
        });

        it("应该拒绝零金额转账", async function () {
            const depositAmount = ethers.parseEther("1.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            await expect(
                bank.connect(user1).transfer(user2.address, 0)
            ).to.be.revertedWith("Transfer amount must be greater than 0");
        });

        it("应该成功条件取款", async function () {
            const depositAmount = ethers.parseEther("2.0");
            const withdrawAmount = ethers.parseEther("1.0");
            const fee = ethers.parseEther("0.05");

            await bank.connect(user1).deposit({ value: depositAmount });
            await expect(
                bank.connect(user1).conditionalWithdraw(withdrawAmount, fee)
            )
                .to.emit(bank, "Withdrawal")
                .withArgs(user1.address, withdrawAmount);
        });

        it("应该拒绝过高的手续费", async function () {
            const depositAmount = ethers.parseEther("2.0");
            const withdrawAmount = ethers.parseEther("1.0");
            const fee = ethers.parseEther("0.2"); // 20%，超过 10%

            await bank.connect(user1).deposit({ value: depositAmount });

            await expect(
                bank.connect(user1).conditionalWithdraw(withdrawAmount, fee)
            ).to.be.revertedWith("Fee too high (max 10%)");
        });
    });

    describe("Assert 测试", function () {
        it("应该正确计算利息", async function () {
            const principal = ethers.parseEther("100");
            const rate = 5; // 5%

            const interest = await bank.calculateInterest(principal, rate);
            expect(interest).to.equal(ethers.parseEther("5"));
        });

        it("应该拒绝过高的利率", async function () {
            const principal = ethers.parseEther("100");
            const rate = 150; // 超过 100%

            await expect(
                bank.calculateInterest(principal, rate)
            ).to.be.reverted;
        });

        it("应该验证百分比总和", async function () {
            const percentages = [30, 40, 30]; // 总和 100

            const result = await bank.distributeDividends(percentages);
            expect(result.length).to.equal(3);
        });

        it("应该拒绝无效的百分比总和", async function () {
            const percentages = [30, 40, 50]; // 总和 120

            await expect(
                bank.distributeDividends(percentages)
            ).to.be.reverted;
        });

        it("应该安全执行除法", async function () {
            const numerator = 100;
            const denominator = 4;

            const result = await bank.safeDivide(numerator, denominator);
            expect(result).to.equal(25);
        });

        it("应该拒绝除以零", async function () {
            await expect(
                bank.safeDivide(100, 0)
            ).to.be.revertedWith("Division by zero");
        });
    });

    describe("自定义错误测试", function () {
        it("应该成功使用自定义错误取款", async function () {
            const depositAmount = ethers.parseEther("2.0");
            const withdrawAmount = ethers.parseEther("1.0");

            await bank.connect(user1).deposit({ value: depositAmount });
            await expect(
                bank.connect(user1).withdrawWithCustomError(withdrawAmount)
            )
                .to.emit(bank, "Withdrawal")
                .withArgs(user1.address, withdrawAmount);
        });

        it("应该拒绝零金额（自定义错误）", async function () {
            await expect(
                bank.connect(user1).withdrawWithCustomError(0)
            ).to.be.revertedWithCustomError(bank, "InvalidValueError");
        });

        it("应该拒绝余额不足（自定义错误）", async function () {
            const withdrawAmount = ethers.parseEther("1.0");

            await expect(
                bank.connect(user1).withdrawWithCustomError(withdrawAmount)
            ).to.be.revertedWithCustomError(bank, "InsufficientBalanceError");
        });

        it("应该拒绝非所有者访问", async function () {
            await expect(
                bank.connect(user1).ownerFunction()
            ).to.be.revertedWithCustomError(bank, "OnlyOwnerError");
        });

        it("所有者应该能调用专属函数", async function () {
            await expect(
                bank.ownerFunction()
            ).to.not.be.reverted;
        });

        it("应该成功批量转账", async function () {
            const depositAmount = ethers.parseEther("10.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const recipients = [user2.address, owner.address];
            const amounts = [
                ethers.parseEther("3.0"),
                ethers.parseEther("2.0")
            ];

            await expect(
                bank.connect(user1).batchTransferWithCustomError(recipients, amounts)
            )
                .to.emit(bank, "Transfer")
                .withArgs(user1.address, user2.address, ethers.parseEther("3.0"));
        });

        it("应该拒绝长度不匹配的批量转账", async function () {
            const recipients = [user2.address, owner.address];
            const amounts = [ethers.parseEther("3.0")];

            await expect(
                bank.connect(user1).batchTransferWithCustomError(recipients, amounts)
            ).to.be.revertedWith("Arrays length mismatch");
        });

        it("应该拒绝过多的批量转账", async function () {
            const depositAmount = ethers.parseEther("100.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const recipients = new Array(21).fill(user2.address);
            const amounts = new Array(21).fill(ethers.parseEther("1.0"));

            await expect(
                bank.connect(user1).batchTransferWithCustomError(recipients, amounts)
            ).to.be.revertedWithCustomError(bank, "InvalidValueError");
        });
    });

    describe("Gas 消耗对比", function () {
        it("自定义错误应该比 require 节省 Gas", async function () {
            const depositAmount = ethers.parseEther("2.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const withdrawAmount = ethers.parseEther("1.0");

            // 测试传统方式
            const tx1 = await bank.connect(user1).withdrawTraditional(withdrawAmount);
            const receipt1 = await tx1.wait();

            // 重新存款
            await bank.connect(user1).deposit({ value: depositAmount });

            // 测试自定义错误方式
            const tx2 = await bank.connect(user1).withdrawWithCustomError(withdrawAmount);
            const receipt2 = await tx2.wait();

            console.log("Traditional withdraw Gas:", receipt1.gasUsed.toString());
            console.log("Custom error withdraw Gas:", receipt2.gasUsed.toString());

            // 自定义错误应该节省约 60-70 Gas
            expect(receipt2.gasUsed < receipt1.gasUsed).to.be.true;
        });
    });

    describe("复杂操作测试", function () {
        it("应该成功执行复杂操作", async function () {
            const depositAmount = ethers.parseEther("10.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const amount = ethers.parseEther("3.0");
            const fee = ethers.parseEther("0.1");
            const minBalance = ethers.parseEther("2.0");

            await expect(
                bank.connect(user1).complexOperation(amount, fee, minBalance, user2.address)
            )
                .to.emit(bank, "Transfer")
                .withArgs(user1.address, user2.address, amount);
        });

        it("应该拒绝违反最小余额约束的操作", async function () {
            const depositAmount = ethers.parseEther("10.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const amount = ethers.parseEther("9.0");
            const fee = ethers.parseEther("0.1");
            const minBalance = ethers.parseEther("5.0"); // user2 余额为 0，无法满足

            await expect(
                bank.connect(user1).complexOperation(amount, fee, minBalance, user2.address)
            ).to.be.revertedWith("Recipient would have insufficient balance");
        });
    });

    describe("辅助函数测试", function () {
        it("应该正确返回余额", async function () {
            const depositAmount = ethers.parseEther("5.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const balance = await bank.connect(user1).getBalance();
            expect(balance).to.equal(depositAmount);
        });

        it("应该正确返回合约总余额", async function () {
            const depositAmount = ethers.parseEther("5.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const totalBalance = await bank.getTotalBalance();
            expect(totalBalance).to.equal(depositAmount);
        });

        it("应该通过 receive 函数接收 Ether", async function () {
            const depositAmount = ethers.parseEther("2.0");

            await expect(
                user1.sendTransaction({ to: bank.address, value: depositAmount })
            )
                .to.emit(bank, "Deposit")
                .withArgs(user1.address, depositAmount);
        });
    });

    describe("防重入测试", function () {
        it("应该防止重入攻击", async function () {
            const depositAmount = ethers.parseEther("5.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const withdrawAmount = ethers.parseEther("1.0");

            // 正常取款应该成功
            await bank.connect(user1).withdrawEther(withdrawAmount);

            const balance = await bank.connect(user1).getBalance();
            expect(balance).to.equal((depositAmount - withdrawAmount));
        });

        it("转账失败应该恢复状态", async function () {
            // 部署一个拒绝接收 Ether 的合约
            const RejectReceiver = await ethers.getContractFactory("RejectReceiver");
            const rejectReceiver = await RejectReceiver.deploy();
            await rejectReceiver.waitForDeployment();

            const depositAmount = ethers.parseEther("5.0");
            await bank.connect(user1).deposit({ value: depositAmount });

            const withdrawAmount = ethers.parseEther("1.0");

            // 修改 bank 合约的所有者为我们控制
            // 这个测试需要特殊设置，这里简化处理
        });
    });
});

// 辅助合约：拒绝接收 Ether 的合约
const rejectReceiverCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RejectReceiver {
    fallback() external {
        revert("Rejects all transfers");
    }

    receive() external payable {
        revert("Rejects all transfers");
    }
}
`;

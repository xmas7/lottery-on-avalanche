const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Lottery contract test:', () => {
  let lotteryFactory;
  let lottery;

  let payTokenFactory;
  let payToken;

  // accounts
  let account1;
  let account2;

  // lottery constructor params
  let lotteryPayTokenAddr;
  let lotteryPayTokenMinAmount;
  let lotteryTreasurAddr;
  let lotteryRewardAmounts;

  before(async () => {
    [owner, account1, account2, account3, treasury, rewardDistributor] = await ethers.getSigners();

    // prepare mock erc20 token contract
    payTokenFactory = await ethers.getContractFactory('MockERC20');
    payToken = await payTokenFactory.deploy(
      "mock Test Token",
      "mTTK",
      "100000000000000000000000000",
    );

    // prepare lottery contract
    lotteryPayTokenAddr = payToken.address
    lotteryPayTokenMinAmount = ethers.utils.parseEther("100");
    lotteryTreasurAddr = treasury.address
    lotteryRewardAmounts = [
      ethers.utils.parseEther("50"),
      ethers.utils.parseEther("30"),
      ethers.utils.parseEther("20")
    ]

    lotteryFactory = await ethers.getContractFactory('Lottery');
    lottery = await lotteryFactory.deploy(
      lotteryPayTokenAddr, // payToken address
      lotteryPayTokenMinAmount, // 100 minAmount of payToken
      treasury.address, // treasury address
      rewardDistributor.address, // rewardDistributor address
      lotteryRewardAmounts // array of reward amounts
    );

    // mint payToken for test accounts (lottery participants)
    await payToken.connect(account1).mint("100000000000000000000000");
    await payToken.connect(account2).mint("100000000000000000000000");
    await payToken.connect(account3).mint("100000000000000000000000");
    await payToken.connect(rewardDistributor).mint("100000000000000000000000");

    // approve payToken for lottery contract
    await payToken.connect(owner).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account1).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account2).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account3).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(rewardDistributor).approve(lottery.address, "100000000000000000000000000000000");
  });

  describe('constructor function test', () => {
    it('should be success', async () => {
      const _payToken = await lottery.payToken();
      const _minAmount = await lottery.minAmount();
      const _currentLotteryId = await lottery.currentLotteryId();

      expect(_payToken).to.be.equal(payToken.address);
      expect(_minAmount).to.be.equal("100000000000000000000");
      expect(_currentLotteryId).to.be.equal("0");
    });
  });

  describe('creatLottery function test', () => {
    it('should be reverted when caller is not the owner', async () => {
      await expect(lottery.connect(account1).createLottery()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should be success when caller is the owner', async () => {
      // before tx
      const currentLotteryIdBefore = await lottery.currentLotteryId();
      // execute tx
      await lottery.connect(owner).createLottery();
      // after tx
      const currentLotteryIdAfter = await lottery.currentLotteryId();
      const activeLotteryInfo = await lottery.getLotteryInfo(currentLotteryIdAfter);

      expect(currentLotteryIdAfter).to.be.equal(currentLotteryIdBefore.add(1));
      expect(activeLotteryInfo.creator).to.be.equal(owner.address);
    });

    it('should be reverted when there is active lottery', async () => {
      await expect(lottery.connect(owner).createLottery()).to.be.revertedWith("Current lottery was not ended");
    });
  });

  describe('enterLottery function test', () => {
    it('should be reverted when caller is the owner', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("100");
      await expect(lottery.connect(owner).enterLottery(lotteryId, amount)).to.be.revertedWith("Lottery creator can't participate");
    });

    it('should be reverted when payToken amount is less than minimum amount', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("90");
      await expect(lottery.connect(owner).enterLottery(lotteryId, amount)).to.be.revertedWith("Not enough pay token!");
    });
    it('should be reverted when lottery id is not active', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("90");
      await expect(lottery.connect(owner).enterLottery(lotteryId + 1, amount)).to.be.revertedWith("Lottery is not active");
    });


    it('should be success', async () => {
      // before transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const payTokenBalanceInTreasuryBefore = await payToken.balanceOf(treasury.address);

      // execute transaction
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("100");

      await lottery.connect(account1).enterLottery(lotteryId, amount)
      // await lottery.connect(account2).enterLottery(lotteryId, amount)

      // after tx
      const lotteryInfoAfter = await lottery.getLotteryInfo(currentLotteryId);
      const payTokenBalanceInTreasuryAfter = await payToken.balanceOf(treasury.address);


      expect(lotteryInfoAfter.players.slice(-1)[0]).to.be.equal(account1.address);
      expect(payTokenBalanceInTreasuryAfter).to.be.equal(payTokenBalanceInTreasuryBefore.add(amount));
    });
  });

  describe('endLottery function test', () => {
    it('should be reverted when caller is not the owner', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      await expect(lottery.connect(account1).endLottery(lotteryId)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should be reverted when lottery id is not active', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      await expect(lottery.connect(owner).endLottery(lotteryId + 1)).to.be.revertedWith("Lottery is not active");
    });

    it('should be reverted when number of participants is less than 3', async () => {
      // execute transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      await expect(lottery.connect(owner).endLottery(lotteryId)).to.be.revertedWith("Error: less than 3 participants");
    });


    it('should be success', async () => {
      // before transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("100");
      await lottery.connect(account2).enterLottery(lotteryId, amount);
      await lottery.connect(account3).enterLottery(lotteryId, amount);

      const account1PayTokenBalBefore = await payToken.balanceOf(account1.address);
      const account2PayTokenBalBefore = await payToken.balanceOf(account2.address);
      const account3PayTokenBalBefore = await payToken.balanceOf(account3.address);
      const lotteryPayTokenBalBefore = await payToken.balanceOf(lottery.address);

      // execute transaction
      await lottery.connect(owner).endLottery(lotteryId)

      // after tx
      const lotteryInfoAfter = await lottery.getLotteryInfo(currentLotteryId);
      const account1PayTokenBalAfter = await payToken.balanceOf(account1.address);
      const account2PayTokenBalAfter = await payToken.balanceOf(account2.address);
      const account3PayTokenBalAfter = await payToken.balanceOf(account3.address);
      const winners = lotteryInfoAfter.winners;

      // account1 balance check
      if (account1.address == winners[0]) {
        expect(account1PayTokenBalAfter.sub(account1PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("50"));
      } else if (account1.address == winners[1]) {
        expect(account1PayTokenBalAfter.sub(account1PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("30"));
      } else if (account1.address == winners[2]) {
        expect(account1PayTokenBalAfter.sub(account1PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("20"));
      }

      // account2 balance check
      if (account2.address == winners[0]) {
        expect(account2PayTokenBalAfter.sub(account2PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("50"));
      } else if (account2.address == winners[1]) {
        expect(account2PayTokenBalAfter.sub(account2PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("30"));
      } else if (account2.address == winners[2]) {
        expect(account2PayTokenBalAfter.sub(account2PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("20"));
      }

      // account3 balance check
      if (account3.address == winners[0]) {
        expect(account3PayTokenBalAfter.sub(account3PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("50"));
      } else if (account3.address == winners[1]) {
        expect(account3PayTokenBalAfter.sub(account3PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("30"));
      } else if (account3.address == winners[2]) {
        expect(account3PayTokenBalAfter.sub(account3PayTokenBalBefore)).to.be.equal(ethers.utils.parseEther("20"));
      }

      expect(await lottery.currentLotteryId()).to.be.equal(currentLotteryId.add(1));
    });
  });

  describe('changeMinPayTokenAmount function test', () => {
    it('should be reverted when caller is not the owner', async () => {
      const newMinAmount = ethers.utils.parseEther("200");
      // execute transaction
      await expect(lottery.connect(account1).changeMinPayTokenAmount(newMinAmount)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should be succeeded when caller is the owner', async () => {
      const newMinAmount = ethers.utils.parseEther("200");
      // execute transaction
      await lottery.connect(owner).changeMinPayTokenAmount(newMinAmount);
      expect(await lottery.minAmount()).to.be.equal(newMinAmount);
    });
  });

  describe('changeTreasury function test', () => {
    it('should be reverted when caller is not the owner', async () => {
      // execute transaction
      await expect(lottery.connect(account1).changeTreasury(treasury.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should be succeeded when caller is the owner', async () => {
      // execute transaction
      await lottery.connect(owner).changeTreasury(treasury.address);
      expect(await lottery.treasury()).to.be.equal(treasury.address);
    });
  });

  describe('changeRewardDistributor function test', () => {
    it('should be reverted when caller is not the owner', async () => {
      // execute transaction
      await expect(lottery.connect(account1).changeRewardDistributor(rewardDistributor.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should be succeeded when caller is the owner', async () => {
      // execute transaction
      await lottery.connect(owner).changeRewardDistributor(rewardDistributor.address);
      expect(await lottery.rewardDistributor()).to.be.equal(rewardDistributor.address);
    });
  });
});

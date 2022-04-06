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

  before(async () => {
    [owner, account1, account2, account3, account4] = await ethers.getSigners();

    // prepare mock erc20 token contract
    payTokenFactory = await ethers.getContractFactory('MockERC20');
    payToken = await payTokenFactory.deploy(
      "mock Test Token",
      "mTTK",
      "100000000000000000000000000",
    );

    // prepare mock marketplace contract
    lotteryFactory = await ethers.getContractFactory('Lottery');
    lottery = await lotteryFactory.deploy(
      payToken.address,
      "100000000000000000000" // 100
    );

    // mint payToken for test accounts (lottery participants)
    await payToken.connect(account1).mint("100000000000000000000000");
    await payToken.connect(account2).mint("100000000000000000000000");
    await payToken.connect(account3).mint("100000000000000000000000");
    await payToken.connect(account4).mint("100000000000000000000000");

    // approve payToken for lottery contract
    await payToken.connect(owner).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account1).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account2).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account3).approve(lottery.address, "100000000000000000000000000000000");
    await payToken.connect(account4).approve(lottery.address, "100000000000000000000000000000000");
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
      expect(activeLotteryInfo.winner).to.be.equal(ethers.constants.AddressZero);
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

      // execute transaction
      const lotteryId = currentLotteryId.toNumber();
      const amount = ethers.utils.parseEther("100");

      await lottery.connect(account1).enterLottery(lotteryId, amount)
      // await lottery.connect(account2).enterLottery(lotteryId, amount)

      // after tx
      const lotteryInfoAfter = await lottery.getLotteryInfo(currentLotteryId);
      expect(lotteryInfoAfter.players.slice(-1)[0]).to.be.equal(account1.address);
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


    it('should be success', async () => {
      // before transaction
      const currentLotteryId = await lottery.currentLotteryId();
      const account1PayTokenBalBefore = await payToken.balanceOf(account1.address);
      const lotteryPayTokenBalBefore = await payToken.balanceOf(lottery.address);

      // execute transaction
      const lotteryId = currentLotteryId.toNumber();
      await lottery.connect(owner).endLottery(lotteryId)

      // after tx
      const lotteryInfoAfter = await lottery.getLotteryInfo(currentLotteryId);
      const account1PayTokenBalAfter = await payToken.balanceOf(account1.address);
      const lotteryPayTokenBalAfter = await payToken.balanceOf(lottery.address);

      expect(lotteryInfoAfter.winner).not.to.be.equal(ethers.constants.AddressZero);
      expect(account1PayTokenBalAfter.sub(account1PayTokenBalBefore)).to.be.equal(lotteryPayTokenBalBefore.sub(lotteryPayTokenBalAfter));
      expect(lotteryPayTokenBalAfter).to.be.equal(0);
      expect(await lottery.currentLotteryId()).to.be.equal(currentLotteryId.add(1));
    });
  });
});

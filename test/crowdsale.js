var Token = artifacts.require('COMToken');
var Crowdsale = artifacts.require('ConectumICO');
const utils = require('./helpers/Utils');

let DECIMALS = 18;

let now = () => web3.eth.getBlock(web3.eth.blockNumber).timestamp;

let min = (m) => utils.duration.minutes(m);

contract("Crowdsale", (accounts) => {
  /*
  Test exchange rate logic
  */
  it("should cost 1 ETH to get 1000 COM tokens at stage one", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );

    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    let balance = await crowdsale.balanceOf.call(accounts[1]);
    assert.equal(balance, 1000 * 10 ** DECIMALS);
  });

  it("should cost 1 ETH to get 750 COM tokens at stage two", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    utils.increaseTime(min(12));
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    let balance = await crowdsale.balanceOf.call(accounts[1]);
    assert.equal(balance, 750 * 10 ** DECIMALS);
  });

  it("should cost 1 ETH to get 500 COM tokens at stage three", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    utils.increaseTime(min(25));
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    let balance = await crowdsale.balanceOf.call(accounts[1]);
    assert.equal(balance, 500 * 10 ** DECIMALS);
  });

  /*
  Test referral logic.
  */
  it("should assign 10% of the token sale to the referrer", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    let participant = accounts[1];
    let referrer = accounts[2];
    await crowdsale.setReferrence(participant, referrer, {from: accounts[0]});
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    let pBalance = await crowdsale.balanceOf.call(participant);
    let rBalance = await crowdsale.balanceOf.call(referrer);
    assert.equal(pBalance, 1000 * 10 ** DECIMALS);
    assert.equal(rBalance, 100 * 10 ** DECIMALS);
  });

  it("should not assign 10% of the token sale to the referrer post stage 1", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    let participant = accounts[1];
    let referrer = accounts[2];
    await crowdsale.setReferrence(participant, referrer, {from: accounts[0]});
    utils.increaseTime(min(12));
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    let pBalance = await crowdsale.balanceOf.call(participant);
    let rBalance = await crowdsale.balanceOf.call(referrer);
    assert.equal(pBalance, 750 * 10 ** DECIMALS);
    assert.equal(rBalance, 0);
  });

  it("should not let override the previous reference", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    let participant = accounts[1];
    let referrer = accounts[2];
    await crowdsale.setReferrence(participant, referrer, {from: accounts[0]});
    let referrer2 = accounts[3];
    try {
      await crowdsale.setReferrence(participant, referrer2, {from: accounts[0]});
      assert(false, "should revert");
    } catch (error) {
      return utils.ensureException(error);
    }
  });

  /*
  Test the investment safeguards
  */
  it("should not accept new investments during breaks between stages", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    utils.increaseTime(min(12));
    try {
      await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
      assert(false, "should revert");
    } catch (error) {
      return utils.ensureException(error);
    }
  });

  it("should not accept new investments if the hardcap was reached", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    crowdsale.sendTransaction({value: utils.eth(2), from: accounts[1]});
    try {
      await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[2]});
      assert(false, "should revert");
    } catch (error) {
      return utils.ensureException(error);
    }
  });

  it("should not accept new investments if the ICO has expired", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(1), min(1), min(1)],
      [min(1), min(1)],
      [1000, 750, 500]
    );
    utils.increaseTime(min(6));
    try {
      await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
      assert(false, "should revert");
    } catch (error) {
      return utils.ensureException(error);
    }
  });

  /*
  Test refunds
  */
  it("should not allow refunds if the ICO goal was not reached & it is not finialized yet", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(1),
      utils.eth(2),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    try {
      await crowdsale.claimRefund({from: accounts[1]});
      assert(false, "should revert");
    } catch (error) {
      return utils.ensureException(error);
    }
  });

  it("should allow refunds if the ICO goal was not reached & it is finalized", async() => {
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(2),
      utils.eth(3),
      accounts[0],
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    utils.increaseTime(min(60));
    await crowdsale.finalize({from: accounts[0]});
    balanceBefore = (await web3.eth.getBalance(accounts[1])).toNumber();
    await crowdsale.claimRefund({from: accounts[1]});
    balanceAfter = (await web3.eth.getBalance(accounts[1])).toNumber();
    // some gas is burned when requesting the reclaim, so the balance won't be exactly as before
    assert(balanceAfter - balanceBefore > 0.9);
  });

  /*
  Test finalization
  */
  it("should transfer the raised funds into a wallet on successful ICO", async() => {
    let fundsReceiver = accounts[3];
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(2),
      utils.eth(3),
      fundsReceiver,
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[2]});
    utils.increaseTime(min(60));
    balanceBefore = (await web3.eth.getBalance(fundsReceiver)).toNumber();
    await crowdsale.finalize({from: accounts[0]});
    balanceAfter = (await web3.eth.getBalance(fundsReceiver)).toNumber();
    // "1.9" -- account for the gas burned during the transactions
    assert(balanceAfter - balanceBefore > 1.9);
  });

  it("should not transfer the raised funds into a wallet if ICO has failed", async() => {
    let fundsReceiver = accounts[3];
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(2),
      utils.eth(3),
      fundsReceiver,
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    await crowdsale.sendTransaction({value: utils.eth(1), from: accounts[1]});
    utils.increaseTime(min(60));
    balanceBefore = (await web3.eth.getBalance(fundsReceiver)).toNumber();
    await crowdsale.finalize({from: accounts[0]});
    balanceAfter = (await web3.eth.getBalance(fundsReceiver)).toNumber();
    assert.equal(balanceAfter - balanceBefore, 0);
  });

  it("should be finalized only by the owner", async() => {
    let owner = accounts[3];
    let crowdsale = await Crowdsale.new(
      now(),
      utils.eth(2),
      utils.eth(3),
      owner,
      [min(10), min(10), min(10)],
      [min(10), min(10)],
      [1000, 750, 500]
    );
    utils.increaseTime(min(60));
    try {
      await crowdsale.finalize({from: accounts[3]});
      assert(false, "should have failed");
    } catch(error) {
      return utils.ensureException(error);
    };
    await crowdsale.finalize({from: accounts[0]});
  });

});

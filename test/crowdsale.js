var Token = artifacts.require('COMToken');
var Crowdsale = artifacts.require('ConectumICO');

const ether = require('./helpers/ether.js');
const latestTime = require('./helpers/latestTime.js');
const utils = require('./helpers/utils.js');

const incTime = require('./helpers/increaseTime.js');
const increaseTimeTo = incTime.increaseTimeTo;
const increaseTime = incTime.increaseTime;
const duration = incTime.duration;

const advanceBlock = require('./helpers/advanceToBlock.js').advanceToBlock;

let DECIMALS = 18;

contract("Crowdsale", (accounts) => {

    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async () => {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(5);
        this.afterEndTime = this.endTime + duration.seconds(1);

        this.stageOneEnd = this.startTime + duration.weeks(1);
        this.stageTwoStart = this.stageOneEnd + duration.weeks(1);
        this.stageTwoEnd = this.stageTwoStart + duration.weeks(1);
        this.stageThreeStart = this.stageTwoEnd + duration.weeks(1);
        this.owner = accounts[1];
        this.alice = accounts[2];
        this.bob = accounts[3];
        this.eve = accounts[4];
        this.token = await Token.new();
        this.crowdsale = await Crowdsale.new(
            this.startTime, 
            ether(1),
            ether(2),
            this.owner,
            [duration.weeks(1), duration.weeks(1), duration.weeks(1)],
            [duration.weeks(1), duration.weeks(1)],
            [1000, 750, 500],
            this.token.address
        );
        await this.token.transferOwnership(this.crowdsale.address);
    });

    describe('exchange rates', () => {
        it("should cost 1 ETH to get 1000 COM tokens at stage one", async() => {
            await increaseTimeTo(this.startTime);
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            let balance = await this.token.balanceOf.call(this.alice);
            assert.equal(balance, 1000 * 10 ** DECIMALS);
        });

        it("should cost 1 ETH to get 750 COM tokens at stage one", async() => {
            await increaseTimeTo(this.stageOneEnd + duration.days(1));
            await this.crowdsale.incStage();
            await increaseTimeTo(this.stageTwoStart);
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            let balance = (await this.token.balanceOf.call(this.alice)).toNumber();
            assert.equal(balance, 750 * 10 ** DECIMALS);
        });

        it("should cost 1 ETH to get 500 COM tokens at stage one", async() => {
            await increaseTimeTo(this.stageOneEnd + duration.days(1));
            await this.crowdsale.incStage();
            await increaseTimeTo(this.stageTwoEnd + duration.days(1));
            await this.crowdsale.incStage();
            await increaseTimeTo(this.stageThreeStart + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            let balance = (await this.token.balanceOf.call(this.alice)).toNumber();
            assert.equal(balance, 500 * 10 ** DECIMALS);
        });
    });

    describe('referral system', async() => {
        it("should set in batches", async() => {
            const p = [
                accounts[0],
                accounts[1],
                accounts[2]
            ];
            const r = [
                accounts[2],
                accounts[0],
                accounts[1]
            ];
            await this.crowdsale.setReferenceBatch(p, r);
            await increaseTimeTo(this.startTime);
            await this.crowdsale.sendTransaction({value: ether(1), from: accounts[0]});
            let pBalance = await this.token.balanceOf.call(accounts[0]);
            let rBalance = await this.token.balanceOf.call(accounts[2]);
            assert.equal(pBalance, 1000 * 10 ** DECIMALS);
            assert.equal(rBalance, 100 * 10 ** DECIMALS);
        });

        it("should assign 10% of the token sale to the referrer", async() => {
            await increaseTimeTo(this.startTime);
            await this.crowdsale.setReference(this.alice, this.bob);
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            let pBalance = await this.token.balanceOf.call(this.alice);
            let rBalance = await this.token.balanceOf.call(this.bob);
            assert.equal(pBalance, 1000 * 10 ** DECIMALS);
            assert.equal(rBalance, 100 * 10 ** DECIMALS);
        });

        it("should not assign 10% of the token sale to the referrer post stage 1", async() => {
            await increaseTimeTo(this.startTime);
            await this.crowdsale.setReference(this.alice, this.bob);
            await increaseTimeTo(this.stageOneEnd + duration.days(1));
            await this.crowdsale.incStage();
            await increaseTimeTo(this.stageTwoStart);

            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            let pBalance = await this.token.balanceOf.call(this.alice);
            let rBalance = await this.token.balanceOf.call(this.bob);
            assert.equal(pBalance, 750 * 10 ** DECIMALS);
            assert.equal(rBalance, 0);
        });

        it("should not let override the previous reference", async() => {
            await increaseTimeTo(this.startTime);
            await this.crowdsale.setReference(this.alice, this.bob);
            let referrer2 = this.eve;
            try {
                await this.crowdsale.setReference(this.alice, this.eve);
                assert(false, "should revert");
            } catch (error) {
                return utils.ensureException(error);
            }
        });

        it("should only work during the Strong Believers stage", async() => {
            await increaseTimeTo(this.stageOneEnd + duration.days(1));
            await this.crowdsale.incStage();
            await increaseTimeTo(this.stageTwoStart);
            try {
                await this.crowdsale.setReference(this.alice, this.bob);
                assert(false, "should revert");
            } catch (error) {
                return utils.ensureException(error);
            }
        });
    });

    describe('investing', () => {
        it("should not accept below min investment", async() => {
            await increaseTimeTo(this.startTime);
            try {
                await this.crowdsale.sendTransaction({value: ether(0.01)});
                assert(false, "should revert");
            } catch (error) {
                return utils.ensureException(error);
            }
        });

        it("should not accept new investments during breaks between stages", async() => {
            await increaseTimeTo(this.stageOneEnd + duration.days(1));
            try {
              await this.crowdsale.sendTransaction({value: ether(1)});
              assert(false, "should revert");
            } catch (error) {
              return utils.ensureException(error);
            }
        });

        it("should not accept new investments if the hardcap was reached", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(2)});
            try {
              await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
              assert(false, "should revert");
            } catch (error) {
              return utils.ensureException(error);
            }
        });

        it("should not accept new investments if the ICO has expired", async() => {
            await increaseTimeTo(this.endTime);
            try {
              await this.crowdsale.sendTransaction({value: ether(1)});
              assert(false, "should revert");
            } catch (error) {
              return utils.ensureException(error);
            }
        });

        it("should not accept investments if finalized", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(0.5), from: this.alice});
            await increaseTimeTo(this.endTime + duration.days(1));
            await this.crowdsale.finalize();
            try {
                await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
                assert(false, "should revert");
            } catch (error) {
                return utils.ensureException(error);
            }
        });
    });

    describe('refunds', () => {
        it("should not allow refunds if the ICO goal was not reached & it is not finialized yet", async() => {
            await increaseTimeTo(this.startTime);
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            try {
              await this.crowdsale.claimRefund({from: this.alice});
              assert(false, "should revert");
            } catch (error) {
              return utils.ensureException(error);
            }
        });

        it("should allow refunds if the ICO goal was not reached & it is finalized", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(0.5), from: this.alice});
            await increaseTimeTo(this.endTime + duration.days(1));
            await this.crowdsale.finalize();
            let balanceBefore = (await web3.eth.getBalance(this.alice)).toNumber();
            await this.crowdsale.claimRefund({from: this.alice});
            let balanceAfter = (await web3.eth.getBalance(this.alice)).toNumber();
            // some gas is burned when requesting the reclaim, so the balance won't be exactly as before
            assert(balanceAfter - balanceBefore > 0.9);
        });
    });

    describe("finalization", () => {

        it("should transfer the raised funds into a wallet on successful ICO", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            await this.crowdsale.sendTransaction({value: ether(1), from: this.bob});
            await increaseTimeTo(this.endTime + duration.days(1));
            balanceBefore = (await web3.eth.getBalance(this.owner)).toNumber();
            await this.crowdsale.finalize();
            balanceAfter = (await web3.eth.getBalance(this.owner)).toNumber();
            // "1.9" -- account for the gas burned during the transactions
            assert(balanceAfter - balanceBefore > 1.9);
        });

        it("should not transfer the raised funds into a wallet if ICO has failed", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(0.5), from: this.alice});
            await increaseTimeTo(this.endTime + duration.days(1));
            balanceBefore = (await web3.eth.getBalance(this.owner)).toNumber();
            await this.crowdsale.finalize();
            balanceAfter = (await web3.eth.getBalance(this.owner)).toNumber();
            assert.equal(balanceAfter - balanceBefore, 0);
        });

        it("should be finalized only by the owner", async() => {
            await increaseTimeTo(this.endTime + duration.days(1));
            try {
                await this.crowdsale.finalize({from: this.alice});
                assert(false, "should have failed");
            } catch(error) {
                utils.ensureException(error);
            };
            await this.crowdsale.finalize();
        });
    });

    describe("token owning", () => {
        it('should be token owner', async() => {
            const owner = await this.token.owner();
            assert.equal(owner, this.crowdsale.address);
        });

        it("should transfer the ownership of the tokens contract to the owner of the crowdsale contract", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            await this.crowdsale.sendTransaction({value: ether(1), from: this.alice});
            await increaseTimeTo(this.endTime + duration.days(1));
            await this.crowdsale.finalize();
            assert.equal(await this.token.owner(), await this.crowdsale.owner());
        });
            
        it("should not be possible to mint new tokens after the crowdsale was finalized", async() => {
            await increaseTimeTo(this.endTime + duration.days(1));
            await this.crowdsale.finalize();
            try {
                await this.token.mint(this.alice, 1000);
                assert(false, "should revert");
            } catch (error) {
                utils.ensureException(error);
            }
        });
    });
});

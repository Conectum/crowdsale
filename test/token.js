var Token = artifacts.require('COMToken');

const ether = require('./helpers/ether.js');
const latestTime = require('./helpers/latestTime.js');
const utils = require('./helpers/utils.js');
const incTime = require('./helpers/increaseTime.js');

const increaseTimeTo = incTime.increaseTimeTo;
const increaseTime = incTime.increaseTime;
const duration = incTime.duration;

const advanceBlock = require('./helpers/advanceToBlock.js').advanceToBlock;

contract("Token", (accounts) => {
    before(async () => {
        await advanceBlock();
    });

    beforeEach(async () => {
        this.releaseDate = latestTime() + duration.weeks(1);
        let quarter = duration.years(1) / 4;
        this.q1 = this.releaseDate + quarter;
        this.q2 = this.q1 + quarter;
        this.q3 = this.q2 + quarter;
        this.q4 = this.q3 + quarter;
        this.token = await Token.new();
    });

    describe('vesting', () => {
        it('should not release before start', async() => {
            await this.token.vest(accounts[1], 1000, latestTime() + duration.weeks(1), duration.years(1));

            try {
                await this.token.releaseVested({from: accounts[1]});
                assert(false, 'should revert');
            } catch (error) {
                return utils.ensureException(error);
            }
        });

        it('should release linearly', async() => {
            var amount;
            await this.token.vest(accounts[1], 1000, this.releaseDate, duration.years(1));
            await increaseTimeTo(this.q1);
            await this.token.releaseVested({from: accounts[1]});
            amount = (await this.token.balanceOf.call(accounts[1])).toNumber();
            assert.equal(amount, 250);

            await increaseTimeTo(this.q2);
            await this.token.releaseVested({from: accounts[1]});
            amount = (await this.token.balanceOf.call(accounts[1])).toNumber();
            assert.equal(amount, 500);

            await increaseTimeTo(this.q4);
            await this.token.releaseVested({from: accounts[1]});
            amount = (await this.token.balanceOf.call(accounts[1])).toNumber();
            assert.equal(amount, 1000);
        });
    });

    describe('timelock', () => {
        it('should not release before start', async() => {
            await this.token.lock(accounts[1], 1000, this.q2);
            await increaseTimeTo(this.q1);
            try {
                await this.token.releaseTimelocked({from: accounts[1]});
                assert(false, 'should revert');
            } catch (error) {
                return utils.ensureException(error);
            }
        });

        it('should release everything after release date', async() => {
            await this.token.lock(accounts[1], 1000, this.q2);
            await increaseTimeTo(this.q3);
            await this.token.releaseTimelocked({from: accounts[1]});
            amount = (await this.token.balanceOf.call(accounts[1])).toNumber();
            assert.equal(amount, 1000);
        });
    });
});

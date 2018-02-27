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

contract("Profile", (accounts) => {
    before(async function () {
        // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async() => {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(5);
        this.afterEndTime = this.endTime + duration.seconds(1);

        this.stageOneEnd = this.startTime + duration.weeks(1);
        this.stageTwoStart = this.stageOneEnd + duration.weeks(1);
        this.stageTwoEnd = this.stageTwoStart + duration.weeks(1);
        this.stageThreeStart = this.stageTwoEnd + duration.weeks(1);

        this.owner = accounts[1];

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

    describe("COMToken", () => {
        it("should mint", async() => {
            const gas = await this.token.mint.estimateGas(accounts[1], 1000, {from: this.crowdsale.address});
            console.log('.mint: ' + gas);
        });
    });

    describe("ConectumICO", () => {
        it("should setReference", async() => {
            await increaseTimeTo(this.startTime);
            const gas = await this.crowdsale.setReference.estimateGas(accounts[2], accounts[2]);
            console.log('.setReference: ' + gas);
        });

        it("should setReferenceBatch (10)", async() => {
            const gas = await this.crowdsale.setReferenceBatch.estimateGas(
                accounts, accounts
            );
            console.log('.setReferenceBatch: ' + gas);
        });

        it("should buyTokens", async() => {
            await increaseTimeTo(this.startTime + duration.days(1));
            const gas = await web3.eth.estimateGas({to: this.crowdsale.address, value: 10**18, from: accounts[1]});
            // current: 129707
            console.log('.buyTokens: ' + gas);
        });
    });
});

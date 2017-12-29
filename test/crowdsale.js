var Token = artifacts.require('Token');
var Crowdsale = artifacts.require('Crowdsale');
const utils = require('./helpers/Utils');

let DECIMALS = 18;

let startTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // crowdsale hasn't started
let endTime = startTime + 30 * 24 * 60 * 60; // crowdsale hasn't ended
let startTimeInProgress = Math.floor(Date.now() / 1000) - 12 * 60 * 60; // ongoing crowdsale
let startTimeFinished = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // ongoing crowdsale

let reserved = 100 * 10**DECIMALS;
let softcap = 200 * 10**DECIMALS;
let hardcap = 500 * 10**DECIMALS;
// 100 tokens for 1 eth
let rate = 100;

contract("Crowdsale", (accounts) => {
    it("should cost 1 ETH to get 100 tokens", async () => {
        let token = await Token.new(reserved, startTime, softcap, hardcap);
        let crowdsale = await Crowdsale.new(token.address, '0x0', startTimeInProgress, startTime, softcap, hardcap, rate);
        await crowdsale.sendTransaction({value: web3.toWei(1, 'ether'), from: accounts[0]});
        let balance = await token.balanceOf.call(accounts[0]);
        assert.equal(balance, 100 * 10**DECIMALS);
    });

    it("should revert investment is crowdsale has not started", async() => {
        let token = await Token.new(reserved, endTime, softcap, hardcap);
        let crowdsale = await Crowdsale.new(token.address, '0x0', startTime, endTime, softcap, hardcap, rate);
        try {
            await crowdsale.sendTransaction({value: web3.toWei(1, 'ether'), from: accounts[0]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should revert investment is crowdsale has ended", async() => {
        let token = await Token.new(reserved, startTimeFinished, softcap, hardcap);
        let crowdsale = await Crowdsale.new(token.address, '0x0', startTimeFinished, startTimeFinished, softcap, hardcap, rate);
        try {
            await crowdsale.sendTransaction({value: web3.toWei(1, 'ether'), from: accounts[0]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should revert if token hard cap has been reached", async() => {
        let token = await Token.new(reserved, startTime, softcap, hardcap);
        let crowdsale = await Crowdsale.new(token.address, '0x0', startTimeInProgress, startTime, softcap, hardcap, rate);

        await crowdsale.sendTransaction({value: web3.toWei(4, 'ether'), from: accounts[0]});
        try {
            await crowdsale.sendTransaction({value: web3.toWei(1, 'ether'), from: accounts[0]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });
});
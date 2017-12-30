var Token = artifacts.require('Token');
var Crowdsale = artifacts.require('Crowdsale');
const utils = require('./helpers/Utils');

let DECIMALS = 18;

let now = () => web3.eth.getBlock(web3.eth.blockNumber).timestamp;
let startTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // crowdsale hasn't started
let endTime = startTime + 30 * 24 * 60 * 60; // crowdsale hasn't ended
let startTimeInProgress = Math.floor(Date.now() / 1000) - 12 * 60 * 60; // ongoing crowdsale
let startTimeFinished = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60; // ongoing crowdsale

let reserved = 100 * 10**DECIMALS;
let softcap = 200 * 10**DECIMALS;
let hardcap = 500 * 10**DECIMALS;
// 100 tokens for 1 eth
let rate = 100;

// helper ETH amounts
let eth = (amount) => web3.toWei(amount, 'ether');

let icoSafe, tokenIcoFinished, tokenIcoInProgress, tokenIcoNotStarted;

contract("Token", (accounts) => {

    before(async() => {
        icoSafe = accounts[0];
    });

    /**
     * Investing
     */
    it("should cost 1 ETH to get 100 tokens", async () => {
        let token = await Token.new(now() - 10, endTime, reserved, softcap, hardcap, icoSafe, rate);
        token.sendTransaction({value: eth(1), from: accounts[1]});
        let balance = await token.balanceOf.call(accounts[1]);
        assert.equal(balance, 100 * 10**DECIMALS);
    });

    it("should revert investment is crowdsale has not started", async () => {
        let token = await Token.new(startTime, endTime, reserved, softcap, hardcap, icoSafe, rate);
        try {
            await token.sendTransaction({value: eth(1), from: accounts[1]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should revert investment is crowdsale has ended", async () => {
        let token = await Token.new(now() - 10, now() - 1, reserved, softcap, hardcap, icoSafe, rate);
        try {
            await token.sendTransaction({value: eth(1), from: accounts[1]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should revert investment if token hard cap has been reached", async () => {
        let token = await Token.new(now() - 10, endTime, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(5), from: accounts[1]});
        try {
            await token.sendTransaction({value: eth(1), from: accounts[2]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    /**
     * Finalizing ICO
     */
    it("should be finalized only once", async () => {
        let token = await Token.new(now() - 10, endTime, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(5), from: accounts[1]});
        await token.finalize();
        try {
            await token.finalize();
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should not be finalized if there is still time", async () => {
        let token = await Token.new(now(), endTime, reserved, softcap, hardcap, icoSafe, rate);
        try {
            await token.finalize();
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should finalize before the end if the hardcap has been reached", async () => { 
        let token = await Token.new(now() - 10, endTime, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(5), from: accounts[1]});
        await token.finalize();
    });

    it("should transfer funds to the wallet when finished and softcap was reached", async () => {
        let oldBalance = (await web3.eth.getBalance(icoSafe)).toNumber();
        let token = await Token.new(now() - 10, now() + 5, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(3), from: accounts[1]});
        utils.increaseTime(6);
        await token.finalize();
        let newBalance = (await web3.eth.getBalance(icoSafe)).toNumber();
        // account for gas
        assert(newBalance - oldBalance > web3.toWei(2, 'ether'));
    });

    it("should leave funds intact if the softcap has not been reached", async () => {
        let token = await Token.new(now() - 10, now() + 5, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(1), from: accounts[1]});
        utils.increaseTime(6);
        await token.finalize();
        let icoBalance = (await web3.eth.getBalance(token.address)).toNumber();
        assert(icoBalance == eth(1));
    });

    /**
     * Refunding ICO
     */
    it("should refund if the ICO has failed", async () => {
        let token = await Token.new(now() - 10, now() + 5, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(1), from: accounts[1]});        
        utils.increaseTime(6);
        let oldBalance = (await web3.eth.getBalance(accounts[1])).toNumber();
        await token.finalize();
        await token.refund({from: accounts[1]});
        let newBalance = (await web3.eth.getBalance(accounts[1])).toNumber();
        assert(newBalance - oldBalance > eth(0.5));
    });

    it("should not refund if ICO is not finished", async () => {
        let token = await Token.new(now() - 10, endTime, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(1), from: accounts[1]});        
        try {
            await token.refund({from: accounts[1]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });

    it("should refund only if invested", async () => {
        let token = await Token.new(now() - 10, now() + 5, reserved, softcap, hardcap, icoSafe, rate);
        await token.sendTransaction({value: eth(1), from: accounts[1]});        
        utils.increaseTime(6);
        await token.finalize();
        try {
            await token.refund({from: accounts[2]});
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    });
});
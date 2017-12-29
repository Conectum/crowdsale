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

contract("Token", (accounts) => {
    it("should revert if token hard cap has been reached", async() => {
        let token = await Token.new(reserved, startTime, softcap, hardcap);
        await token.createToken(accounts[0], rate * web3.toWei(3, 'ether'));
        try {
            await token.createToken(accounts[0], rate * web3.toWei(2, 'ether'));
            assert(false, "should revert");
        } catch (error) {
            return utils.ensureException(error);
        }
    })
});
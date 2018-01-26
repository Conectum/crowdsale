var Token = artifacts.require("./Token.sol");

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

const latestTime = () => web3.eth.getBlock('latest').timestamp;

module.exports = function(deployer, network, accounts) {

    const rate = 100;
    const startTime = latestTime();
    const endTime = startTime + duration.days(1);
    const reserved = 100 * 10**18;
    const softCap = 300 * 10**18;
    const hardCap = 800 * 10**18;

    var owner;
    var wallet;
    if (network == 'development') {
        owner = accounts[0];
        wallet = accounts[0];
    } else if (network == 'kovan') {
        owner = '0x0';
        wallet = '0x0';
    }


    deployer.deploy(Token, owner, startTime, endTime, reserved, softCap, hardCap, wallet, rate).then(() => {
        console.log(Token.address);
    });
};

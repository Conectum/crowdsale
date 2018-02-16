var Token = artifacts.require('COMToken');
var Crowdsale = artifacts.require('ConectumICO');

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
    const icoStart = latestTime() + duration.weeks(1);
    const icoEnd = icoStart + duration.weeks(4);
    deployer.deploy(Token).then(() => {
        return deployer.deploy(
            Crowdsale,
            icoStart,
            1 * 10**18,
            2 * 10**18,
            accounts[0],
            [duration.minutes(30), duration.minutes(10), duration.minutes(10)],
            [duration.minutes(1), duration.minutes(1)],
            [1000, 750, 500],
            Token.address)
        .then(() => Token.deployed())
        .then((coin) => {
           return Promise.all([
               coin.lock("0x0095aE2806C14c09A8390ce6eb01554C7d54Dc4D", 1000, icoEnd),
               coin.vest("0x00a37086f69E7b548f29AC4A3bA6A3e145bdE633", 1000, icoEnd, duration.weeks(4)),
               coin.mint("0x004F1037AD1850eb31A9bF4CC470b199775f5C2E", 1000),
               coin.transferOwnership(Crowdsale.address)
           ]);
        });
    });
}

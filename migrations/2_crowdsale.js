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
  deployer.deploy(
    Crowdsale,
    latestTime(),
    1 * 10**18,
    2 * 10**18,
    accounts[0],
    [duration.minutes(30), duration.minutes(10), duration.minutes(10)],
    [duration.minutes(1), duration.minutes(1)],
    [1000, 750, 500]
  );
}

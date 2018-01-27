function isException(error) {
    let strError = error.toString();
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('VM Exception');
}

function ensureException(error) {
    assert(isException(error), error.toString());
}

const timeout = ms => new Promise(res => setTimeout(res, ms));

const increaseTime = function(deltaTime) {
    if(deltaTime > 0){
        console.log("TIME INCREASED +" + deltaTime)
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [deltaTime],
            id: new Date().getTime()
          })
    }
}

// helper ETH amounts
const eth = (amount) => web3.toWei(amount, 'ether');

const duration = {
  seconds: function (val) { return val; },
  minutes: function (val) { return val * this.seconds(60); },
  hours: function (val) { return val * this.minutes(60); },
  days: function (val) { return val * this.hours(24); },
  weeks: function (val) { return val * this.days(7); },
  years: function (val) { return val * this.days(365); },
};

module.exports = {
    zeroAddress: '0x0000000000000000000000000000000000000000',
    isException: isException,
    ensureException: ensureException,
    timeout: timeout,
    increaseTime: increaseTime,
    eth: eth,
    duration: duration
};

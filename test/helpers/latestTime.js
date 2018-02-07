// Returns the time of the last mined block in seconds
module.exports = () => web3.eth.getBlock('latest').timestamp;

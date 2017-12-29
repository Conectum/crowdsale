var Crowdsale = artifacts.require("./Crowdsale.sol");
var Token = artifacts.require("./Token.sol");

module.exports = function(deployer) {
    deployer.deploy(Token, 50, 2, 100, 200).then(() => {
        return deployer.deploy(Crowdsale, Token.address, '0x0', 1, 2, 100, 200, 1);
    });
};
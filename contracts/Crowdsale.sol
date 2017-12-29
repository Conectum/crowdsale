pragma solidity ^0.4.18;

import './Token.sol';

contract Crowdsale {
    uint256 constant DECIMALS = 18;

    uint256 start;
    uint256 end;

    address msWallet;
    uint256 reserved = 500 * 10**6 * 10**DECIMALS;
    // soft cap of COM tokens
    uint256 softcap;
    // hard cap of COM tokens
    uint256 hardcap;
    uint256 tokensSold = 0;

    // number of tokens for 1 ETH
    uint256 rate;
    // ether invested
    mapping (address => uint256) balances;

    Token tokenContract;

    function Crowdsale(
        address _tokenAddress,
        address _wallet,
        uint256 _start,
        uint256 _end,
        uint256 _softcap,
        uint256 _hardcap,
        uint256 _rate) {

        msWallet = _wallet;
        start = _start;
        end = _end;
        softcap = _softcap;
        hardcap = _hardcap;
        rate = _rate;

        tokenContract = Token(_tokenAddress);
    }

    function hasFailed() returns(bool) {
		return now > end && tokensSold < softcap;
	}

	function hasFinished() returns(bool) {
		return now > end && tokensSold > softcap;
	}

    function () payable {
		if (now < start) {
            revert();
        }
		if (now > end) {
            revert();
        }
		if (msg.value == 0) {
            revert();
        }
		
		uint256 weiAmount = msg.value;
		// keep track of ETH investments
		balances[msg.sender] += weiAmount;
		uint256 tokenCount = rate * weiAmount;
		tokenContract.createToken(msg.sender, tokenCount);
	}
}
pragma solidity ^0.4.18;

import './StandardToken.sol';

contract Token is StandardToken {
    using SafeMath for uint256;

    // TODO: add name, decimals, symbol
    uint256 reserved;
    uint256 icoEnd;
    uint256 softcap;
    uint256 hardcap;

    function Token(uint256 _reserved, uint256 _icoEnd, uint256 _softcap, uint256 _hardcap) {
        reserved = _reserved;
        totalSupply = reserved;
        icoEnd = _icoEnd;
        softcap = _softcap;
        hardcap = _hardcap;
    }

    function hasIcoEnded() returns (bool) {
        return now > icoEnd || hardcap == totalSupply;
    }

    function createToken(address _for, uint256 amount) {
        if (hasIcoEnded()) {
            revert();
        }
        // make sure we are not overboard with the amount of tokens we are creating
        if (totalSupply.add(amount) > hardcap) {
            revert();
        }
        balances[_for] = balances[_for].add(amount);
        totalSupply = totalSupply.add(amount);
    }
}
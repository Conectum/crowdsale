pragma solidity ^0.4.18;

import './StandardToken.sol';

contract Token is StandardToken {
    using SafeMath for uint256;

    // metadata
    string public constant name = "Conectum Token";
    string public constant symbol = "COM";
    uint256 constant decimals = 18;

    uint256 start;
    uint256 end;
    bool public icoFinished = false;

    uint256 reserved;
    uint256 softcap;
    uint256 hardcap;
    uint256 tokensSold;

    // number of tokens for 1 ETH
    uint256 rate;

    // multi-sig wallet to store raised funds at the end of the ICO
    address wallet;
    address owner;

    // who donated how much ETH
    mapping (address => uint256) icoBalances;

    event FundTransfer(address receiver, uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function Token(
        address _owner,
        uint256 _start,
        uint256 _end,
        uint256 _reserved, 
        uint256 _softcap, 
        uint256 _hardcap,
        address _wallet,
        uint256 _rate) public 
    {
        owner = _owner;
        start = _start;
        end = _end;
        reserved = _reserved;
        softcap = _softcap;
        hardcap = _hardcap;
        wallet = _wallet;
        rate = _rate;

        totalSupply = reserved;
    }

    function () public payable {
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
        icoBalances[msg.sender] += weiAmount;
        uint256 tokenCount = rate * weiAmount;
        if (tokensSold + tokenCount > hardcap) {
            revert();
        }
        tokensSold += tokenCount;
        createTokens(msg.sender, tokenCount);
    }

    function createTokens(address _for, uint256 amount) private {
        balances[_for] = balances[_for].add(amount);
        totalSupply = totalSupply.add(amount);
    }

    function finalize() public onlyOwner {
        if (icoFinished) {
            revert();
        }
        // if contract is not expired and hardcap is not reached:w
        if (now < end && tokensSold < hardcap) {
            revert();
        }
        icoFinished = true;
        if (tokensSold > softcap) {
            uint256 amount = this.balance;
            // will throw if something goes wrong resetting the state
            wallet.transfer(amount);
            FundTransfer(wallet, amount);
        }
    }

    function refund() public {
        if (!icoFinished) {
            revert();
        }
        uint256 refundAmount = icoBalances[msg.sender];
        if (refundAmount == 0) {
            revert();
        }
        icoBalances[msg.sender] = 0;
        msg.sender.transfer(refundAmount);
        FundTransfer(msg.sender, refundAmount);
    }
}
pragma solidity ^0.4.18;
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import 'zeppelin-solidity/contracts/token/ERC20/TokenVesting.sol';
import 'zeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol';

contract COMToken is MintableToken {
  string public constant name = "Conectum Utility Token";
  string public constant symbol = "COM";
  uint8 public constant decimals = 18;

  uint releaseStart;

  mapping (address => TokenVesting) public vesting;
  mapping (address => TokenTimelock) public timelock;

  function COMToken (uint _releaseStart) public {
      require(now <= _releaseStart);
      releaseStart = _releaseStart;
  }

  function vest(address to, uint amount, uint duration) onlyOwner public {
      require(to != address(0));
      vesting[to] = new TokenVesting(to, releaseStart, 0, duration, false);
      mint(address(vesting[to]), amount);
  }

  function lock(address to, uint amount, uint releaseTime) onlyOwner public {
      require(to != address(0));
      timelock[to] = new TokenTimelock(this, to, releaseTime);
      mint(address(timelock[to]), amount);
  }

  function releaseVested() public {
      releaseVestedFor(msg.sender);
  }

  function releaseVestedFor(address to) public {
      require(to != address(0));
      TokenVesting v = vesting[to];
      v.release(this);
  }

  function releaseTimelocked() public {
      releaseTimelockedFor(msg.sender);
  }

  function releaseTimelockedFor(address to) public {
      require(to != address(0));
      TokenTimelock t = timelock[to];
      t.release();
  }
}

pragma solidity ^0.4.18;
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract COMToken is MintableToken {
  string public constant name = "Conectum Utility Token";
  string public constant symbol = "COM";
  uint8 public constant decimals = 18;
}

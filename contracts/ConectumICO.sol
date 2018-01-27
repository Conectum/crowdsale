pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './COMToken.sol';

contract ConectumICO is Ownable {
  using SafeMath for uint;

  struct Referrer {
    address addr;
    // NOTE: default is false
    bool isSet;
  }

  uint constant StrongBelieversStage = 0;
  uint constant EarlyAdaptersStage = 1;
  uint constant MainStage = 2;

  // length of every crowdsale stage
  uint[] stageLengths;
  // length of breaks of the crowdsale stages
  uint[] stageBreaks;
  // ETH/COM exchange rates of every crowdsale stage
  uint[] stageRates;

  uint[] stageStarts;
  uint[] stageEnds;

  // is the ICO finished?
  bool public isFinalized = false;

  uint public weiRaised;
  // minimum required amount of wei to be raised in order for this ICO to be considered successful
  uint public softcap;
  // maximum amount of wei that is planned to raised
  uint public hardcap;

  mapping (address => Referrer) public refedBy;
  uint constant refBonusPct = 10;

  // refund vault used to hold funds while crowdsale is running
  RefundVault public vault;

  // The token being sold
  MintableToken public token;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint value, uint amount);
  // fired when referrer of a recent contributor is rewarded with a bonus
  event GiveReferrerBonus(address referrer, uint bonus);
  // fired when the crowdsale is finalized by the owner
  event Finalized();

  function ConectumICO(
    uint startTime,
    uint _softcap,
    uint _hardcap,
    address _wallet,
    uint[] _stageLengths,
    uint[] _stageBreaks,
    uint[] _stageRates) public {

    stageLengths = _stageLengths;
    stageBreaks = _stageBreaks;
    // we need the final 0 to keep the arrays of same size. Makes the bellow loop simple.
    stageBreaks.push(0);
    stageRates = _stageRates;

    uint stageStart = startTime;
    uint stageEnd;
    for (uint idx = 0; idx < stageLengths.length; idx++) {
      stageEnd = stageStart + stageLengths[idx];
      stageStarts.push(stageStart);
      stageEnds.push(stageEnd);
      stageStart = stageEnd + stageBreaks[idx];
    }

    softcap = _softcap;
    hardcap = _hardcap;

    vault = new RefundVault(_wallet);
    token = new COMToken();
  }

  function getStage() public view returns(uint) {
    for (uint idx = 0; idx < stageStarts.length; idx++) {
      uint start = stageStarts[idx];
      uint end = stageEnds[idx];
      if (start <= now && now <= end) {
        return idx;
      }
    }
    revert();
  }

  // fallback function can be used to buy tokens
  function () external payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable {
    require(beneficiary != address(0));
    require(validPurchase());

    uint weiAmount = msg.value;

    // calculate token amount to be created
    uint tokens = getTokenAmount(weiAmount);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    // if we are in the referral mode
    if (inReferralStage() && refedBy[msg.sender].isSet) {
      // calculate referrer bonus
      address referrer = refedBy[msg.sender].addr;

      uint bonus = tokens * refBonusPct / 100;
      token.mint(referrer, bonus);
      GiveReferrerBonus(referrer, bonus);
    }

    forwardFunds();
  }

  function balanceOf(address _owner) public view returns(uint) {
    return token.balanceOf(_owner);
  }

  function inReferralStage() internal view returns(bool) {
    return getStage() == StrongBelieversStage;
  }

  function setReferrence(address participant, address referrer) onlyOwner public {
    // make sure that the `participant` and `referrer` values were passed
    require(participant != address(0));
    require(referrer != address(0));
    // there referer can only be set once
    require(!refedBy[participant].isSet);
    refedBy[participant] = Referrer(referrer, true);
  }

  function getReferrer(address participant) public view returns(address) {
    require(refedBy[participant].isSet);
    return refedBy[participant].addr;
  }

  function forwardFunds() internal {
    vault.deposit.value(msg.value)(msg.sender);
  }

  function getTokenAmount(uint weiAmount) internal view returns(uint) {
    uint stage = getStage();
    uint rate = stageRates[stage];
    return weiAmount.mul(rate);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal view returns (bool) {
    bool nonZeroPurchase = msg.value != 0;
    bool withinCap = weiRaised.add(msg.value) <= hardcap;
    return isActive() && nonZeroPurchase && withinCap;
  }

  function hasEnded() public view returns(bool) {
    if (weiRaised >= hardcap) {
      return true;
    }

    if (now > stageEnds[stageEnds.length - 1]) {
      return true;
    }

    return false;
  }

  // is the crowdsale in an active fund raising stage
  function isActive() public view returns(bool){
    uint stage = getStage();
    uint start = stageStarts[stage];
    uint end = stageEnds[stage];
    return now >= start && now <= end && !isFinalized;
  }

  /**
   * Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() onlyOwner public {
    require(!isFinalized);
    require(hasEnded());

    finalization();
    Finalized();

    isFinalized = true;
  }

  function finalization() internal {
    if (goalReached()) {
      vault.close();
    } else {
      vault.enableRefunds();
    }
    token.finishMinting();
    token.transferOwnership(owner);
  }

  function goalReached() public view returns (bool) {
    return weiRaised >= softcap;
  }

  // if crowdsale is unsuccessful, investors can claim refunds here
  function claimRefund() public {
    require(isFinalized);
    require(!goalReached());

    vault.refund(msg.sender);
  }
}

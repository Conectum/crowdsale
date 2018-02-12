pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundableCrowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './COMToken.sol';

contract ConectumICO is Ownable, RefundableCrowdsale {
    using SafeMath for uint;

    struct Referrer {
        address addr;
        bool isSet;
    }

    // indexes of different ico stages, mainly for code readability purposes
    uint constant StrongBelieversStage = 0;
    uint constant EarlyAdaptersStage = 1;
    uint constant MainStage = 2;

    // length of every crowdsale stage
    uint[] stageLengths;
    // length of breaks of the crowdsale stages
    uint[] stageBreaks;
    // ETH/COM exchange rates of every crowdsale stage
    uint[] stageRates;

    // current ICO stage index
    uint stage = 0;

    // what time every stage starts
    uint[] stageStarts;
    // what time every stage ends
    uint[] stageEnds;

    // maximum amount of wei that is planned to be raised
    uint public hardcap;

    // users that were referred by others
    mapping (address => Referrer) public referredBy;
    uint constant refBonusPct = 10;

    /**
    * event for referrer bonus tokens minting
    * @param referrer who referred current purchaser of the tokens
    * @param bonus amount of tokens referrer was awarded with
    */
    event GiveReferrerBonus(address referrer, uint bonus);

    /**
    * @param _startTime when ICO should start
    * @param _softcap in wei
    * @param _hardcap in wei
    * @param _wallet that will receive successful ICO funds
    * @param _stageLengths in seconds
    * @param _stageBreaks in seconds
    * @param _stageRates -- ETH/COM
    */
    function ConectumICO(
        uint _startTime,
        uint _softcap,
        uint _hardcap,
        address _wallet,
        uint[] _stageLengths,
        uint[] _stageBreaks,
        uint[] _stageRates) public
        FinalizableCrowdsale()
        RefundableCrowdsale(_softcap)
        Crowdsale(_startTime, calcEndTime(_startTime, _stageLengths, _stageBreaks), _stageRates[0], _wallet)
    {
        stageRates = _stageRates;
        stageLengths = _stageLengths;
        stageBreaks = _stageBreaks;

        require(stageLengths.length == stageRates.length);
        require(stageBreaks.length + 1 == stageLengths.length);
        stageBreaks.push(0);

        uint stageStart = startTime;
        uint stageEnd;
        for (uint idx = 0; idx < stageLengths.length; idx++) {
          stageEnd = stageStart + stageLengths[idx];
          stageStarts.push(stageStart);
          stageEnds.push(stageEnd);
          stageStart = stageEnd + stageBreaks[idx];
        }

        hardcap = _hardcap;
    }

    function createTokenContract() internal returns (MintableToken) {
        return new COMToken();
    }

    function calcEndTime(
        uint _startTime,
        uint[] _stageLengths,
        uint[] _stageBreaks)
        internal pure returns(uint) {
        uint acc = _startTime;
        for (uint i = 0; i < _stageLengths.length; i++) {
          acc += _stageLengths[i];
        }
        for (uint j = 0; j < _stageBreaks.length; j++) {
          acc += _stageBreaks[j];
        }
        return acc;
    }

    function buyTokens(address beneficiary) public payable {
        super.buyTokens(beneficiary);

        // try to award referrer of the tokens `beneficiary`
        uint weiAmount = msg.value;
        uint tokens = getTokenAmount(weiAmount);
        // if we are in the referral stage
        if (inReferralStage() && referredBy[msg.sender].isSet) {
          // calculate referrer's bonus
          address referrer = referredBy[msg.sender].addr;
          uint bonus = tokens * refBonusPct / 100;

          token.mint(referrer, bonus);
          GiveReferrerBonus(referrer, bonus);
        }
    }

    function incStage() public onlyOwner {
        require(stageEnds[stage] < now);
        require(now < stageStarts[stage+1]);
        stage += 1;
    }

    function inReferralStage() internal view returns(bool) {
        return stage == StrongBelieversStage;
    }

    function setReferrence(address participant, address referrer) public onlyOwner {
        require(participant != address(0));
        require(referrer != address(0));
        // the referer can only be set once
        require(!referredBy[participant].isSet);
        referredBy[participant] = Referrer(referrer, true);
    }

    // Convert Wei to COM tokens
    function getTokenAmount(uint weiAmount) internal view returns(uint) {
        uint rate = stageRates[stage];
        return weiAmount.mul(rate);
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal view returns (bool) {
        bool withinCap = weiRaised.add(msg.value) <= hardcap;
        return isActive() && withinCap && super.validPurchase();
    }

    // @return true if ICO is in one of its ICO stages
    function isActive() public view returns(bool){
        uint start = stageStarts[stage];
        uint end = stageEnds[stage];
        return now >= start && now <= end;
    }

    function hasEnded() public view returns(bool) {
        bool capReached = weiRaised >= hardcap;
        return capReached || super.hasEnded();
    }

    function finalization() internal {
        super.finalization();
        token.finishMinting();
        token.transferOwnership(owner);
    }
} 

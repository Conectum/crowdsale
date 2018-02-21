pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/crowdsale/RefundVault.sol';
import 'zeppelin-solidity/contracts/token/ERC20/MintableToken.sol';
import './crowdsale/Crowdsale.sol';
import './crowdsale/RefundableCrowdsale.sol';
import './crowdsale/FinalizableCrowdsale.sol';
import './crowdsale/CappedCrowdsale.sol';
import './COMToken.sol';

contract ConectumICO is CappedCrowdsale, RefundableCrowdsale {
    using SafeMath for uint;

    struct Referrer {
        address addr;
        bool isSet;
    }

    // indexes of different ico stages, mainly for code readability purposes
    uint constant StrongBelieversStage = 0;
    uint constant EarlyAdoptersStage = 1;
    uint constant MainStage = 2;

    // length of every crowdsale stage
    uint[] stageLengths;
    // length of breaks of the crowdsale stages
    uint[] stageBreaks;
    // ETH/COM exchange rates of every crowdsale stage
    uint[] stageRates;

    // current ICO stage index
    uint public stage = 0;

    // what time every stage starts
    uint[] stageStarts;
    // what time every stage ends
    uint[] stageEnds;

    uint constant minInvest = 0.2 ether;

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
        uint[] _stageRates,
        MintableToken _token
    ) public
        CappedCrowdsale(_hardcap)
        FinalizableCrowdsale()
        RefundableCrowdsale(_softcap)
        Crowdsale(_startTime, calcEndTime(_startTime, _stageLengths, _stageBreaks), _stageRates[0], _wallet, _token)
    {
        require(_stageLengths.length == _stageRates.length);
        require(_stageBreaks.length + 1 == _stageLengths.length);

        stageRates = _stageRates;
        stageLengths = _stageLengths;
        stageBreaks = _stageBreaks;

        stageStarts = [
            uint(startTime),
            startTime + _stageLengths[0] + _stageBreaks[0],
            startTime + _stageLengths[0] + _stageBreaks[0] + _stageLengths[1] + _stageBreaks[1]
        ];

        stageEnds = [
            uint(stageStarts[0] + _stageLengths[0]), 
            stageStarts[1] + _stageLengths[1], 
            stageStarts[2] + _stageLengths[2]
        ];
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

    function incStage() external onlyOwner {
        require(stageEnds[stage] < now);
        require(now < stageStarts[stage+1]);
        stage += 1;
    }

    function inReferralStage() internal view returns(bool) {
        return stage == StrongBelieversStage;
    }

    function setReference(address participant, address referrer) external onlyOwner {
        require(participant != address(0));
        require(referrer != address(0));
        require(isActive());
        require(stage == 0);
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
        bool aboveMinInvestment = msg.value >= minInvest;
        return isActive() && aboveMinInvestment && !isFinalized && super.validPurchase();
    }

    // @return true if ICO is in one of its ICO stages
    function isActive() public view returns(bool){
        uint start = stageStarts[stage];
        uint end = stageEnds[stage];
        return now >= start && now <= end;
    }

    function finalization() internal {
        super.finalization();
        token.finishMinting();
        token.transferOwnership(owner);
    }
} 

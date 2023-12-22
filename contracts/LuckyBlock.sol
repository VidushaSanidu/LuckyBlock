// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title Lucky Block Contract
 * @author Vidusha Sanidu
 * @notice First block chain project
 * @dev this implements chainlink VRF and chainlink Automation
 */


contract LuckyBlock is VRFConsumerBaseV2, AutomationCompatibleInterface{
    // data types
    enum LBStatus {
        OPEN, CALCULATIONG
    }

    // state variables
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    address private s_recentWinner;
    LBStatus private s_lbState; 
    uint256 private s_prevTimeStamp;
    uint256 private immutable i_interval;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subsriptionID;
    uint16 private constant REQUEST_CONFORMATION = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // events
    event EventEnter(address indexed player);
    event RequestedLBWinner(uint256 indexed reqestID);
    event WinnerPicked(address indexed winner);

    // constructor
    constructor(address vrfCoordinatorV2,
                uint256 entranceFee, 
                bytes32 gasLane,
                uint64 subscriptionID,
                uint32 callbackGasLimit,
                uint256 interval
    )VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subsriptionID = subscriptionID;
        i_callbackGasLimit = callbackGasLimit;
        s_lbState = LBStatus.OPEN;
        s_prevTimeStamp = block.timestamp;
        i_interval = interval;
    }


    // buy a ticket
    function enterEvent() public payable{
        // check ETH blance
        if (msg.value < i_entranceFee) {
            revert LBlock__NotEnoughETHprovided();
        }
        if (s_lbState != LBStatus.OPEN) {
            revert LBlock__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit EventEnter(msg.sender);
    }

    // winner selection trigger function
    function checkUpkeep(bytes memory /*checkData*/) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = (s_lbState == LBStatus.OPEN);
        bool timePassed = (block.timestamp - s_prevTimeStamp > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
    }

    // --> once the checkUpkeep is true following function will triggered
    // --> it is external since it can only executed by outside

    // request a random number
    function performUpkeep(bytes calldata /* performData */) external override {
        // check upkeep validity
        (bool upkeepNeeded,) = checkUpkeep("");

        if (!upkeepNeeded) {
            revert LBlock__UpKeepFailed(
                address(this).balance,
                s_players.length,
                uint256(s_lbState)
            );
        }
        s_lbState = LBStatus.CALCULATIONG;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
        i_gasLane, // s_keyHash - maximum gas price you are willing to pay
        i_subsriptionID, //  subscription ID that this contract uses for funding requests
        REQUEST_CONFORMATION, // he longer the node waits, the more secure the random value is.
        i_callbackGasLimit, // how much gas to use for the callback request
        NUM_WORDS
       );
       emit RequestedLBWinner(requestId);
    }

    // get the winner and payment
    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override{
        // get winner
        uint256 indexWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexWinner];
        s_recentWinner = recentWinner;
        s_players = new address payable[](0);
        s_lbState = LBStatus.OPEN;
        s_prevTimeStamp = block.timestamp;
        
        // send ETH to winner
        (bool success,) = recentWinner.call{value: address(this).balance}("");
        if (!success){
            revert LBlock__TranferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    // get a given player
    function getPlayer(uint256 num) public view returns (address){
        return s_players[num];
    }

    // getter functions
    function getRecentWinner() public view returns (address){
        return s_recentWinner;
    }

    function getEntranceFee() public view  returns (uint256) {
        return i_entranceFee;
    }

    function getLBStatus() public view returns (LBStatus){
        return s_lbState;
    }

    function getNumWords() public pure returns (uint32){
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFORMATION;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_prevTimeStamp;
    }

}

// errors
error LBlock__NotEnoughETHprovided();
error LBlock__TranferFailed();
error LBlock__NotOpen();
error LBlock__UpKeepFailed(uint256 currentBalace,uint256 numPlayers,uint256 lbState);
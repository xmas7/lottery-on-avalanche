// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Lottery is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum LOTTERY_STATE {
        NOT_STARTED,
        ACTIVE,
        CLOSED
    }

    struct LotteryInfo {
        address[] players;
        address creator;
        address[] winners;
        LOTTERY_STATE status;
    }

    address public payToken;
    uint256 public minAmount;
    uint256[] public rewardAmounts;
    address public treasury;
    address public rewardDistributor;

    /// @dev current active lottery id
    uint256 public currentLotteryId;

    /// @dev lottery id => Lottry info
    mapping(uint256 => LotteryInfo) public lotteries;

    /// @dev lottery id => user index => status
    mapping(uint256 => mapping(uint256 => bool)) _winnerSelected;

    event LotteryCreated(
        address indexed creator,
        uint256 indexed lotteryId,
        uint256 timestamp
    );
    event LotteryEntered(
        address indexed participant,
        uint256 indexed lotteryId,
        uint256 amount,
        uint256 timestamp
    );
    event LotteryEnded(
        address indexed creator,
        uint256 indexed lotteryId,
        uint256 timestamp
    );

    /**
     * @dev Construct Lottery contract
     * @param _payToken address of pay token
     * @param _minAmount minimum amount of pay token
     * @param _treasury address of treasury
     * @param _rewardDistributor address of rewardDistributor
     * @param _rewardAmounts array of reward amount for 1st, 2nd and 3rd winners
     */
    constructor(
        address _payToken,
        uint256 _minAmount,
        address _treasury,
        address _rewardDistributor,
        uint256[] memory _rewardAmounts
    ) {
        require(_payToken != address(0), "Error: payToken address is zero");
        require(_treasury != address(0), "Error: treasury address is zero");
        require(
            _rewardDistributor != address(0),
            "Error: rewardDistributor address is zero"
        );
        require(_rewardAmounts.length == 3, "Error: winners are only 3");

        payToken = _payToken;
        minAmount = _minAmount;
        treasury = _treasury;
        rewardDistributor = _rewardDistributor;
        rewardAmounts = _rewardAmounts;

        currentLotteryId = 0;
    }

    /**
     * @dev Create lottry only from owner
     */
    function getLotteryInfo(uint256 _lotteryId)
        public
        view
        returns (LotteryInfo memory)
    {
        return lotteries[_lotteryId];
    }

    /**
     * @dev Create lottry only from owner
     */
    function createLottery() public onlyOwner {
        require(
            currentLotteryId == 0 ||
                lotteries[currentLotteryId].status == LOTTERY_STATE.CLOSED,
            "Current lottery was not ended"
        );

        currentLotteryId += 1;
        lotteries[currentLotteryId].creator = msg.sender;
        lotteries[currentLotteryId].status = LOTTERY_STATE.ACTIVE;

        emit LotteryCreated(msg.sender, currentLotteryId, block.timestamp);
    }

    /**
     * @dev Enter lottery
     * @param _lotteryId lottery id
     * @param _amount amount of pay token
     */
    function enterLottery(uint256 _lotteryId, uint256 _amount) public {
        require(
            lotteries[_lotteryId].status == LOTTERY_STATE.ACTIVE,
            "Lottery is not active"
        );
        require(_amount >= minAmount, "Not enough pay token!");
        require(
            msg.sender != lotteries[_lotteryId].creator,
            "Lottery creator can't participate"
        );

        // transfer payToken from user to lottery
        IERC20(payToken).safeTransferFrom(msg.sender, treasury, _amount);

        lotteries[_lotteryId].players.push(msg.sender);

        emit LotteryEntered(msg.sender, _lotteryId, _amount, block.timestamp);
    }

    /**
     * @dev End lottery and choose winner by only owner
     * @param _lotteryId lottery id
     */
    function endLottery(uint256 _lotteryId) public onlyOwner nonReentrant {
        require(
            lotteries[_lotteryId].status == LOTTERY_STATE.ACTIVE,
            "Lottery is not active"
        );
        require(
            lotteries[_lotteryId].players.length > 2,
            "Error: less than 3 participants"
        );

        // choose winners
        _drawWinners(_lotteryId);

        emit LotteryEnded(msg.sender, _lotteryId, block.timestamp);

        // create lottery automatically
        createLottery();
    }

    /**
     * @notice Change minimum amount of payToken to enter lottery
     * @param _minAmount     amount of minAmount
     */
    function changeMinPayTokenAmount(uint256 _minAmount) external onlyOwner {
        minAmount = _minAmount;
    }

    /**
     * @notice Change treasury address
     * @param _treasury  address of treasury
     */
    function changeTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Error: treasury address is zero");
        treasury = _treasury;
    }

    /**
     * @notice Change rewardDistributor address
     * @param _rewardDistributor  address of rewardDistributor
     */
    function changeRewardDistributor(address _rewardDistributor)
        external
        onlyOwner
    {
        require(
            _rewardDistributor != address(0),
            "Error: rewardDistributor address is zero"
        );
        rewardDistributor = _rewardDistributor;
    }

    /**
     * @notice Draw 3 winners
     * @param _lotteryId lottery id
     */
    function _drawWinners(uint256 _lotteryId) internal {
        address[] memory lotteryPlayers = lotteries[_lotteryId].players;
        // it's increased when same random number is generated
        uint256 pIdx;

        for (uint256 i = 0; i < 3; i++) {
            uint256 indexOfWinner;
            while (true) {
                // get random number
                uint256 randomNumber = uint256(
                    keccak256(
                        abi.encodePacked(
                            block.difficulty, // can actually be manipulated by the miners!
                            block.timestamp, // timestamp is predictable
                            lotteryPlayers, // lottery players
                            pIdx
                        )
                    )
                );

                indexOfWinner = randomNumber % lotteryPlayers.length;

                if (!_winnerSelected[_lotteryId][indexOfWinner]) {
                    _winnerSelected[_lotteryId][indexOfWinner] = true;
                    break;
                }
                pIdx++;
            }

            // transfer reward token to winners
            IERC20(payToken).safeTransferFrom(
                rewardDistributor,
                lotteryPlayers[indexOfWinner],
                rewardAmounts[i]
            );
            lotteries[_lotteryId].winners.push(lotteryPlayers[indexOfWinner]);
        }

        // change lottery status
        lotteries[currentLotteryId].status = LOTTERY_STATE.CLOSED;
    }
}

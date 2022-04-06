// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Lottery is Ownable {
    using SafeERC20 for IERC20;

    enum LOTTERY_STATE {
        NOT_STARTED,
        ACTIVE,
        CLOSED
    }

    struct LotteryInfo {
        address[] players;
        address winner;
        address creator;
        LOTTERY_STATE status;
    }

    address public payToken;
    uint256 public minAmount;

    /// @dev current active lottery id
    uint256 public currentLotteryId;

    /// @dev lottery id => Lottry info
    mapping(uint256 => LotteryInfo) public lotteries;

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

    /// @dev Construct Lottery contract
    /// @param _payToken address of pay token
    /// @param _minAmount minimum amount of pay token
    constructor(address _payToken, uint256 _minAmount) {
        require(_payToken != address(0), "Error: zero address");
        payToken = _payToken;
        minAmount = _minAmount;
        currentLotteryId = 0;
    }

    /// @dev Create lottry only from owner
    function getLotteryInfo(uint256 _lotteryId)
        public
        view
        returns (LotteryInfo memory)
    {
        return lotteries[_lotteryId];
    }

    /// @dev Create lottry only from owner
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

    /// @dev Enter lottery
    /// @param _lotteryId lottery id
    /// @param _amount amount of pay token
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
        IERC20(payToken).safeTransferFrom(msg.sender, address(this), _amount);

        lotteries[_lotteryId].players.push(msg.sender);

        emit LotteryEntered(msg.sender, _lotteryId, _amount, block.timestamp);
    }

    /// @dev End lottery and choose winner by only owner
    /// @param _lotteryId lottery id
    function endLottery(uint256 _lotteryId) public onlyOwner {
        address[] memory lotteryPlayers = lotteries[_lotteryId].players;

        require(
            lotteries[_lotteryId].status == LOTTERY_STATE.ACTIVE,
            "Lottery is not active"
        );
        require(lotteryPlayers.length > 0, "No lottery participants");

        // get random number
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.difficulty, // can actually be manipulated by the miners!
                    block.timestamp, // timestamp is predictable
                    lotteryPlayers // lottery players
                )
            )
        );

        uint256 indexOfWinner = randomNumber % lotteryPlayers.length;

        // transfer avax token
        _safeTransferAvax(lotteryPlayers[indexOfWinner], address(this).balance);

        // transfer all pay token
        IERC20(payToken).safeTransfer(
            lotteryPlayers[indexOfWinner],
            IERC20(payToken).balanceOf((address(this)))
        );

        // change lottery status
        lotteries[currentLotteryId].status = LOTTERY_STATE.CLOSED;
        lotteries[currentLotteryId].winner = lotteryPlayers[indexOfWinner];

        emit LotteryEnded(msg.sender, _lotteryId, block.timestamp);

        // create lottery automatically
        createLottery();
    }

    /**
     * @notice Transfer avax
     * @param _to     receipnt address
     * @param _value  amount
     */
    function _safeTransferAvax(address _to, uint256 _value) internal {
        (bool success, ) = payable(_to).call{value: _value}(new bytes(0));
        require(success, "SafeTransferAvax: Avax transfer failed");
    }
}

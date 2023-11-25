// SPDX-License-Identifier: unlicensed

pragma solidity >=0.8.0 <0.9.0;

import "../../contracts/Consorcio.sol";
import "../../contracts/DateTime.sol";
import "../../contracts/PriorityQueue.sol";

contract ConsorcioTest is Consorcio(5, 120) {
    
    // function a() public view {
    //     assert(10 > 5);
    // }

    function numberOfParticipantsAlwaysPositive() public view{
        assert(numberOfLandlords >= 0);
    }

    function votesCountMatchWithVotesByLandlords() public view{
        for (uint i = 1; i < nextProposalId; i++) {
            if (proposals[i].id == i) {
                (uint positiveVotes, uint negativeVotes) = getPositiveAndNegativeVotes(i);
                if (positiveVotes != proposals[i].positiveVotes || negativeVotes != proposals[i].negativeVotes) {
                    assert(false);
                }
            }
        }
        assert(true);
    }

    function timeoutsInPriorityQueueAreSorted() public view{
        require(acceptedProposals.length() > 0, "There are no accepted proposals");

        PriorityQueue.Node memory node = acceptedProposals.getNodeInPosition(0);
        uint previousTimeout = node.timeout;
        for (uint i = 1; i < acceptedProposals.length(); i++) {
            node = acceptedProposals.getNodeInPosition(i);
            if (node.timeout < previousTimeout) {
                assert(false);
            }
            previousTimeout = node.timeout;
        }
        assert(true);
    }

    function getPositiveAndNegativeVotes(uint proposalId) internal view returns(uint, uint) {
        uint positiveVotes = 0;
        uint negativeVotes = 0;
        for (uint j = 0; j < landlordsAddresses.length; j++) {
            if (proposals[proposalId].votes[landlordsAddresses[j]] == VotesState.POSITIVE) {
                positiveVotes++;
            } else if (proposals[proposalId].votes[landlordsAddresses[j]] == VotesState.NEGATIVE) {
                negativeVotes++;
            }
        }
        return (positiveVotes, negativeVotes);
    }
}
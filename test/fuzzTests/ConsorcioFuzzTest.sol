// SPDX-License-Identifier: unlicensed

pragma solidity >=0.8.0 <0.9.0;

import "../../contracts/Consorcio.sol";
import "../../contracts/DateTime.sol";
import "../../contracts/PriorityQueue.sol";

contract ConsorcioTest is Consorcio(5, 120) {

    function numberOfParticipantsAlwaysPositive() public view{
        assert(numberOfLandlords >= 0);
    }

    function numberOfParticipantsIsNeverMoreThanMax() public view{
        assert(numberOfLandlords <= totalNumberOfLandlords);
    }

    function votesCountMatchWithVotesByLandlords() public view{
        for (uint i = 1; i < nextProposalId; i++) {
            if (proposalExists(i)) {
                (uint positiveVotes, uint negativeVotes) = getPositiveAndNegativeVotes(i);
                if (positiveVotes != proposals[i].positiveVotes || negativeVotes != proposals[i].negativeVotes) {
                    assert(false); // If contract reaches this line, the test fails.
                }
            }
        }
    }

    function proposalExists(uint i) internal view returns(bool){
        return proposals[i].id == i;
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

    function timeoutsInPriorityQueueAreSorted() public view {
        uint queueLength = acceptedProposals.length();
        require(queueLength > 0, "There are no accepted proposals");

        uint previousTimeout = acceptedProposals.getNodeInPosition(0).timeout;
        for (uint i = 1; i < queueLength; i++) {
            uint currentTimeout = acceptedProposals.getNodeInPosition(i).timeout;
            if (currentTimeout < previousTimeout) {
                assert(false);
            }
            previousTimeout = currentTimeout;
        }
    }

    function isACCEPTEDorDECLINEDifHasReachedMajority() public view{
        require(acceptedProposals.length() > 0, "There are no accepted proposals");

        PriorityQueue.Node memory node;
        
        for (uint i = 0; i < acceptedProposals.length(); i++) {
            node = acceptedProposals.getNodeInPosition(i);
            // Check if the proposal has more positive votes than the majority
            (uint positiveVotes, uint negativeVotes) = getPositiveAndNegativeVotes(node.id);
            if (positiveVotes >= majority) {
                assert(proposals[node.id].state == ProposalState.ACCEPTED);
            }

            if (negativeVotes >= majority) {
                assert(proposals[node.id].state == ProposalState.DECLINED);
            }
        }
        assert(true);
    }

    function noProposalsFromThePast() public view{
        require(acceptedProposals.length() > 0, "There are no accepted proposals");
        PriorityQueue.Node memory node;
        
        for (uint i = 0; i < acceptedProposals.length(); i++) {
            node = acceptedProposals.getNodeInPosition(i);
            // Check if the proposal timeout is in the past by at least one day
            if (node.timeout < block.timestamp - 60 * 60 * 24) {
                assert(false);
            }
        }
    }


}
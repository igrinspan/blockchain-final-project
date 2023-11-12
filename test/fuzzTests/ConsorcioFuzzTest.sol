// SPDX-License-Identifier: unlicensed

pragma solidity >=0.8.0 <0.9.0;

import "../../contracts/Consorcio.sol";

contract MyConsorcio is Consorcio(5) {
    function echidna_NumberOfParticipantsAlwaysPositive() public view returns(bool){
        return (numberOfParticipants >= 0);
    }

    function echidna_votesCountMatchWithVotesByLandlords() public view returns(bool){
        for (uint i = 1; i < nextProposalId; i++) {
            if (proposals[i].id == i) {
                (uint positiveVotes, uint negativeVotes) = getPositiveAndNegativeVotes(i);

                if (positiveVotes != proposals[i].positiveVotes || negativeVotes != proposals[i].negativeVotes) {
                    return false;
                }
            }
        }

        return true;
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

    // echidna_votesCountMatchWithVotesByLandlords: FAILED! with ReturnFalse 
    // Call sequence:
    //   1. registerLandlord(0x20000) from: 0x30000
    
    //   2.createProposal ("Proposal does not exist,
    //   57096287151886725766673929959883360895235781676170941017085712676984511076436,53949753978686336192849440701
    //   046751842233999309574818123425808076275702729360) from: 0×20000
    
    //   3. createProposal ("Proposal does not exist",
    //   57096287151886725766673929959883360895235781676170941017085712676984511076436,53949753978686336192849440701
    //   046751842233999309574818123425808076275702729360) from: 0×20000
    
    //   4. registerLandlord (0x10000) from: 0x30000
    
    //   5. createProposal ("Proposal does not exist",
    //   57096287151886725766673929959883360895235781676170941017085712676984511076436,53949753978686336192849440701
    //   046751842233999309574818123425808076275702729360) from: 0×10000
    
    //   6. vote(3, true) from: 0x20000
    
    //   7.editVote (3,true) from: 0×20000
}
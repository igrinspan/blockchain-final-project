// SPDX-License-Identifier: unlicensed
import "PriorityQueue.sol";

pragma solidity >=0.8.0 <0.9.0;

contract Consorcio {

    mapping(address => bool) landlordsRegistered;
    address owner = msg.sender;
    mapping(uint => Proposal) public proposals;
    uint nextProposalId = 0;
    uint numberOfParticipants;
    uint majority;
    mapping(uint => uint) pool;
    PriorityQueue acceptedProposals;

    uint[] proposalsPriority; // La prioridad esta determinada por el timeout.

    enum ProposalState { CREATED, ACCEPTED, DECLINED, EXPIRED, FULFILLED }

    // La persona en realidad solo deberia mandar descripcion y costo.
    // Y dentro del contrato que se le asigne un timestamp, id, y state(que va a ser siempre CREATED al principio).
    struct Proposal {
        uint id;
        string description;
        uint costPerPerson;
        uint timestamp;
        uint timeout;
        uint negativeVotes;
        uint positiveVotes;
        ProposalState state;
    }


    event ProposalAccepted(uint proposalId);
    event ProposalFulfilled(uint proposalId);
    event NotEnoughBalanceToFulfill(uint proposalId);

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier isRegistered {
        require(landlordsRegistered[msg.sender]);
        _;
    }

    constructor(uint _numberOfParticipants){
        numberOfParticipants = _numberOfParticipants;
        majority = _numberOfParticipants / 2 + 1;
    }

    function registerLandlord(address landlord) public onlyOwner{
        landlordsRegistered[landlord] = true;
    }

    function replaceLandlord(address previousLandlord, address newLandlord) public onlyOwner{
        landlordsRegistered[previousLandlord] = false;
        landlordsRegistered[newLandlord] = true;
    }

    function propose(string memory description, uint cost, uint timeout) public isRegistered {
        Proposal memory proposal = Proposal(nextProposalId, description, cost, block.timestamp, timeout, 0, 0, ProposalState.CREATED);
        proposals[nextProposalId] = proposal;
        nextProposalId = nextProposalId + 1;
    }

    function seeProposal(uint proposalId) public view returns(Proposal memory){
        return proposals[proposalId];
    }

    function vote(uint proposalId, bool decision) public isRegistered {
        Proposal storage proposal = proposals[proposalId]; // storage te lo pasa por referencia.
        updateProposalStateBasedOnVote(proposal, decision);
    }

    function updateProposalStateBasedOnVote(Proposal storage proposal, bool decision) internal {
        if (decision){
            proposal.positiveVotes++;
            if (proposal.positiveVotes >= majority){
                proposal.state = ProposalState.ACCEPTED;
                emit ProposalAccepted(proposal.id);
                addToPriorityQueue(proposal);
                tryToFulfillProposal(proposal);
            }
        } 
        else {
            proposal.negativeVotes--;
            if (proposal.negativeVotes >= majority){
                proposal.state = ProposalState.DECLINED;
                removeProposal(proposal);
            }
        }
    }

    function deposit() public payable isRegistered {
        // Actualizamos el valor de su cuenta.
        pool[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);

        // get 1rst priority proposal cost
        // check if all landlords have enoggh money to pay
        // if so, substract the same quantiy from all of them
        // and update proposals
        // else error message 
    }

    function addToPriorityQueue(Proposal storage proposal) internal {
        acceptedProposals.addEntry(proposal.id, proposal.timeout);
    }

    function tryToFulfillProposal(Proposal storage proposal) internal {

    }

    function removeProposal(Proposal storage proposal) internal {

    }


}
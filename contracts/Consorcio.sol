// SPDX-License-Identifier: unlicensed

import "./PriorityQueue.sol";

pragma solidity >=0.8.0 <0.9.0;

contract Consorcio {

    mapping(address => bool) landlordsRegistered;
    address owner = msg.sender;
    mapping(uint => Proposal) public proposals;
    uint nextProposalId = 0;
    uint numberOfParticipants = 0;
    uint totalNumberOfParticipants;
    uint majority;
    mapping(address => uint) pool;
    PriorityQueue acceptedProposals;

    uint[] proposalsPriority; // La prioridad esta determinada por el timeout.

    enum ProposalState { CREATED, ACCEPTED, DECLINED, EXPIRED, FULFILLED }
    enum VotesState { PENDING, POSITIVE, NEGATIVE }

    struct Vote {
        address landlordAddress;
        VotesState state;
    }

    struct Proposal {
        uint id;
        address creator;
        string description;
        uint costPerPerson;
        uint timestamp;
        uint timeout;
        ProposalState state;
        Vote[] votes;
    }
    
    event ProposalAccepted(uint proposalId);
    event ProposalFulfilled(uint proposalId);
    event NotEnoughBalanceToFulfill(uint proposalId);
    event Deposit(address landlord, uint amount);

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isRegistered {
        require(landlordsRegistered[msg.sender], "Landlord is not registered");
        _;
    }
    modifier hasCREATEDState(uint proposalId) {
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be edited");
        _;
    }



    constructor(uint _totalNumberOfParticipants){
        totalNumberOfParticipants = _totalNumberOfParticipants;
        majority = _totalNumberOfParticipants / 2 + 1;
    }

    function registerLandlord(address landlord) public onlyOwner{
        // require landlord address is a valid address
        require(landlord != address(0));

        // require landlord is not already registered
        require(!landlordsRegistered[landlord]);

        // require there are less than totalNumberOfParticipants landlords registered
        require(numberOfParticipants < totalNumberOfParticipants);

        landlordsRegistered[landlord] = true;
        numberOfParticipants++;
    }

    function replaceLandlord(address previousLandlord, address newLandlord) public {
        require(msg.sender == previousLandlord);

        landlordsRegistered[previousLandlord] = false;
        landlordsRegistered[newLandlord] = true;
    }


    function createProposal(string memory description, uint costPerPerson, uint timeout) public isRegistered {
        require(bytes(description).length != 0 && costPerPerson != 0 && timeout != 0, "All parameters must be not null");

        // create empty votes array
        Vote[] memory votes;

        Proposal memory proposal = Proposal(nextProposalId, msg.sender, description, costPerPerson, block.timestamp, timeout, ProposalState.CREATED, votes);
        proposals[nextProposalId] = proposal;
        nextProposalId = nextProposalId + 1;
    }

    function removeProposal(uint proposalId) public isRegistered hasCREATEDState(proposalId){
        // require msg.sender is the creator of the proposal
        require(proposals[proposalId].creator == msg.sender, "Only the creator of the proposal can remove it");

        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        delete proposals[proposalId];
    }

    // we consider description == "", cost == 0 or timeout == 0 as null values.
    function editProposal(uint proposalId, string memory description, uint costPerPerson, uint timeout) public isRegistered hasCREATEDState(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.creator == msg.sender, "Only the creator of the proposal can edit it");
    
        // require at least one of the parameters is not null
        require(bytes(description).length != 0 || costPerPerson != 0 || timeout != 0, "At least one of the parameters must be not null");
        
        if (bytes(description).length != 0){
            proposal.description = description;
        }
        if (costPerPerson != 0){
            proposal.costPerPerson = costPerPerson;
        }
        if (timeout != 0){
            proposal.timeout = timeout;
        }

        proposal.timestamp = block.timestamp;
        proposal.votes = new Vote[](0);
    }

    

    function seeProposal(uint proposalId) public view returns(Proposal memory){
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        return proposals[proposalId];
    }

    function vote(uint proposalId, bool decision) public isRegistered {
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        // require proposal is in CREATED state
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");

        // require msg.sender has not voted yet
        for (uint i = 0; i < proposals[proposalId].votes.length; i++){
            require(proposals[proposalId].votes[i].landlordAddress != msg.sender, "Landlord has already voted");
        }

        Proposal storage proposal = proposals[proposalId]; // storage te lo pasa por referencia.
        // add vote to proposal votes
        Vote memory vote = Vote(msg.sender, decision ? VotesState.POSITIVE : VotesState.NEGATIVE);
        proposal.votes.push(vote);

        updateProposalStateBasedOnVote(proposal);
    }

    function editVote(uint proposalId, bool decision) public isRegistered {
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        // require proposal is in CREATED state
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");

        // require msg.sender has voted yet
        bool hasVoted = false;
        for (uint i = 0; i < proposals[proposalId].votes.length; i++){
            if (proposals[proposalId].votes[i].landlordAddress == msg.sender){
                hasVoted = true;
                break;
            }
        }
        require(hasVoted, "Landlord has not voted yet");

        Proposal storage proposal = proposals[proposalId]; // storage te lo pasa por referencia.
        Vote memory vote = Vote(msg.sender, decision ? VotesState.POSITIVE : VotesState.NEGATIVE);
        proposal.votes.push(vote);
        updateProposalStateBasedOnVote(proposal);


    }

    function updateProposalStateBasedOnVote(Proposal storage proposal) internal {
        uint positiveVotes = 0;
        uint negativeVotes = 0;

        for (uint i = 0; i < proposal.votes.length; i++){
            if (proposal.votes[i].state == VotesState.POSITIVE){
                positiveVotes++;
            }
            else {
                negativeVotes++;
            }
        }

        
        if (majority <= positiveVotes){
            proposal.state = ProposalState.ACCEPTED;
            emit ProposalAccepted(proposal.id);
            addToPriorityQueue(proposal);
            tryToFulfillProposal(proposal);
        }

        if (majority <= negativeVotes){
            proposal.state = ProposalState.DECLINED;
            removeProposal(proposal.id);
        }
    }

    function deposit() public payable isRegistered {
        // Actualizamos el valor de su cuenta.
        pool[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);

        // get 1rst priority proposal cost
        acceptedProposals.getFirstId();
        // check if all landlords have enough money to pay
        // if so, substract the same quantiy from all of them
        // and update proposals
        // else error message 
    }

    function addToPriorityQueue(Proposal storage proposal) internal {
        acceptedProposals.addEntry(proposal.id, proposal.timeout);
    }

    function tryToFulfillProposal(Proposal storage proposal) internal {

    }

}
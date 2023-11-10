// SPDX-License-Identifier: unlicensed

import "./PriorityQueue.sol";

pragma solidity >=0.8.0 <0.9.0;

contract Consorcio {

    address[] public landlordsAddresses;
    mapping(address => uint) public landlordsIndexes; // used for checking if eddress is landlord and for replacing landlords
    address owner = msg.sender;
    mapping(uint => Proposal) public proposals;
    uint nextProposalId = 1; // TODO: charlar. Puse esto porque sino habia una propuesta con id 0 y no se podia diferenciar de una propuesta que no existia en la funcion vote.
    uint numberOfParticipants = 0;
    uint public totalNumberOfParticipants;
    uint majority;
    mapping(address => uint) pool;
    PriorityQueue acceptedProposals;

    uint[] proposalsPriority; // La prioridad esta determinada por el timeout.

    enum ProposalState { CREATED, ACCEPTED, DECLINED, EXPIRED, FULFILLED }
    enum VotesState { PENDING, POSITIVE, NEGATIVE }


    struct Proposal {
        uint id;
        address creator;
        string description;
        uint costPerPerson;
        uint timestamp;
        uint timeout;
        ProposalState state;
        uint positiveVotes;
        uint negativeVotes;
        mapping(address => VotesState) votes;
    }
    
    event ProposalAccepted(uint proposalId);
    event ProposalFulfilled(uint proposalId);
    event NotEnoughBalanceToFulfill(uint proposalId);
    event Deposit(address landlord, uint amount);

    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier isRegistered {
        require(0 < landlordsIndexes[msg.sender], "Only registered landlords can call this function");
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
        require(landlordsIndexes[landlord] == 0, "Landlord is already registered");

        // require there are less than totalNumberOfParticipants landlords registered
        require(numberOfParticipants < totalNumberOfParticipants, "There are already enough landlords registered");

        numberOfParticipants++;
        landlordsIndexes[landlord] = numberOfParticipants;
        landlordsAddresses.push(landlord);
    }

    function replaceLandlord(address previousLandlord, address newLandlord) public {
        require(msg.sender == previousLandlord, "Only the landlord to be replaced can call this function");


        landlordsAddresses[landlordsIndexes[previousLandlord] - 1] = newLandlord;

        landlordsIndexes[newLandlord] = landlordsIndexes[previousLandlord];
        landlordsIndexes[previousLandlord] = 0;
    }

    // TODO: estaria bueno que esta funcion devuelva el id de la propuesta creada, ¿no? (ian)
    function createProposal(string memory description, uint costPerPerson, uint timeout) public isRegistered {
        require(bytes(description).length != 0 && costPerPerson != 0 && timeout != 0, "All parameters must be not null");

        constructProposal(nextProposalId, msg.sender, description, costPerPerson, block.timestamp, timeout);
        nextProposalId = nextProposalId + 1;
    }

    function constructProposal(uint id, address creator, string memory description, uint costPerPerson, uint timestamp, uint timeout) internal{
        Proposal storage p = proposals[nextProposalId];
        p.id = id;
        p.creator = creator;
        p.description = description;
        p.costPerPerson = costPerPerson;
        p.timestamp = timestamp;
        p.timeout = timeout;
        p.state = ProposalState.CREATED;
        p.positiveVotes = 0;
        p.negativeVotes = 0;

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
        for (uint i = 0; i < landlordsAddresses.length; i++){
            address addr = landlordsAddresses[i];
            delete proposal.votes[addr];
        }
    }


    function vote(uint proposalId, bool decision) public isRegistered {
        // require proposalId is a key in proposals
        require(proposalId > 0 && proposals[proposalId].id == proposalId, "Proposal does not exist");

        // require proposal is in CREATED state
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");

        // require msg.sender has not voted yet
        require(proposals[proposalId].votes[msg.sender] == VotesState.PENDING, "Landlord has already voted that proposal");

        updateProposalStateBasedOnVote(proposalId, msg.sender, decision);
    }

    function editVote(uint proposalId, bool decision) public isRegistered {
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        // require proposal is in CREATED state
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");

        // require msg.sender has voted yet
        require(proposals[proposalId].votes[msg.sender] != VotesState.PENDING, "Landlord has not voted yet");

        
        updateProposalStateBasedOnVote(proposalId, msg.sender, decision);
    }

    function updateProposalStateBasedOnVote(uint proposalId, address addr, bool decision) internal {
        
        Proposal storage proposal = proposals[proposalId];
        // add vote to proposal votes
        proposal.votes[addr] = decision ? VotesState.POSITIVE : VotesState.NEGATIVE;
        if (decision){
            proposal.positiveVotes++;
        }else{
            proposal.negativeVotes--;
        }
        
        if (majority <= proposal.positiveVotes){
            proposal.state = ProposalState.ACCEPTED;
            emit ProposalAccepted(proposal.id);
            addToPriorityQueue(proposal);
            tryToFulfillProposal(proposal);
        }

        if (majority <= proposal.negativeVotes){
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


    // --- View functions ---

    function seeProposal(uint proposalId) public view returns(uint id){
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        return proposalId;
    }

}
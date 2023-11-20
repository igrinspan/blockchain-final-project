// SPDX-License-Identifier: unlicensed

import "./PriorityQueue.sol";

pragma solidity >=0.8.0 <0.9.0;

contract Consorcio {

    address owner = msg.sender;
    uint public initialDeposit;

    address[] public landlordsAddresses;
    mapping(address => uint) public landlordsIndexes; // used for checking if eddress is landlord and for replacing landlords
    mapping(address => bool) public invitedLandlords;

    uint numberOfLandlords = 0;
    uint public totalNumberOfLandlords;
    uint majority;
    mapping(address => uint) pool;
    NextMonthExpenses public nextMonthExpenses;

    uint nextProposalId = 1; // TODO: charlar. Puse esto porque sino habia una propuesta con id 0 y no se podia diferenciar de una propuesta que no existia en la funcion vote.
    mapping(uint => Proposal) public proposals;
    PriorityQueue acceptedProposals;
    uint[] proposalsPriority; // La prioridad esta determinada por el timeout.

    enum ProposalState { CREATED, ACCEPTED, DECLINED, EXPIRED, FULFILLED }
    enum VotesState { PENDING, POSITIVE, NEGATIVE }

    struct NextMonthExpenses {
        uint month;
        uint value;
        mapping(address => bool) landlordHasPaid;
    }

    mapping(address => uint) landlordsDeposits;


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

    modifier isInvited {
        require(invitedLandlords[msg.sender], "Only invited landlords can call this function");
        _;
    }

    modifier hasCREATEDState(uint proposalId) {
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be edited");
        _;
    }

    modifier hasNoDebt(uint proposalId) {
        require(landlordsDeposits[msg.sender] == initialDeposit, "You must pay your deposit debt");
        _;
    }


    



    constructor(uint _totalNumberOfLandlords, uint _initialDeposit){
        totalNumberOfLandlords = _totalNumberOfLandlords;
        majority = _totalNumberOfLandlords / 2 + 1;
        initialDeposit = _initialDeposit;
    }


    function inviteLandlord(address landlord) public onlyOwner{
        require(landlord != address(0), "Invalid address");
        require(invitedLandlords[landlord] == false, "Landlord is already invited");
        require(numberOfLandlords < totalNumberOfLandlords, "There are already enough landlords registered");

        invitedLandlords[landlord] = true;
    }

    function payInitialDepositAndRegister() external payable isInvited {
        require(msg.value == initialDeposit, "Ether sent does not match initial deposit amount");
        require(landlordsIndexes[msg.sender] == 0, "Landlord is already registered"); 
        

        numberOfLandlords++;
        landlordsIndexes[msg.sender] = numberOfLandlords;
        landlordsDeposits[msg.sender] = msg.value;
        landlordsAddresses.push(msg.sender);   
    }

    function replaceLandlord(address previousLandlord, address newLandlord) public { 
        require(msg.sender == previousLandlord, "Only the landlord to be replaced can call this function");

        // move each landlord from the previousLandlord to the last one, one step back.
        for (uint i = landlordsIndexes[previousLandlord] - 1; i < landlordsAddresses.length - 2; i++) {
                landlordsIndexes[landlordsAddresses[i+1]] -= 1;
                landlordsAddresses[i] = landlordsAddresses[i + 1];
            }
        // remove last landlord
        landlordsIndexes[landlordsAddresses[landlordsAddresses.length - 1]] = 0 ;
        delete landlordsAddresses[landlordsAddresses.length - 1];

        numberOfLandlords--;

        invitedLandlords[previousLandlord] = false;
        invitedLandlords[previousLandlord] = true;
    }


    function getDeposit() isInvited external payable  { 
        require(landlordsIndexes[msg.sender] == 0, "Only unregistered landlords can call this function");
        require(0 < landlordsDeposits[msg.sender], "You must have deposited money");
        invitedLandlords[msg.sender] = false;

        // TODO : agregar pay function 

        landlordsDeposits[msg.sender] = 0;
    }

    function payNextMonthExpenses() isRegistered external payable  { 
        
        require((getMonth(block.timestamp) + 1) % 12 == nextMonthExpenses.month, "You must pay next month's expenses");
        require(msg.value == nextMonthExpenses.value, "You must pay the correct amount of money for next month's expenses");
        require(nextMonthExpenses.landlordHasPaid[msg.sender] == false);

        nextMonthExpenses.landlordHasPaid[msg.sender] = true;
    
    }

    function payDepositDebt() isRegistered external payable  { 
        require(landlordsDeposits[msg.sender] < initialDeposit, "You must have a debt");
        require(0 < msg.value, "You must pay a positive amount of money");
        require(msg.value <= initialDeposit - landlordsDeposits[msg.sender], "You must pay at most your debt");

        landlordsDeposits[msg.sender] = msg.value;
    
    }

    function addDays(uint256 timestamp, uint256 _days) public pure returns (uint256 newTimestamp) {}
    function getMonth(uint256 timestamp) internal pure returns (uint256 month) {}

    function timestampToDateTime(uint256 timestamp)
        public
        pure
        returns (uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute, uint256 second)
    {}

    function calculateNextMonthExpenses() isRegistered external view returns(uint256){
        // Cuando se llame la funcion, tiene que ser el ultimo dia del mes.
        (, , uint256 nextDay, , , ) = timestampToDateTime(addDays(block.timestamp, 1));
        require(nextDay == 1);
        // La primera vez que se llame a la funcion en un mes particular, se debera calcular cuanto debe pagar cada uno el siguiente mes.
        uint nextMonth = getMonth(block.timestamp) + 1;
        if (nextMonthExpenses.month < nextMonth){
            uint[] memory nextMonthProposalsIDs = acceptedProposals.getNextMonthProposalsIDs(nextMonth);
            uint totalCostPerPerson = 0;
            // calculate total value for next months
            for (uint i=0; i < nextMonthProposalsIDs.length; i++) {
                totalCostPerPerson += proposals[nextMonthProposalsIDs[i]].costPerPerson;
            }
            nextMonthExpenses.month = nextMonth;
            nextMonthExpenses.value = totalCostPerPerson;

            for (uint i = 0; i < landlordsAddresses.length; i++){ // update landlords next month's expenses
                nextMonthExpenses.landlordHasPaid[landlordsAddresses[i]] = false;
            }
        }
        return nextMonthExpenses.value;
    }

    function createProposal(string memory description, uint costPerPerson, uint timeout) public isRegistered hasNoDebt {
        require(bytes(description).length != 0 && costPerPerson != 0 && timeout != 0, "All parameters must be not null");
        require(block.timestamp < timeout);

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
        if (timeout != 0 && block.timestamp < timeout){
            proposal.timeout = timeout;
        }

        proposal.timestamp = block.timestamp;
        for (uint i = 0; i < landlordsAddresses.length; i++){
            address addr = landlordsAddresses[i];
            delete proposal.votes[addr];
        }
    }

    function vote(uint proposalId, bool decision) public isRegistered hasNoDebt {
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

        // require decision is not the same as before (i.e. voter is changing his vote)
        require(proposals[proposalId].votes[msg.sender] == VotesState.POSITIVE && !decision || 
        proposals[proposalId].votes[msg.sender] == VotesState.NEGATIVE && decision, "Vote cannot be the same");

        
        updateProposalStateBasedOnVote(proposalId, msg.sender, decision);
    }

    function updateProposalStateBasedOnVote(uint proposalId, address addr, bool decision) internal {
        
        Proposal storage proposal = proposals[proposalId];
        // add vote to proposal votes
        proposal.votes[addr] = decision ? VotesState.POSITIVE : VotesState.NEGATIVE;
        if (decision){ // TODO : reportar error gracias a fuzzing
            proposal.positiveVotes++;
            proposal.negativeVotes--;
        }else{
            proposal.positiveVotes--;
            proposal.negativeVotes++;
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

    // TODO: el primero de cada mes se llama a la funcion que intenta cumplir todas las propuestas de este mes que empieza. 
    // check which landlord hasn't paid (looking into nextMonthExpenses.landlordHasPaid). Notify to the others (emit event) and discount the debt from the deposit.
    // para cada propueta con prioridad mayor que pueda ser cumplida,
    // - emite un evento
    // - ACCEPTED -> FULFILLED
    // para las demas, no son ACCEPTED o DECLINED (no se llegó un acuerdo antes de su fecha limite), las cambia por EXPIRED
    // - emite un evento
    // - ACCEPTED -> EXPIRED
    

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

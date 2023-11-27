// SPDX-License-Identifier: unlicensed

import "./PriorityQueue.sol";
import "./DateTime.sol";

pragma solidity >=0.8.0 <0.9.0;

contract Consorcio {

    address owner = msg.sender;
    uint public initialDeposit;

    address[] public landlordsAddresses;
    mapping(address => uint) public landlordsIndexes; // used for checking if address is landlord and for replacing landlords
    mapping(address => bool) public invitedLandlords;

    uint public numberOfLandlords = 0;
    uint totalNumberOfLandlords;
    uint majority;
    NextMonthExpenses public nextMonthExpenses;

    uint nextProposalId = 1;
    mapping(uint => Proposal) public proposals;
    PriorityQueue acceptedProposals = new PriorityQueue();

    enum ProposalState { CREATED, ACCEPTED, DECLINED, EXPIRED, FULFILLED }
    enum VotesState { PENDING, POSITIVE, NEGATIVE }

    struct NextMonthExpenses {
        uint month;
        uint year;
        uint value;
        mapping(address => bool) landlordHasPaid;
    }

    mapping(address => uint) landlordsDeposits;
    mapping(address => uint) landlordsBalances;


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
    event ProposalExpired(uint proposalId);
    event NotEnoughBalanceToFulfill(uint proposalId);
    event Deposit(address landlord, uint amount);
    event LandlordHasNotPaid(address landlord, uint month, uint amount);

    // TODO: agregar algún tipo de lock para que no se pueda llamar correctamente
    // a calculateNextMonthExpenses y tryToFulfillAllProposals mas de una vez por mes.

    constructor(uint _totalNumberOfLandlords, uint _initialDeposit){
        totalNumberOfLandlords = _totalNumberOfLandlords;
        majority = _totalNumberOfLandlords / 2 + 1;
        initialDeposit = _initialDeposit;
    }

    // --- Landlord management functions ---
    function inviteLandlord(address landlord) external onlyOwner{
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

    function replaceLandlord(address previousLandlord, address newLandlord) external { 
        require(msg.sender == previousLandlord, "Only the landlord to be replaced can call this function");

        uint index = landlordsIndexes[previousLandlord];
        require(index > 0, "Landlord to be replaced is not registered");

        // Ajuste para evitar comenzar con un índice negativo
        index -= 1;

        for (uint i = index; i < landlordsAddresses.length - 1; i++) {
            landlordsIndexes[landlordsAddresses[i + 1]] = i;
            landlordsAddresses[i] = landlordsAddresses[i + 1];
        }

        landlordsIndexes[landlordsAddresses[landlordsAddresses.length - 1]] = 0;
        landlordsAddresses.pop();
        numberOfLandlords--;

        invitedLandlords[newLandlord] = true;
    }


    function getDepositAndExtraBalance() isInvited external { 
        require(invitedLandlords[msg.sender], "Only invited landlords can call this function");
        require(landlordsIndexes[msg.sender] == 0, "Landlord is still registered");
        require(0 < landlordsDeposits[msg.sender], "Landlord has no deposit to claim");
        
        invitedLandlords[msg.sender] = false;
        uint balanceToTransfer = landlordsDeposits[msg.sender];
        balanceToTransfer += landlordsBalances[msg.sender];

        landlordsDeposits[msg.sender] = 0;
        landlordsBalances[msg.sender] = 0;

        payable(msg.sender).transfer(balanceToTransfer);
    }

    // TODO: esta solo se deberia poder llamar el 1ero de cada mes o el ultimo dia de cada mes?
    function payNextMonthExpenses() isRegistered external payable  {
        (uint month, uint year) = DateTime.nextMonthAndYear(block.timestamp);
        require(month == nextMonthExpenses.month && year == nextMonthExpenses.year, "You must pay next month's expenses");
        require(nextMonthExpenses.landlordHasPaid[msg.sender] == false, "You have already paid next month's expenses");
        require(msg.value == myNextMonthExpenses(), "Ether sent does not match next month's expenses");

        nextMonthExpenses.landlordHasPaid[msg.sender] = true;
        landlordsBalances[msg.sender] += msg.value;
    }

    function payDepositDebt() isRegistered external payable  { 
        require(landlordsDeposits[msg.sender] < initialDeposit, "You must have a debt");
        require(0 < msg.value, "You must pay a positive amount of money");
        require(msg.value <= initialDeposit - landlordsDeposits[msg.sender], "You must pay at most your debt");

        landlordsDeposits[msg.sender] = msg.value;
    }

    function calculateNextMonthExpenses() isRegistered external {
        uint nextDay = DateTime.getDay(DateTime.addDays(block.timestamp, 1));
        require(nextDay == 1, "You can only calculate next month's expenses the last day of the month");
        
        uint nextMonth = DateTime.getMonth(block.timestamp) + 1;
        uint year = DateTime.getYear(block.timestamp);



        if (nextMonth > 12) { // Si estamos en diciembre, calculamos para enero del siguiente año
            nextMonth = 1;
            year = year + 1;
        }

        if (nextMonthExpenses.month == nextMonth && nextMonthExpenses.year == year){
            return; // Porque ya se calculó el valor para el mes siguiente
        }

        uint[] memory nextMonthProposalsIDs = acceptedProposals.getMonthProposalsIDs(nextMonth, year);

        nextMonthExpenses.month = nextMonth;

        uint totalCostPerPerson = 0;
        for (uint i = 0; i < nextMonthProposalsIDs.length; i++) {
            totalCostPerPerson += proposals[nextMonthProposalsIDs[i]].costPerPerson;
        }

        nextMonthExpenses.month = nextMonth;
        nextMonthExpenses.year = year;
        nextMonthExpenses.value = totalCostPerPerson;
        
        for (uint i = 0; i < landlordsAddresses.length; i++){ // update landlords next month's expenses
            nextMonthExpenses.landlordHasPaid[landlordsAddresses[i]] = false;
        }

        // printExpenses();
    }

    function myNextMonthExpenses() public view returns(uint256){
        require(0 < landlordsIndexes[tx.origin], "Only registered landlords can call this function");
        if (landlordsBalances[tx.origin] > nextMonthExpenses.value){
            return 0;
        } else {
            return nextMonthExpenses.value - landlordsBalances[tx.origin];
        }
    }


    // --- Proposal management functions ---

    function createProposal(string memory description, uint costPerPerson, uint day, uint month, uint year) external isRegistered hasNoDebt {
        require(bytes(description).length != 0 && costPerPerson != 0 , "All parameters must be not null");
        require(DateTime.isFutureDate(day, month, year), "Date must be in the future");

        uint timeout = DateTime.timestampFromDateTime(day, month, year);

        // Hacemos que el timeout que manda el usuario sea en cuánto tiempo vence la propuesta o exactamente la fecha/hora en la que vence la propuesta?
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

    function removeProposal(uint proposalId) public isRegistered hasDECLINEDState(proposalId){
        require(proposals[proposalId].creator == msg.sender, "Only the creator of the proposal can remove it");
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        delete proposals[proposalId];
    }

    // we consider description == "", cost == 0 as null values.
    function editProposal(uint proposalId, string memory description, uint costPerPerson, uint day, uint month, uint year) external isRegistered hasCREATEDState(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.creator == msg.sender, "Only the creator of the proposal can edit it");
        require(bytes(description).length != 0 || costPerPerson != 0, "At least one of the parameters must be not null");
        require(DateTime.isFutureDate(day, month, year), "Date must be in the future");
        
        if (bytes(description).length != 0){
            proposal.description = description;
        }
        if (costPerPerson != 0){
            proposal.costPerPerson = costPerPerson;
        }
        uint timeout = DateTime.timestampFromDateTime(day, month, year);
        if (timeout != 0 && block.timestamp < timeout){
            proposal.timeout = timeout;
        }

        proposal.timestamp = block.timestamp;
        for (uint i = 0; i < landlordsAddresses.length; i++){
            address addr = landlordsAddresses[i];
            delete proposal.votes[addr];
        }
    }

    function vote(uint proposalId, bool decision) external isRegistered hasNoDebt {
        require(proposalId > 0 && proposals[proposalId].id == proposalId, "Proposal does not exist");
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");
        require(proposals[proposalId].votes[msg.sender] == VotesState.PENDING, "Landlord has already voted that proposal");

        updateProposalStateBasedOnVote(proposalId, msg.sender, decision);
    }

    function editVote(uint proposalId, bool decision) external isRegistered {
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state to be voted");
        require(proposals[proposalId].votes[msg.sender] != VotesState.PENDING, "Landlord has not voted this proposal yet");

        // require decision is not the same as before (i.e. voter is changing his vote)
        require(proposals[proposalId].votes[msg.sender] == VotesState.POSITIVE && !decision || 
        proposals[proposalId].votes[msg.sender] == VotesState.NEGATIVE && decision, "Vote cannot be the same");
        
        updateProposalStateBasedOnEdit(proposalId, msg.sender, decision);
    }

    function updateProposalStateBasedOnVote(uint proposalId, address addr, bool decision) internal {   
        Proposal storage proposal = proposals[proposalId];

        proposal.votes[addr] = decision ? VotesState.POSITIVE : VotesState.NEGATIVE;
        if (decision){
            proposal.positiveVotes++;
        }else{
            proposal.negativeVotes++;
        }
        checkProposalState(proposal);
    }

    function updateProposalStateBasedOnEdit(uint proposalId, address addr, bool decision) internal {
        Proposal storage proposal = proposals[proposalId];

        proposal.votes[addr] = decision ? VotesState.POSITIVE : VotesState.NEGATIVE;
        if (decision){ // TODO : reportar error gracias a fuzzing
            proposal.positiveVotes++;
            proposal.negativeVotes--;
        }else{
            proposal.positiveVotes--;
            proposal.negativeVotes++;
        }
        
        checkProposalState(proposal);
    }

    function checkProposalState(Proposal storage proposal) internal {
        if (majority <= proposal.positiveVotes){
            proposal.state = ProposalState.ACCEPTED;
            emit ProposalAccepted(proposal.id);
            addToPriorityQueue(proposal);
        }

        if (majority <= proposal.negativeVotes){
            proposal.state = ProposalState.DECLINED;
            // TODO: la sacamos una vez que se declina? o en realidad esperamos a que llegue su mes? 
            // porque alguien podria cambiar de voto y hacer que de declined pase a accepted por ejemplo
            // Lo mismo se puede pensar con el addToPriorityQueue.
            removeProposal(proposal.id);
        }
    }

    // el primero de cada mes se llama a la funcion que intenta cumplir todas las propuestas de este mes que empieza.
    // TODO: faltaria agregar el require de que solo se pueda llamar el 1ero de cada mes.
    // TODO: y que sólo pueda ser llamado por landlords?
    function tryToFulfillAllProposals() public {
        // Check which landlord hasn't paid.
        for (uint i = 0; i < landlordsAddresses.length; i++){
            if (nextMonthExpenses.landlordHasPaid[landlordsAddresses[i]] == false){
                // Notify to the others (emit event) and discount the debt from the deposit.
                emit LandlordHasNotPaid(landlordsAddresses[i], nextMonthExpenses.month, nextMonthExpenses.value);
                // TODO: no hay que chequear que el deposito quede mayor o igual a 0 antes de restar?
                if (landlordsDeposits[landlordsAddresses[i]] >= nextMonthExpenses.value){
                    landlordsDeposits[landlordsAddresses[i]] -= nextMonthExpenses.value;
                    landlordsBalances[landlordsAddresses[i]] += nextMonthExpenses.value;
                }
            }
        }

        // Para cada propuesta del mes, ver en que estado esta
        uint[] memory currentMonthProposalIDs = acceptedProposals.getMonthProposalsIDs(DateTime.getMonth(block.timestamp), DateTime.getYear(block.timestamp));
        bool fulfilled = true;
        for (uint i = 0; i < currentMonthProposalIDs.length; i++){
            if (fulfilled){
                fulfilled = tryToFulfillProposal(proposals[currentMonthProposalIDs[i]]);
            } else {
                emit NotEnoughBalanceToFulfill(currentMonthProposalIDs[i]);
                acceptedProposals.removeEntry(i); // TODO: agregué esto porque sino acceptedProposals no cambiaba nunca. o sea no se borraban las proposals de ahi.
                proposals[currentMonthProposalIDs[i]].state = ProposalState.EXPIRED;
            }
        }
    }

    function tryToFulfillProposal(Proposal storage proposal) internal returns(bool){
        uint lastLandlordThatPaid;
        // Chequear si tenemos suficiente balance para cumplir la propuesta recorriendo los balances de los landlords
        for(uint i = 0; i < landlordsAddresses.length; i++){
            if (landlordsBalances[landlordsAddresses[i]] < proposal.costPerPerson){
                emit NotEnoughBalanceToFulfill(proposal.id);
                proposal.state = ProposalState.EXPIRED;
                acceptedProposals.removeEntry(proposal.id);
                break;
            }
            lastLandlordThatPaid = i;
            landlordsBalances[landlordsAddresses[i]] -= proposal.costPerPerson;
        }
        if (lastLandlordThatPaid < landlordsAddresses.length - 1){
            for (int i = int(lastLandlordThatPaid); i >= 0; i--){
                landlordsBalances[landlordsAddresses[uint(i)]] += proposal.costPerPerson;
            }
            return false; 
        } 

        proposal.state = ProposalState.FULFILLED;
        emit ProposalFulfilled(proposal.id);
        acceptedProposals.removeEntry(proposal.id);
        return true;
    }

    function addToPriorityQueue(Proposal storage proposal) internal {
        acceptedProposals.addEntry(proposal.id, proposal.timeout);
    }

    // --- View functions ---
    // TODO: borrar las funciones que no se usan en los tests (varias funciones las creé solo para debuggear)
    function seeProposal(uint proposalId) public view returns(uint, uint, uint){
        // require proposalId is a key in proposals
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");

        return (proposalId, proposals[proposalId].timeout, proposals[proposalId].costPerPerson);
    }

     function getVote(uint proposalID, address landlord) isRegistered2(landlord) public view returns(bool){
         require(proposals[proposalID].id == proposalID, "Proposal does not exist");
 
         return proposals[proposalID].votes[landlord] == VotesState.POSITIVE;
     }
 
     function hasPaidNextMonthExpenses(address landlord) isRegistered2(landlord) public view returns(bool){
         return nextMonthExpenses.landlordHasPaid[landlord];
     }
 
     function getDepositOf(address landlord) isRegistered2(landlord) public view returns(uint){
         return landlordsDeposits[landlord];
     }
 
     function getBalanceOf(address landlord) isRegistered2(landlord) public view returns(uint){
         return landlordsBalances[landlord];
     }
 
     function getMonthExpenses() public view returns(uint, uint, uint){
         return (nextMonthExpenses.month, nextMonthExpenses.year, nextMonthExpenses.value);
     }

//    function printExpenses() public view {
//        console.log("Next Month Expenses: %s, %s, %s", nextMonthExpenses.month, nextMonthExpenses.year, nextMonthExpenses.value);
//    }
    // -----------------

    // --- Modifiers ---
    modifier onlyOwner {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier isRegistered {
        require(0 < landlordsIndexes[msg.sender], "Only registered landlords can call this function");
        _;
    }

    modifier isRegistered2(address landlord){
        require(0 < landlordsIndexes[landlord], "Landlord is not registered");
        _;
    }

    modifier isInvited {
        require(invitedLandlords[msg.sender], "Only invited landlords can call this function");
        _;
    }

    modifier hasCREATEDState(uint proposalId) {
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");
        require(proposals[proposalId].state == ProposalState.CREATED, "Proposal must be in CREATED state");
        _;
    }

    modifier hasDECLINEDState(uint proposalId) {
        require(proposals[proposalId].id == proposalId, "Proposal does not exist");
        require(proposals[proposalId].state == ProposalState.DECLINED, "Proposal must be in DECLINED state");
        _;
    }

    modifier hasNoDebt {
        require(landlordsDeposits[msg.sender] == initialDeposit, "You must pay your deposit debt");
        _;
    }
}
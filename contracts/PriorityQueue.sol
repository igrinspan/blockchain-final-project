// SPDX-License-Identifier: unlicensed

import "./DateTime.sol";

pragma solidity >=0.8.0 <0.9.0;

contract PriorityQueue {

  uint public length = 0; // also used as nonce
  uint public head;
  mapping (uint => Node) public nodes;


  struct Node{
    uint next;
    uint id;
    uint timeout;
  }

  event EntryAdded(uint head, uint id, uint timeout);
  event EntryRemoved(uint head, uint id);

  function findPreviousAndCurrent(uint _id, uint _timeout) private view returns(uint, uint){
    uint currentNodeId = head;
    uint previousNodeId = 0;

    while(currentNodeId != 0){
        Node storage tempNode = nodes[currentNodeId];
        
        if (currentNodeId == _id || _timeout < tempNode.timeout){ // 
            // Lo insertamos 
            break;
        }

        previousNodeId = currentNodeId; 
        currentNodeId = nodes[previousNodeId].next; 
    }

    return(previousNodeId, currentNodeId);
  }

  function addEntry(uint _id, uint _timeout) external {
    
    // Recorrer la lista fijandose los timeouts y meter el nodo cuando encontremos una de menor prioridad.
    (uint previousNodeId, uint tempNodeId) = findPreviousAndCurrent(_id, _timeout);

    if(tempNodeId == head){ // if first node
        head = _id;
    }

    Node memory new_node = Node(nodes[previousNodeId].next, _id, _timeout);
    nodes[previousNodeId].next = _id;

    nodes[_id] = new_node;
    length = length+1;
    emit EntryAdded(head, _id, _timeout);
  }

  function removeEntry(uint _id) external {
    require(nodes[_id].id == _id, "Node is not in queue");
    
    (uint previousNodeId, uint tempNodeId) = findPreviousAndCurrent(_id, nodes[_id].timeout);

    if(tempNodeId == head){ // if first node
        head = nodes[tempNodeId].next;
    }

    nodes[previousNodeId].next = nodes[tempNodeId].next;

    // remove tempNodeId from nnodes
    length = length-1;
    emit EntryRemoved(head, _id);
  }

  //needed for external contract access to struct
  function getEntry(uint _id) external view returns (uint,uint){
    return (nodes[_id].next, nodes[_id].timeout);
  }

  function getFirstId() external view returns(uint){
    return head;
  }

  function getMonthProposalsIDs(uint month) public view returns(uint[] memory){
      uint currentNodeId = head;
      uint numberOfMonthProposalsIDs = 0;
      while(currentNodeId != 0){
        Node storage tempNode = nodes[currentNodeId];
        if (month < DateTime.getMonth(tempNode.timeout)){
            // Insert logic here
            break;
        }
        numberOfMonthProposalsIDs++;
        currentNodeId = nodes[currentNodeId].next; 
      }

      currentNodeId = head;
      uint[] memory proposalsIDs = new uint[](numberOfMonthProposalsIDs);

      for (uint i = 0; i < numberOfMonthProposalsIDs; i++){
        proposalsIDs[i] = currentNodeId;
        currentNodeId = nodes[currentNodeId].next; 
      }

      return proposalsIDs; 
  }

  function getNodeInPosition(uint position) external view returns(Node memory){
    require(position < length, "Position is out of bounds");

    // Iterate throug the mapping nodes until we get to the "position" node
    uint currentNodeId = head;
    for(uint i = 0; i < position; i++){
      currentNodeId = nodes[currentNodeId].next; 
    }
    return nodes[currentNodeId];
  }


}
// SPDX-License-Identifier: unlicensed

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

  event AddEntry(uint head, uint id, uint timeout);
  event RemoveEntry(uint head, uint id);

  function findPreviousAndCurrent(uint _timeout, uint _id) public view returns(uint, uint){
    uint tempNodeId = head;
    uint previousNodeId = 0; 

    while(tempNodeId != 0){
        Node storage tempNode = nodes[tempNodeId];
        
        if (tempNodeId == _id || _timeout < tempNode.timeout){
            // Lo insertamos 
            break;
        }

        previousNodeId = tempNodeId; 
        tempNodeId = nodes[previousNodeId].next; 
    }
    return(previousNodeId, tempNodeId);
  }

  function addEntry(uint _id, uint _timeout) public {
    // Recorrer la lista fijandose los timeouts y meter el nodo cuando encontremos una de menor prioridad.
  
    (uint previousNodeId, uint tempNodeId) = findPreviousAndCurrent(_id, _timeout);

    if(tempNodeId == head){ // if first node
        head = _id;
    }

    Node memory new_node = Node(nodes[previousNodeId].next, _id, _timeout);
    nodes[previousNodeId].next = _id;

    nodes[_id] = new_node;
    length = length+1;
    emit AddEntry(head, _id, _timeout);
  }

  function removeEntry(uint _id) public {
    
    (uint previousNodeId, uint tempNodeId) = findPreviousAndCurrent(_id, nodes[_id].timeout);

    if(tempNodeId == head){ // if first node
        head = nodes[tempNodeId].next;
    }

    nodes[previousNodeId].next = nodes[tempNodeId].next;

    // remove tempNodeId from nnodes
    length = length-1;
    emit RemoveEntry(head, _id);
  }

  //needed for external contract access to struct
  function getEntry(uint _id) public view returns (uint,uint){
    return (nodes[_id].next, nodes[_id].timeout);
  }

  function getFirstId() public view returns(uint){
    return head;
  }


}
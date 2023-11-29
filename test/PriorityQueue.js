const { expect } = require("chai");
const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const JUL_01_2024_00_00_05_TIMESTAMP = 1719792005;
const SEP_01_2024_00_00_00_TIMESTAMP = 1725159600;
const JUL_01_2025_00_00_05_TIMESTAMP = 1751338805;

describe("PriorityQueue Contract", function () {


  // We define a fixture to reuse the same setup in every test: Deploying the priorityQueue contract, which uses DateTime library.
  const deployTokenFixture = async () => {

    // Deploy library DateTime and get the address of deployment.
    const dateTime = await ethers.deployContract("DateTime");
    await dateTime.waitForDeployment();

    const PriorityQueue = await ethers.getContractFactory("PriorityQueue");
    const priorityQueue = await PriorityQueue.deploy();
    await priorityQueue.waitForDeployment();
    return { priorityQueue };
  };
  

  // ADD ENTRY
  describe("addEntry", function () {
      it("Should increment size by 1", async function () {
      
          const { priorityQueue } = await loadFixture(deployTokenFixture);
          const previousLength = await priorityQueue.length();

          await priorityQueue.addEntry(1, 10);
      
          expect(previousLength).to.equal(0);
          expect(await priorityQueue.length()).to.equal(1);
      });

      it("Should update head when queue was empty", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        const previousHead = await priorityQueue.head();

        await priorityQueue.addEntry(1, 10);

        expect(previousHead).to.equal(0);
        expect(await priorityQueue.head()).to.equal(1);
      });

      it("Should update head when inserting highest priority element", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await priorityQueue.addEntry(1, 10);
        const previousHead = await priorityQueue.head();
        await priorityQueue.addEntry(2, 3);

        expect(previousHead).to.equal(1);
        expect(await priorityQueue.head()).to.equal(2);
      });

      it("Should keep previous head when inserting lowest priority element", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await priorityQueue.addEntry(1, 10);
        const previousHead = await priorityQueue.head();
        await priorityQueue.addEntry(2, 20);

        expect(previousHead).to.equal(1);
        expect(await priorityQueue.head()).to.equal(1);
      });

      it("Should emit EntryAdded event", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await expect(priorityQueue.addEntry(1, 10))
          .to.emit(priorityQueue, "EntryAdded")
          .withArgs(1, 1, 10);
      });
  });

  // REMOVE ENTRY
  describe("removeEntry", function () {
      it("Should decrement size by 1 when only one node", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await priorityQueue.addEntry(1, 10);
        const previousLength = await priorityQueue.length();
        await priorityQueue.removeEntry(1);

        expect(previousLength).to.equal(1);
        expect(await priorityQueue.length()).to.equal(0);
      });

      it("Should decrement size by 1 when multiple nodes", async function(){
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await priorityQueue.addEntry(11, 10);
        await priorityQueue.addEntry(23, 25)
        const previousLength = await priorityQueue.length();
        await priorityQueue.removeEntry(11);

        expect(previousLength).to.equal(2);
        expect(await priorityQueue.length()).to.equal(1);
        expect(await priorityQueue.head()).to.equal(23)
      })

      it("Should do nothing if queue is empty", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        const previousLength = await priorityQueue.length();
        const previousHead = await priorityQueue.head();

        await expect (priorityQueue.removeEntry(1)).to.revertedWith("Node is not in queue");

        expect(previousLength).to.equal(0);
        expect(previousHead).to.equal(0);

        expect(await priorityQueue.length()).to.equal(0);
        expect(await priorityQueue.head()).to.equal(0);
      });

      it("Should do nothing if node is not in the queue", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        const previousLength = await priorityQueue.length();
        const previousHead = await priorityQueue.head();

        await priorityQueue.addEntry(3, 10);
        
        await expect (priorityQueue.removeEntry(5)).to.revertedWith("Node is not in queue");

        expect(previousLength).to.equal(0);
        expect(previousHead).to.equal(0);

        expect(await priorityQueue.length()).to.equal(1);
        expect(await priorityQueue.head()).to.equal(3);
      });

  });

  // GET NODE IN POSITION
  describe("getNodeInPosition", function () {
    it("0 -> Should return head", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);
      
      await priorityQueue.addEntry(1, 10);

      let { nextId, id, timeout } = await priorityQueue.getNodeInPosition(0);

      expect(await id).to.equal(1);
    });

    it("1 -> Should return next node", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);
      
      await priorityQueue.addEntry(1, 10);
      await priorityQueue.addEntry(2, 20);

      let { n, id, t } = await priorityQueue.getNodeInPosition(1);

      expect(await id).to.equal(2);
    });

    it("Should return 0 if position is greater than size", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);
      
      await priorityQueue.addEntry(1, 10);

      await expect(priorityQueue.getNodeInPosition(1)).to.be.revertedWith("Position is out of bounds");
    });
  });

  // getMonthProposalsIDs
  describe("getMonthProposalsIDs", function () {
    it("Should return empty array if queue is empty", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);

      expect(await priorityQueue.getMonthProposalsIDs(8, 2024)).to.be.empty;
    });

    it("Should return empty array if queue is not empty but no node has the same month", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);

      await priorityQueue.addEntry(1, SEP_01_2024_00_00_00_TIMESTAMP);

      expect(await priorityQueue.getMonthProposalsIDs(8, 2024)).to.be.empty;
    });

    it("Should return array with node id if queue is not empty and node has the same month", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);

      await priorityQueue.addEntry(1, JUL_01_2024_00_00_05_TIMESTAMP);

      let res = await priorityQueue.getMonthProposalsIDs(7, 2024);

      expect(res).to.have.lengthOf(1);
      expect(res[0]).to.equal(1);
    });

    it("Should return only from this year when queue has nodes from same month and different years", async function () {
      const { priorityQueue } = await loadFixture(deployTokenFixture);

      await priorityQueue.addEntry(1, JUL_01_2024_00_00_05_TIMESTAMP);
      await priorityQueue.addEntry(2, JUL_01_2025_00_00_05_TIMESTAMP);

      let res = await priorityQueue.getMonthProposalsIDs(7, 2024);

      expect(res).to.have.lengthOf(1);
      expect(res[0]).to.equal(1);
    });

    it("Should work properly witj multiple proposals", async function(){
      const { priorityQueue } = await loadFixture(deployTokenFixture);

      await priorityQueue.addEntry(15, 1721001600);
      await priorityQueue.addEntry(23, 1723248000);

      let res7 = await priorityQueue.getMonthProposalsIDs(7, 2024);
      
      expect(res7).to.have.lengthOf(1);
      expect(res7[0]).to.equal(15);
      
      await priorityQueue.removeEntry(15);
      
      let res8 = await priorityQueue.getMonthProposalsIDs(8, 2024);
      expect(res8).to.have.lengthOf(1);
      expect(res8[0]).to.equal(23);
    })

  });

  const getNextAndTimeout = async (priorityQueue, nodeId) => {
    const res = (await priorityQueue.getEntry(nodeId)).values();
    const nextNode = Number(res.next().value);
    const timeout = Number(res.next().value);
    return { nextNode, timeout };
  };
  
  describe("test integrador", function () {

    it("Should pass", async function () {    

      let nextNode1, nextNode2, nextNode3, nextNode4;
      let timeout1, timeout2, timeout3, timeout4;


      const { priorityQueue } = await loadFixture(deployTokenFixture);
      expect(await priorityQueue.length()).to.equal(0);
      expect(await priorityQueue.head()).to.equal(0);

      await priorityQueue.addEntry(1, 10); // add node 1 with timeout 10
      expect(await priorityQueue.length()).to.equal(1);
      expect(await priorityQueue.head()).to.equal(1); 

      ({ nextNode: nextNode1, timeout: timeout1 } = await getNextAndTimeout(priorityQueue, 1));
      expect(nextNode1).to.equal(0);
      expect(timeout1).to.equal(10);

      await priorityQueue.addEntry(2, 24); // add node 2 with timeout 24
      expect(await priorityQueue.length()).to.equal(2);
      expect(await priorityQueue.head()).to.equal(1);

      ({ nextNode: nextNode1, timeout: timeout1 } = await getNextAndTimeout(priorityQueue, 1));
      ({ nextNode: nextNode2, timeout: timeout2 } = await getNextAndTimeout(priorityQueue, 2));
      expect(nextNode1).to.equal(2);
      expect(timeout1).to.equal(10);
      expect(nextNode2).to.equal(0);
      expect(timeout2).to.equal(24);

      await priorityQueue.addEntry(3, 5); // add node 3 with timeout 5
      expect(await priorityQueue.length()).to.equal(3);
      expect(await priorityQueue.head()).to.equal(3);

      ({ nextNode: nextNode3, timeout: timeout3 } = await getNextAndTimeout(priorityQueue, 3));
      expect(nextNode3).to.equal(1);
      expect(timeout3).to.equal(5);

      await priorityQueue.addEntry(4, 12); // add node 4 with timeout 12
      expect(await priorityQueue.length()).to.equal(4);
      expect(await priorityQueue.head()).to.equal(3);

      ({ nextNode: nextNode1, timeout: timeout1 } = await getNextAndTimeout(priorityQueue, 1));
      ({ nextNode: nextNode2, timeout: timeout2 } = await getNextAndTimeout(priorityQueue, 2));
      ({ nextNode: nextNode3, timeout: timeout3 } = await getNextAndTimeout(priorityQueue, 3));
      ({ nextNode: nextNode4, timeout: timeout4 } = await getNextAndTimeout(priorityQueue, 4));
      expect(nextNode3).to.equal(1); expect(timeout3).to.equal(5);
      expect(nextNode1).to.equal(4); expect(timeout1).to.equal(10);
      expect(nextNode4).to.equal(2); expect(timeout4).to.equal(12);
      expect(nextNode2).to.equal(0); expect(timeout2).to.equal(24);
    });

  });
});
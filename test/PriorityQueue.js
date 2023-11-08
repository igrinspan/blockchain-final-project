const { expect } = require("chai");
const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


describe("PriorityQueue Contract", function () {

  // We define a fixture to reuse the same setup in every test.
  async function deployTokenFixture() {
    const priorityQueue = await ethers.deployContract("PriorityQueue");
    await priorityQueue.waitForDeployment();

    // Fixtures can return anything you consider useful for your tests
    return { priorityQueue };
  }

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
      it("Should decrement size by 1", async function () {
        const { priorityQueue } = await loadFixture(deployTokenFixture);
        
        await priorityQueue.addEntry(1, 10);
        const previousLength = await priorityQueue.length();
        await priorityQueue.removeEntry(1);

        expect(previousLength).to.equal(1);
        expect(await priorityQueue.length()).to.equal(0);
      });

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

  const getNextAndTimeout = async (priorityQueue, nodeId) => {
    const res = (await priorityQueue.getEntry(nodeId)).values();
    const nextNode = Number(res.next().value);
    const timeout = Number(res.next().value);
    return { nextNode, timeout };
  }
  
  describe("test integrador", function () {

    it("should pass obviamente", async function () {    

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
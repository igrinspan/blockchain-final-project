const { expect } = require("chai");
const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


const VALID_PROPOSAL_DESCRIPTION = "Proposal 1";
const VALID_PROPOSAL_COST_PER_PERSON = 100;
const VALID_PROPOSAL_TIMEOUT = 10;
const TEST_NOT_IMPLEMENTED_MESSAGE = "TODAVIA NO IMPLEMENTAMOS ESTE TEST";

// We define a fixture to reuse the same setup in every test.
async function deployConsorcioWith3ParticipantsAndReturn4Signers() {
    const consorcio = await ethers.deployContract("Consorcio", [3]);
    await consorcio.waitForDeployment();

    const signers = await ethers.getSigners();
    const participants = signers.slice(0, 4);

    return { consorcio, participants };
}

describe("Consorcio Contract", function () {
    describe("registerLandlord", function () {
        it("Should register landlord", async function () {

            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1, addr2] = participants;
            
            await consorcio.registerLandlord(addr1.address);

            expect(await consorcio.landlordsAddresses(0)).to.equal(addr1.address);
            expect(await consorcio.landlordsIndexes(addr1.address)).to.not.equal(0);
        });
        
        it("Should not register more landlords than totalNumberOfParticipants", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1, addr2, addr3] = participants;

            await consorcio.registerLandlord(deployer.address);
            await consorcio.registerLandlord(addr1.address);
            await consorcio.registerLandlord(addr2.address);

            await expect(consorcio.registerLandlord(addr3.address)).to.be.revertedWith("There are already enough landlords registered");
        });

        it("Should not register landlord twice", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);
            await expect(consorcio.registerLandlord(addr1.address)).to.be.revertedWith("Landlord is already registered");
        });

        it("Should not register landlord from non-owner", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await expect(consorcio.connect(addr1).registerLandlord(addr1.address)).to.be.revertedWith("Only the owner can call this function");
        });
    });

    describe("replaceLandlord", function () {
        it("Should replace landlord if called by that landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;

            await consorcio.registerLandlord(addr1.address);
            await consorcio.connect(addr1).replaceLandlord(addr1.address, addr2.address);

            expect(await consorcio.landlordsAddresses(0)).to.equal(addr2.address);
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(0);
            expect(await consorcio.landlordsIndexes(addr2.address)).to.not.equal(0);
        });

        it("Should not replace landlord if called by other address", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1, addr2, addr3] = participants;

            await consorcio.registerLandlord(addr1.address);
            await expect(consorcio.connect(addr2).replaceLandlord(addr1.address, addr3.address)).to.be.revertedWith("Only the landlord to be replaced can call this function");
        });
    });

    describe("createProposal", function () {
        it("Should not create proposal if description is empty", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);

            await expect(consorcio.connect(addr1).createProposal("", 100, 10)).to.be.revertedWith("All parameters must be not null");
        });

        it("Should not create proposal if costPerPerson is 0", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);

            await expect(consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 0, 10)).to.be.revertedWith("All parameters must be not null");
        });

        it("Should not create proposal if timeout is 0", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);

            await expect(consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 0)).to.be.revertedWith("All parameters must be not null");
        });

        it("Should not create proposal if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);

            await expect(consorcio.createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10)).to.be.revertedWith("Only registered landlords can call this function");
        });
    });

    describe("vote", function () {
        it("Should not vote if proposal does not exist", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);

            await expect(consorcio.connect(addr1).vote(1, true)).to.be.revertedWith("Proposal does not exist");
        });
    
        it("Should not vote if timeout has passed", async function () {
            await expect(true).to.equal(false, TEST_NOT_IMPLEMENTED_MESSAGE);
        });

        it("Should not vote if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10);

            await expect(consorcio.vote(0, true)).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should not vote if address has already voted that proposal", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await consorcio.registerLandlord(addr1.address);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10);
            await consorcio.connect(addr1).vote(1, true);

            await expect(consorcio.connect(addr1).vote(1, true)).to.be.revertedWith("Landlord has already voted that proposal");
        });
    });

});

// contract TestConsorcio {

//     Consorcio consorcio;

//     function beforeEach() public {
//         consorcio = new Consorcio(3);
//     }

//     function testRegisterLandlord() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         (bool success, ) = address(consorcio).call(abi.encodeWithSignature("registerLandlord(address)", address(0x4)));
//         Assert.isFalse(success, "Should not be able to register more landlords than totalNumberOfParticipants");
//     }

//     function testReplaceLandlord() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.replaceLandlord(address(0x1), address(0x4));
//         Assert.equal(consorcio.landlordsAddresses(0), address(0x4), "Should replace landlord address");
//     }

//     function testCreateProposal() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         Assert.equal(consorcio.proposals(0).description, "Proposal 1", "Should create proposal with correct description");
//     }

//     function testRemoveProposal() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         consorcio.removeProposal(0);
//         Assert.equal(consorcio.proposals(0).id, 0, "Should remove proposal");
//     }

//     function testEditProposal() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         consorcio.editProposal(0, "New description", 200, 20);
//         Assert.equal(consorcio.proposals(0).description, "New description", "Should edit proposal with correct description");
//         Assert.equal(consorcio.proposals(0).costPerPerson, 200, "Should edit proposal with correct costPerPerson");
//         Assert.equal(consorcio.proposals(0).timeout, 20, "Should edit proposal with correct timeout");
//     }

//     function testVote() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         consorcio.vote(0, true);
//         Assert.equal(consorcio.proposals(0).positiveVotes, 1, "Should vote positive");
//     }

//     function testEditVote() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         consorcio.vote(0, true);
//         consorcio.editVote(0, false);
//         Assert.equal(consorcio.proposals(0).positiveVotes, 0, "Should edit vote to negative");
//         Assert.equal(consorcio.proposals(0).negativeVotes, 1, "Should edit vote to negative");
//     }

//     function testDeposit() public {
//         consorcio.registerLandlord(address(0x1));
//         consorcio.registerLandlord(address(0x2));
//         consorcio.registerLandlord(address(0x3));

//         consorcio.createProposal("Proposal 1", 100, 10);
//         consorcio.vote(0, true);
//         consorcio.deposit{value: 100}(address(0x1));
//         Assert.equal(consorcio.pool(address(0x1)), 100, "Should deposit correct amount");
//     }

// }
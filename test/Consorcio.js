const { expect } = require("chai");
const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


const VALID_PROPOSAL_DESCRIPTION = "Proposal 1";
const VALID_PROPOSAL_COST_PER_PERSON = 100;
const VALID_PROPOSAL_TIMEOUT = 1703548800; // 25-dic-2023 00:00:00
const TEST_NOT_IMPLEMENTED_MESSAGE = "TODAVIA NO IMPLEMENTAMOS ESTE TEST";

const JUN_30_2024_23_59_59_TIMESTAMP = 1719791999;
const JUN_30_2024_23_59_50_TIMESTAMP = 1719791990;

const JUL_01_2024_00_00_00_TIMESTAMP = 1719792000;
const JUL_31_2024_23_59_50_TIMESTAMP = 1722470390;

const AUG_01_2024_00_00_00_TIMESTAMP = 1722470400;
const AUG_31_2024_23_59_50_TIMESTAMP = 1725148790;

const SEP_01_2024_00_00_00_TIMESTAMP = 1725148800;
const SEP_31_2924_23_59_50_TIMESTAMP = 1727740790;

const DIC_10_2023_00_00_00_TIMESTAMP = 1702166400;
const DIC_20_2023_00_00_00_TIMESTAMP = 1703030400;

function minutes(n) {
    return n * 60;
}

function hours(n) {
    return n * 60 * 60;
}

function days(n) {
    return n * 24 * 60 * 60;
}

function weeks(n) {
    return n * 7 * 24 * 60 * 60;
}


// We define a fixture to reuse the same setup in every test.
async function deployConsorcioWith3ParticipantsAndReturn4Signers() {

    // Deploy library DateTime and get the address of deployment.
    const dateTime = await ethers.deployContract("DateTime");
    await dateTime.waitForDeployment();
    

    const consorcio = await ethers.deployContract("Consorcio", [3, 120]);
    await consorcio.waitForDeployment();

    const signers = await ethers.getSigners();
    const participants = signers.slice(0, 4);

    return { consorcio, participants };
}

async function register(consorcio, address){
    await consorcio.inviteLandlord(address);
    await consorcio.connect(address).payInitialDepositAndRegister({ value: 120 });
}

describe("Consorcio Contract", function () {
    describe("inviteLandlord", function () {
        it("Should invite landlord correctly", async function () {

            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1, addr2] = participants;
            
            await consorcio.inviteLandlord(addr1.address);

            expect(await consorcio.invitedLandlords(addr1.address)).to.equal(true);
        });
        
        // it("Should not invite landlord with invalid address 0", async function () {
        //     const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
        //     const [deployer, addr1, addr2] = participants;

        //     // NO PUDE RESOLVER LO DE ADDRESS 0.

        //     // expect(await consorcio.inviteLandlord(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address");
        //     expect("no implementado").to.equal("", TEST_NOT_IMPLEMENTED_MESSAGE);
        // });

        it("Should not invite landlord twice", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1, addr2] = participants;
            
            await consorcio.inviteLandlord(addr1.address);
            await expect(consorcio.inviteLandlord(addr1.address)).to.be.revertedWith("Landlord is already invited");
        });

        it("Should not invite landlord if called by non-owner", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1, addr2] = participants;
            
            await expect(consorcio.connect(addr1).inviteLandlord(addr1.address)).to.be.revertedWith("Only the owner can call this function");
        });

        it("Should not invite landlord if there are already enough landlords registered", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1, addr2, addr3, ] = participants;
            
            await consorcio.inviteLandlord(deployer.address);
            await consorcio.inviteLandlord(addr1.address);
            await consorcio.inviteLandlord(addr2.address);

            // Each one of the invited landlords should pay the initial deposit by calling the function payInitialDepositAndRegister with a msg.value of 120
            await consorcio.connect(deployer).payInitialDepositAndRegister({ value: 120 });
            await consorcio.connect(addr1).payInitialDepositAndRegister({ value: 120 });
            await consorcio.connect(addr2).payInitialDepositAndRegister({ value: 120 });
            
            await expect(consorcio.inviteLandlord(addr3.address)).to.be.revertedWith("There are already enough landlords registered");
        });
    });

    describe("payInitialDepositAndRegister", function () {
        it("Should fail if msg.value is less than initial deposit", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1] = participants;

            await consorcio.inviteLandlord(addr1.address);

            await expect(consorcio.connect(addr1).payInitialDepositAndRegister({ value: 100 })).to.be.revertedWith("Ether sent does not match initial deposit amount");
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(0);
        });

        it("Should fail if msg.value is more than initial deposit", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1] = participants;

            await consorcio.inviteLandlord(addr1.address);

            await expect(consorcio.connect(addr1).payInitialDepositAndRegister({ value: 150 })).to.be.revertedWith("Ether sent does not match initial deposit amount");
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(0);
        });

        it("Should fail if address is not invited", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);            
            const [deployer, addr1] = participants;

            await expect(consorcio.connect(addr1).payInitialDepositAndRegister({ value: 120 })).to.be.revertedWith("Only invited landlords can call this function");
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(0);
            expect(await consorcio.numberOfLandlords()).to.equal(0);
        });

        it("Should fail if address is already registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(1);
            await expect(consorcio.connect(addr1).payInitialDepositAndRegister({ value: 120 })).to.be.revertedWith("Landlord is already registered");
        });

        it("Should register landlord correctly", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await consorcio.inviteLandlord(addr1.address);
            await consorcio.connect(addr1).payInitialDepositAndRegister({ value: 120 });

            expect(await consorcio.landlordsAddresses(0)).to.equal(addr1.address);
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(1);
            expect(await consorcio.numberOfLandlords()).to.equal(1);
        });
    });

    describe("replaceLandlord", function () {
        it("Should replace landlord if called by that landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;

            await register(consorcio, addr1);

            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(1);

            await consorcio.connect(addr1).replaceLandlord(addr1.address, addr2.address);
            
            // make address 2 pay 120 deposit
            await consorcio.connect(addr2).payInitialDepositAndRegister({ value: 120 });

            expect(await consorcio.landlordsAddresses(0)).to.equal(addr2.address);
            expect(await consorcio.landlordsIndexes(addr1.address)).to.equal(0);
            expect(await consorcio.landlordsIndexes(addr2.address)).to.equal(1);
        });

        it("Should not replace landlord if called by other address", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1, addr2, addr3] = participants;

            await consorcio.inviteLandlord(addr1.address);
            await expect(consorcio.connect(addr2).replaceLandlord(addr1.address, addr3.address)).to.be.revertedWith("Only the landlord to be replaced can call this function");
        });

        it("Should not replace landlord if address to be replaced is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1, addr2, addr3] = participants;

            await expect(consorcio.connect(addr1).replaceLandlord(addr1.address, addr3.address)).to.be.revertedWith("Landlord to be replaced is not registered");
        });
    });

    describe("createProposal", function () {
        it("Should not create proposal if description is empty", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).createProposal("", 100, 10, 12, 2023)).to.be.revertedWith("All parameters must be not null");
        });

        it("Should not create proposal if costPerPerson is 0", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 0, 10, 12, 2023)).to.be.revertedWith("All parameters must be not null");
        });

        it("Should not create proposal if date is in this month", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2021)).to.be.revertedWith("Date must be in the future");
        });

        it("Should not create proposal if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023)).to.be.revertedWith("Only registered landlords can call this function");
        });
    });

    describe("editProposal", function () {
        it("Should not edit proposal if proposal does not exist", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).editProposal(1, VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023)).to.be.revertedWith("Proposal does not exist");
        });

        it("Should not edit proposal if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);

            await expect(consorcio.editProposal(1, VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023)).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should not edit proposal if address is not the creator of the proposal", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);

            await expect(consorcio.connect(addr2).editProposal(1, VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023)).to.be.revertedWith("Only the creator of the proposal can edit it");
        });

        it("Should not edit proposal if description is empty and costPerPerson is 0", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);

            await expect(consorcio.connect(addr1).editProposal(1, "", 0, 10, 12, 2023)).to.be.revertedWith("At least one of the parameters must be not null");
        });

        it("Should edit proposal correctly", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;
            
            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);
            const proposalBefore = await consorcio.proposals(1);
            
            // get block timestamp
            const block = await ethers.provider.getBlock();
            const timestamp = block.timestamp;
            
            // add 10 seconds to block timestamp in the network
            await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp + 10]);
            
            await consorcio.connect(addr1).editProposal(1, "New description", 200, 20, 12, 2023);
            const proposalAfter = await consorcio.proposals(1);

            expect(proposalBefore.description).to.equal(VALID_PROPOSAL_DESCRIPTION);
            expect(proposalBefore.costPerPerson).to.equal(100);
            expect(proposalBefore.timeout).to.equal(DIC_10_2023_00_00_00_TIMESTAMP);
            expect(proposalBefore.timestamp).to.equal(timestamp);
            expect(proposalAfter.description).to.equal("New description");
            expect(proposalAfter.costPerPerson).to.equal(200);
            expect(proposalAfter.timeout).to.equal(DIC_20_2023_00_00_00_TIMESTAMP);
            expect(proposalAfter.timestamp).to.equal(timestamp + 10);
        });
    });



    describe("vote", function () {
        it("Should not vote if proposal does not exist", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).vote(1, true)).to.be.revertedWith("Proposal does not exist");
        });

        it("Should not vote if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);

            await expect(consorcio.vote(0, true)).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should not vote if address has already voted that proposal", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);
            await consorcio.connect(addr1).vote(1, true);

            await expect(consorcio.connect(addr1).vote(1, true)).to.be.revertedWith("Landlord has already voted that proposal");
        });
    });

    describe("editVote", function () {
        it("Should edit vote correctly", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2] = participants;
    
            await register(consorcio, addr1);
            await register(consorcio, addr2);
    
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, VALID_PROPOSAL_COST_PER_PERSON, 25, 12, 2023);
            await consorcio.connect(addr2).vote(1, true);

            await consorcio.connect(addr2).editVote(1, false);
    
            expect(await consorcio.getVote(1, addr2.address)).to.equal(false);
        });

        it("Should not edit vote if proposal does not exist", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).editVote(1, true)).to.be.revertedWith("Proposal does not exist");
        });

        it("Should not edit vote if address is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, , addr2] = participants;

            await register(consorcio, addr2);
            await consorcio.connect(addr2).createProposal(VALID_PROPOSAL_DESCRIPTION, VALID_PROPOSAL_COST_PER_PERSON, 25, 12, 2023);

            await expect(consorcio.editVote(1, true)).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should not edit vote if address has not voted that proposal yet", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, VALID_PROPOSAL_COST_PER_PERSON, 25, 12, 2023);

            await expect(consorcio.connect(addr2).editVote(1, true)).to.be.revertedWith("Landlord has not voted this proposal yet");
        });

        it("Should not edit vote if address has already voted that proposal and new vote is the same as the previous one", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, VALID_PROPOSAL_COST_PER_PERSON, 25, 12, 2023);
            await consorcio.connect(addr2).vote(1, true);

            await expect(consorcio.connect(addr2).editVote(1, true)).to.be.revertedWith("Vote cannot be the same");
        });
    });


    describe("CalculateNextMonthExpenses", function () {
        it("Should fail if user is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await expect(consorcio.calculateNextMonthExpenses()).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should fail if it is not the last day of the month", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            // Set ethereum timestamp to the last day of the month
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUL_01_2024_00_00_00_TIMESTAMP]);

            await expect(consorcio.connect(addr1).calculateNextMonthExpenses()).to.be.revertedWith("You can only calculate next month's expenses the last day of the month");
        });

        it("Should return 0 if there are no proposals", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            // Set ethereum timestamp to the last day of the month
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_59_TIMESTAMP]);
            
            // Calculate nextMonthExpenses
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            // See the values it calculated (month, year, value)
            const { month, year, value } = await consorcio.nextMonthExpenses();

            expect(month).to.equal(7);
            expect(year).to.equal(2024);
            expect(value).to.equal(0);
        });

        it("Should return 0 if there are no approved proposals", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 15, 7, 2024);
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_59_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();
            
            const { month, year, value } = await consorcio.nextMonthExpenses();

            expect(month).to.equal(7);
            expect(year).to.equal(2024);
            expect(value).to.equal(0);
        });

        it("should return 50 if there is one approved proposal with costPerPerson 50", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2, addr3] = participants;
            
            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr2).vote(1, true);
            await consorcio.connect(addr3).vote(1, true);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_59_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();
            
            const { month, year, value } = await consorcio.nextMonthExpenses();

            expect(month).to.equal(7);
            expect(year).to.equal(2024);
            expect(value).to.equal(50);
        });

        it("should work correctly when there are multiple proposals", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1, addr2, addr3] = participants;
            
            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr2).vote(1, true);
            await consorcio.connect(addr3).vote(1, true);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 30, 25, 7, 2024);
            await consorcio.connect(addr2).vote(2, true);
            await consorcio.connect(addr3).vote(2, true);

            await consorcio.connect(addr3).createProposal(VALID_PROPOSAL_DESCRIPTION, 10, 25, 8, 2024);
            await consorcio.connect(addr1).vote(3, false);
            await consorcio.connect(addr2).vote(3, true);
            await consorcio.connect(addr3).vote(3, true);

            await consorcio.connect(addr3).createProposal(VALID_PROPOSAL_DESCRIPTION, 5, 1, 7, 2025);
            await consorcio.connect(addr2).vote(4, true);
            await consorcio.connect(addr3).vote(4, true);

            await consorcio.connect(addr3).createProposal(VALID_PROPOSAL_DESCRIPTION, 33, 1, 7, 2025);
            await consorcio.connect(addr2).vote(5, false);
            await consorcio.connect(addr3).vote(5, false);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_59_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();
            
            const { month, year, value } = await consorcio.nextMonthExpenses();

            expect(month).to.equal(7);
            expect(year).to.equal(2024);
            expect(value).to.equal(80);
        });

    });

    describe("payNextMonthExpenses", function () {
        it("Should fail if user is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1] = participants;

            await expect(consorcio.payNextMonthExpenses()).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should fail if it is not the last day of the month", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1] = participants;

            await register(consorcio, addr1);

            // Set ethereum timestamp to the last day of the month
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUL_01_2024_00_00_00_TIMESTAMP]);

            await expect(consorcio.connect(addr1).payNextMonthExpenses()).to.be.revertedWith("You must pay next month's expenses");
        });

        it("Should fail if landlord has already paid next month's expenses", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr2).vote(1, true);
            await consorcio.connect(addr3).vote(1, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 50 });
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_59_TIMESTAMP]);
            await expect(consorcio.connect(addr1).payNextMonthExpenses()).to.be.revertedWith("You have already paid next month's expenses");
        });

        it("Should fail if landlord sends incorrect amount of money to pay next month's expenses", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr2).vote(1, true);
            await consorcio.connect(addr3).vote(1, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await expect(consorcio.connect(addr1).payNextMonthExpenses({ value: 40 })).to.be.revertedWith("Ether sent does not match next month's expenses");
        });

        it("Should pay next month's expenses correctly", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr2).vote(1, true);
            await consorcio.connect(addr3).vote(1, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 50 });
            await consorcio.connect(addr2).payNextMonthExpenses({ value: 50 });
            await consorcio.connect(addr3).payNextMonthExpenses({ value: 50 });
            
            const { month, year, value } = await consorcio.nextMonthExpenses();

            expect(month).to.equal(7);
            expect(year).to.equal(2024);
            expect(value).to.equal(50);

            expect(await consorcio.hasPaidNextMonthExpenses(addr1.address)).to.be.true;
            expect(await consorcio.hasPaidNextMonthExpenses(addr2.address)).to.be.true;
            expect(await consorcio.hasPaidNextMonthExpenses(addr3.address)).to.be.true;
        });
    });

    describe("myNextMonthExpenses", function(){
        it("Should fail if landlord is not registered", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1] = participants;

            await expect(consorcio.connect(addr1).myNextMonthExpenses()).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should return same nextMonthExpenses in normal scenario", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;
            
            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr1).vote(1, true);
            await consorcio.connect(addr2).vote(1, true);
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            expect(await consorcio.connect(addr1).myNextMonthExpenses()).to.equal(50);
            expect(await consorcio.connect(addr2).myNextMonthExpenses()).to.equal(50);
            expect(await consorcio.connect(addr3).myNextMonthExpenses()).to.equal(50);
        });

        it("Should return less nextMonthExpenses for landlord that has paid but some proposals were not fulfilled", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;
            
            await register(consorcio, addr1);
            await register(consorcio, addr2);
            await register(consorcio, addr3);

            // JULIO 2024
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 50, 15, 7, 2024);
            await consorcio.connect(addr1).vote(1, true);
            await consorcio.connect(addr2).vote(1, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 50 });
            await consorcio.connect(addr2).payNextMonthExpenses({ value: 50 });
            await ethers.provider.send("evm_setNextBlockTimestamp", [JUL_01_2024_00_00_00_TIMESTAMP]);
            await consorcio.tryToFulfillAllProposals();

            // AGOSTO 2024
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 70, 10, 8, 2024);
            await consorcio.connect(addr1).vote(2, true);
            await consorcio.connect(addr2).vote(2, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUL_31_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 70 });
            await consorcio.connect(addr2).payNextMonthExpenses({ value: 70 });

            await ethers.provider.send("evm_setNextBlockTimestamp", [AUG_01_2024_00_00_00_TIMESTAMP]);
            await consorcio.tryToFulfillAllProposals();
            
            // SEPTIEMBRE 2024 (addr3 ya se quedo sin deposit)
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 10, 17, 9, 2024);
            await consorcio.connect(addr1).vote(3, true);
            await consorcio.connect(addr2).vote(3, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [AUG_31_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 10 });
            await consorcio.connect(addr2).payNextMonthExpenses({ value: 10 });
            
            await ethers.provider.send("evm_setNextBlockTimestamp", [SEP_01_2024_00_00_00_TIMESTAMP]);
            await consorcio.tryToFulfillAllProposals();

            // // OCTUBRE 2024 (addr1 y addr2 habían puesto 10 que no se usaron)
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 15, 25, 10, 2024);
            await consorcio.connect(addr1).vote(4, true);
            await consorcio.connect(addr2).vote(4, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [SEP_31_2924_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            expect(await consorcio.connect(addr1).myNextMonthExpenses()).to.equal(5);
            expect(await consorcio.connect(addr2).myNextMonthExpenses()).to.equal(5);
            expect(await consorcio.connect(addr3).myNextMonthExpenses()).to.equal(15);
        });
    });

    describe("getDepositAndExtraBalance", function(){
        // This happens when a landlord is replaced so he has to claim his deposit and any extra balance.
        it("Should fail if landlord is not invited", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1] = participants;

            // await consorcio.inviteLandlord(addr1.address);

            await expect(consorcio.connect(addr1).getDepositAndExtraBalance()).to.be.revertedWith("Only invited landlords can call this function");
        });

        it("Should fail if landlord is still registered", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1] = participants;

            await register(consorcio, addr1);

            await expect(consorcio.connect(addr1).getDepositAndExtraBalance()).to.be.revertedWith("Landlord is still registered");
        });
        
        it("Should fail if landlord has no deposit to claim", async function(){
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [, addr1, addr2, addr3] = participants;

            await register(consorcio, addr1);
            await register(consorcio, addr2);

            // Make a proposal with cost 120 that is accepted and then next month replace the landlord that has not paid for that proposal.
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 120, 9, 7, 2024);
            await consorcio.connect(addr1).vote(1, true);
            await consorcio.connect(addr2).vote(1, true);

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUN_30_2024_23_59_50_TIMESTAMP]);
            await consorcio.connect(addr1).calculateNextMonthExpenses();

            await consorcio.connect(addr1).payNextMonthExpenses({ value: 120 });

            await ethers.provider.send("evm_setNextBlockTimestamp", [JUL_01_2024_00_00_00_TIMESTAMP]);
            await consorcio.tryToFulfillAllProposals();

            await consorcio.connect(addr2).replaceLandlord(addr2.address, addr3.address);

            await expect(consorcio.connect(addr2).getDepositAndExtraBalance()).to.be.revertedWith("Landlord has no deposit to claim");
        });
    });

});
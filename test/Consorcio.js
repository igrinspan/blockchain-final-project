const { expect } = require("chai");
const { ethers } = require("hardhat");

// We use `loadFixture` to share common setups (or fixtures) between tests.
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");


const VALID_PROPOSAL_DESCRIPTION = "Proposal 1";
const VALID_PROPOSAL_COST_PER_PERSON = 100;
const VALID_PROPOSAL_TIMEOUT = 10;
const TEST_NOT_IMPLEMENTED_MESSAGE = "TODAVIA NO IMPLEMENTAMOS ESTE TEST";

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

    // RESOLVER LO DE REPLACE LANDLORD (NO LO ENTENDI, PUEDE SER QUE CAMBIE EL INDEX DE LOS LANDLORDS?)

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

    describe("CalculateNextMonthExpenses", function () {
        it("Should fail if user is not registered as landlord", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await expect(consorcio.calculateNextMonthExpenses()).to.be.revertedWith("Only registered landlords can call this function");
        });

        it("Should return 0 if there are no proposals", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);

            expect(await consorcio.connect(addr1).calculateNextMonthExpenses()).to.equal(0);
        });

        it("Should return 0 if there are no approved proposals", async function () {
            const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
            const [deployer, addr1] = participants;

            await register(consorcio, addr1);
            await consorcio.connect(addr1).createProposal(VALID_PROPOSAL_DESCRIPTION, 100, 10, 12, 2023);

            expect(await consorcio.connect(addr1).calculateNextMonthExpenses()).to.equal(0);
        });

    });

});


// Avanzar el tiempo:
// await ethers.provider.send("evm_increaseTime", [minutes(1)]);
// await ethers.provider.send("evm_mine");



// Cosas de REGISTER LANDLORD

// it("Should not register more landlords than totalNumberOfParticipants", async function () {
//     const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers); 
//     const [deployer, addr1, addr2, addr3] = participants;

//     await consorcio.inviteLandlord(deployer.address);
//     await consorcio.inviteLandlord(addr1.address);
//     await consorcio.inviteLandlord(addr2.address);

//     await expect(consorcio.inviteLandlord(addr3.address)).to.be.revertedWith("There are already enough landlords registered");
// });

// it("Should not register landlord twice", async function () {
//     const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
//     const [deployer, addr1] = participants;

//     await consorcio.inviteLandlord(addr1.address);
//     await expect(consorcio.inviteLandlord(addr1.address)).to.be.revertedWith("Landlord is already registered");
// });

// it("Should not register landlord from non-owner", async function () {
//     const { consorcio, participants } = await loadFixture(deployConsorcioWith3ParticipantsAndReturn4Signers);
//     const [deployer, addr1] = participants;

//     await expect(consorcio.connect(addr1).inviteLandlord(addr1.address)).to.be.revertedWith("Only the owner can call this function");
// });
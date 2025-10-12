const Voting = artifacts.require("./Voting.sol");
const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("Voting", function(accounts) {
  const owner = accounts[0];
  const voter1 = accounts[1];
  const voter2 = accounts[2];
  const voter3 = accounts[3];
  const nonVoter = accounts[4];

  let votingInstance;

  // Enum WorkflowStatus
  const WorkflowStatus = {
    RegisteringVoters: new BN(0),
    ProposalsRegistrationStarted: new BN(1),
    ProposalsRegistrationEnded: new BN(2),
    VotingSessionStarted: new BN(3),
    VotingSessionEnded: new BN(4),
    VotesTallied: new BN(5)
  };

  describe("Test initial state and voter registration", function() {
    beforeEach(async function() {
      votingInstance = await Voting.new({ from: owner });
    });

    it("should initialize with RegisteringVoters status", async function() {
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.RegisteringVoters);
    });

    it("should set the deployer as owner", async function() {
      const contractOwner = await votingInstance.owner();
      expect(contractOwner).to.equal(owner);
    });

    it("should register a voter by owner", async function() {
      const receipt = await votingInstance.registerVoter(voter1, { from: owner });
      
      expectEvent(receipt, 'VoterRegistered', { voterAddress: voter1 });
      
      const voter = await votingInstance.getVoter(voter1);
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
    });

    it("should not allow non-owner to register voters", async function() {
      await expectRevert.unspecified(
        votingInstance.registerVoter(voter2, { from: voter1 })
      );
    });

    it("should not register the same voter twice", async function() {
      await votingInstance.registerVoter(voter1, { from: owner });
      await expectRevert(
        votingInstance.registerVoter(voter1, { from: owner }),
        "Cet electeur est deja enregistre"
      );
    });

    it("should not register zero address", async function() {
      await expectRevert(
        votingInstance.registerVoter('0x0000000000000000000000000000000000000000', { from: owner }),
        "Adresse invalide"
      );
    });
  });

  describe("Test proposals registration workflow", function() {
    beforeEach(async function() {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.registerVoter(voter1, { from: owner });
      await votingInstance.registerVoter(voter2, { from: owner });
    });

    it("should start proposals registration", async function() {
      const receipt = await votingInstance.startProposalsRegistration({ from: owner });
      
      expectEvent(receipt, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatus.RegisteringVoters,
        newStatus: WorkflowStatus.ProposalsRegistrationStarted
      });
      
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.ProposalsRegistrationStarted);
    });

    it("should allow registered voter to submit proposal", async function() {
      await votingInstance.startProposalsRegistration({ from: owner });
      
      const receipt = await votingInstance.registerProposal("Proposition 1", { from: voter1 });
      
      expectEvent(receipt, 'ProposalRegistered', { proposalId: new BN(0) });
      
      const proposal = await votingInstance.getProposal(0);
      expect(proposal.description).to.equal("Proposition 1");
      expect(proposal.voteCount).to.be.bignumber.equal(new BN(0));
    });

    it("should not allow non-registered voter to submit proposal", async function() {
      await votingInstance.startProposalsRegistration({ from: owner });
      
      await expectRevert(
        votingInstance.registerProposal("Proposition", { from: nonVoter }),
        "Vous n'etes pas un electeur enregistre"
      );
    });

    it("should not allow empty proposal description", async function() {
      await votingInstance.startProposalsRegistration({ from: owner });
      
      await expectRevert(
        votingInstance.registerProposal("", { from: voter1 }),
        "La description ne peut pas etre vide"
      );
    });

    it("should not allow proposal registration before session starts", async function() {
      await expectRevert(
        votingInstance.registerProposal("Proposition", { from: voter1 }),
        "L'enregistrement des propositions n'est pas en cours"
      );
    });

    it("should end proposals registration", async function() {
      await votingInstance.startProposalsRegistration({ from: owner });
      await votingInstance.registerProposal("Proposition 1", { from: voter1 });
      
      const receipt = await votingInstance.endProposalsRegistration({ from: owner });
      
      expectEvent(receipt, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatus.ProposalsRegistrationStarted,
        newStatus: WorkflowStatus.ProposalsRegistrationEnded
      });
      
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.ProposalsRegistrationEnded);
    });

    it("should not end proposals registration without proposals", async function() {
      await votingInstance.startProposalsRegistration({ from: owner });
      
      await expectRevert(
        votingInstance.endProposalsRegistration({ from: owner }),
        "Aucune proposition n'a ete enregistree"
      );
    });
  });

  describe("Test voting session", function() {
    beforeEach(async function() {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.registerVoter(voter1, { from: owner });
      await votingInstance.registerVoter(voter2, { from: owner });
      await votingInstance.registerVoter(voter3, { from: owner });
      await votingInstance.startProposalsRegistration({ from: owner });
      await votingInstance.registerProposal("Proposition 1", { from: voter1 });
      await votingInstance.registerProposal("Proposition 2", { from: voter2 });
      await votingInstance.registerProposal("Proposition 3", { from: voter3 });
      await votingInstance.endProposalsRegistration({ from: owner });
    });

    it("should start voting session", async function() {
      const receipt = await votingInstance.startVotingSession({ from: owner });
      
      expectEvent(receipt, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatus.ProposalsRegistrationEnded,
        newStatus: WorkflowStatus.VotingSessionStarted
      });
      
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.VotingSessionStarted);
    });

    it("should allow registered voter to vote", async function() {
      await votingInstance.startVotingSession({ from: owner });
      
      const receipt = await votingInstance.vote(0, { from: voter1 });
      
      expectEvent(receipt, 'Voted', { voter: voter1, proposalId: new BN(0) });
      
      const voter = await votingInstance.getVoter(voter1);
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedProposalId).to.be.bignumber.equal(new BN(0));
      
      const proposal = await votingInstance.getProposal(0);
      expect(proposal.voteCount).to.be.bignumber.equal(new BN(1));
    });

    it("should not allow non-registered voter to vote", async function() {
      await votingInstance.startVotingSession({ from: owner });
      
      await expectRevert(
        votingInstance.vote(0, { from: nonVoter }),
        "Vous n'etes pas un electeur enregistre"
      );
    });

    it("should not allow voter to vote twice", async function() {
      await votingInstance.startVotingSession({ from: owner });
      await votingInstance.vote(0, { from: voter1 });
      
      await expectRevert(
        votingInstance.vote(1, { from: voter1 }),
        "Vous avez deja vote"
      );
    });

    it("should not allow voting for non-existent proposal", async function() {
      await votingInstance.startVotingSession({ from: owner });
      
      await expectRevert(
        votingInstance.vote(99, { from: voter1 }),
        "Cette proposition n'existe pas"
      );
    });

    it("should not allow voting before session starts", async function() {
      await expectRevert(
        votingInstance.vote(0, { from: voter1 }),
        "La session de vote n'est pas en cours"
      );
    });

    it("should end voting session", async function() {
      await votingInstance.startVotingSession({ from: owner });
      await votingInstance.vote(0, { from: voter1 });
      
      const receipt = await votingInstance.endVotingSession({ from: owner });
      
      expectEvent(receipt, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatus.VotingSessionStarted,
        newStatus: WorkflowStatus.VotingSessionEnded
      });
      
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.VotingSessionEnded);
    });
  });

  describe("Test vote tallying and winner", function() {
    beforeEach(async function() {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.registerVoter(voter1, { from: owner });
      await votingInstance.registerVoter(voter2, { from: owner });
      await votingInstance.registerVoter(voter3, { from: owner });
      await votingInstance.startProposalsRegistration({ from: owner });
      await votingInstance.registerProposal("Proposition 1", { from: voter1 });
      await votingInstance.registerProposal("Proposition 2", { from: voter2 });
      await votingInstance.registerProposal("Proposition 3", { from: voter3 });
      await votingInstance.endProposalsRegistration({ from: owner });
      await votingInstance.startVotingSession({ from: owner });
    });

    it("should tally votes and determine winner", async function() {
      await votingInstance.vote(1, { from: voter1 });
      await votingInstance.vote(1, { from: voter2 });
      await votingInstance.vote(0, { from: voter3 });
      await votingInstance.endVotingSession({ from: owner });
      
      const receipt = await votingInstance.tallyVotes({ from: owner });
      
      expectEvent(receipt, 'WorkflowStatusChange', {
        previousStatus: WorkflowStatus.VotingSessionEnded,
        newStatus: WorkflowStatus.VotesTallied
      });
      
      const winningProposalId = await votingInstance.winningProposalId();
      expect(winningProposalId).to.be.bignumber.equal(new BN(1));
      
      const winner = await votingInstance.getWinner();
      expect(winner.description).to.equal("Proposition 2");
      expect(winner.voteCount).to.be.bignumber.equal(new BN(2));
    });

    it("should not tally votes before voting session ends", async function() {
      await expectRevert(
        votingInstance.tallyVotes({ from: owner }),
        "La session de vote doit etre terminee"
      );
    });

    it("should not get winner before tallying", async function() {
      await votingInstance.vote(0, { from: voter1 });
      await votingInstance.endVotingSession({ from: owner });
      
      await expectRevert(
        votingInstance.getWinner(),
        "Les votes n'ont pas encore ete comptabilises"
      );
    });

    it("should handle tie by selecting first proposal with max votes", async function() {
      await votingInstance.vote(0, { from: voter1 });
      await votingInstance.vote(1, { from: voter2 });
      await votingInstance.endVotingSession({ from: owner });
      await votingInstance.tallyVotes({ from: owner });
      
      const winningProposalId = await votingInstance.winningProposalId();
      expect(winningProposalId).to.be.bignumber.equal(new BN(0));
    });
  });

  describe("Test getter functions", function() {
    beforeEach(async function() {
      votingInstance = await Voting.new({ from: owner });
      await votingInstance.registerVoter(voter1, { from: owner });
      await votingInstance.startProposalsRegistration({ from: owner });
      await votingInstance.registerProposal("Proposition 1", { from: voter1 });
      await votingInstance.registerProposal("Proposition 2", { from: voter1 });
    });

    it("should get all proposals", async function() {
      const proposals = await votingInstance.getProposals();
      expect(proposals.length).to.equal(2);
      expect(proposals[0].description).to.equal("Proposition 1");
      expect(proposals[1].description).to.equal("Proposition 2");
    });

    it("should get specific proposal", async function() {
      const proposal = await votingInstance.getProposal(0);
      expect(proposal.description).to.equal("Proposition 1");
      expect(proposal.voteCount).to.be.bignumber.equal(new BN(0));
    });

    it("should not get non-existent proposal", async function() {
      await expectRevert(
        votingInstance.getProposal(99),
        "Cette proposition n'existe pas"
      );
    });

    it("should get voter information", async function() {
      const voter = await votingInstance.getVoter(voter1);
      expect(voter.isRegistered).to.be.true;
      expect(voter.hasVoted).to.be.false;
    });
  });

  describe("Test complete workflow", function() {
    it("should execute complete voting workflow successfully", async function() {
      votingInstance = await Voting.new({ from: owner });
      
      // Phase 1: Register voters
      await votingInstance.registerVoter(voter1, { from: owner });
      await votingInstance.registerVoter(voter2, { from: owner });
      await votingInstance.registerVoter(voter3, { from: owner });
      
      // Phase 2: Proposals registration
      await votingInstance.startProposalsRegistration({ from: owner });
      await votingInstance.registerProposal("Augmenter le budget", { from: voter1 });
      await votingInstance.registerProposal("Reduire les impots", { from: voter2 });
      await votingInstance.registerProposal("Ameliorer les services", { from: voter3 });
      await votingInstance.endProposalsRegistration({ from: owner });
      
      // Phase 3: Voting session
      await votingInstance.startVotingSession({ from: owner });
      await votingInstance.vote(2, { from: voter1 });
      await votingInstance.vote(2, { from: voter2 });
      await votingInstance.vote(1, { from: voter3 });
      await votingInstance.endVotingSession({ from: owner });
      
      // Phase 4: Tally votes
      await votingInstance.tallyVotes({ from: owner });
      
      // Verify winner
      const winner = await votingInstance.getWinner();
      expect(winner.description).to.equal("Ameliorer les services");
      expect(winner.voteCount).to.be.bignumber.equal(new BN(2));
      
      const status = await votingInstance.workflowStatus();
      expect(status).to.be.bignumber.equal(WorkflowStatus.VotesTallied);
    });
  });
});

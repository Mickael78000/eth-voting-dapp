// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Voting is Ownable {

    // Structure pour représenter un électeur
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    // Structure pour représenter une proposition
    struct Proposal {
        string description;
        uint voteCount;
    }

    // Énumération pour gérer les différents états du vote
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    // Variables d'état
    WorkflowStatus public workflowStatus;
    uint public winningProposalId;
    
    // Mappings
    mapping(address => Voter) public voters;
    
    // Tableau des propositions
    Proposal[] public proposals;

    // Événements
    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    // Modificateurs
    modifier onlyRegisteredVoter() {
        require(voters[msg.sender].isRegistered, "Vous n'etes pas un electeur enregistre");
        _;
    }

    modifier onlyDuringVotersRegistration() {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "L'enregistrement des electeurs n'est pas en cours");
        _;
    }

    modifier onlyDuringProposalsRegistration() {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "L'enregistrement des propositions n'est pas en cours");
        _;
    }

    modifier onlyDuringVotingSession() {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "La session de vote n'est pas en cours");
        _;
    }

    // Constructeur
    constructor() Ownable(msg.sender) {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    // ::::::::::::: VOTER REGISTRATION ::::::::::::: //

    /**
     * @notice Permet à l'administrateur d'enregistrer un électeur
     * @param _voterAddress L'adresse Ethereum de l'électeur à enregistrer
     */
    function registerVoter(address _voterAddress) external onlyOwner onlyDuringVotersRegistration {
        require(!voters[_voterAddress].isRegistered, "Cet electeur est deja enregistre");
        require(_voterAddress != address(0), "Adresse invalide");
        
        voters[_voterAddress].isRegistered = true;
        
        emit VoterRegistered(_voterAddress);
    }

    // ::::::::::::: PROPOSAL REGISTRATION ::::::::::::: //

    /**
     * @notice Démarre la session d'enregistrement des propositions
     */
    function startProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "L'enregistrement des electeurs doit etre termine");
        
        WorkflowStatus previousStatus = workflowStatus;
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        
        emit WorkflowStatusChange(previousStatus, workflowStatus);
    }

    /**
     * @notice Permet aux électeurs enregistrés de soumettre une proposition
     * @param _description La description de la proposition
     */
    function registerProposal(string calldata _description) external onlyRegisteredVoter onlyDuringProposalsRegistration {
        require(bytes(_description).length > 0, "La description ne peut pas etre vide");
        
        proposals.push(Proposal({
            description: _description,
            voteCount: 0
        }));
        
        emit ProposalRegistered(proposals.length - 1);
    }

    /**
     * @notice Termine la session d'enregistrement des propositions
     */
    function endProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "L'enregistrement des propositions n'est pas en cours");
        require(proposals.length > 0, "Aucune proposition n'a ete enregistree");
        
        WorkflowStatus previousStatus = workflowStatus;
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        
        emit WorkflowStatusChange(previousStatus, workflowStatus);
    }

    // ::::::::::::: VOTING SESSION ::::::::::::: //

    /**
     * @notice Démarre la session de vote
     */
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "L'enregistrement des propositions doit etre termine");
        
        WorkflowStatus previousStatus = workflowStatus;
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        
        emit WorkflowStatusChange(previousStatus, workflowStatus);
    }

    /**
     * @notice Permet aux électeurs enregistrés de voter pour une proposition
     * @param _proposalId L'identifiant de la proposition
     */
    function vote(uint _proposalId) external onlyRegisteredVoter onlyDuringVotingSession {
        require(!voters[msg.sender].hasVoted, "Vous avez deja vote");
        require(_proposalId < proposals.length, "Cette proposition n'existe pas");
        
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        proposals[_proposalId].voteCount++;
        
        emit Voted(msg.sender, _proposalId);
    }

    /**
     * @notice Termine la session de vote
     */
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "La session de vote n'est pas en cours");
        
        WorkflowStatus previousStatus = workflowStatus;
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        
        emit WorkflowStatusChange(previousStatus, workflowStatus);
    }

    // ::::::::::::: VOTE TALLYING ::::::::::::: //

    /**
     * @notice Comptabilise les votes et détermine le gagnant
     */
    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "La session de vote doit etre terminee");
        require(proposals.length > 0, "Aucune proposition n'existe");
        
        uint winningVoteCount = 0;
        uint winningProposal = 0;
        
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposal = i;
            }
        }
        
        winningProposalId = winningProposal;
        
        WorkflowStatus previousStatus = workflowStatus;
        workflowStatus = WorkflowStatus.VotesTallied;
        
        emit WorkflowStatusChange(previousStatus, workflowStatus);
    }

    // ::::::::::::: GETTERS ::::::::::::: //

    /**
     * @notice Retourne le gagnant du vote
     * @return La proposition gagnante
     */
    function getWinner() external view returns (Proposal memory) {
        require(workflowStatus == WorkflowStatus.VotesTallied, "Les votes n'ont pas encore ete comptabilises");
        return proposals[winningProposalId];
    }

    /**
     * @notice Retourne toutes les propositions
     * @return Le tableau de toutes les propositions
     */
    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    /**
     * @notice Retourne une proposition spécifique
     * @param _proposalId L'identifiant de la proposition
     * @return La proposition demandée
     */
    function getProposal(uint _proposalId) external view returns (Proposal memory) {
        require(_proposalId < proposals.length, "Cette proposition n'existe pas");
        return proposals[_proposalId];
    }

    /**
     * @notice Retourne les informations d'un électeur
     * @param _voterAddress L'adresse de l'électeur
     * @return Les informations de l'électeur
     */
    function getVoter(address _voterAddress) external view returns (Voter memory) {
        return voters[_voterAddress];
    }

    /**
     * @notice Vérifie si une adresse est un électeur enregistré (compatible web3.js 0.20.x)
     * @param _voterAddress L'adresse de l'électeur
     * @return bool True si l'électeur est enregistré
     */
    function isVoterRegistered(address _voterAddress) external view returns (bool) {
        return voters[_voterAddress].isRegistered;
    }

    /**
     * @notice Vérifie si un électeur a voté (compatible web3.js 0.20.x)
     * @param _voterAddress L'adresse de l'électeur
     * @return bool True si l'électeur a voté
     */
    function hasVoterVoted(address _voterAddress) external view returns (bool) {
        return voters[_voterAddress].hasVoted;
    }

    /**
     * @notice Retourne l'ID de la proposition pour laquelle un électeur a voté (compatible web3.js 0.20.x)
     * @param _voterAddress L'adresse de l'électeur
     * @return uint L'ID de la proposition
     */
    function getVoterVotedProposalId(address _voterAddress) external view returns (uint) {
        return voters[_voterAddress].votedProposalId;
    }
}
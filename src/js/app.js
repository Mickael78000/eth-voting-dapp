App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  isOwner: false,
  isRegistered: false,
  hasVoted: false,
  workflowStatus: 0,

  init: function() {
    return App.initWeb3();
  },

  initWeb3: async function() {
    // Détection moderne du fournisseur MetaMask
    if (typeof window.ethereum !== 'undefined') {
      // Fournisseur MetaMask moderne
      try {
        console.log("Détection de MetaMask...");
        
        // Demander l'accès au compte AVANT de créer web3
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Comptes MetaMask reçus:", accounts);
        
        if (!accounts || accounts.length === 0) {
          alert("MetaMask est verrouillé ou aucun compte n'est disponible. Veuillez déverrouiller MetaMask.");
          return;
        }
        
        // Créer l'instance web3
        web3 = new Web3(window.ethereum);
        
        // IMPORTANT: truffle-contract a besoin d'un provider avec sendAsync
        // Créer un wrapper pour assurer la compatibilité
        App.web3Provider = web3.currentProvider;
        
        // Vérifier si sendAsync existe, sinon le créer
        if (!App.web3Provider.sendAsync && App.web3Provider.send) {
          App.web3Provider.sendAsync = function(payload, callback) {
            App.web3Provider.send(payload)
              .then(result => callback(null, result))
              .catch(error => callback(error, null));
          };
        }
        
        console.log("Web3 initialisé avec succès");
      } catch (error) {
        console.error("Erreur lors de l'accès à MetaMask:", error);
        alert("Veuillez autoriser l'accès à MetaMask pour utiliser cette application.");
        return;
      }
    } else if (typeof web3 !== 'undefined') {
      // Navigateurs dapp hérités
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Spécifier l'instance par défaut si aucune instance web3 n'est fournie
      console.log("MetaMask non détecté, utilisation de Ganache local");
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('/build/contracts/Voting.json', function(data) {
      App.contracts.Voting = TruffleContract(data);
      // Utiliser le provider qui a été correctement configuré
      App.contracts.Voting.setProvider(App.web3Provider);
      return App.render();
    }).fail(function(error) {
      console.error('Error loading contract:', error);
      alert('Erreur lors du chargement du contrat. Vérifiez que le contrat est déployé.');
    });
  },

  render: async function() {
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    try {
      // Get accounts using modern async/await
      console.log("Récupération des comptes...");
      let accounts = await web3.eth.getAccounts();
      console.log("Comptes récupérés:", accounts);
      
      // Si aucun compte, essayer de demander à nouveau l'accès
      if (!accounts || accounts.length === 0) {
        if (typeof window.ethereum !== 'undefined') {
          console.log("Aucun compte trouvé, nouvelle demande d'accès...");
          try {
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          } catch (error) {
            console.error("Erreur lors de la demande d'accès:", error);
          }
        }
        
        if (!accounts || accounts.length === 0) {
          alert("Aucun compte trouvé. Veuillez:\n1. Déverrouiller MetaMask\n2. Connecter votre compte à ce site\n3. Rafraîchir la page");
          loader.hide();
          return;
        }
      }

      App.account = accounts[0];
      console.log("Compte actif:", App.account);
      $("#accountAddress").text(App.account);

      // Get contract instance
      console.log("Récupération de l'instance du contrat...");
      const instance = await App.contracts.Voting.deployed();
      console.log("Instance du contrat récupérée:", instance.address);
      window.votingInstance = instance;

      // Get all contract state in parallel
      console.log("Récupération de l'état du contrat...");
      let owner, status, isRegistered, hasVoted, votedProposalId;
      
      try {
        owner = await instance.owner();
        console.log("Owner:", owner);
      } catch (error) {
        console.error("❌ Erreur lors de la récupération du owner:", error);
        throw new Error("Impossible de récupérer le propriétaire du contrat. Le contrat est-il déployé ?");
      }
      
      try {
        status = await instance.workflowStatus();
        console.log("Workflow status:", status.toNumber());
      } catch (error) {
        console.error("❌ Erreur lors de la récupération du workflowStatus:", error);
        throw new Error("Impossible de récupérer le statut du workflow.");
      }
      
      try {
        isRegistered = await instance.isVoterRegistered(App.account);
        console.log("Is registered:", isRegistered);
      } catch (error) {
        console.error("❌ Erreur lors de la vérification de l'enregistrement:", error);
        throw new Error("Impossible de vérifier si le compte est enregistré.");
      }
      
      try {
        hasVoted = await instance.hasVoterVoted(App.account);
        console.log("Has voted:", hasVoted);
      } catch (error) {
        console.error("❌ Erreur lors de la vérification du vote:", error);
        throw new Error("Impossible de vérifier si le compte a voté.");
      }
      
      try {
        votedProposalId = await instance.getVoterVotedProposalId(App.account);
        console.log("Voted proposal ID:", votedProposalId.toString());
      } catch (error) {
        console.error("❌ Erreur lors de la récupération de l'ID de proposition votée:", error);
        throw new Error("Impossible de récupérer l'ID de la proposition votée.");
      }

      App.isOwner = (App.account.toLowerCase() === owner.toLowerCase());
      App.workflowStatus = status.toNumber();
      App.displayWorkflowStatus(App.workflowStatus);

      App.isRegistered = isRegistered;
      App.hasVoted = hasVoted;
      if (App.hasVoted) {
        $("#votedProposalId").text(votedProposalId.toString());
      }

      if (App.isOwner) {
        $("#voterStatus").text("Administrateur");
      } else if (App.isRegistered) {
        $("#voterStatus").text("Électeur enregistré");
      } else {
        $("#voterStatus").text("Non enregistré");
      }

      App.updateUI();
      await App.loadProposalsIndividually();

      if (App.workflowStatus === 5) {
        const winner = await instance.getWinner();
        if (winner) {
          $("#winnerDescription").text(winner.description || winner[0]);
          $("#winnerVoteCount").text((winner.voteCount || winner[1]).toString());
        }
      }
      
      loader.hide();
      content.show();
    } catch (error) {
      console.error("❌ Erreur lors du chargement:", error);
      
      let errorMessage = "Erreur lors du chargement: ";
      
      if (error.message && error.message.includes("not been deployed")) {
        errorMessage += "Le contrat n'a pas été déployé. Veuillez exécuter 'truffle migrate --reset' dans le terminal.";
      } else if (error.message && error.message.includes("network")) {
        errorMessage += "Problème de réseau. Vérifiez que MetaMask est connecté au bon réseau (Ganache sur localhost:7545).";
      } else {
        errorMessage += error.message || error;
      }
      
      alert(errorMessage);
      loader.hide();
    }
  },

  displayWorkflowStatus: function(status) {
    const statusNames = [
      "Enregistrement des électeurs",
      "Enregistrement des propositions en cours",
      "Enregistrement des propositions terminé",
      "Session de vote en cours",
      "Session de vote terminée",
      "Votes comptabilisés"
    ];
    $("#workflowStatus").text("État actuel: " + statusNames[status]);
    $("#workflowStatus").attr('class', 'workflow-status status-' + status);
  },

  updateUI: function() {
    console.log("=== Mise à jour de l'interface ===");
    console.log("isOwner:", App.isOwner);
    console.log("isRegistered:", App.isRegistered);
    console.log("hasVoted:", App.hasVoted);
    console.log("workflowStatus:", App.workflowStatus);
    
    $('.hidden').addClass('hidden');
    $("#adminSection").addClass('hidden');
    $("#voterSection").addClass('hidden');
    $("#registerVoterSection").addClass('hidden');
    $("#proposalsAdminSection").addClass('hidden');
    $("#votingAdminSection").addClass('hidden');
    $("#endVotingAdminSection").addClass('hidden');
    $("#tallyAdminSection").addClass('hidden');
    $("#submitProposalSection").addClass('hidden');
    $("#voteSection").addClass('hidden');
    $("#alreadyVotedSection").addClass('hidden');
    $("#winnerSection").addClass('hidden');

    if (App.isOwner) {
      console.log("Affichage de la section admin");
      $("#adminSection").removeClass('hidden');
      
      if (App.workflowStatus === 0) {
        $("#registerVoterSection").removeClass('hidden');
      } else if (App.workflowStatus === 1) {
        $("#proposalsAdminSection").removeClass('hidden');
      } else if (App.workflowStatus === 2) {
        $("#votingAdminSection").removeClass('hidden');
      } else if (App.workflowStatus === 3) {
        $("#endVotingAdminSection").removeClass('hidden');
      } else if (App.workflowStatus === 4) {
        $("#tallyAdminSection").removeClass('hidden');
      }
    }

    if (App.isRegistered) {
      console.log("Affichage de la section électeur");
      $("#voterSection").removeClass('hidden');
      
      if (App.workflowStatus === 1) {
        console.log("Affichage du formulaire de soumission de proposition");
        $("#submitProposalSection").removeClass('hidden');
      } else if (App.workflowStatus === 3) {
        if (App.hasVoted) {
          $("#alreadyVotedSection").removeClass('hidden');
        } else {
          $("#voteSection").removeClass('hidden');
        }
      }
    }

    if (App.workflowStatus === 5) {
      $("#winnerSection").removeClass('hidden');
    }
  },

  loadProposalsIndividually: async function() {
    var proposalsList = [];
    var index = 0;

    try {
      // Try to load proposals one by one until we hit an error
      while (true) {
        try {
          const proposal = await window.votingInstance.proposals(index);
          const desc = proposal[0] || proposal.description;
          const votes = proposal[1] || proposal.voteCount;
          
          // Check if we got a valid proposal
          if (!desc || desc === "") {
            break;
          }
          
          proposalsList.push({ 
            description: desc, 
            voteCount: votes.toString() 
          });
          index++;
        } catch (error) {
          // Error means we've reached the end of the array or no proposals exist
          break;
        }
      }
    } catch (error) {
      console.log("Aucune proposition trouvée ou erreur de chargement:", error.message);
    }
    
    App.displayProposals(proposalsList);
  },

  displayProposals: function(proposals) {
    let html = '';
    const select = $("#proposalSelect");
    select.empty();
    select.append('<option value="">Sélectionnez une proposition</option>');

    if (proposals.length === 0) {
      html = '<p class="text-muted">Aucune proposition pour le moment</p>';
    } else {
      html = '<table class="table table-striped"><thead><tr><th>#</th><th>Description</th><th>Votes</th></tr></thead><tbody>';
      
      for (let i = 0; i < proposals.length; i++) {
        var desc = proposals[i].description || proposals[i][0];
        var votes = proposals[i].voteCount || proposals[i][1];
        html += '<tr><td>' + i + '</td><td>' + desc + '</td><td>' + votes + '</td></tr>';
        select.append('<option value="' + i + '">#' + i + ' - ' + desc + '</option>');
      }
      
      html += '</tbody></table>';
    }
    
    $("#proposalsList").html(html);
  },

  loadProposals: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      const proposals = await instance.getProposals();
      
      let html = '';
      const select = $("#proposalSelect");
      select.empty();
      select.append('<option value="">Sélectionnez une proposition</option>');

      if (proposals.length === 0) {
        html = '<p class="text-muted">Aucune proposition pour le moment</p>';
      } else {
        html = '<table class="table table-striped"><thead><tr><th>#</th><th>Description</th><th>Votes</th></tr></thead><tbody>';
        
        for (let i = 0; i < proposals.length; i++) {
          html += '<tr><td>' + i + '</td><td>' + proposals[i].description + '</td><td>' + proposals[i].voteCount + '</td></tr>';
          select.append('<option value="' + i + '">#' + i + ' - ' + proposals[i].description + '</option>');
        }
        
        html += '</tbody></table>';
      }
      
      $("#proposalsList").html(html);
    } catch (error) {
      console.error(error);
    }
  },

  loadWinner: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      const winner = await instance.getWinner();
      $("#winnerDescription").text(winner.description);
      $("#winnerVoteCount").text(winner.voteCount.toString());
    } catch (error) {
      console.error(error);
    }
  },

  registerVoter: async function() {
    const address = $("#voterAddress").val();
    if (!address) {
      alert("Veuillez entrer une adresse");
      return;
    }

    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Envoi de la transaction pour enregistrer l'électeur...");
      const tx = await instance.registerVoter(address, { from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Électeur enregistré avec succès!");
      $("#voterAddress").val('');
      await App.render();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  startProposalsRegistration: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Démarrage de l'enregistrement des propositions...");
      const tx = await instance.startProposalsRegistration({ from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Session d'enregistrement des propositions démarrée!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  submitProposal: async function() {
    const description = $("#proposalDescription").val();
    if (!description) {
      alert("Veuillez entrer une description");
      return;
    }

    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Envoi de la proposition...");
      const tx = await instance.registerProposal(description, { from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Proposition soumise avec succès!");
      $("#proposalDescription").val('');
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  endProposalsRegistration: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Fin de l'enregistrement des propositions...");
      const tx = await instance.endProposalsRegistration({ from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Session d'enregistrement des propositions terminée!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  startVotingSession: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Démarrage de la session de vote...");
      const tx = await instance.startVotingSession({ from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Session de vote démarrée!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  vote: async function() {
    const proposalId = $("#proposalSelect").val();
    if (!proposalId && proposalId !== "0") {
      alert("Veuillez sélectionner une proposition");
      return;
    }

    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Envoi du vote pour la proposition", proposalId);
      const tx = await instance.vote(proposalId, { from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Vote enregistré avec succès!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  endVotingSession: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Fin de la session de vote...");
      const tx = await instance.endVotingSession({ from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Session de vote terminée!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  tallyVotes: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      console.log("Comptabilisation des votes...");
      const tx = await instance.tallyVotes({ from: App.account });
      console.log("Transaction confirmée:", tx);
      alert("Votes comptabilisés avec succès!");
      await App.render();
    } catch (error) {
      console.error("Erreur:", error);
      if (error.message.includes("User denied")) {
        alert("Transaction annulée par l'utilisateur");
      } else {
        alert("Erreur: " + (error.message || error));
      }
    }
  },

  bindEvents: function() {
    // Form: Register Voter
    const registerVoterForm = document.getElementById('registerVoterForm');
    if (registerVoterForm) {
      registerVoterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        App.registerVoter();
      });
    }

    // Button: Start Proposals Registration
    const startProposalsBtn = document.getElementById('startProposalsBtn');
    if (startProposalsBtn) {
      startProposalsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        App.startProposalsRegistration();
      });
    }

    // Button: End Proposals Registration
    const endProposalsBtn = document.getElementById('endProposalsBtn');
    if (endProposalsBtn) {
      endProposalsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        App.endProposalsRegistration();
      });
    }

    // Button: Start Voting Session
    const startVotingBtn = document.getElementById('startVotingBtn');
    if (startVotingBtn) {
      startVotingBtn.addEventListener('click', function(e) {
        e.preventDefault();
        App.startVotingSession();
      });
    }

    // Button: End Voting Session
    const endVotingBtn = document.getElementById('endVotingBtn');
    if (endVotingBtn) {
      endVotingBtn.addEventListener('click', function(e) {
        e.preventDefault();
        App.endVotingSession();
      });
    }

    // Button: Tally Votes
    const tallyVotesBtn = document.getElementById('tallyVotesBtn');
    if (tallyVotesBtn) {
      tallyVotesBtn.addEventListener('click', function(e) {
        e.preventDefault();
        App.tallyVotes();
      });
    }

    // Form: Submit Proposal
    const submitProposalForm = document.getElementById('submitProposalForm');
    if (submitProposalForm) {
      submitProposalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        App.submitProposal();
      });
    }

    // Form: Vote
    const voteForm = document.getElementById('voteForm');
    if (voteForm) {
      voteForm.addEventListener('submit', function(e) {
        e.preventDefault();
        App.vote();
      });
    }
  }
};

$(function() {
  $(window).load(function() {
    App.init();
    // Bind all event listeners after DOM is loaded
    App.bindEvents();
  });
});

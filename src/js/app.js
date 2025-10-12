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
      App.web3Provider = window.ethereum;
      web3 = new Web3(window.ethereum);
      try {
        // Demander l'accès au compte
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access", error);
      }
    } else if (typeof web3 !== 'undefined') {
      // Navigateurs dapp hérités
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Spécifier l'instance par défaut si aucune instance web3 n'est fournie
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Voting.json', function(data) {
      App.contracts.Voting = TruffleContract(data);
      App.contracts.Voting.setProvider(App.web3Provider);
      return App.render();
    });
  },

  render: function() {
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    web3.eth.getAccounts(function(err, accounts) {
      if (err) {
        console.error(err);
        alert("Erreur: " + err.message);
        return;
      }

      App.account = accounts[0];
      $("#accountAddress").text(App.account);

      App.contracts.Voting.deployed().then(function(instance) {
        window.votingInstance = instance;

        return Promise.all([
          instance.owner(),
          instance.workflowStatus(),
          instance.isVoterRegistered(App.account),
          instance.hasVoterVoted(App.account),
          instance.getVoterVotedProposalId(App.account)
        ]).then(function(results) {
          var owner = results[0];
          var status = results[1];
          var isRegistered = results[2];
          var hasVoted = results[3];
          var votedProposalId = results[4];

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
          App.loadProposalsIndividually();

          if (App.workflowStatus === 5) {
            return instance.getWinner();
          }
        }).then(function(winner) {
          if (winner) {
            $("#winnerDescription").text(winner.description || winner[0]);
            $("#winnerVoteCount").text((winner.voteCount || winner[1]).toString());
          }
          loader.hide();
          content.show();
        });
      }).catch(function(error) {
        console.error(error);
        alert("Erreur lors du chargement: " + error.message);
        loader.hide();
      });
    });
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
      $("#voterSection").removeClass('hidden');
      
      if (App.workflowStatus === 1) {
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

  loadProposalsIndividually: function() {
    var proposalsList = [];
    var index = 0;

    function loadNext() {
      window.votingInstance.proposals(index).then(function(proposal) {
        var desc = proposal[0] || proposal.description;
        var votes = proposal[1] || proposal.voteCount;
        
        if (desc) {
          proposalsList.push({ description: desc, voteCount: votes.toString() });
          index++;
          loadNext();
        } else {
          App.displayProposals(proposalsList);
        }
      }).catch(function() {
        // No more proposals
        App.displayProposals(proposalsList);
      });
    }

    loadNext();
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
      await instance.registerVoter(address, { from: App.account });
      alert("Électeur enregistré avec succès!");
      $("#voterAddress").val('');
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  startProposalsRegistration: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.startProposalsRegistration({ from: App.account });
      alert("Session d'enregistrement des propositions démarrée!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
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
      await instance.registerProposal(description, { from: App.account });
      alert("Proposition soumise avec succès!");
      $("#proposalDescription").val('');
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  endProposalsRegistration: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.endProposalsRegistration({ from: App.account });
      alert("Session d'enregistrement des propositions terminée!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  startVotingSession: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.startVotingSession({ from: App.account });
      alert("Session de vote démarrée!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  vote: async function() {
    const proposalId = $("#proposalSelect").val();
    if (!proposalId) {
      alert("Veuillez sélectionner une proposition");
      return;
    }

    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.vote(proposalId, { from: App.account });
      alert("Vote enregistré avec succès!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  endVotingSession: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.endVotingSession({ from: App.account });
      alert("Session de vote terminée!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  },

  tallyVotes: async function() {
    try {
      const instance = await App.contracts.Voting.deployed();
      await instance.tallyVotes({ from: App.account });
      alert("Votes comptabilisés avec succès!");
      App.render();
    } catch (error) {
      console.error(error);
      alert("Erreur: " + error.message);
    }
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});

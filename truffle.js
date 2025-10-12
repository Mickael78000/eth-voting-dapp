module.exports = {
  // Voir <http://truffleframework.com/docs/advanced/configuration>
  // pour plus d'informations sur la personnalisation de votre configuration Truffle !
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Correspond à n'importe quel identifiant de réseau
    }
  },
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        },
        evmVersion: "paris"
      }
    }
  }
};
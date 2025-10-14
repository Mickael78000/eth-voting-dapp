require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

// IMPORTANT: Créez un fichier .env et ajoutez-le à .gitignore
// Ne committez JAMAIS vos clés privées ou mnémoniques!
const INFURA_API_KEY = process.env.INFURA_API_KEY || "YOUR_INFURA_API_KEY";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "YOUR_ALCHEMY_API_KEY";
const MNEMONIC = process.env.MNEMONIC || "YOUR_WALLET_MNEMONIC_12_WORDS";

module.exports = {
  // Voir <http://truffleframework.com/docs/advanced/configuration>
  // pour plus d'informations sur la personnalisation de votre configuration Truffle !
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Correspond à n'importe quel identifiant de réseau
    },
    sepolia: {
      provider: () => new HDWalletProvider(
        MNEMONIC,
        `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
      ),
      network_id: 11155111,       // Sepolia's network id
      gas: 5500000,               // Gas limit
      confirmations: 2,           // # of confirmations to wait between deployments
      timeoutBlocks: 200,         // # of blocks before a deployment times out
      skipDryRun: true            // Skip dry run before migrations
    },
    sepolia_alchemy: {
      provider: () => new HDWalletProvider(
        MNEMONIC,
        `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      ),
      network_id: 11155111,       // Sepolia's network id
      gas: 5500000,               // Gas limit
      confirmations: 2,           // # of confirmations to wait between deployments
      timeoutBlocks: 200,         // # of blocks before a deployment times out
      skipDryRun: true            // Skip dry run before migrations
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
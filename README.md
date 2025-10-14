
# 🗳️ Système de Vote Décentralisé - DApp Ethereum

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://eth-voting-dapp.vercel.app/)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black)](https://vercel.com)

Une application décentralisée (DApp) complète de vote sur la blockchain Ethereum, développée avec Truffle, Solidity et Web3.js.

## 🌐 Démo en Ligne

**🚀 Application déployée**: [https://eth-voting-dapp.vercel.app/](https://eth-voting-dapp.vercel.app/)

> **Note**: Pour utiliser la démo, vous devez avoir MetaMask installé et connecté à un réseau Ethereum (Ganache local, Sepolia, ou autre réseau de test).

## 📋 Description

Ce projet implémente un système de vote décentralisé avec gestion de workflow complet :
- Enregistrement des électeurs par un administrateur
- Soumission de propositions par les électeurs enregistrés
- Session de vote sécurisée
- Comptabilisation automatique des votes
- Interface web interactive en français

## 🛠️ Technologies Utilisées

### Smart Contract
- **Solidity**: v0.8.20
- **OpenZeppelin Contracts**: v5.4.0 (pour Ownable)
- **Truffle Framework**: Pour la compilation et le déploiement

### Frontend
- **Web3.js**: v0.20.x (version compatible avec l'ancien format)
- **Bootstrap**: v3.3.7 (pour l'interface utilisateur)
- **jQuery**: v1.12.4
- **Truffle Contract**: Pour l'interaction avec les smart contracts
- **Lite-server**: Serveur de développement
- **CSP-Compliant**: Content Security Policy respecté (pas d'inline scripts)
- **Async/Await**: Patterns modernes pour MetaMask

### Blockchain Locale
- **Ganache**: v7.9.2
- **Network ID**: 1337
- **RPC Server**: http://127.0.0.1:7545

### Tests
- **Chai**: v4.5.0 (assertions)
- **OpenZeppelin Test Helpers**: v0.5.16

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

1. **Node.js et NPM**: https://nodejs.org (version LTS recommandée)
2. **Truffle Framework**:
   ```bash
   npm install -g truffle
   ```
3. **Ganache**: https://trufflesuite.com/ganache/
   - Lancez Ganache et configurez-le sur le port **7545**
   - Network ID: **1337**
4. **MetaMask**: https://metamask.io/
   - Extension de navigateur pour interagir avec la blockchain

## 🚀 Installation

### Étape 1 : Cloner le projet
```bash
git clone <votre-repo>
cd election
```

### Étape 2 : Installer les dépendances
```bash
npm install
```

### Étape 3 : Configurer Ganache
1. Ouvrez Ganache
2. Créez un nouveau workspace ou utilisez Quickstart
3. Vérifiez que le serveur RPC est sur **http://127.0.0.1:7545**
4. Vérifiez que le Network ID est **1337**

### Étape 4 : Compiler les smart contracts
```bash
truffle compile
```

### Étape 5 : Déployer sur Ganache
```bash
truffle migrate --reset
```

Vous devriez voir :
```
Replacing 'Voting'
------------------
> contract address:    0x...
> block number:        ...
> account:             0x...
```

### Étape 6 : Configurer MetaMask

1. Ouvrez MetaMask dans votre navigateur
2. Ajoutez un réseau personnalisé :
   - **Nom du réseau**: Ganache Local
   - **URL RPC**: http://127.0.0.1:7545
   - **ID de chaîne**: 1337
   - **Symbole**: ETH
3. Importez un compte depuis Ganache :
   - Copiez une clé privée depuis Ganache
   - Dans MetaMask : Importer un compte → Coller la clé privée

### Étape 7 : Lancer le serveur de développement
```bash
npm run dev
```

L'application sera accessible sur **http://localhost:3000**

> **Note**: Le port peut varier (3000, 3001, 3002) selon les instances de lite-server en cours d'exécution. Vérifiez la sortie de la console.

## 🧪 Tests

Exécuter les tests unitaires :
```bash
truffle test
```

Les tests couvrent :
- ✅ Enregistrement des électeurs
- ✅ Transitions de workflow
- ✅ Soumission de propositions
- ✅ Processus de vote
- ✅ Comptabilisation des votes
- ✅ Contrôles d'accès et validations

## 📖 Structure du Projet

```
election/
├── contracts/
│   ├── Voting.sol              # Smart contract principal
│   └── Migrations.sol          # Contrat de migration Truffle
├── migrations/
│   ├── 1_initial_migration.js
│   └── 3_deploy_voting.js      # Script de déploiement
├── test/
│   └── voting.js               # Tests unitaires avec Chai
├── src/
│   ├── index.html              # Interface utilisateur
│   ├── js/
│   │   └── app.js              # Logique frontend Web3.js
│   └── css/
│       └── bootstrap.min.css
├── truffle.js                  # Configuration Truffle
└── package.json
```

## 🎯 Utilisation

### En tant qu'Administrateur (Owner)

Le compte qui déploie le contrat est automatiquement l'administrateur.

1. **Enregistrer des électeurs**:
   - Entrez l'adresse Ethereum d'un électeur
   - Cliquez sur "Enregistrer l'électeur"

2. **Démarrer l'enregistrement des propositions**:
   - Cliquez sur "Démarrer l'enregistrement des propositions"

3. **Terminer l'enregistrement des propositions**:
   - Une fois les propositions soumises, cliquez sur "Terminer l'enregistrement des propositions"

4. **Démarrer la session de vote**:
   - Cliquez sur "Démarrer la session de vote"

5. **Terminer la session de vote**:
   - Après le vote, cliquez sur "Terminer la session de vote"

6. **Comptabiliser les votes**:
   - Cliquez sur "Comptabiliser les votes" pour déterminer le gagnant

### En tant qu'Électeur

Changez de compte dans MetaMask pour utiliser un compte électeur enregistré.

1. **Soumettre une proposition** (pendant la phase d'enregistrement):
   - Entrez la description de votre proposition
   - Cliquez sur "Soumettre la proposition"

2. **Voter** (pendant la session de vote):
   - Sélectionnez une proposition dans la liste
   - Cliquez sur "Voter"

## 🔧 Workflow du Vote

Le système suit un workflow strict :

```
0. RegisteringVoters (Enregistrement des électeurs)
   ↓
1. ProposalsRegistrationStarted (Enregistrement des propositions)
   ↓
2. ProposalsRegistrationEnded (Enregistrement terminé)
   ↓
3. VotingSessionStarted (Session de vote)
   ↓
4. VotingSessionEnded (Session terminée)
   ↓
5. VotesTallied (Votes comptabilisés)
```

## 🔐 Fonctionnalités de Sécurité

- **Contrôle d'accès**: Seul le propriétaire peut gérer le workflow
- **Vérification des électeurs**: Seuls les électeurs enregistrés peuvent proposer et voter
- **Vote unique**: Chaque électeur ne peut voter qu'une seule fois
- **Workflow strict**: Les transitions d'état sont contrôlées
- **Validation des données**: Vérification des adresses et des propositions

## 🐛 Résolution de Problèmes

### Erreur "Contract not deployed" ou "Internal JSON-RPC error"
- Vérifiez que Ganache est lancé sur le port 7545
- Relancez `truffle migrate --reset`
- Vérifiez que MetaMask est connecté au bon réseau (Ganache Local - Chain ID 1337)
- Consultez la console du navigateur pour des messages d'erreur détaillés

### Erreur "Aucun compte trouvé"
- Déverrouillez MetaMask
- Connectez votre compte au site (cliquez sur l'icône MetaMask et sélectionnez "Connecter")
- Vérifiez que vous avez importé un compte depuis Ganache
- Rafraîchissez la page après la connexion

### Erreur MetaMask "Nonce too high"
- Dans MetaMask : Paramètres → Avancé → Réinitialiser le compte

### Erreur "e is not a function" ou "sendAsync"
- Ce problème est résolu avec le wrapper de compatibilité ajouté dans `app.js`
- Assurez-vous que les derniers changements sont appliqués

### Erreur CSP (Content Security Policy)
- Tous les event handlers inline ont été supprimés
- Les événements sont gérés via `App.bindEvents()` dans le JavaScript

### La page ne charge pas
- Vérifiez que `npm run dev` est en cours d'exécution
- Vérifiez que MetaMask est connecté au réseau Ganache Local
- Ouvrez la console du navigateur (F12) pour voir les logs détaillés

### Les boutons ne fonctionnent pas
- Vérifiez que `App.bindEvents()` est appelé après le chargement du DOM
- Consultez la console pour les erreurs JavaScript

## 📝 Notes Importantes

### Compatibilité et Architecture

- **Compatibilité Web3.js**: Le projet utilise web3.js 0.20.x pour la compatibilité. Des fonctions spéciales (`isVoterRegistered`, `hasVoterVoted`, `getVoterVotedProposalId`) ont été ajoutées au contrat pour éviter les problèmes de décodage des structs.

- **Solidity 0.8.20**: Version moderne avec protection contre les débordements intégrée.

- **OpenZeppelin**: Utilisation du contrat `Ownable` pour la gestion des droits d'administration.

### Améliorations Modernes

- **Async/Await**: Toutes les fonctions utilisent des patterns async/await modernes pour une meilleure gestion des transactions MetaMask.

- **CSP-Compliant**: L'application respecte les Content Security Policies strictes :
  - Aucun inline event handler (`onclick`, `onsubmit`)
  - Tous les événements sont liés via JavaScript avec `addEventListener`
  - Aucun inline style (sauf dans le bloc `<style>`)

- **Wrapper sendAsync**: Un wrapper de compatibilité est ajouté automatiquement pour que truffle-contract fonctionne avec les providers MetaMask modernes.

- **Gestion des changements MetaMask**: L'application détecte automatiquement :
  - Les changements de compte (recharge la page)
  - Les changements de réseau (recharge la page)
  - Les déconnexions de compte

- **Logs de débogage**: Des logs console détaillés facilitent le débogage :
  - État de connexion MetaMask
  - Comptes récupérés
  - État du workflow
  - Erreurs spécifiques pour chaque appel de contrat

## 📄 Licence

ISC

## 👨‍💻 Auteur

Projet développé dans le cadre du bootcamp Ethereum.

---

**Bon vote décentralisé ! 🗳️✨**

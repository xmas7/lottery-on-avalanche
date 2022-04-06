require("dotenv-extended").load();
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";

if (!process.env.ACCOUNT1_PRIVKEY)
  throw new Error("ACCOUNT1_PRIVKEY missing from .env file");
if (!process.env.ACCOUNT2_PRIVKEY)
  throw new Error("ACCOUNT2_PRIVKEY missing from .env file");
if (!process.env.ACCOUNT3_PRIVKEY)
  throw new Error("ACCOUNT3_PRIVKEY missing from .env file");
if (!process.env.ACCOUNT4_PRIVKEY)
  throw new Error("ACCOUNT4_PRIVKEY missing from .env file");
if (!process.env.ACCOUNT5_PRIVKEY)
  throw new Error("ACCOUNT5_PRIVKEY missing from .env file");

const account1PrivateKey = process.env.ACCOUNT1_PRIVKEY
const account2PrivateKey = process.env.ACCOUNT2_PRIVKEY
const account3PrivateKey = process.env.ACCOUNT3_PRIVKEY
const account4PrivateKey = process.env.ACCOUNT4_PRIVKEY
const account5PrivateKey = process.env.ACCOUNT4_PRIVKEY


const config = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    mainnet: {
      chainId: 1,
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_MAINNET_KEY}`,
      accounts: [
        account1PrivateKey,
        account2PrivateKey,
        account3PrivateKey,
        account4PrivateKey,
        account5PrivateKey
      ],
    },
    rinkeby: {
      chainId: 4,
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_TESTNET_KEY}`,
      accounts: [
        account1PrivateKey,
        account2PrivateKey,
        account3PrivateKey,
        account4PrivateKey,
        account5PrivateKey
      ],
    },
    avalanche: {
      chainId: 43114,
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [
        account1PrivateKey,
        account2PrivateKey,
        account3PrivateKey,
        account4PrivateKey,
        account5PrivateKey
      ],
    },
    avalancheTest: {
      chainId: 43113,
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [
        account1PrivateKey,
        account2PrivateKey,
        account3PrivateKey,
        account4PrivateKey,
        account5PrivateKey
      ],
    },
  },
  etherscan: {
    apiKey: process.env.AVAXSCAN_API,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  mocha: {
    timeout: 2000000000,
  },
  typechain: {
    outDir: "types/contracts",
    target: "truffle-v5",
  },
};

export default config;

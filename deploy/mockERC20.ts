import hre from "hardhat";
import { Logger } from "tslog";
import "@nomiclabs/hardhat-ethers";
import { mockERC20Args } from "../config/construct-arguments";
import { verify } from "../utils";

const log: Logger = new Logger();
const contractName = "MockERC20";
const mockERC20ArgValues = Object.values(mockERC20Args);

async function deploy() {
  log.info(`Deploying "${contractName}" on network: ${hre.network.name}`);
  const deployContract = await hre.ethers.getContractFactory(contractName);
  const deployContractInstance = await deployContract.deploy(
    mockERC20Args.name,
    mockERC20Args.symbol,
    mockERC20Args.initialSupply
  );
  await deployContractInstance.deployed();
  const deployContractAddress = deployContractInstance.address;
  log.info(
    `"${contractName}" was successfully deployed on network: ${hre.network.name}, address: ${deployContractAddress}`
  );
  return { deployedAddr: deployContractAddress };
}

async function main() {
  const { deployedAddr } = await deploy();
  await verify({
    contractName,
    address: deployedAddr,
    constructorArguments: mockERC20ArgValues,
    contractPath: "contracts/mock/MockERC20.sol:MockERC20",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

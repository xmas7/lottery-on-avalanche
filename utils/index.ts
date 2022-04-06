import hre from "hardhat";
import { Logger } from "tslog";
import { wait } from "../utils/time";

const log: Logger = new Logger();

async function verify({
  contractName,
  address,
  constructorArguments,
  contractPath,
}: {
  contractName: string;
  address: string;
  constructorArguments: any[];
  contractPath: string;
}) {
  wait(10000);

  log.info(
    `Verifying "${contractName}" on network: ${hre.network.name}, address: ${address}`
  );
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
      contract: contractPath,
    });
    log.info(
      `Verifying "${contractName}" on network: ${hre.network.name}, address: ${address} was succeeded.`
    );
  } catch (e) {
    log.error(`Verification error: ${e}`);
  }
}

export { verify };

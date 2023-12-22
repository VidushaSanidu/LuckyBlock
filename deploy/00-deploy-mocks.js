// IF THE NETWORK IS A TEST NETWORK
// FIRST NEED TO DEPLOY MOCK CONTRACTS

const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

// set up arguments for deploying mock contract
const BASE_FEE = ethers.parseEther("0.25"); //"100000000000000000";
const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    //const chainID = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying mocks...");

        // deployment
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        });

        log("Mocks Deployed Successfully.");
        log("--------------------------------------------------");
    }
};

module.exports.tags = ["all", "mocks"];

// DEPLOYING LUCKY BLOCK CONTRACT
// BOTH IN TEST NETS AND PUBLIC NETWORKS

const { network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { varify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // set up arguments //

    let vrfCoordinatorV2Address, vrfCoordinatorV2Mock;
    let subscriptionID;

    // get arguments specific for the testnet
    // ie. vrfCoordinatorV2Address and subscriptionID

    if (developmentChains.includes(network.name)) {
        // get the deployed mock contract and set the address
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.runner.address;

        // creates a VRF subscription and retrieves its ID.
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionID = transactionReceipt.logs[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionID, VRF_SUB_FUND_AMOUNT);
    }
    // get arguments specific for the public nets
    else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionID = networkConfig[chainId]["subsriptionID"];
    }

    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callBackGasLimit = networkConfig[chainId]["callBackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    // finalize the args
    args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionID,
        callBackGasLimit,
        interval,
    ];

    // deploy lucky block
    console.log("deploying lucky block on " + network.name + "...");

    const luckyBlock = await deploy("LuckyBlock", {
        from: deployer,
        args: args,
        logs: true,
        waitConfirmation: network.config.blockConfirmations || 1,
    });

    if (luckyBlock.newlyDeployed) {
        log(`contract deployed at ${luckyBlock.address} using ${luckyBlock.receipt.gasUsed} gas`);
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("varifying...");
        await varify(luckyBlock.address, args);
        log("done.");
    }

    log("--------------------------------------------------");
};

module.exports.tags = ["all"];

const { run } = require("hardhat");

const varify = async (contractAddress, args) => {
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        });
    } catch (e) {
        if (e.message.toLowerCase().includes("already varifired")) {
            console.log("Already Varified!");
        } else {
            console.log(e);
        }
    }
};

module.exports = { varify };

const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? // if the network is not a test network --> skip
      describe.skip
    : // if the network is a test network --> run test
      describe("Lucky Block Unit Tests", async function () {
          let luckyBlock,
              pc_luckyBlock,
              vrfCoordinatorV2Mock,
              LBEntranceFee,
              deployer,
              player,
              interval;
          const chainID = network.config.chainId;

          // get deployed contracts
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              player = (await getNamedAccounts()).player;
              await deployments.fixture(["all"]);
              luckyBlock = await ethers.getContract("LuckyBlock", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              pc_luckyBlock = luckyBlock.connect(player);
              LBEntranceFee = await luckyBlock.getEntranceFee();
              interval = await luckyBlock.getInterval();
          });

          describe("constructor", async function () {
              it("Initializes the lucky block correctly", async function () {
                  const blockState = await luckyBlock.getLBStatus();
                  assert.equal(blockState.toString(), "0");
                  assert.equal(interval.toString(), networkConfig[chainID]["interval"]);
              });
          });

          describe("enter Lucky Block", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(luckyBlock.enterEvent()).to.be.revertedWithCustomError(
                      luckyBlock,
                      "LBlock__NotEnoughETHprovided",
                  );
              });
              it("records player when they enter", async () => {
                  //console.log(luckyBlock);
                  await luckyBlock.enterEvent({ value: LBEntranceFee });
                  const contractPlayer = await luckyBlock.getPlayer(0);
                  assert.equal(deployer, contractPlayer);
              });
              it("emits event on enter", async () => {
                  await expect(luckyBlock.enterEvent({ value: LBEntranceFee })).to.emit(
                      luckyBlock,
                      "EventEnter",
                  );
              });
              //   it("doesn't allow entrance when Lucky Block is calculating", async () => {
              //       await luckyBlock.enterEvent({ value: LBEntranceFee });
              //       console.log(typeof interval);
              //       await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
              //       await network.provider.request({ method: "evm_mine", params: [] });
              //       // we pretend to be a keeper for a second
              //       await luckyBlock.performUpkeep([]); // changes the state to calculating for our comparison below
              //       await expect(luckyBlock.enterEvent({ value: LBEntranceFee })).to.be.revertedWith(
              //           "LBlock__NotOpen",
              //       );
              //   });
          });
      });

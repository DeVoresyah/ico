let FastInvestToken = artifacts.require("./FastInvestToken.sol");
let FastInvestTokenCrowdsale = artifacts.require("./FastInvestTokenCrowdsale.sol");

module.exports = function(deployer, network, accounts) {

    const walletAddress = '0xe17217B991cBb6BA78CcCb918b2052C2aE9B5aDe';
    const fundingGoal   = 388500000000000000000000000;
    const START_TIMESTAMP = 1512381600;
    const END_TIMESTAMP = 1517410800;

    deployer.deploy(FastInvestToken).then(function() {

        deployer.deploy(FastInvestTokenCrowdsale, FastInvestToken.address, walletAddress, START_TIMESTAMP, END_TIMESTAMP).then(function(){

            FastInvestToken.at(FastInvestToken.address).approve(FastInvestTokenCrowdsale.address, fundingGoal);

        });
    });
};
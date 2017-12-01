let FastInvestToken = artifacts.require('FastInvestToken');
let Crowdsale = artifacts.require('FastInvestTokenCrowdsale');

let walletAddress = '0xe17217B991cBb6BA78CcCb918b2052C2aE9B5aDe';

let softCap     = 38850000000000000000000000;
let fundingGoal = 388500000000000000000000000;

let rate = 1000;
let rateSoft = 1200;

let startTimestamp = 1512381600; // 12/04/2017 @ 10:00am (UTC)
let endTimestamp = 1517410800; // 01/31/2018 @ 3:00pm (UTC)

let tokenInstance;
let crowdsaleInstance;

let decimals = 18;

function toAmount(value) {
    return value * 10**decimals;
}

function increaseTime(duration) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1);

            web3.currentProvider.sendAsync({jsonrpc: '2.0', method: 'evm_mine', id: id+1}, (err2, res) => {
                return err2 ? reject(err2) : resolve(res)
            })
        })
    })
}

contract('Crowdsale', function (accounts) {

    let ownerAccount     = accounts[0];
    let investorAccount  = accounts[2];

    let halfSoftTokens = 19425000;
    let halfSoftTokensPriceInEther = 16187.5;

    before(async function () {
        tokenInstance = await FastInvestToken.new();
        crowdsaleInstance = await Crowdsale.new(tokenInstance.address, walletAddress, startTimestamp, endTimestamp);

        await tokenInstance.approve(crowdsaleInstance.address, fundingGoal);
    });

    it("initializes with correct values", async function () {

        let goal = await crowdsaleInstance.FUNDING_GOAL.call();
        assert.equal(fundingGoal, goal.toNumber());

        let cap = await crowdsaleInstance.SOFT_CAP.call();
        assert.equal(softCap, cap.toNumber());

        let regularRate = await crowdsaleInstance.RATE.call();
        assert.equal(rate, regularRate.toNumber());

        let softRate = await crowdsaleInstance.RATE_SOFT.call();
        assert.equal(rateSoft, softRate.toNumber());

        let start = await crowdsaleInstance.startTime.call();
        assert.equal(startTimestamp, start.toNumber());


        let end = await crowdsaleInstance.endTime.call();
        assert.equal(endTimestamp, end.toNumber());

    });

    it('should be not ended before endTime', async function () {

        let ended = await crowdsaleInstance.hasEnded();
        assert.equal(ended, false);

    });

    it("should fail to buy tokens too early", async function () {

        let owner_account_token_balance = await tokenInstance.balanceOf(ownerAccount);
        let investor_account_token_balance = await tokenInstance.balanceOf(investorAccount);

        try {

            await crowdsaleInstance.buyTokens(investorAccount, { value: web3.toWei(10), from: investorAccount });

        } catch (error) {}

        let owner_account_token_balance_after = await tokenInstance.balanceOf(ownerAccount);
        let investor_account_token_balance_after = await tokenInstance.balanceOf(investorAccount);

        assert.equal(owner_account_token_balance.toNumber(), owner_account_token_balance_after.toNumber());
        assert.equal(investor_account_token_balance.toNumber(), investor_account_token_balance_after.toNumber());

    });

    it("should buy tokens at soft cap price", async function () {
        // Increase time to value after Crowdsale start
        await increaseTime(startTimestamp - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 100);

        let walletBalanceBefore = web3.eth.getBalance(walletAddress);
        let weiRaisedBefore = await crowdsaleInstance.weiRaised.call();
        let tokensSoldBefore = await crowdsaleInstance.tokensSold.call();

        let weiAmount = web3.toWei(halfSoftTokensPriceInEther);
        let expectedTokensCount = toAmount(halfSoftTokens);

        let result = await crowdsaleInstance.buyTokens(investorAccount, { value: weiAmount, from: investorAccount });

        //Event shold be fired
        let event = result.logs[0].args;
        assert.equal(event.purchaser, investorAccount);
        assert.equal(event.beneficiary, investorAccount);
        assert.equal(event.value.toNumber(), weiAmount);
        assert.equal(event.amount.toNumber(), expectedTokensCount);

        // Investor should receive tokens
        let investor_account_balance_after = await tokenInstance.balanceOf(investorAccount);
        assert.equal(investor_account_balance_after.toNumber(), expectedTokensCount);

        // Funds should be transfered to wallet
        let walletBalanceAfter = web3.eth.getBalance(walletAddress);
        let expectedWalletBalance = walletBalanceBefore.plus(weiAmount);
        assert.equal(walletBalanceAfter.toNumber(), expectedWalletBalance.toNumber());

        // Totals should be updated
        let weiRaisedAfter = await crowdsaleInstance.weiRaised.call();
        let tokensSoldAfter = await crowdsaleInstance.tokensSold.call();
        assert.equal(weiRaisedBefore.plus(weiAmount).toNumber(), weiRaisedAfter.toNumber());
        assert.equal(tokensSoldBefore.plus(expectedTokensCount).toNumber(), tokensSoldAfter.toNumber());

    });

    it("should buy X tokens at soft cap price and Y tokens at normal price", async function () {

        let walletBalanceBefore = web3.eth.getBalance(walletAddress);
        let weiRaisedBefore = await crowdsaleInstance.weiRaised.call();
        let tokensSoldBefore = await crowdsaleInstance.tokensSold.call();
        let investorAccountBalanceBefore = await tokenInstance.balanceOf(investorAccount);

        let weiAmount = web3.toWei(halfSoftTokensPriceInEther + 1000);
        let expectedTokensCount = toAmount(halfSoftTokens + 1000000);

        let result = await crowdsaleInstance.buyTokens(investorAccount, { value: weiAmount, from: investorAccount });

        //Event shold be fired
        let event = result.logs[0].args;
        assert.equal(event.purchaser, investorAccount);
        assert.equal(event.beneficiary, investorAccount);
        assert.equal(event.value.toNumber(), weiAmount);
        assert.equal(event.amount.toNumber(), expectedTokensCount);

        // Investor should receive tokens
        let investorAccountBalanceAfter = await tokenInstance.balanceOf(investorAccount);
        assert.equal(investorAccountBalanceAfter.toNumber(), investorAccountBalanceBefore.plus(expectedTokensCount).toNumber());

        // Funds should be transfered to wallet
        let walletBalanceAfter = web3.eth.getBalance(walletAddress);
        let expectedWalletBalance = walletBalanceBefore.plus(weiAmount);
        assert.equal(walletBalanceAfter.toNumber(), expectedWalletBalance.toNumber());

        // Totals should be updated
        let weiRaisedAfter = await crowdsaleInstance.weiRaised.call();
        let tokensSoldAfter = await crowdsaleInstance.tokensSold.call();
        assert.equal(weiRaisedBefore.plus(weiAmount).toNumber(), weiRaisedAfter.toNumber());
        assert.equal(tokensSoldBefore.plus(expectedTokensCount).toNumber(), tokensSoldAfter.toNumber());

    });

    it("should buy tokens at normal price", async function () {

        let walletBalanceBefore = web3.eth.getBalance(walletAddress);
        let weiRaisedBefore = await crowdsaleInstance.weiRaised.call();
        let tokensSoldBefore = await crowdsaleInstance.tokensSold.call();
        let investorAccountBalanceBefore = await tokenInstance.balanceOf(investorAccount);

        let weiAmount = web3.toWei(1000);
        let expectedTokensCount = toAmount(1000000);

        let result = await crowdsaleInstance.buyTokens(investorAccount, { value: weiAmount, from: investorAccount });

        //Event shold be fired
        let event = result.logs[0].args;
        assert.equal(event.purchaser, investorAccount);
        assert.equal(event.beneficiary, investorAccount);
        assert.equal(event.value.toNumber(), weiAmount);
        assert.equal(event.amount.toNumber(), expectedTokensCount);

        // Investor should receive tokens
        let investorAccountBalanceAfter = await tokenInstance.balanceOf(investorAccount);
        assert.equal(investorAccountBalanceAfter.toNumber(), investorAccountBalanceBefore.plus(expectedTokensCount).toNumber());

        // Funds should be transfered to wallet
        let walletBalanceAfter = web3.eth.getBalance(walletAddress);
        let expectedWalletBalance = walletBalanceBefore.plus(weiAmount);
        assert.equal(walletBalanceAfter.toNumber(), expectedWalletBalance.toNumber());

        // Totals should be updated
        let weiRaisedAfter = await crowdsaleInstance.weiRaised.call();
        let tokensSoldAfter = await crowdsaleInstance.tokensSold.call();
        assert.equal(weiRaisedBefore.plus(weiAmount).toNumber(), weiRaisedAfter.toNumber());
        assert.equal(tokensSoldBefore.plus(expectedTokensCount).toNumber(), tokensSoldAfter.toNumber());

    });

    it('should be ended after endTime', async function () {

        await increaseTime(endTimestamp - web3.eth.getBlock(web3.eth.blockNumber).timestamp + 100);
        let ended = await crowdsaleInstance.hasEnded();
        assert.equal(ended, true);

    });

    it("should fail to buy tokens because too late", async function () {

        let owner_account_token_balance = await tokenInstance.balanceOf(ownerAccount);
        let investor_account_token_balance = await tokenInstance.balanceOf(investorAccount);

        try {

            await crowdsaleInstance.buyTokens(investorAccount, { value: web3.toWei(10), from: investorAccount });

        } catch (error) {}

        let owner_account_token_balance_after = await tokenInstance.balanceOf(ownerAccount);
        let investor_account_token_balance_after = await tokenInstance.balanceOf(investorAccount);

        assert.equal(owner_account_token_balance.toNumber(), owner_account_token_balance_after.toNumber());
        assert.equal(investor_account_token_balance.toNumber(), investor_account_token_balance_after.toNumber());

    });

    it("should not allow to change start time from not owner", async function () {

        let newTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 3600;
        let crowdsaleStartTimeBefore = await crowdsaleInstance.startTime.call();

        try {

            await crowdsaleInstance.setStart(newTime, { from: investorAccount });

        } catch (error) {}

        let crowdsaleStartTime = await crowdsaleInstance.startTime.call();

        assert.notEqual(newTime, crowdsaleStartTime.toNumber());
        assert.equal(crowdsaleStartTimeBefore.toNumber(), crowdsaleStartTime.toNumber());

    });

    it("should not allow to change end time from not owner", async function () {

        let newTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 3600;
        let crowdsaleEndTimeBefore = await crowdsaleInstance.endTime.call();

        try {

            await crowdsaleInstance.setEnd(newTime, { from: investorAccount });

        } catch (error) {}

        let crowdsaleEndTime = await crowdsaleInstance.endTime.call();

        assert.notEqual(newTime, crowdsaleEndTime.toNumber());
        assert.equal(crowdsaleEndTimeBefore.toNumber(), crowdsaleEndTime.toNumber());

    });

    it("should allow to change start time from owner", async function () {

        let newTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 3600;
        let crowdsaleStartTimeBefore = await crowdsaleInstance.startTime.call();

        await crowdsaleInstance.setStart(newTime, { from: ownerAccount });

        let crowdsaleStartTime = await crowdsaleInstance.startTime.call();

        assert.equal(newTime, crowdsaleStartTime.toNumber());
        assert.notEqual(crowdsaleStartTimeBefore.toNumber(), crowdsaleStartTime.toNumber());

    });

    it("should allow to change end time from owner", async function () {

        let newTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 7200;
        let crowdsaleEndTimeBefore = await crowdsaleInstance.endTime.call();

        await crowdsaleInstance.setEnd(newTime, { from: ownerAccount });

        let crowdsaleEndTime = await crowdsaleInstance.endTime.call();

        assert.equal(newTime, crowdsaleEndTime.toNumber());
        assert.notEqual(crowdsaleEndTimeBefore.toNumber(), crowdsaleEndTime.toNumber());

    });

    /*
        Transfer ownership ?

        instance.sendTransaction() ?
    */

});
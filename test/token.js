let FastInvestToken = artifacts.require('FastInvestToken');

let totalSupply = 777000000000000000000000000;
let decimals = 18;

let instance;

function toAmount(value) {
    return value * 10**decimals;
}

contract('FastInvestToken', function (accounts) {

    before(async function () {
        instance = await FastInvestToken.new();
    });

    it("should return the correct totalSupply after construction", async function() {

        let supply = await instance.totalSupply();
        assert.equal(supply.valueOf(), totalSupply, "Total supply does not match!");

    });

    it("should give all tokens to the owner", async function () {

        let balance = await instance.balanceOf(accounts[0]);
        assert.equal(balance.valueOf(), totalSupply, "Owner does not have all tokens!");

    });

    it("should transfer 10 tokens", async function () {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let amount = toAmount(10);

        let account_one_starting_balance = await instance.balanceOf(account_one);
        let account_two_starting_balance = await instance.balanceOf(account_two);

        let transfer = await instance.transfer(account_two, amount, {from: account_one});

        let account_one_ending_balance = await instance.balanceOf(account_one);
        let account_two_ending_balance = await instance.balanceOf(account_two);


        assert.equal(account_one_ending_balance.toNumber(), account_one_starting_balance.toNumber() - amount, "Amount wasn't correctly taken from the sender");
        assert.equal(account_two_ending_balance.toNumber(), account_two_starting_balance.toNumber() + amount, "Amount wasn't correctly sent to the receiver");

    });

    it('should not allow to transfer more than balance', async function() {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let account_one_balance = await instance.balanceOf(account_one);
        let account_two_balance = await instance.balanceOf(account_two);

        try {

            let transfer = await instance.transfer(account_two, account_one_balance + 1, { from: account_one });

        } catch (error) {}

        let account_one_balance_after = await instance.balanceOf(account_one);
        let account_two_balance_after = await instance.balanceOf(account_two);

        assert.equal(account_one_balance.valueOf(), account_one_balance_after.valueOf());
        assert.equal(account_two_balance.valueOf(), account_two_balance_after.valueOf());

    });

    it("should not allow to transfer without allowance approval", async function () {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let amount = toAmount(1000);

        let account_one_balance = await instance.balanceOf(account_one);
        let account_two_balance = await instance.balanceOf(account_two);

        try {

            let transfer = await instance.transferFrom(account_one, account_two, amount, {from: account_two});

        } catch (error) {}

        let account_one_balance_after = await instance.balanceOf(account_one);
        let account_two_balance_after = await instance.balanceOf(account_two);

        assert.equal(account_one_balance.valueOf(), account_one_balance_after.valueOf());
        assert.equal(account_two_balance.valueOf(), account_two_balance_after.valueOf());

    });

    it("should approve 1000FIT allowance", async function () {

        let amount = toAmount(1000);

        let result = await instance.approve(accounts[1], amount);

        let allowed = await instance.allowance(accounts[0], accounts[1]);
        assert.equal(allowed.valueOf(), amount);

    });

    it("should not approve 2000FIT allowance", async function () {

        let allowedBefore = await instance.allowance(accounts[0], accounts[1]);
        let amount = toAmount(2000);

        try {

            let result = await instance.approve(accounts[1], amount);

        } catch (error) {}

        let allowed = await instance.allowance(accounts[0], accounts[1]);
        assert.equal(allowed.valueOf(), allowedBefore.valueOf());

    });

    it("should not allow transfer more than 1000FIT from the owner to acc1", async function() {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let amount = toAmount(1001);

        let account_one_balance = await instance.balanceOf(account_one);
        let account_two_balance = await instance.balanceOf(account_two);

        try {

            let result = await instance.transferFrom(account_one, account_two, amount, {from: account_two});

        } catch (error) {}

        let account_one_balance_after = await instance.balanceOf(account_one);
        let account_two_balance_after = await instance.balanceOf(account_two);

        assert.equal(account_one_balance.valueOf(), account_one_balance_after.valueOf());
        assert.equal(account_two_balance.valueOf(), account_two_balance_after.valueOf());

    });

    it("should transfer 500FIT from the owner to acc1", async function() {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let amount = toAmount(500);

        let account_one_balance = await instance.balanceOf(account_one);
        let account_two_balance = await instance.balanceOf(account_two);

        let result = await instance.transferFrom(account_one, account_two, amount, {from: account_two});

        let event = result.logs[0].args;
        assert.equal(event.from, account_one);
        assert.equal(event.to, account_two);
        assert.equal(event.value, amount);

        let account_one_balance_after = await instance.balanceOf(account_one);
        let account_two_balance_after = await instance.balanceOf(account_two);

        assert.equal(account_one_balance_after.toNumber(), account_one_balance.toNumber() - amount, "Account one balance doesn't match!");
        assert.equal(account_two_balance_after.toNumber(), account_two_balance.toNumber() + amount, "Account two balance doesn't match!");

        let allowance = await instance.allowance(account_one, account_two);
        assert.equal(allowance.valueOf(), toAmount(1000-500));

    });


    it("should not transfer 1000FIT because of allowance limit", async function() {

        let account_one = accounts[0];
        let account_two = accounts[1];

        let amount = toAmount(1000);

        let account_one_balance = await instance.balanceOf(account_one);
        let account_two_balance = await instance.balanceOf(account_two);

        try {

            let result = await instance.transferFrom(account_one, account_two, amount, {from: account_two});

        } catch (error) {}

        let account_one_balance_after = await instance.balanceOf(account_one);
        let account_two_balance_after = await instance.balanceOf(account_two);

        assert.equal(account_one_balance.valueOf(), account_one_balance_after.valueOf());
        assert.equal(account_two_balance.valueOf(), account_two_balance_after.valueOf());

    });

    it("should not approve 2000FIT allowance bacause allowance is not 0", async function () {

        let allowedBefore = await instance.allowance(accounts[0], accounts[1]);
        let amount = toAmount(2000);

        try {

            let result = await instance.approve(accounts[1], amount);

        } catch (error) {}

        let allowed = await instance.allowance(accounts[0], accounts[1]);
        assert.equal(allowed.valueOf(), allowedBefore.valueOf());

    });

    it("should approve 0FIT allowance", async function () {

        let amount = 0;

        let result = await instance.approve(accounts[1], amount);

        let allowed = await instance.allowance(accounts[0], accounts[1]);
        assert.equal(allowed.valueOf(), amount);

    });

});
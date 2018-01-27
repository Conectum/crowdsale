## Design decisions

### Pros & cons of separate vs single crowdsale contract

**Separate contracts**

Pros:

* Divides multi-stage logic into three relatively simple contracts that could better re-use contracts written by the community (i.e. OpenZeppelin)

Cons:

* The attribute of the amount raised has be carried out from contract to contract. I suppose it would be possible to pass the address of the previous stage contract as a parameter and call the contract directly in order to obtain the funds raised attribute.
* In order for the crowdsale contract to be able to call a `mint` method of a `MintableToken`, the token contract must be owned by the crowdsale contract. Thus the ownership of the token contract would have to be transferred from a crowdsale contract to contract as well.
* All the information related to the `vault` would have to be transferred in order to facilitate the refunds.
* Money raised would have be transferred between different stage contracts as well.

**Single contract**

Pros:

* No need to transfer information and funds between different stages.
* Simpler to analyze and understand since all the logic is in one place.

Cons:

* Less logic can be reused directly (i.e. by inheriting) from the community contracts.
* It is a bit ugly to pass how long every stage will take, how long the breaks in between are going to be and so on.

## Deploying

```
truffle migrate
```

## Running tests

```
truffle test
```

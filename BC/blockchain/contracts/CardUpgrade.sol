// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CardUpgrade is Ownable {
    bytes32 public nextServerSeedHash;
    event UpgradeResult(address indexed user, string dbCardId, bool success, uint8 attempt);

    constructor() Ownable(msg.sender) {}

    function setNextServerSeedHash(bytes32 _hash) external onlyOwner {
        nextServerSeedHash = _hash;
    }

    function requestUpgrade(string memory dbCardId, uint8 attempt, uint256 clientSeed) external {
        require(attempt <= 7, "Max 7");
        require(nextServerSeedHash != bytes32(0), "Seed not set");

        uint256 rand = uint256(keccak256(abi.encodePacked(nextServerSeedHash, clientSeed, msg.sender, dbCardId, block.prevrandao)));
        bool success = (rand % 100) < 30;

        emit UpgradeResult(msg.sender, dbCardId, success, attempt);
        nextServerSeedHash = bytes32(0);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICardNFT {
    function grantMintRight(address user, string memory dbCardId, uint8 grade) external;
}

contract CardGacha is Ownable {
    ICardNFT public nftContract;
    bytes32 public nextServerSeedHash;

    event GachaExecuted(address indexed user, uint8 gachaType, uint8[] grades, string[] dbCardIds);

    constructor(address _nftAddress) Ownable(msg.sender) {
        nftContract = ICardNFT(_nftAddress);
    }

    function setNextServerSeedHash(bytes32 _hash) external onlyOwner {
        nextServerSeedHash = _hash;
    }

    function requestGacha(uint8 gachaType, uint32 count, uint256 clientSeed, string[] memory dbCardIds) external {
        require(nextServerSeedHash != bytes32(0), "Seed not set");
        require(dbCardIds.length == count, "ID mismatch");

        uint8[] memory grades = new uint8[](count);
        for (uint32 i = 0; i < count; i++) {
            uint256 rand = uint256(keccak256(abi.encodePacked(nextServerSeedHash, clientSeed, msg.sender, i, block.prevrandao)));
            uint8 grade = _calculateGrade(gachaType, rand);
            grades[i] = grade;

            if (grade >= 3) {
                nftContract.grantMintRight(msg.sender, dbCardIds[i], grade);
            }
        }
        emit GachaExecuted(msg.sender, gachaType, grades, dbCardIds);
        nextServerSeedHash = bytes32(0);
    }

    function _calculateGrade(uint8 gachaType, uint256 randomWord) internal pure returns (uint8) {
        uint256 rand = randomWord % 100;
        if (gachaType == 0) { if (rand < 10) return 2; if (rand < 40) return 1; return 0; }
        else if (gachaType == 1) { if (rand < 5) return 3; if (rand < 25) return 2; if (rand < 65) return 1; return 0; }
        else { if (rand < 2) return 4; if (rand < 11) return 3; if (rand < 40) return 2; if (rand < 80) return 1; return 0; }
    }
}
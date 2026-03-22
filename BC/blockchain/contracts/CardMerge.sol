// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICardNFT {
    function grantMintRight(address user, string memory dbCardId, uint8 grade) external;
}

contract CardMerge is Ownable {
    ICardNFT public nftContract;
    bytes32 public nextServerSeedHash;

    event MergeResult(address indexed user, string[] targetDbIds, uint8 resultGrade, string newDbId);

    constructor(address _nftAddress) Ownable (msg.sender) {
        nftContract = ICardNFT(_nftAddress);
    }

    function setNextServerSeedHash(bytes32 _hash) external onlyOwner {
        nextServerSeedHash = _hash;
    }

    function requestMerge(string[] memory targetDbIds, uint8 currentGrade, string memory newDbId, uint256 clientSeed) external {
        require(targetDbIds.length >= 3 && targetDbIds.length <= 5, "3-5 cards required");
        require(nextServerSeedHash != bytes32(0), "Seed not set");

        uint256 rand = uint256(keccak256(abi.encodePacked(nextServerSeedHash, clientSeed, msg.sender, block.prevrandao)));
        uint8 resultGrade = _calculateMergeResult(currentGrade, targetDbIds.length, rand % 100);

        if (resultGrade >= 3) {
            nftContract.grantMintRight(msg.sender, newDbId, resultGrade);
        }

        emit MergeResult(msg.sender, targetDbIds, resultGrade, newDbId);
        nextServerSeedHash = bytes32(0);
    }

    function _calculateMergeResult(uint8 currentGrade, uint256 count, uint256 rand) internal pure returns (uint8) {
        // ... 형님이 주신 확률표 로직 동일하게 적용 ...
        if (currentGrade == 0) return rand < (60 + (count-3)*10) ? 1 : 0;
        if (currentGrade == 1) return rand < (40 + (count-3)*10) ? 2 : 1;
        if (currentGrade == 2) return rand < (25 + (count-3)*5) ? 3 : 2;
        if (currentGrade == 3) return rand < (5 + (count-3)*2) ? 4 : 3;
        return 4; // S -> S
    }
}
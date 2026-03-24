// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface INFT {
    function mintCard(address player, uint8 grade) external;
}

contract CardGacha is Ownable {
    address public nft;
    mapping(address => uint256) public userDrawCount;

    event GachaResult(address indexed user, uint8 grade, uint256 timestamp);

    constructor(address nftAddress) Ownable(msg.sender) {
        nft = nftAddress;
    }

    /**
     * BE 서버 지갑(owner)이 가챠 결과를 온체인에 기록한다.
     * grade: 1=B, 2=A, 3=S, 4=SS (D등급은 온체인 기록 안 함)
     *
     * 가챠 결과 기록과 NFT 민팅은 분리된 흐름으로 설계한다.
     * 민팅은 별도 플로우(마켓 등록 시 또는 유저 직접 요청)에서 처리한다.
     */
    function recordGachaResult(address user, uint8 grade) external onlyOwner {
        require(grade >= 1 && grade <= 4, "Invalid grade");
        userDrawCount[user]++;
        INFT(nft).mintCard(user, grade);
        emit GachaResult(user, grade, block.timestamp);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Ledger (공정성 증명 기록 장부)
 * @dev 백엔드에서 연산된 Provably Fair 기록을 온체인에 순수하게 '박제'하기 위한 컨트랙트
 */
contract Ledger is Ownable {

    // 백엔드 서버(지갑)만 이 장부에 기록할 수 있도록 권한 관리
    mapping(address => bool) public authorizedServers;

    modifier onlyServer() {
        require(authorizedServers[msg.sender] || owner() == msg.sender, "Not authorized server");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // 서버 지갑 주소 등록
    function setServerAddress(address server, bool status) external onlyOwner {
        authorizedServers[server] = status;
    }

    // =========================================================
    // 1. 뽑기(Gacha) 기록 이벤트
    // 기록 내용: 서버 시드, 클라이언트 시드, 뽑기 횟수, 뽑기 타입
    // =========================================================
    event GachaRecorded(
        address indexed user,
        string serverSeed,
        string clientSeed,
        uint256 count,
        string gachaType,
        uint256 timestamp
    );

    function recordGacha(
        address user,
        string memory serverSeed,
        string memory clientSeed,
        uint256 count,
        string memory gachaType
    ) external onlyServer {
        // State에 저장하지 않고 이벤트만 발생시켜 가스비 대폭 절약!
        emit GachaRecorded(user, serverSeed, clientSeed, count, gachaType, block.timestamp);
    }

    // =========================================================
    // 2. 강화(Enhancement) 기록 이벤트
    // 기록 내용: 서버 시드, 클라이언트 시드
    // =========================================================
    event EnhancementRecorded(
        address indexed user,
        string serverSeed,
        string clientSeed,
        uint256 timestamp
    );

    function recordEnhancement(
        address user,
        string memory serverSeed,
        string memory clientSeed
    ) external onlyServer {
        emit EnhancementRecorded(user, serverSeed, clientSeed, block.timestamp);
    }

    // =========================================================
    // 3. 합성(Synthesis) 기록 이벤트
    // 기록 내용: 합성에 소모되는 카드들(ID 배열)
    // =========================================================
    event SynthesisRecorded(
        address indexed user,
        uint256[] consumedCardIds,
        uint256 timestamp
    );

    function recordSynthesis(
        address user,
        uint256[] memory consumedCardIds
    ) external onlyServer {
        emit SynthesisRecorded(user, consumedCardIds, block.timestamp);
    }
}
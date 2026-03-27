// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CardNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // 토큰ID를 넣으면 백엔드 DB의 원래 카드 ID를 뱉어냄
    mapping(uint256 => string) public dbCardIds;
    
    mapping(address => bool) public authorizedServers;
    mapping(address => mapping(string => string)) public approvedMints;

    // 🌟 핵심 이벤트: 유저가 NFT를 태웠을 때 백엔드가 이 이벤트를 보고 DB를 살려줌!
    event CardReturnedToGame(address indexed user, uint256 tokenId, string dbCardId);
    event CardMinted(address indexed user, uint256 tokenId, string dbCardId, string tokenURI);

    modifier onlyServer() {
        require(authorizedServers[msg.sender] || owner() == msg.sender, "Not authorized server");
        _;
    }

    constructor() ERC721("S-Rank Card", "SRC") Ownable(msg.sender) {}

    function setServer(address server, bool status) external onlyOwner {
        authorizedServers[server] = status;
    }

    // [백엔드 전용] S급 카드 마켓 등록/지갑 전송 시 권한 부여
    function grantMintRight(address user, string memory dbCardId, string memory _tokenURI) external onlyServer {
        approvedMints[user][dbCardId] = _tokenURI;
    }

    // [유저 전용] 권한을 바탕으로 NFT 실제 발급
    function mint(string memory dbCardId) external returns (uint256) {
        string memory uri = approvedMints[msg.sender][dbCardId];
        require(bytes(uri).length > 0, "No minting right");

        delete approvedMints[msg.sender][dbCardId];

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri); 
        
        dbCardIds[tokenId] = dbCardId;

        emit CardMinted(msg.sender, tokenId, dbCardId, uri);
        return tokenId;
    }

    // 🌟 [유저 전용] 합성하거나 게임에서 다시 쓰기 위해 NFT를 영구히 불태움!
    function burnReturnToGame(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your card");
        
        string memory originalDbId = dbCardIds[tokenId];
        
        _burn(tokenId); // 지갑에서 카드 소각
        
        // 백엔드가 이 이벤트를 캐치해서 DB 카드를 활성화(Active) 시킴!
        emit CardReturnedToGame(msg.sender, tokenId, originalDbId);
    }
}
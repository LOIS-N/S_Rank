// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CardMarket is Ownable {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        uint256 expiresAt; 
        bool isActive;
    }

    IERC20 public paymentToken;
    IERC721 public nftContract;

    mapping(uint256 => Listing) public listings;

    event CardListed(address indexed seller, uint256 indexed tokenId, uint256 price, uint256 expiresAt);
    event CardSold(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price);
    event CardReclaimed(address indexed seller, uint256 indexed tokenId);

    constructor(address _token, address _nft) Ownable(msg.sender) {
        paymentToken = IERC20(_token);
        nftContract = IERC721(_nft);
    }

    // 1️⃣ 판매 등록: 파라미터에서 duration 삭제! 무조건 24시간 고정!
    function listCard(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");

        nftContract.transferFrom(msg.sender, address(this), tokenId);

        // 🌟 핵심: 현재 블록체인 시간 + 24시간 (솔리디티 내장 키워드 사용)
        uint256 expiration = block.timestamp + 24 hours; 
        
        listings[tokenId] = Listing(msg.sender, tokenId, price, expiration, true);
        emit CardListed(msg.sender, tokenId, price, expiration);
    }

    // 2️⃣ 코인으로 구매 (변경 없음)
    function buyCard(uint256 tokenId) external {
        Listing memory item = listings[tokenId];
        require(item.isActive, "Item is not for sale");
        
        // ⏳ 24시간이 지났으면 구매 불가 입구컷!
        require(block.timestamp <= item.expiresAt, "Listing has expired. Cannot buy."); 

        require(paymentToken.transferFrom(msg.sender, item.seller, item.price), "Token payment failed");
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

        delete listings[tokenId];
        emit CardSold(msg.sender, item.seller, tokenId, item.price);
    }

    // 3️⃣ 유찰 카드 회수: 24시간 지나야만 본인이 찾아갈 수 있음 (변경 없음)
    function reclaimExpiredCard(uint256 tokenId) external {
        Listing memory item = listings[tokenId];
        require(item.isActive, "Item is not listed");
        
        // ⏳ 24시간이 지나기 전에는 절대 못 빼감!
        require(block.timestamp > item.expiresAt, "Listing has not expired yet");
        require(msg.sender == item.seller, "Only seller can reclaim");

        delete listings[tokenId];
        nftContract.safeTransferFrom(address(this), item.seller, tokenId); 

        emit CardReclaimed(item.seller, tokenId);
    }
}
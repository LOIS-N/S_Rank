// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CardMarket is Ownable (msg.sender) {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool isActive;
    }

    IERC20 public paymentToken;
    IERC721 public nftContract;

    mapping(uint256 => Listing) public listings;

    event CardListed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event CardSold(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price);

    constructor(address _token, address _nft) {
        paymentToken = IERC20(_token);
        nftContract = IERC721(_nft);
    }

    // 판매 등록: 유저는 미리 NFT 컨트랙트에서 마켓 주소로 approve를 해줘야 함
    function listCard(uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than zero");
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not the owner");

        // NFT를 마켓으로 전송 (리스팅 기간 동안 마켓이 보관)
        nftContract.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing(msg.sender, tokenId, price, true);
        emit CardListed(msg.sender, tokenId, price);
    }

    // 코인으로 구매
    function buyCard(uint256 tokenId) external {
        Listing memory item = listings[tokenId];
        require(item.isActive, "Item is not for sale");

        // 1. 코인 결제 (구매자 -> 판매자)
        // 구매자가 미리 마켓 컨트랙트에 코인 approve를 해둬야 함
        require(paymentToken.transferFrom(msg.sender, item.seller, item.price), "Token payment failed");

        // 2. NFT 전송 (마켓 -> 구매자)
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

        // 3. 리스팅 정보 삭제
        delete listings[tokenId];

        emit CardSold(msg.sender, item.seller, tokenId, item.price);
    }
}
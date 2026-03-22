// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CardNFT is ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;
    
    // 토큰 정보 저장 매핑
    mapping(uint256 => uint8) public cardGrades;
    mapping(uint256 => string) public dbCardIds;
    
    // 민팅 권한 관리 (Gacha, Composer 등)
    mapping(address => bool) public isAuthorizedController;
    // [유저][DB_ID] => 등급 (민팅 권한 대장)
    mapping(address => mapping(string => uint8)) public mintRights;

    event MintRightGranted(address indexed user, string dbCardId, uint8 grade);
    event CardMinted(address indexed user, uint256 tokenId, string dbCardId, uint8 grade);

    // v5.0 규격 생성자
    constructor() ERC721("DevCard NFT", "DCN") Ownable(msg.sender) {}

    // [해결] onlyMinter 대신 쓸 권한 확인 Modifier (직접 정의)
    modifier onlyController() {
        require(isAuthorizedController[msg.sender] || owner() == msg.sender, "Not authorized");
        _;
    }

    // 컨트롤러(Gacha, Composer) 주소 등록 함수
    function setController(address controller, bool status) external onlyOwner {
        isAuthorizedController[controller] = status;
    }

    // 가챠/합성 컨트랙트가 권한을 부여할 때 호출
    function grantMintRight(address user, string memory dbCardId, uint8 grade) external onlyController {
        mintRights[user][dbCardId] = grade;
        emit MintRightGranted(user, dbCardId, grade);
    }

    /**
     * @dev [수정] 인자명을 _tokenURI로 변경하여 Shadowing 오류 해결
     */
    function mintWithRight(string memory dbCardId, string memory _tokenURI) external returns (uint256) {
        uint8 grade = mintRights[msg.sender][dbCardId];
        require(grade >= 3, "No minting right");

        // 권한 소모
        delete mintRights[msg.sender][dbCardId];

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI); // 부모 함수의 인자와 겹치지 않음
        
        cardGrades[tokenId] = grade;
        dbCardIds[tokenId] = dbCardId;

        emit CardMinted(msg.sender, tokenId, dbCardId, grade);
        return tokenId;
    }

    // --- 상속 충돌 해결을 위한 필수 오버라이드 함수들 ---

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
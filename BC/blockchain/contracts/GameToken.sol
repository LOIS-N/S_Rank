// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameToken is ERC20, Ownable (msg.sender) {
    constructor() ERC20("Coffee", "CFF") {
        // 배포자에게 초기 물량 100,000,000개 발행
        _mint(msg.sender, 100000000 * 10 ** decimals());
    }

    // 업적 달성 시 백엔드(서버)가 유저에게 코인을 무에서 유로 찍어내서 줄 수 있는 함수!
    function mintReward(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
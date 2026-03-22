// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameToken is ERC20, Ownable (msg.sender) {
    constructor() ERC20("Coffee", "CFF") {
        // 배포자에게 초기 물량 100,000,000개 발행
        _mint(msg.sender, 100000000 * 10 ** decimals());
    }

    // 테스트를 위해 누구나 토큰을 받아갈 수 있는 수도꼭지 함수 (배포 시 삭제 권장)
    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
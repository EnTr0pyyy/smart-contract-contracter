/**
 * Sample Smart Contracts for Testing
 * Contains both safe and risky contracts
 */

export const SAFE_ERC20 = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeToken {
    string public name = "Safe Token";
    string public symbol = "SAFE";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 _initialSupply) {
        require(_initialSupply <= MAX_SUPPLY, "Exceeds max supply");
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }
    
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        require(_to != address(0), "Invalid address");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        require(_to != address(0), "Invalid address");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;

export const RISKY_UNLIMITED_MINTING = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RiskyToken {
    string public name = "Risky Token";
    string public symbol = "RISK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    address public owner;
    mapping(address => uint256) public balanceOf;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // RISK: Unlimited minting without cap
    function mint(address _to, uint256 _amount) public onlyOwner {
        totalSupply += _amount;
        balanceOf[_to] += _amount;
    }
    
    // RISK: Owner can withdraw all ETH
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // RISK: Owner can pause transfers
    bool public paused = false;
    
    function pause() public onlyOwner {
        paused = true;
    }
    
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(!paused, "Transfers paused");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        return true;
    }
}
`;

export const CRITICAL_SELFDESTRUCT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DestructibleContract {
    address public owner;
    mapping(address => uint256) public balances;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // CRITICAL RISK: Contract can be destroyed
    function destroy() public onlyOwner {
        selfdestruct(payable(owner));
    }
}
`;

export const DANGEROUS_TX_ORIGIN = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PhishableContract {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    // RISK: Using tx.origin for authentication
    function transfer(address _to, uint256 _amount) public {
        require(tx.origin == owner, "Not authorized");
        payable(_to).transfer(_amount);
    }
}
`;

export const UPGRADEABLE_PROXY = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UpgradeableProxy {
    address public implementation;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }
    
    // RISK: Owner can change implementation
    function upgradeTo(address _newImplementation) public onlyOwner {
        implementation = _newImplementation;
    }
    
    // RISK: Delegatecall allows arbitrary code execution
    fallback() external payable {
        address _impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
`;

export const ADJUSTABLE_FEES = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TokenWithFees {
    address public owner;
    uint256 public transferFee = 100; // 1%
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public blacklist;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // RISK: Owner can change fees at any time
    function setTransferFee(uint256 _fee) public onlyOwner {
        transferFee = _fee;
    }
    
    // RISK: Owner can blacklist any address
    function addToBlacklist(address _addr) public onlyOwner {
        blacklist[_addr] = true;
    }
    
    function transfer(address _to, uint256 _amount) public returns (bool) {
        require(!blacklist[msg.sender], "Blacklisted");
        require(balanceOf[msg.sender] >= _amount, "Insufficient balance");
        
        uint256 fee = (_amount * transferFee) / 10000;
        uint256 amountAfterFee = _amount - fee;
        
        balanceOf[msg.sender] -= _amount;
        balanceOf[_to] += amountAfterFee;
        balanceOf[owner] += fee;
        
        return true;
    }
}
`;

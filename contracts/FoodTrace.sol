pragma solidity ^0.8.19;

contract FoodTrace {
    mapping(string => string) public batches;
    
    function addBatch(string memory id, string memory data) external {
        batches[id] = data;
    }
    
    function getBatch(string memory id) external view returns (string memory) {
        return batches[id];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Funding: a fund in its community's currency, and the budget for it.
/// The money is in the community: the fund's account there has this flow's
/// id, and the community records each payment into it. Here are the fund's
/// description and goal, the budget items, and how each participant
/// allocates their TOTAL_POINTS points among the items.
contract FundingFlow {
    uint256 public constant TOTAL_POINTS = 1000;

    struct Fund {
        string name;
        string description;
        uint256 goal; // in the community's millionths; 0 for none
        string communityId;
    }

    struct Item {
        string id;
        string name;
        address createdBy;
    }

    /// A participant's allocation: itemIds[i] gets points[i].
    struct Allocation {
        address participant;
        string[] itemIds;
        uint256[] points;
    }

    Fund private fund;
    Item[] private items;
    mapping(string => bool) private isItem;
    address[] private allocators;
    mapping(address => string[]) private allocatedIds;
    mapping(address => uint256[]) private allocatedPoints;
    mapping(address => bool) private allocated;

    constructor(string memory name, string memory description, uint256 goal, string memory communityId) {
        require(bytes(name).length > 0, "a fund needs a name");
        fund = Fund(name, description, goal, communityId);
    }

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function addItem(string calldata name) external returns (string memory id) {
        require(bytes(name).length > 0, "an item needs a name");
        id = decimal(items.length + 1);
        items.push(Item(id, name, msg.sender));
        isItem[id] = true;
    }

    /// Sets the caller's allocation, replacing their previous one: TOTAL_POINTS at most.
    function setMyAllocation(string[] calldata itemIds, uint256[] calldata points) external {
        require(itemIds.length == points.length, "points for each item");
        uint256 total;
        string[] storage ids = allocatedIds[msg.sender];
        while (ids.length > 0) ids.pop();
        for (uint256 i = 0; i < itemIds.length; i++) {
            require(isItem[itemIds[i]], "no such item");
            total += points[i];
            ids.push(itemIds[i]);
        }
        require(total <= TOTAL_POINTS, "more points than you have");
        allocatedPoints[msg.sender] = points;
        if (!allocated[msg.sender]) {
            allocated[msg.sender] = true;
            allocators.push(msg.sender);
        }
    }

    function getFund() external view returns (Fund memory) {
        return fund;
    }

    function getItems() external view returns (Item[] memory) {
        return items;
    }

    function getAllocations() external view returns (Allocation[] memory out) {
        out = new Allocation[](allocators.length);
        for (uint256 i = 0; i < allocators.length; i++) {
            address p = allocators[i];
            out[i] = Allocation(p, allocatedIds[p], allocatedPoints[p]);
        }
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

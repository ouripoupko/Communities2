// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A community: its properties and its members. The agent that deploys it is
/// its first member.
contract Community {
    struct Properties {
        string name;
        string description;
        uint64 createdAt; // unix seconds
        address creator;
    }

    /// A member, and where others find them: their node, and their profile contract there.
    struct Member {
        address agent;
        string node;
        string profile;
    }

    Properties private properties;
    Member[] private members;
    mapping(address => bool) private isMember;

    constructor(string memory name, string memory description, string memory node, string memory profile) {
        require(bytes(name).length > 0, "a community needs a name");
        properties = Properties(name, description, uint64(block.timestamp), msg.sender);
        addMember(msg.sender, node, profile);
    }

    /// Becomes a member. Open join for now: anyone who joined the contract may.
    function join(string calldata node, string calldata profile) external {
        addMember(msg.sender, node, profile);
    }

    /// ibc asks these when an agent joins the contract, as a partner or as a
    /// guest: anyone may, to become a member with join().
    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function getProperties() external view returns (Properties memory) {
        return properties;
    }

    function getMembers() external view returns (Member[] memory) {
        return members;
    }

    function addMember(address agent, string memory node, string memory profile) private {
        require(!isMember[agent], "already a member");
        isMember[agent] = true;
        members.push(Member(agent, node, profile));
    }
}

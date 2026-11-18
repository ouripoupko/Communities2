// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Membership.sol";

/// The community's collaborations. Each is its own contract, on its
/// creator's node, which holds its flows; the community lists them.
contract Collaborations {
    enum Kind { Initiative, Wish, Agreement }

    /// A collaboration. Every kind has the same three texts, and gives them
    /// its own meaning: an initiative's description, a wish's dream or need;
    /// an agreement's title is its rule, and its detail the harm it prevents.
    struct Collaboration {
        string id;
        Kind kind;
        string title;
        string description;
        string detail;
        string node;
        address creator;
        uint64 createdAt;
    }

    Membership private immutable membership;
    Collaboration[] private collaborations;
    mapping(string => bool) private listed;

    constructor(Membership membership_) {
        membership = membership_;
    }

    /// Lists a collaboration whose contract the caller deployed on their node.
    function addCollaboration(
        string calldata id,
        Kind kind,
        string calldata title,
        string calldata description,
        string calldata detail,
        string calldata node
    ) external {
        require(membership.isMember(msg.sender), "members only");
        require(bytes(id).length > 0, "a collaboration needs its contract's id");
        require(!listed[id], "the collaboration is listed already");
        listed[id] = true;
        collaborations.push(Collaboration(id, kind, title, description, detail, node, msg.sender, uint64(block.timestamp)));
    }

    function getCollaborations() external view returns (Collaboration[] memory) {
        return collaborations;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Membership.sol";
import "./Collaborations.sol";
import "./Currency.sol";

/// A community: the contract ibc deploys and joins. It keeps the community's
/// properties, decides who may join the agreement, and creates its parts,
/// which members call directly, by their addresses (getParts):
///
/// - Membership: the members, and the web of trust through which newcomers join;
/// - Collaborations: the list of the community's collaborations;
/// - Currency: accounts, payments, policies, and the settlement of balances.
///
/// The agent that deploys it is its first member.
contract Community {
    struct Properties {
        string name;
        string description;
        uint64 createdAt; // unix seconds
        address creator;
        uint256 initialBalance; // what a new member's account starts with
        bool openJoin; // anyone joins at once; otherwise through the web of trust
    }

    /// The parts' addresses.
    struct Parts {
        address membership;
        address collaborations;
        address currency;
    }

    Properties private properties;
    Membership private immutable membership;
    Collaborations private immutable collaborations;
    Currency private immutable currency;

    constructor(
        string memory name,
        string memory description,
        string memory node,
        string memory profile,
        uint256 initialBalance,
        bool starterPolicies,
        bool openJoin
    ) {
        require(bytes(name).length > 0, "a community needs a name");
        properties = Properties(name, description, uint64(block.timestamp), msg.sender, initialBalance, openJoin);
        currency = new Currency(initialBalance, starterPolicies, msg.sender);
        membership = new Membership(currency, openJoin);
        currency.setMembership(address(membership));
        collaborations = new Collaborations(membership);
        membership.addFounder(msg.sender, node, profile);
    }

    /// ibc asks these when an agent joins the agreement, as a partner or as a
    /// guest: anyone may, to ask to become a member (Membership.join).
    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function getProperties() external view returns (Properties memory) {
        return properties;
    }

    /// Where the parts are, to call them.
    function getParts() external view returns (Parts memory) {
        return Parts(address(membership), address(collaborations), address(currency));
    }
}

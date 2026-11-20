// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A collaboration of a community (an initiative, a wish or an agreement),
/// deployed on its creator's node, and its flows, as a tree: each flow may
/// have child flows, without limit. Each flow is a contract on the node of
/// whoever added it, who hosts it.
///
/// Removing a flow moves its branch (it and everything under it) to the
/// bin; restoring it puts the branch back, anywhere in the tree.
contract Collaboration {
    enum Kind { Initiative, Wish, Agreement }

    struct Flow {
        string id; // the flow's contract
        string flowType; // e.g. "ranking"
        string title;
        string node; // its host's node
        address agent; // its host: whoever added it
        string parent; // its parent flow's id, or "" at the top level
        uint64 position; // orders siblings: later is lower
        bool binned; // its branch is in the bin (its children stay under it)
    }

    Kind public kind;
    string public title;
    string public communityId;
    address public creator;

    Flow[] private flows;
    mapping(string => uint256) private flowIndex; // the flow's index + 1
    uint64 private nextPosition;

    constructor(Kind kind_, string memory title_, string memory communityId_) {
        kind = kind_;
        title = title_;
        communityId = communityId_;
        creator = msg.sender;
    }

    /// ibc asks these when an agent joins the contract: anyone who has the
    /// collaboration's id (from the community) may.
    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Adds a flow, which the caller deployed on their node, under parent ("" for the top level).
    function addFlow(
        string calldata id,
        string calldata flowType,
        string calldata flowTitle,
        string calldata node,
        string calldata parent
    ) external {
        require(bytes(id).length > 0, "a flow needs its contract's id");
        require(bytes(flowTitle).length > 0, "a flow needs a title");
        require(flowIndex[id] == 0, "the flow is in the collaboration already");
        requirePlace(parent);
        flows.push(Flow(id, flowType, flowTitle, node, msg.sender, parent, nextPosition++, false));
        flowIndex[id] = flows.length;
    }

    /// Moves a flow's branch to the bin: the one who added it, or the
    /// collaboration's creator. The flows' contracts stay on their hosts' nodes.
    function removeFlow(string calldata id) external {
        Flow storage flow = flowOf(id);
        require(msg.sender == flow.agent || msg.sender == creator,
            "only who added the flow, or the collaboration's creator, removes it");
        require(inTree(id), "the flow is in the bin already");
        flow.binned = true;
    }

    /// Takes a branch out of the bin, and puts it under parent ("" for the top level).
    function restoreFlow(string calldata id, string calldata parent) external {
        Flow storage flow = flowOf(id);
        require(flow.binned, "the flow is not in the bin");
        // The flow and its branch are out of the tree, so parent (in the tree) is not among them.
        requirePlace(parent);
        flow.binned = false;
        flow.parent = parent;
        flow.position = nextPosition++;
    }

    /// Every flow: those in the tree, and those in the bin (binned, or under a binned one).
    function getFlows() external view returns (Flow[] memory) {
        return flows;
    }

    /// A place for a flow: the top level, or a flow in the tree.
    function requirePlace(string memory parent) private view {
        if (bytes(parent).length == 0) return;
        require(flowIndex[parent] != 0, "no such parent flow");
        require(inTree(parent), "the parent flow is in the bin");
    }

    /// Whether a flow is in the tree: neither it nor an ancestor is in the bin.
    function inTree(string memory id) private view returns (bool) {
        for (string memory p = id; bytes(p).length > 0; p = flowOf(p).parent) {
            if (flowOf(p).binned) return false;
        }
        return true;
    }

    function flowOf(string memory id) private view returns (Flow storage) {
        uint256 index = flowIndex[id];
        require(index != 0, "no such flow");
        return flows[index - 1];
    }
}

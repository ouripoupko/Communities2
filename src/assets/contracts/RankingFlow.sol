// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A ranking vote: participants propose options for a topic, and each ranks
/// them, with an acceptance bar among them (options above it are acceptable
/// to the participant). The app computes the collective result from the
/// rankings.
contract RankingFlow {
    struct Topic {
        string topic;
        string description;
    }

    struct Proposal {
        string id;
        string text;
        address author;
    }

    /// A participant's ranking: proposal ids, most preferred first, with the
    /// app's acceptance-bar id among them.
    struct Ranking {
        address participant;
        string[] order;
    }

    Topic private topic;
    Proposal[] private proposals;
    address[] private rankers;
    mapping(address => string[]) private orders;
    mapping(address => bool) private ranked;

    constructor(string memory topic_, string memory description) {
        topic = Topic(topic_, description);
    }

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Proposes an option, and returns its id.
    function addProposal(string calldata text) external returns (string memory id) {
        require(bytes(text).length > 0, "a proposal needs a text");
        id = decimal(proposals.length + 1);
        proposals.push(Proposal(id, text, msg.sender));
    }

    /// Sets the caller's ranking, replacing their previous one.
    function setMyRanking(string[] calldata order) external {
        if (!ranked[msg.sender]) {
            ranked[msg.sender] = true;
            rankers.push(msg.sender);
        }
        // One entry at a time: the compiler copies no calldata string[] to storage at once.
        string[] storage stored = orders[msg.sender];
        while (stored.length > 0) stored.pop();
        for (uint256 i = 0; i < order.length; i++) stored.push(order[i]);
    }

    function getTopic() external view returns (Topic memory) {
        return topic;
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    function getRankings() external view returns (Ranking[] memory out) {
        out = new Ranking[](rankers.length);
        for (uint256 i = 0; i < rankers.length; i++) out[i] = Ranking(rankers[i], orders[rankers[i]]);
    }

    function decimal(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

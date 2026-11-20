// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Concern resolution: participants raise concerns, and each votes on each
/// one: support it, reject it, or mark it resolved. The app decides a
/// concern's status from the votes.
contract ConcernsFlow {
    enum Vote { None, Support, Reject, Resolved }

    struct Concern {
        string id;
        string title;
        string description;
        address createdBy;
        uint64 createdAt;
    }

    /// A concern, with its votes: voters[i] voted votes[i].
    struct ConcernView {
        string id;
        string title;
        string description;
        address createdBy;
        uint64 createdAt;
        address[] voters;
        Vote[] votes;
    }

    Concern[] private concerns;
    mapping(string => uint256) private concernIndex; // index + 1
    mapping(uint256 => address[]) private voters; // everyone who ever voted on a concern
    mapping(uint256 => mapping(address => Vote)) private votes;

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Raises a concern, which its creator supports, and returns its id.
    function addConcern(string calldata title, string calldata description) external returns (string memory id) {
        require(bytes(title).length > 0, "a concern needs a title");
        id = decimal(concerns.length + 1);
        concerns.push(Concern(id, title, description, msg.sender, uint64(block.timestamp)));
        concernIndex[id] = concerns.length;
        setVote(concerns.length - 1, Vote.Support);
    }

    /// Votes on a concern; Vote.None takes the caller's vote back.
    function vote(string calldata concernId, Vote value) external {
        uint256 index = concernIndex[concernId];
        require(index != 0, "no such concern");
        setVote(index - 1, value);
    }

    function getConcerns() external view returns (ConcernView[] memory out) {
        out = new ConcernView[](concerns.length);
        for (uint256 i = 0; i < concerns.length; i++) {
            Concern storage c = concerns[i];
            address[] storage all = voters[i];
            uint256 n;
            for (uint256 j = 0; j < all.length; j++) if (votes[i][all[j]] != Vote.None) n++;
            address[] memory who = new address[](n);
            Vote[] memory what = new Vote[](n);
            uint256 k;
            for (uint256 j = 0; j < all.length; j++) {
                Vote v = votes[i][all[j]];
                if (v == Vote.None) continue;
                who[k] = all[j];
                what[k++] = v;
            }
            out[i] = ConcernView(c.id, c.title, c.description, c.createdBy, c.createdAt, who, what);
        }
    }

    function setVote(uint256 index, Vote value) private {
        mapping(address => Vote) storage concernVotes = votes[index];
        bool known = concernVotes[msg.sender] != Vote.None;
        if (!known) {
            bool listed;
            address[] storage all = voters[index];
            for (uint256 j = 0; j < all.length; j++) if (all[j] == msg.sender) listed = true;
            if (!listed) all.push(msg.sender);
        }
        concernVotes[msg.sender] = value;
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Currency.sol";

/// The community's members, and the web of trust through which newcomers
/// join (unless the community is open: then they join at once). A member
/// admitted gets their personal account in the currency, in the same step.
///
/// The members form a graph. While there are at most TRUST_DEGREE of them, a
/// newcomer is nominated to all of them, one newcomer at a time, and joins
/// linked to them all. From then on the graph is TRUST_DEGREE-regular: two
/// edges are drawn at random, among those no pending nomination holds and
/// that share no member, and their four ends vouch for the newcomer; once
/// the newcomer and the four approve each other, the two edges are cut and
/// the four are linked to the newcomer instead. Disapproving (the nominee,
/// or one of their vouchers) cancels the nomination.
contract Membership {
    uint256 public constant TRUST_DEGREE = 4;

    /// A member, and where others find them: their node, and their profile contract there.
    struct Member {
        address agent;
        string node;
        string profile;
    }

    struct Nomination {
        address nominee;
        string node;
        string profile;
        address[] vouchers;
    }

    /// A nomination, and who approved whom: vouchedFor[i] (vouchers[i] approved
    /// the nominee), and nomineeApproved[i] (the nominee approved vouchers[i]).
    struct NominationView {
        address nominee;
        string node;
        string profile;
        address[] vouchers;
        bool[] vouchedFor;
        bool[] nomineeApproved;
    }

    address private immutable community = msg.sender;
    Currency private immutable currency;
    bool private immutable openJoin; // anyone joins at once; otherwise through the web of trust

    Member[] private members;
    mapping(address => bool) public isMember;

    mapping(address => address[]) private neighbors;
    Nomination[] private nominations;
    mapping(address => uint256) private nominationIndex; // the nominee's nomination's index + 1
    mapping(address => mapping(address => bool)) private approved; // approver -> approved

    constructor(Currency currency_, bool openJoin_) {
        currency = currency_;
        openJoin = openJoin_;
    }

    // ------------------------------------------------------------------
    // Joining
    // ------------------------------------------------------------------

    /// The community's first member: its creator, once, at its creation.
    function addFounder(address agent, string calldata node, string calldata profile) external {
        require(msg.sender == community && members.length == 0, "only the community adds its founder");
        admit(agent, node, profile, new address[](0));
    }

    /// Asks to become a member. In an open community, the caller is one at
    /// once; otherwise they are nominated, and become one through the web of trust.
    function join(string calldata node, string calldata profile) external {
        require(!isMember[msg.sender], "already a member");
        if (openJoin) {
            admit(msg.sender, node, profile, new address[](0));
            return;
        }
        require(nominationIndex[msg.sender] == 0, "you are nominated already");
        address[] memory vouchers;
        if (members.length <= TRUST_DEGREE) {
            require(nominations.length == 0, "another newcomer is being approved: try again later");
            vouchers = new address[](members.length);
            for (uint256 i = 0; i < members.length; i++) vouchers[i] = members[i].agent;
        } else {
            vouchers = drawVouchers(msg.sender);
        }
        Nomination storage n = nominations.push();
        n.nominee = msg.sender;
        n.node = node;
        n.profile = profile;
        n.vouchers = vouchers;
        nominationIndex[msg.sender] = nominations.length;
    }

    /// Approves the other side of a nomination: a nominee approves one of
    /// their vouchers, or a voucher approves the nominee. When all approved
    /// each other, the nominee becomes a member.
    function approve(address other) external {
        (address nominee, address voucher) = nominationIndex[other] != 0 ? (other, msg.sender) : (msg.sender, other);
        uint256 index = nominationIndex[nominee];
        require(index != 0, "no such nomination");
        require(isVoucher(nominations[index - 1], voucher), "not a voucher of this nomination");
        approved[msg.sender][other] = true;
        if (allApproved(nominations[index - 1])) admitNominee(index - 1);
    }

    /// Cancels a nomination: the nominee, or one of their vouchers.
    function disapprove(address other) external {
        address nominee = nominationIndex[other] != 0 ? other : msg.sender;
        uint256 index = nominationIndex[nominee];
        require(index != 0, "no such nomination");
        require(msg.sender == nominee || isVoucher(nominations[index - 1], msg.sender),
            "only the nominee or a voucher cancels a nomination");
        dropNomination(index - 1);
    }

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    function getMembers() external view returns (Member[] memory) {
        return members;
    }

    function getNominations() external view returns (NominationView[] memory out) {
        out = new NominationView[](nominations.length);
        for (uint256 i = 0; i < nominations.length; i++) {
            Nomination storage n = nominations[i];
            uint256 k = n.vouchers.length;
            bool[] memory vouched = new bool[](k);
            bool[] memory nomineeApproved = new bool[](k);
            for (uint256 j = 0; j < k; j++) {
                vouched[j] = approved[n.vouchers[j]][n.nominee];
                nomineeApproved[j] = approved[n.nominee][n.vouchers[j]];
            }
            out[i] = NominationView(n.nominee, n.node, n.profile, n.vouchers, vouched, nomineeApproved);
        }
    }

    // ------------------------------------------------------------------
    // The graph
    // ------------------------------------------------------------------

    /// Makes agent a member, linked to links, with a personal account.
    function admit(address agent, string memory node, string memory profile, address[] memory links) private {
        require(!isMember[agent], "already a member");
        isMember[agent] = true;
        members.push(Member(agent, node, profile));
        neighbors[agent] = links;
        currency.openPersonalAccount(agent);
    }

    /// Makes a nominee a member, linked to their vouchers.
    function admitNominee(uint256 index) private {
        Nomination storage n = nominations[index];
        address[] memory vouchers = n.vouchers;
        bool rewire = vouchers.length == 4 && members.length > TRUST_DEGREE;
        for (uint256 i = 0; i < vouchers.length; i++) {
            if (rewire) unlink(vouchers[i], vouchers[i % 2 == 0 ? i + 1 : i - 1]);
            neighbors[vouchers[i]].push(n.nominee);
        }
        address nominee = n.nominee;
        string memory node = n.node;
        string memory profile = n.profile;
        dropNomination(index);
        admit(nominee, node, profile, vouchers);
    }

    /// Two edges, at random, that no pending nomination holds and that share
    /// no member: their ends, in pairs (u, v, x, y for edges u-v and x-y).
    function drawVouchers(address nominee) private view returns (address[] memory vouchers) {
        (address[] memory from, address[] memory to, uint256 n) = freeEdges(address(0), address(0));
        require(n > 0, "the web of trust has no free link now: try again later");
        uint256 first = draw(n, nominee, 0);
        address u = from[first];
        address v = to[first];
        (from, to, n) = freeEdges(u, v);
        require(n > 0, "the web of trust has no second free link now: try again later");
        uint256 second = draw(n, nominee, 1);
        vouchers = new address[](4);
        vouchers[0] = u;
        vouchers[1] = v;
        vouchers[2] = from[second];
        vouchers[3] = to[second];
    }

    /// The graph's edges (each once), less those pending nominations hold,
    /// and less those touching a or b (unless they are zero).
    function freeEdges(address a, address b) private view returns (address[] memory from, address[] memory to, uint256 n) {
        uint256 max = members.length * TRUST_DEGREE;
        from = new address[](max);
        to = new address[](max);
        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i].agent;
            address[] storage links = neighbors[m];
            for (uint256 j = 0; j < links.length; j++) {
                address x = links[j];
                if (uint160(x) < uint160(m)) continue; // each edge once
                if (a != address(0) && (m == a || m == b || x == a || x == b)) continue;
                if (held(m, x)) continue;
                from[n] = m;
                to[n++] = x;
            }
        }
    }

    /// Whether a pending nomination is to cut the edge a-b.
    function held(address a, address b) private view returns (bool) {
        for (uint256 i = 0; i < nominations.length; i++) {
            address[] storage v = nominations[i].vouchers;
            if (v.length != 4) continue;
            if ((v[0] == a && v[1] == b) || (v[0] == b && v[1] == a)
                || (v[2] == a && v[3] == b) || (v[2] == b && v[3] == a)) return true;
        }
        return false;
    }

    /// A number below n, the same at every partner: from the block's time,
    /// the ledger position, the nominee and a salt.
    function draw(uint256 n, address nominee, uint256 salt) private view returns (uint256) {
        return uint256(keccak256(abi.encode(block.timestamp, block.number, nominee, salt))) % n;
    }

    function isVoucher(Nomination storage n, address agent) private view returns (bool) {
        for (uint256 i = 0; i < n.vouchers.length; i++) if (n.vouchers[i] == agent) return true;
        return false;
    }

    function allApproved(Nomination storage n) private view returns (bool) {
        for (uint256 i = 0; i < n.vouchers.length; i++) {
            if (!approved[n.vouchers[i]][n.nominee] || !approved[n.nominee][n.vouchers[i]]) return false;
        }
        return true;
    }

    function unlink(address a, address b) private {
        address[] storage links = neighbors[a];
        for (uint256 i = 0; i < links.length; i++) {
            if (links[i] == b) {
                links[i] = links[links.length - 1];
                links.pop();
                return;
            }
        }
    }

    /// Removes a nomination, and the approvals between its nominee and vouchers.
    function dropNomination(uint256 index) private {
        Nomination storage n = nominations[index];
        address nominee = n.nominee;
        for (uint256 i = 0; i < n.vouchers.length; i++) {
            delete approved[n.vouchers[i]][nominee];
            delete approved[nominee][n.vouchers[i]];
        }
        delete nominationIndex[nominee];
        uint256 last = nominations.length - 1;
        if (index != last) {
            nominations[index] = nominations[last];
            nominationIndex[nominations[index].nominee] = index + 1;
        }
        nominations.pop();
    }
}

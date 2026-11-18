// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


/// The community's currency. Every member has a personal account, and funds
/// (accounts a collaboration's flow opens) have accounts too. Amounts have six
/// decimals (UNIT is one unit). Policies move currency once a day (a tick,
/// counted from the community's creation): they mint into accounts, burn from
/// them, or transfer between them, at a rate the members set together (the
/// median of their preferences) or, for a commitment, that its creator sets.
/// Balances are calculated up to a tick, and brought up to date by
/// updateBalances(), and by every write that depends on them, a year of ticks
/// at most at a time.
///
/// The members are the owners of the personal accounts: Membership opens one
/// for each member it admits, and only Membership opens them.
contract Currency {
    uint256 public constant UNIT = 1e6;
    uint64 public constant TICK = 1 days;
    uint64 public constant MAX_TICKS_PER_UPDATE = 366;

    enum AccountKind { Personal, Fund }

    /// An account. A personal account's id is its member's address in
    /// lowercase hex; a fund's is the id its flow gave it.
    struct Account {
        string id;
        AccountKind kind;
        string name;
        address owner;
        uint256 balance;
    }

    /// A payment into a fund's account.
    struct Contribution {
        address from;
        uint256 amount;
        uint64 time;
    }

    enum SideKind { Void, Account, EveryPersonal, EveryAccount }
    enum Mode { Units, Percent }
    enum RateType { CommunityGoverned, SelfSet }

    /// Where a policy takes currency from, or puts it: nowhere (minting or
    /// burning), one account, every personal account, or every account.
    struct Side {
        SideKind kind;
        string account; // for SideKind.Account: the account's id
    }

    /// A policy. Each tick, it mints rate into each destination (units only),
    /// or takes from each source rate units, or rate percent of its balance
    /// (rate has six decimals either way), and burns it or splits it equally
    /// among the destinations.
    struct Policy {
        string name;
        string description;
        Side source;
        Side destination;
        Mode mode;
        RateType rateType;
        address creator;
        uint256 selfRate; // a commitment's rate
        uint64 createdAt;
        uint64 startTick; // the first tick it applies to
        bool deleted;
    }

    /// A policy as getPolicies() shows it, with its rate now and the reader's preference.
    struct PolicyView {
        uint256 id;
        string name;
        string description;
        Side source;
        Side destination;
        Mode mode;
        RateType rateType;
        address creator;
        uint256 selfRate;
        uint256 currentRate;
        uint64 createdAt;
        uint256 preferences; // how many members set a preference
        bool hasMyPreference;
        uint256 myPreference;
    }

    /// Where the balances stand: calculated up to settledTick, while the
    /// current tick is currentTick.
    struct Settlement {
        uint64 tickSeconds;
        uint64 currentTick;
        uint64 settledTick;
        uint64 settledUntil; // unix seconds: when settledTick fell (the creation, before any tick)
        uint64 maxTicksPerUpdate;
        uint256 initialBalance;
    }

    address private immutable community = msg.sender;
    address private membership; // set once, by the community, when it creates it
    uint64 private immutable start; // when tick 0 began: the community's creation
    uint256 private immutable initialBalance; // what a new member's account starts with

    Account[] private accounts;
    mapping(string => uint256) private accountIndex; // the account's index + 1
    mapping(string => Contribution[]) private contributions; // fund account id -> payments into it

    Policy[] private policies;
    mapping(uint256 => mapping(address => uint256)) private preference;
    mapping(uint256 => mapping(address => bool)) private hasPreference;
    uint64 private settledTick;

    /// With starterPolicies, creator's community starts with personal minting
    /// and demurrage, at the rates its members will set.
    constructor(uint256 initialBalance_, bool starterPolicies, address creator) {
        start = uint64(block.timestamp);
        initialBalance = initialBalance_;
        if (starterPolicies) {
            addPolicy(creator, "Personal Minting", "Mints currency directly into every member's personal account.",
                Side(SideKind.Void, ""), Side(SideKind.EveryPersonal, ""), Mode.Units, RateType.CommunityGoverned, 0);
            addPolicy(creator, "Demurrage", "Gradually burns a share of every account balance.",
                Side(SideKind.EveryAccount, ""), Side(SideKind.Void, ""), Mode.Percent, RateType.CommunityGoverned, 0);
        }
    }

    /// Connects the community's membership, which opens members' accounts: once, by the community.
    function setMembership(address membership_) external {
        require(msg.sender == community && membership == address(0), "only the community sets its membership, once");
        membership = membership_;
    }

    modifier onlyMember() {
        uint256 index = accountIndex[personalId(msg.sender)];
        require(index != 0 && accounts[index - 1].kind == AccountKind.Personal, "members only");
        _;
    }

    /// Brings the balances up to date first, and refuses if they are still
    /// behind (more than MAX_TICKS_PER_UPDATE ticks): then call updateBalances() first.
    modifier upToDate() {
        uint64 current = currentTick();
        settle(current);
        require(settledTick == current, "the balances are more than a year behind: update them first");
        _;
    }

    // ------------------------------------------------------------------
    // Accounts and payments
    // ------------------------------------------------------------------

    /// Opens a new member's personal account, with the starting balance.
    function openPersonalAccount(address agent) external upToDate {
        require(msg.sender == membership, "only the membership opens personal accounts");
        addAccount(personalId(agent), AccountKind.Personal, "", agent, initialBalance);
    }

    /// Opens a fund's account, which a collaboration's flow uses (id is the
    /// flow's). Returns false if it is open already.
    function createFundAccount(string calldata id, string calldata name, address owner) external onlyMember returns (bool) {
        require(bytes(id).length > 0, "a fund needs an id");
        require(bytes(name).length > 0, "a fund needs a name");
        if (accountIndex[id] != 0) return false;
        addAccount(id, AccountKind.Fund, name, owner, 0);
        return true;
    }

    /// Pays from the caller's personal account.
    function pay(string calldata to, uint256 amount) external onlyMember upToDate {
        address agent = msg.sender;
        require(amount > 0, "the amount must be positive");
        uint256 toIndex = accountIndex[to];
        require(toIndex != 0, "no such account");
        Account storage from = accounts[accountIndex[personalId(agent)] - 1];
        require(from.balance >= amount, "not enough balance");
        from.balance -= amount;
        Account storage recipient = accounts[toIndex - 1];
        recipient.balance += amount;
        if (recipient.kind == AccountKind.Fund) contributions[to].push(Contribution(agent, amount, uint64(block.timestamp)));
    }

    function getAccounts() external view returns (Account[] memory) {
        return accounts;
    }

    /// The payments into a fund's account.
    function getContributions(string calldata fundId) external view returns (Contribution[] memory) {
        return contributions[fundId];
    }

    // ------------------------------------------------------------------
    // Policies
    // ------------------------------------------------------------------

    /// The caller creates a policy; returns its id. A commitment (SelfSet)
    /// pays from its creator's own account, at the rate they give; the
    /// members set a community-governed policy's rate.
    function createPolicy(
        string calldata name,
        string calldata description,
        Side calldata source,
        Side calldata destination,
        Mode mode,
        RateType rateType,
        uint256 selfRate
    ) external onlyMember upToDate returns (uint256) {
        address agent = msg.sender;
        require(bytes(name).length > 0, "a policy needs a name");
        if (rateType == RateType.SelfSet) {
            require(source.kind == SideKind.Account && equal(source.account, personalId(agent)),
                "a commitment pays from your own account");
        }
        return addPolicy(agent, name, description, source, destination, mode, rateType,
            rateType == RateType.SelfSet ? selfRate : 0);
    }

    /// Sets the caller's preference for a community-governed policy's rate.
    function setPolicyPreference(uint256 policyId, uint256 value) external onlyMember upToDate {
        address agent = msg.sender;
        Policy storage policy = livePolicy(policyId);
        require(policy.rateType == RateType.CommunityGoverned, "the members do not set this policy's rate");
        preference[policyId][agent] = value;
        hasPreference[policyId][agent] = true;
    }

    /// Sets a commitment's rate: its creator only.
    function setCommitmentRate(uint256 policyId, uint256 value) external upToDate {
        Policy storage policy = livePolicy(policyId);
        require(policy.rateType == RateType.SelfSet, "this policy is not a commitment");
        require(policy.creator == msg.sender, "only its creator sets a commitment's rate");
        policy.selfRate = value;
    }

    function setPolicyDetails(uint256 policyId, string calldata name, string calldata description) external {
        Policy storage policy = livePolicy(policyId);
        require(policy.creator == msg.sender, "only its creator changes a policy's details");
        require(bytes(name).length > 0, "a policy needs a name");
        policy.name = name;
        policy.description = description;
    }

    /// Deletes a policy: its creator only, and a community-governed one only
    /// once the members' rate is zero.
    function deletePolicy(uint256 policyId) external upToDate {
        Policy storage policy = livePolicy(policyId);
        require(policy.creator == msg.sender, "only its creator deletes a policy");
        require(policy.rateType == RateType.SelfSet || median(policyId) == 0, "the members' rate is not zero yet");
        policy.deleted = true;
    }

    /// The live policies, with the reader's preferences.
    function getPolicies() external view returns (PolicyView[] memory out) {
        address reader = msg.sender;
        uint256 live;
        for (uint256 i = 0; i < policies.length; i++) if (!policies[i].deleted) live++;
        out = new PolicyView[](live);
        uint256 k;
        for (uint256 i = 0; i < policies.length; i++) {
            if (policies[i].deleted) continue;
            out[k++] = viewOf(i, reader);
        }
    }

    function addPolicy(
        address creator,
        string memory name,
        string memory description,
        Side memory source,
        Side memory destination,
        Mode mode,
        RateType rateType,
        uint256 selfRate
    ) private returns (uint256) {
        require(source.kind != SideKind.Void || destination.kind != SideKind.Void, "a policy needs a source or a destination");
        require(source.kind != SideKind.Void || mode == Mode.Units, "minting is in units, not percent");
        checkSide(source);
        checkSide(destination);
        Policy storage policy = policies.push();
        policy.name = name;
        policy.description = description;
        policy.source = source;
        policy.destination = destination;
        policy.mode = mode;
        policy.rateType = rateType;
        policy.creator = creator;
        policy.selfRate = selfRate;
        policy.createdAt = uint64(block.timestamp);
        policy.startTick = currentTick() + 1;
        return policies.length - 1;
    }

    function checkSide(Side memory side) private view {
        if (side.kind == SideKind.Account) require(accountIndex[side.account] != 0, "no such account");
    }

    function livePolicy(uint256 policyId) private view returns (Policy storage policy) {
        require(policyId < policies.length && !policies[policyId].deleted, "no such policy");
        return policies[policyId];
    }

    function viewOf(uint256 i, address reader) private view returns (PolicyView memory v) {
        Policy storage policy = policies[i];
        v.id = i;
        v.name = policy.name;
        v.description = policy.description;
        v.source = policy.source;
        v.destination = policy.destination;
        v.mode = policy.mode;
        v.rateType = policy.rateType;
        v.creator = policy.creator;
        v.selfRate = policy.selfRate;
        v.currentRate = rateOf(i);
        v.createdAt = policy.createdAt;
        v.preferences = preferenceCount(i);
        v.hasMyPreference = hasPreference[i][reader];
        v.myPreference = preference[i][reader];
    }

    function rateOf(uint256 policyId) private view returns (uint256) {
        Policy storage policy = policies[policyId];
        return policy.rateType == RateType.SelfSet ? policy.selfRate : median(policyId);
    }

    // The members are the owners of the personal accounts: every member has one.

    function preferenceCount(uint256 policyId) private view returns (uint256 count) {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i].kind == AccountKind.Personal && hasPreference[policyId][accounts[i].owner]) count++;
        }
    }

    /// The median of the members' preferences (of those who set one), or 0.
    function median(uint256 policyId) private view returns (uint256) {
        uint256[] memory values = new uint256[](accounts.length);
        uint256 n;
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i].kind != AccountKind.Personal) continue;
            address agent = accounts[i].owner;
            if (hasPreference[policyId][agent]) values[n++] = preference[policyId][agent];
        }
        if (n == 0) return 0;
        for (uint256 i = 1; i < n; i++) {
            uint256 v = values[i];
            uint256 j = i;
            for (; j > 0 && values[j - 1] > v; j--) values[j] = values[j - 1];
            values[j] = v;
        }
        return n % 2 == 1 ? values[n / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
    }

    // ------------------------------------------------------------------
    // Settlement
    // ------------------------------------------------------------------

    function currentTick() public view returns (uint64) {
        return (uint64(block.timestamp) - start) / TICK;
    }

    function getCurrency() external view returns (Settlement memory) {
        return Settlement(TICK, currentTick(), settledTick, start + settledTick * TICK, MAX_TICKS_PER_UPDATE, initialBalance);
    }

    /// Applies the policies to the ticks not calculated yet, up to a year of them.
    function updateBalances() external {
        settle(currentTick());
    }

    /// What a policy does in one settlement: its rate then, the first tick it
    /// applies to, and the accounts it takes from and puts into.
    struct Plan {
        uint256 rate;
        uint64 start;
        bool units;
        bool mint;
        bool burn;
        uint256[] sources;
        uint256[] destinations;
    }

    function settle(uint64 target) private {
        uint64 from = settledTick;
        if (target <= from) return;
        uint64 to = target - from > MAX_TICKS_PER_UPDATE ? from + MAX_TICKS_PER_UPDATE : target;

        uint256[] memory balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) balances[i] = accounts[i].balance;
        Plan[] memory plans = plansOf();

        for (uint64 t = from + 1; t <= to; t++) {
            for (uint256 p = 0; p < plans.length; p++) {
                if (plans[p].rate != 0 && t >= plans[p].start) applyTick(plans[p], balances);
            }
        }

        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i].balance != balances[i]) accounts[i].balance = balances[i];
        }
        settledTick = to;
    }

    function plansOf() private view returns (Plan[] memory plans) {
        plans = new Plan[](policies.length);
        for (uint256 p = 0; p < policies.length; p++) {
            Policy storage policy = policies[p];
            if (policy.deleted) continue;
            plans[p].rate = rateOf(p);
            plans[p].start = policy.startTick;
            plans[p].units = policy.mode == Mode.Units;
            plans[p].mint = policy.source.kind == SideKind.Void;
            plans[p].burn = policy.destination.kind == SideKind.Void;
            plans[p].sources = resolve(policy.source);
            plans[p].destinations = resolve(policy.destination);
        }
    }

    function applyTick(Plan memory plan, uint256[] memory balances) private pure {
        if (plan.mint) {
            for (uint256 d = 0; d < plan.destinations.length; d++) balances[plan.destinations[d]] += plan.rate;
            return;
        }
        uint256 n = plan.destinations.length;
        for (uint256 s = 0; s < plan.sources.length; s++) {
            uint256 i = plan.sources[s];
            uint256 amount = plan.units
                ? (plan.rate < balances[i] ? plan.rate : balances[i])
                : balances[i] * plan.rate / (100 * UNIT);
            if (plan.burn) {
                balances[i] -= amount;
                continue;
            }
            if (n == 0) continue;
            uint256 share = amount / n;
            if (share == 0) continue;
            balances[i] -= share * n;
            for (uint256 d = 0; d < n; d++) balances[plan.destinations[d]] += share;
        }
    }

    /// The indexes of the accounts a side names.
    function resolve(Side storage side) private view returns (uint256[] memory out) {
        if (side.kind == SideKind.Void) return new uint256[](0);
        if (side.kind == SideKind.Account) {
            out = new uint256[](1);
            out[0] = accountIndex[side.account] - 1;
            return out;
        }
        uint256 count;
        for (uint256 i = 0; i < accounts.length; i++) {
            if (side.kind == SideKind.EveryAccount || accounts[i].kind == AccountKind.Personal) count++;
        }
        out = new uint256[](count);
        uint256 k;
        for (uint256 i = 0; i < accounts.length; i++) {
            if (side.kind == SideKind.EveryAccount || accounts[i].kind == AccountKind.Personal) out[k++] = i;
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function addAccount(string memory id, AccountKind kind, string memory name, address owner, uint256 balance) private {
        require(accountIndex[id] == 0, "the account already exists");
        accounts.push(Account(id, kind, name, owner, balance));
        accountIndex[id] = accounts.length;
    }

    /// A personal account's id: its member's address, in lowercase hex.
    function personalId(address agent) private pure returns (string memory) {
        bytes memory digits = "0123456789abcdef";
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        uint160 value = uint160(agent);
        for (uint256 i = 41; i > 1; i--) {
            out[i] = digits[value & 0xf];
            value >>= 4;
        }
        return string(out);
    }

    function equal(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}

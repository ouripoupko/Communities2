// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CurrencyAccounts.sol";

/// The currency's policies: the second layer of Currency (see Currency.sol).
/// A policy moves currency once a tick: it mints into accounts, burns from
/// them, or transfers between them, at a rate the members set together (the
/// median of their preferences) or, for a commitment, that its creator sets.
abstract contract CurrencyPolicies is CurrencyAccounts {
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

    Policy[] internal policies;
    mapping(uint256 => mapping(address => uint256)) private preference;
    mapping(uint256 => mapping(address => bool)) private hasPreference;

    /// The tick now (in Currency): a new policy applies from the next one.
    function currentTick() public view virtual returns (uint64);

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
    ) internal returns (uint256) {
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

    /// A policy's rate now: a commitment's own, or the members' median.
    function rateOf(uint256 policyId) internal view returns (uint256) {
        Policy storage policy = policies[policyId];
        return policy.rateType == RateType.SelfSet ? policy.selfRate : median(policyId);
    }

    // The members are the owners of the personal accounts: every member has one.

    function preferenceCount(uint256 policyId) private view returns (uint256 count) {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i].kind == AccountKind.Personal && hasPreference[policyId][accounts[i].owner]) count++;
        }
    }

    /// The median of every member's preference: a member who has not set one
    /// counts as 0, so no few members set the rate for all.
    function median(uint256 policyId) private view returns (uint256) {
        uint256[] memory values = new uint256[](accounts.length);
        uint256 n;
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i].kind == AccountKind.Personal) values[n++] = preference[policyId][accounts[i].owner];
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

    function equal(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}

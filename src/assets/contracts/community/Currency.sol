// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CurrencyPolicies.sol";

/// The community's currency: one contract, written in three layers, a file
/// each: its accounts and payments (CurrencyAccounts.sol), its policies
/// (CurrencyPolicies.sol), and here, the settlement that applies the policies
/// to the accounts.
///
/// Policies move currency once a day (a tick, counted from the community's
/// creation). Balances are calculated up to a tick, and brought up to date by
/// updateBalances(), and by every write that depends on them, a year of ticks
/// at most at a time.
contract Currency is CurrencyPolicies {
    uint64 public constant TICK = 1 days;
    uint64 public constant MAX_TICKS_PER_UPDATE = 366;

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

    uint64 private immutable start; // when tick 0 began: the community's creation
    uint64 private settledTick;

    /// With starterPolicies, creator's community starts with personal minting
    /// and demurrage, at the rates its members will set.
    constructor(uint256 initialBalance_, bool starterPolicies, address creator) CurrencyAccounts(initialBalance_) {
        start = uint64(block.timestamp);
        if (starterPolicies) {
            addPolicy(creator, "Personal Minting", "Mints currency directly into every member's personal account.",
                Side(SideKind.Void, ""), Side(SideKind.EveryPersonal, ""), Mode.Units, RateType.CommunityGoverned, 0);
            addPolicy(creator, "Demurrage", "Gradually burns a share of every account balance.",
                Side(SideKind.EveryAccount, ""), Side(SideKind.Void, ""), Mode.Percent, RateType.CommunityGoverned, 0);
        }
    }

    function currentTick() public view override returns (uint64) {
        return (uint64(block.timestamp) - start) / TICK;
    }

    function getCurrency() external view returns (Settlement memory) {
        return Settlement(TICK, currentTick(), settledTick, start + settledTick * TICK, MAX_TICKS_PER_UPDATE, initialBalance);
    }

    /// Applies the policies to the ticks not calculated yet, up to a year of them.
    function updateBalances() external {
        settle(currentTick());
    }

    function bringUpToDate() internal override returns (bool) {
        uint64 current = currentTick();
        settle(current);
        return settledTick == current;
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
}

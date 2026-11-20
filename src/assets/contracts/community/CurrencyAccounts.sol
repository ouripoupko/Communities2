// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


/// The currency's accounts and payments: the first layer of Currency (see
/// Currency.sol). Every member has a personal account, and funds (accounts a
/// collaboration's flow opens) have accounts too. Amounts have six decimals
/// (UNIT is one unit).
///
/// The members are the owners of the personal accounts: Membership opens one
/// for each member it admits, and only Membership opens them.
abstract contract CurrencyAccounts {
    uint256 public constant UNIT = 1e6;

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

    address private immutable community = msg.sender;
    address private membership; // set once, by the community, when it creates it
    uint256 internal immutable initialBalance; // what a new member's account starts with

    Account[] internal accounts;
    mapping(string => uint256) internal accountIndex; // the account's index + 1
    mapping(string => Contribution[]) private contributions; // fund account id -> payments into it

    constructor(uint256 initialBalance_) {
        initialBalance = initialBalance_;
    }

    /// Brings the balances up to date (the settlement, in Currency); returns
    /// false if they are still behind.
    function bringUpToDate() internal virtual returns (bool);

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
        require(bringUpToDate(), "the balances are more than a year behind: update them first");
        _;
    }

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

    function addAccount(string memory id, AccountKind kind, string memory name, address owner, uint256 balance) private {
        require(accountIndex[id] == 0, "the account already exists");
        accounts.push(Account(id, kind, name, owner, balance));
        accountIndex[id] = accounts.length;
    }

    /// A personal account's id: its member's address, in lowercase hex.
    function personalId(address agent) internal pure returns (string memory) {
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
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Roles: each role has a purpose, and four sections of items
/// (responsibilities, autonomy, authorities, boundaries). Participants join
/// and leave roles, and approve or disapprove what a role says and who holds
/// it, under keys the app names ("purpose", "item_<id>", "holder_<agent>").
contract RolesFlow {
    enum Vote { None, Approve, Disapprove }
    uint8 public constant SECTIONS = 4; // responsibilities, autonomy, authorities, boundaries

    struct Item {
        string id;
        string text;
    }

    struct VoteEntry {
        string key;
        address voter;
        Vote value;
    }

    struct Role {
        string id;
        string name;
        string description;
        address createdBy;
        uint64 createdAt;
        string purpose;
        bool deleted;
    }

    struct RoleView {
        string id;
        string name;
        string description;
        address createdBy;
        uint64 createdAt;
        string purpose;
        address[] assignees;
        Item[] responsibilities;
        Item[] autonomy;
        Item[] authorities;
        Item[] boundaries;
        VoteEntry[] votes;
    }

    Role[] private roles;
    mapping(string => uint256) private roleIndex; // index + 1
    mapping(uint256 => address[]) private assignees;
    mapping(uint256 => mapping(uint8 => Item[])) private sections;
    mapping(uint256 => VoteEntry[]) private votes;
    mapping(bytes32 => uint256) private voteIndex; // keccak(role, key, voter) -> index + 1

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function addRole(string calldata name, string calldata description) external returns (string memory id) {
        require(bytes(name).length > 0, "a role needs a name");
        id = decimal(roles.length + 1);
        roles.push(Role(id, name, description, msg.sender, uint64(block.timestamp), "", false));
        roleIndex[id] = roles.length;
    }

    function joinRole(string calldata roleId) external {
        uint256 r = indexOf(roleId);
        require(!holds(r, msg.sender), "you hold this role already");
        assignees[r].push(msg.sender);
    }

    function leaveRole(string calldata roleId) external {
        uint256 r = indexOf(roleId);
        address[] storage list = assignees[r];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == msg.sender) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
        revert("you do not hold this role");
    }

    function deleteRole(string calldata roleId) external {
        uint256 r = indexOf(roleId);
        require(roles[r].createdBy == msg.sender, "only its creator deletes a role");
        roles[r].deleted = true;
    }

    function setPurpose(string calldata roleId, string calldata text) external {
        roles[indexOf(roleId)].purpose = text;
    }

    /// Replaces a section's items: ids[i] is the item whose text is texts[i].
    function setSection(string calldata roleId, uint8 section, string[] calldata ids, string[] calldata texts) external {
        require(section < SECTIONS, "no such section");
        require(ids.length == texts.length, "one text for each item");
        Item[] storage items = sections[indexOf(roleId)][section];
        while (items.length > 0) items.pop();
        for (uint256 i = 0; i < ids.length; i++) items.push(Item(ids[i], texts[i]));
    }

    /// Votes on something of a role, under its key; Vote.None takes the vote back.
    function vote(string calldata roleId, string calldata key, Vote value) external {
        uint256 r = indexOf(roleId);
        bytes32 k = keccak256(abi.encode(r, key, msg.sender));
        uint256 i = voteIndex[k];
        if (i == 0) {
            votes[r].push(VoteEntry(key, msg.sender, value));
            voteIndex[k] = votes[r].length;
        } else {
            votes[r][i - 1].value = value;
        }
    }

    function getRoles() external view returns (RoleView[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < roles.length; i++) if (!roles[i].deleted) n++;
        out = new RoleView[](n);
        uint256 k;
        for (uint256 i = 0; i < roles.length; i++) if (!roles[i].deleted) out[k++] = viewOf(i);
    }

    function viewOf(uint256 r) private view returns (RoleView memory v) {
        Role storage role = roles[r];
        v.id = role.id;
        v.name = role.name;
        v.description = role.description;
        v.createdBy = role.createdBy;
        v.createdAt = role.createdAt;
        v.purpose = role.purpose;
        v.assignees = assignees[r];
        v.responsibilities = sections[r][0];
        v.autonomy = sections[r][1];
        v.authorities = sections[r][2];
        v.boundaries = sections[r][3];
        v.votes = votes[r];
    }

    function indexOf(string calldata roleId) private view returns (uint256) {
        uint256 index = roleIndex[roleId];
        require(index != 0 && !roles[index - 1].deleted, "no such role");
        return index - 1;
    }

    function holds(uint256 r, address agent) private view returns (bool) {
        address[] storage list = assignees[r];
        for (uint256 i = 0; i < list.length; i++) if (list[i] == agent) return true;
        return false;
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

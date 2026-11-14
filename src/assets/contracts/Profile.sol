// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A member's own profile. Only the agent that deployed it can change it.
contract Profile {
    struct Data {
        string firstName;
        string lastName;
        string userPhoto; // a small JPEG, as a data URL
    }

    address public owner;
    Data private data;

    constructor() {
        owner = msg.sender;
    }

    function setProfile(string calldata firstName, string calldata lastName, string calldata userPhoto) external {
        require(msg.sender == owner, "only the owner can change the profile");
        data = Data(firstName, lastName, userPhoto);
    }

    function getProfile() external view returns (Data memory) {
        return data;
    }
}

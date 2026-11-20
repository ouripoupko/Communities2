// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Scheduling: its organizer (who deploys it) sets a range of days and daily
/// hours, split into slots; each participant selects the slots that suit
/// them. A slot's index counts slots from the first day's first one.
contract SchedulingFlow {
    struct Range {
        string title;
        string description;
        address organizer;
        string startDate; // "YYYY-MM-DD"
        string endDate; // "YYYY-MM-DD"
        string dailyStart; // "HH:MM"
        string dailyEnd; // "HH:MM"
        uint16 slotMinutes;
    }

    struct Selection {
        address participant;
        uint32[] slots;
    }

    Range private range;
    address[] private participants;
    mapping(address => uint32[]) private selected;
    mapping(address => bool) private hasSelected;

    constructor(
        string memory title,
        string memory description,
        string memory startDate,
        string memory endDate,
        string memory dailyStart,
        string memory dailyEnd,
        uint16 slotMinutes
    ) {
        require(slotMinutes > 0, "a slot needs a length");
        range = Range(title, description, msg.sender, startDate, endDate, dailyStart, dailyEnd, slotMinutes);
    }

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Changes the range: its organizer only. Selections keep their slot indexes.
    /// (memory, not calldata, parameters: seven calldata strings are too deep for the stack.)
    function setRange(
        string memory title,
        string memory description,
        string memory startDate,
        string memory endDate,
        string memory dailyStart,
        string memory dailyEnd,
        uint16 slotMinutes
    ) external {
        require(msg.sender == range.organizer, "only its organizer changes the range");
        require(slotMinutes > 0, "a slot needs a length");
        range = Range(title, description, range.organizer, startDate, endDate, dailyStart, dailyEnd, slotMinutes);
    }

    /// Sets the caller's selected slots, replacing their previous ones.
    function setMySelection(uint32[] calldata slots) external {
        if (!hasSelected[msg.sender]) {
            hasSelected[msg.sender] = true;
            participants.push(msg.sender);
        }
        selected[msg.sender] = slots;
    }

    function getRange() external view returns (Range memory) {
        return range;
    }

    function getSelections() external view returns (Selection[] memory out) {
        out = new Selection[](participants.length);
        for (uint256 i = 0; i < participants.length; i++) out[i] = Selection(participants[i], selected[participants[i]]);
    }
}

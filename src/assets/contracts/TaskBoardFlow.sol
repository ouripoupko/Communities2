// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A task board: tasks move from to-do to in-progress to done. Anyone claims a
/// task; its owner releases it, or moves it forward or back; its creator
/// deletes it, until it is done.
contract TaskBoardFlow {
    enum Status { Todo, InProgress, Done }

    struct Task {
        string id;
        string title;
        string description;
        address createdBy;
        address owner; // zero when nobody owns it
        Status status;
        uint64 createdAt;
        bool deleted;
    }

    Task[] private tasks;
    mapping(string => uint256) private taskIndex; // index + 1

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function addTask(string calldata title, string calldata description) external returns (string memory id) {
        require(bytes(title).length > 0, "a task needs a title");
        id = decimal(tasks.length + 1);
        tasks.push(Task(id, title, description, msg.sender, address(0), Status.Todo, uint64(block.timestamp), false));
        taskIndex[id] = tasks.length;
    }

    function claimTask(string calldata id) external {
        Task storage t = taskOf(id);
        require(t.owner != msg.sender, "you own this task already");
        t.owner = msg.sender;
    }

    function releaseTask(string calldata id) external {
        Task storage t = ownedTask(id);
        require(t.status != Status.Done, "a done task stays with its owner");
        t.owner = address(0);
    }

    function advanceTask(string calldata id) external {
        Task storage t = ownedTask(id);
        require(t.status != Status.Done, "the task is done");
        t.status = Status(uint8(t.status) + 1);
    }

    function revertTask(string calldata id) external {
        Task storage t = ownedTask(id);
        require(t.status != Status.Todo, "the task is not started");
        t.status = Status(uint8(t.status) - 1);
    }

    function deleteTask(string calldata id) external {
        Task storage t = taskOf(id);
        require(t.createdBy == msg.sender, "only its creator deletes a task");
        require(t.status != Status.Done, "a done task stays");
        t.deleted = true;
    }

    function getTasks() external view returns (Task[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < tasks.length; i++) if (!tasks[i].deleted) n++;
        out = new Task[](n);
        uint256 k;
        for (uint256 i = 0; i < tasks.length; i++) if (!tasks[i].deleted) out[k++] = tasks[i];
    }

    function taskOf(string calldata id) private view returns (Task storage t) {
        uint256 index = taskIndex[id];
        require(index != 0 && !tasks[index - 1].deleted, "no such task");
        t = tasks[index - 1];
    }

    function ownedTask(string calldata id) private view returns (Task storage t) {
        t = taskOf(id);
        require(t.owner == msg.sender, "only its owner moves a task");
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

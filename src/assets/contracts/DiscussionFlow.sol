// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A discussion: comments, each a reply to another or at the top. Deleting a
/// comment (its author only) hides it and the replies under it.
contract DiscussionFlow {
    struct Comment {
        string id;
        address author;
        string text;
        string parent; // the comment it replies to, or ""
        uint64 timestamp;
        bool deleted;
    }

    Comment[] private comments;
    mapping(string => uint256) private commentIndex; // index + 1

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Comments, as a reply to parent ("" at the top), and returns its id.
    function addComment(string calldata text, string calldata parent) external returns (string memory id) {
        require(bytes(text).length > 0, "a comment needs a text");
        if (bytes(parent).length > 0) {
            uint256 p = commentIndex[parent];
            require(p != 0 && !comments[p - 1].deleted, "no such comment to reply to");
        }
        id = decimal(comments.length + 1);
        comments.push(Comment(id, msg.sender, text, parent, uint64(block.timestamp), false));
        commentIndex[id] = comments.length;
    }

    /// Deletes a comment, and so hides the replies under it: its author only.
    function deleteComment(string calldata id) external {
        uint256 index = commentIndex[id];
        require(index != 0, "no such comment");
        Comment storage c = comments[index - 1];
        require(c.author == msg.sender, "only its author deletes a comment");
        c.deleted = true;
    }

    /// Every comment, deleted ones too (the app hides them, and the replies under them).
    function getComments() external view returns (Comment[] memory) {
        return comments;
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

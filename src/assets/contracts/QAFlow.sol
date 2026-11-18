// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Questions and answers: participants ask questions, and answer them, one
/// answer each per question; others approve or disapprove an answer (not
/// their own). Only an author edits or deletes their question or answer;
/// deleting a question deletes its answers.
contract QAFlow {
    enum Vote { None, Approve, Disapprove }

    struct Question {
        string id;
        string text;
        address createdBy;
        uint64 createdAt;
        bool deleted;
    }

    struct Answer {
        string id;
        string questionId;
        string text;
        address createdBy;
        uint64 createdAt;
        bool deleted;
    }

    struct AnswerView {
        string id;
        string questionId;
        string text;
        address createdBy;
        uint64 createdAt;
        address[] approvals;
        address[] disapprovals;
    }

    Question[] private questions;
    mapping(string => uint256) private questionIndex; // index + 1
    Answer[] private answers;
    mapping(string => uint256) private answerIndex; // index + 1
    mapping(string => mapping(address => bool)) private answered; // question -> author
    mapping(uint256 => address[]) private voters;
    mapping(uint256 => mapping(address => Vote)) private votes;

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    function addQuestion(string calldata text) external returns (string memory id) {
        require(bytes(text).length > 0, "a question needs a text");
        id = decimal(questions.length + 1);
        questions.push(Question(id, text, msg.sender, uint64(block.timestamp), false));
        questionIndex[id] = questions.length;
    }

    function deleteQuestion(string calldata questionId) external {
        Question storage q = questionOf(questionId);
        require(q.createdBy == msg.sender, "only its author deletes a question");
        q.deleted = true;
    }

    function addAnswer(string calldata questionId, string calldata text) external returns (string memory id) {
        questionOf(questionId);
        require(bytes(text).length > 0, "an answer needs a text");
        require(!answered[questionId][msg.sender], "you answered this question already");
        answered[questionId][msg.sender] = true;
        id = decimal(answers.length + 1);
        answers.push(Answer(id, questionId, text, msg.sender, uint64(block.timestamp), false));
        answerIndex[id] = answers.length;
    }

    function editAnswer(string calldata answerId, string calldata text) external {
        Answer storage a = ownAnswer(answerId);
        require(bytes(text).length > 0, "an answer needs a text");
        a.text = text;
    }

    function deleteAnswer(string calldata answerId) external {
        Answer storage a = ownAnswer(answerId);
        a.deleted = true;
        answered[a.questionId][msg.sender] = false;
    }

    /// Approves or disapproves an answer; Vote.None takes the vote back.
    function vote(string calldata answerId, Vote value) external {
        uint256 index = answerIndex[answerId];
        require(index != 0 && !answers[index - 1].deleted, "no such answer");
        require(answers[index - 1].createdBy != msg.sender, "you cannot vote on your own answer");
        if (votes[index][msg.sender] == Vote.None && !voted(index, msg.sender)) voters[index].push(msg.sender);
        votes[index][msg.sender] = value;
    }

    function getQuestions() external view returns (Question[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < questions.length; i++) if (!questions[i].deleted) n++;
        out = new Question[](n);
        uint256 k;
        for (uint256 i = 0; i < questions.length; i++) if (!questions[i].deleted) out[k++] = questions[i];
    }

    /// The answers of the questions not deleted.
    function getAnswers() external view returns (AnswerView[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < answers.length; i++) if (live(i)) n++;
        out = new AnswerView[](n);
        uint256 k;
        for (uint256 i = 0; i < answers.length; i++) if (live(i)) out[k++] = viewOf(i);
    }

    function viewOf(uint256 i) private view returns (AnswerView memory v) {
        Answer storage a = answers[i];
        v.id = a.id;
        v.questionId = a.questionId;
        v.text = a.text;
        v.createdBy = a.createdBy;
        v.createdAt = a.createdAt;
        v.approvals = votersWith(i + 1, Vote.Approve);
        v.disapprovals = votersWith(i + 1, Vote.Disapprove);
    }

    function votersWith(uint256 index, Vote value) private view returns (address[] memory out) {
        address[] storage all = voters[index];
        uint256 n;
        for (uint256 j = 0; j < all.length; j++) if (votes[index][all[j]] == value) n++;
        out = new address[](n);
        uint256 k;
        for (uint256 j = 0; j < all.length; j++) if (votes[index][all[j]] == value) out[k++] = all[j];
    }

    function voted(uint256 index, address agent) private view returns (bool) {
        address[] storage all = voters[index];
        for (uint256 j = 0; j < all.length; j++) if (all[j] == agent) return true;
        return false;
    }

    function live(uint256 i) private view returns (bool) {
        return !answers[i].deleted && !questions[questionIndex[answers[i].questionId] - 1].deleted;
    }

    function questionOf(string calldata questionId) private view returns (Question storage q) {
        uint256 index = questionIndex[questionId];
        require(index != 0 && !questions[index - 1].deleted, "no such question");
        q = questions[index - 1];
    }

    function ownAnswer(string calldata answerId) private view returns (Answer storage a) {
        uint256 index = answerIndex[answerId];
        require(index != 0 && !answers[index - 1].deleted, "no such answer");
        a = answers[index - 1];
        require(a.createdBy == msg.sender, "only its author changes an answer");
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

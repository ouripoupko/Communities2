// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A scoring vote: participants propose options for a topic, and each scores
/// them from 0 to 10. The app averages the scores.
contract ScoringFlow {
    uint8 public constant MAX_SCORE = 10;

    struct Topic {
        string topic;
        string description;
    }

    struct Option {
        string id;
        string text;
        address author;
    }

    /// A participant's scores: optionIds[i] scored values[i]. Options they did not score are left out.
    struct Scores {
        address participant;
        string[] optionIds;
        uint8[] values;
    }

    Topic private topic;
    Option[] private options;
    mapping(string => bool) private isOption;
    address[] private scorers;
    mapping(address => string[]) private scoredIds;
    mapping(address => uint8[]) private scoredValues;
    mapping(address => bool) private scored;

    constructor(string memory topic_, string memory description) {
        topic = Topic(topic_, description);
    }

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Proposes an option, and returns its id.
    function addOption(string calldata text) external returns (string memory id) {
        require(bytes(text).length > 0, "an option needs a text");
        id = decimal(options.length + 1);
        options.push(Option(id, text, msg.sender));
        isOption[id] = true;
    }

    /// Sets the caller's scores, replacing their previous ones.
    function setMyScores(string[] calldata optionIds, uint8[] calldata values) external {
        require(optionIds.length == values.length, "one score for each option");
        if (!scored[msg.sender]) {
            scored[msg.sender] = true;
            scorers.push(msg.sender);
        }
        string[] storage ids = scoredIds[msg.sender];
        while (ids.length > 0) ids.pop();
        for (uint256 i = 0; i < optionIds.length; i++) {
            require(isOption[optionIds[i]], "no such option");
            require(values[i] <= MAX_SCORE, "a score is from 0 to 10");
            ids.push(optionIds[i]);
        }
        scoredValues[msg.sender] = values;
    }

    function getTopic() external view returns (Topic memory) {
        return topic;
    }

    function getOptions() external view returns (Option[] memory) {
        return options;
    }

    function getScores() external view returns (Scores[] memory out) {
        out = new Scores[](scorers.length);
        for (uint256 i = 0; i < scorers.length; i++) {
            address p = scorers[i];
            out[i] = Scores(p, scoredIds[p], scoredValues[p]);
        }
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

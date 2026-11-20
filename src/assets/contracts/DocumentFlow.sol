// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// A document written together: a title, then sections, subsections,
/// paragraphs and sentences. An element's owner (who added it) edits it, and
/// deletes it if nobody else owns anything under it; anyone edits the title.
/// Others propose an edit or a deletion: MAJORITY supporters apply it, and
/// MAJORITY rejecters discard it.
contract DocumentFlow {
    uint256 public constant MAJORITY = 3;
    string public constant TITLE_ID = "title";

    enum ElementType { Title, Section, Subsection, Paragraph, Sentence }
    enum ProposalKind { Edit, Delete }

    struct Element {
        string id;
        ElementType elementType;
        string text;
        address owner;
        string parent; // "" for the title and sections
        uint64 order; // orders siblings
        bool deleted;
    }

    struct Proposal {
        string id;
        string targetId;
        ProposalKind kind;
        string proposedText;
        address proposer;
        address[] supporters;
        address[] rejecters;
        bool closed;
    }

    Element[] private elements;
    mapping(string => uint256) private elementIndex; // index + 1
    mapping(string => string[]) private children;
    mapping(string => uint64) private nextOrder;
    Proposal[] private proposals;
    mapping(string => uint256) private proposalIndex; // index + 1

    constructor(string memory title) {
        elements.push(Element(TITLE_ID, ElementType.Title, title, msg.sender, "", 0, false));
        elementIndex[TITLE_ID] = 1;
    }

    function approve_partner(address) external pure returns (bool) {
        return true;
    }

    function approve_guest(address) external pure returns (bool) {
        return true;
    }

    /// Adds an element under parent ("" for a section), and returns its id.
    function addElement(ElementType elementType, string calldata parent, string calldata text) external returns (string memory id) {
        require(bytes(text).length > 0, "an element needs a text");
        ElementType parentType = bytes(parent).length == 0 ? ElementType.Title : liveElement(parent).elementType;
        require(allowedUnder(parentType, elementType), "that kind of element does not go there");
        id = decimal(elements.length + 1);
        elements.push(Element(id, elementType, text, msg.sender, parent, ++nextOrder[parent], false));
        elementIndex[id] = elements.length;
        children[parent].push(id);
    }

    /// Edits an element: its owner, or anyone for the title.
    function editElement(string calldata id, string calldata text) external {
        Element storage e = liveElement(id);
        require(e.elementType == ElementType.Title || e.owner == msg.sender, "only its owner edits an element; propose an edit instead");
        require(bytes(text).length > 0, "an element needs a text");
        e.text = text;
    }

    /// Deletes an element, and everything under it: its owner, if nobody else owns anything under it.
    function deleteElement(string calldata id) external {
        Element storage e = liveElement(id);
        require(e.elementType != ElementType.Title, "the title stays");
        require(e.owner == msg.sender && !othersUnder(id, msg.sender),
            "you may only propose to delete this");
        remove(id);
    }

    function proposeEdit(string calldata targetId, string calldata text) external returns (string memory) {
        Element storage e = liveElement(targetId);
        require(e.elementType != ElementType.Title, "anyone edits the title directly");
        require(e.owner != msg.sender, "edit your own element directly");
        require(bytes(text).length > 0, "an element needs a text");
        return propose(targetId, ProposalKind.Edit, text);
    }

    function proposeDelete(string calldata targetId) external returns (string memory) {
        Element storage e = liveElement(targetId);
        require(e.elementType != ElementType.Title, "the title stays");
        require(e.owner != msg.sender || othersUnder(targetId, msg.sender), "delete your own element directly");
        return propose(targetId, ProposalKind.Delete, "");
    }

    /// Supports or rejects a proposal: MAJORITY supporters apply it, MAJORITY rejecters discard it.
    function voteProposal(string calldata proposalId, bool support) external {
        uint256 index = proposalIndex[proposalId];
        require(index != 0 && !proposals[index - 1].closed, "no such open proposal");
        Proposal storage p = proposals[index - 1];
        removeFrom(p.supporters, msg.sender);
        removeFrom(p.rejecters, msg.sender);
        if (support) p.supporters.push(msg.sender);
        else p.rejecters.push(msg.sender);
        if (p.supporters.length >= MAJORITY) enact(p);
        else if (p.rejecters.length >= MAJORITY) p.closed = true;
    }

    function getElements() external view returns (Element[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < elements.length; i++) if (!elements[i].deleted) n++;
        out = new Element[](n);
        uint256 k;
        for (uint256 i = 0; i < elements.length; i++) if (!elements[i].deleted) out[k++] = elements[i];
    }

    /// The open proposals.
    function getProposals() external view returns (Proposal[] memory out) {
        uint256 n;
        for (uint256 i = 0; i < proposals.length; i++) if (!proposals[i].closed) n++;
        out = new Proposal[](n);
        uint256 k;
        for (uint256 i = 0; i < proposals.length; i++) if (!proposals[i].closed) out[k++] = proposals[i];
    }

    function propose(string calldata targetId, ProposalKind kind, string memory text) private returns (string memory id) {
        id = decimal(proposals.length + 1);
        Proposal storage p = proposals.push();
        p.id = id;
        p.targetId = targetId;
        p.kind = kind;
        p.proposedText = text;
        p.proposer = msg.sender;
        p.supporters.push(msg.sender);
        proposalIndex[id] = proposals.length;
        if (p.supporters.length >= MAJORITY) enact(p);
    }

    function enact(Proposal storage p) private {
        p.closed = true;
        if (p.kind == ProposalKind.Edit) elements[elementIndex[p.targetId] - 1].text = p.proposedText;
        else remove(p.targetId);
    }

    /// Deletes an element and everything under it, and closes the proposals on them.
    function remove(string memory id) private {
        Element storage e = elements[elementIndex[id] - 1];
        if (e.deleted) return;
        e.deleted = true;
        for (uint256 i = 0; i < proposals.length; i++) {
            if (!proposals[i].closed && equal(proposals[i].targetId, id)) proposals[i].closed = true;
        }
        string[] storage kids = children[id];
        for (uint256 i = 0; i < kids.length; i++) remove(kids[i]);
    }

    function othersUnder(string memory id, address agent) private view returns (bool) {
        string[] storage kids = children[id];
        for (uint256 i = 0; i < kids.length; i++) {
            Element storage k = elements[elementIndex[kids[i]] - 1];
            if (k.deleted) continue;
            if (k.owner != agent || othersUnder(kids[i], agent)) return true;
        }
        return false;
    }

    function allowedUnder(ElementType parent, ElementType child) private pure returns (bool) {
        if (parent == ElementType.Title) return child == ElementType.Section;
        if (parent == ElementType.Section) return child == ElementType.Subsection || child == ElementType.Paragraph;
        if (parent == ElementType.Subsection) return child == ElementType.Paragraph;
        if (parent == ElementType.Paragraph) return child == ElementType.Sentence;
        return false;
    }

    function liveElement(string memory id) private view returns (Element storage e) {
        uint256 index = elementIndex[id];
        require(index != 0 && !elements[index - 1].deleted, "no such element");
        e = elements[index - 1];
    }

    function removeFrom(address[] storage list, address agent) private {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == agent) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }

    function equal(string memory a, string memory b) private pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function decimal(uint256 value) private pure returns (string memory) {
        uint256 digits;
        for (uint256 v = value; v != 0; v /= 10) digits++;
        bytes memory out = new bytes(digits);
        for (; value != 0; value /= 10) out[--digits] = bytes1(uint8(48 + value % 10));
        return string(out);
    }
}

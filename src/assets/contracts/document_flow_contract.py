class DocumentFlow:

    def __init__(self):
        self.elements = Storage('elements')
        self.proposals = Storage('proposals')
        self.votes = Storage('votes')

    # Document elements
    def add_element(self, element):
        self.elements.append(element)

    def get_elements(self):
        return [self.elements[key].get_dict() for key in self.elements]

    def set_elements(self, elements):
        pass  # TODO

    # Edit proposals
    def add_proposal(self, proposal):
        self.proposals.append(proposal)

    def get_proposals(self):
        return [self.proposals[key].get_dict() for key in self.proposals]

    def set_proposals(self, proposals):
        pass  # TODO

    # Votes on proposals
    def add_vote(self, vote):
        self.votes.append(vote)

    def get_votes(self):
        return [self.votes[key].get_dict() for key in self.votes]

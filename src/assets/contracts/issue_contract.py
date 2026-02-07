class Issue:

    def __init__(self):
        self.details = Storage('details')['details']
        self.comments = Storage('comments')
        self.proposals = Storage('proposals')
        self.votes = Storage('votes')

    def set_description(self, text):
        self.details['description'] = text

    def set_name(self, name):
        self.details['name'] = name

    def set_ai_feedback(self, feedback):
        self.details['ai_feedback'] = feedback

    def set_issue(self, name, text):
        self.set_name(name)
        self.set_description(text)

    def get_description(self):
        return self.details['description']

    def get_name(self):
        return self.details['name']

    def get_ai_feedback(self):
        return self.details['ai_feedback']

    def add_comment(self, comment):
        self.comments.append(comment)

    def get_comments(self):
        return [self.comments[key].get_dict() for key in self.comments]
    
    def add_proposal(self, proposal):
        self.proposals.append(proposal)

    def get_proposals(self):
        return [self.proposals[key].get_dict() for key in self.proposals]
    
    def add_vote(self, voter, vote):
        self.votes[voter] = vote

    def get_votes(self):
        return {key: self.votes[key].get_dict() for key in self.votes}

    def get_issue(self):
        return {
            'name': self.get_name(),
            'description': self.get_description(),
            'proposals': self.get_proposals(),
            'votes': self.get_votes()
        }
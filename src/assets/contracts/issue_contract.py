class Issue:

    def __init__(self):
        self.details = Storage('details')['details']
        self.comments = Storage('comments')
        self.proposals = Storage('proposals')
        self.votes = Storage('votes')
        self.approvals = Storage('approvals')

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
        proposal['author'] = master()
        proposal['createdAt'] = timestamp()
        self.proposals.append(proposal)

    def get_proposals(self):
        return [self.proposals[key].get_dict() for key in self.proposals]
    
    def add_vote(self, voter, vote):
        self.votes[voter] = vote

    def get_votes(self):
        return {key: self.votes[key].get_dict() for key in self.votes}

    def approve(self, proposal_id):
        voter = master()
        self.approvals[voter][proposal_id] = True

    def withdraw_approval(self, proposal_id):
        voter = master()
        if voter in self.approvals:
            voter_doc = self.approvals[voter].get_dict()
            if proposal_id in voter_doc:
                del self.approvals[voter][proposal_id]

    def get_approvals(self):
        result = {}
        for voter in self.approvals:
            result[voter] = self.approvals[voter].get_dict()
        return result

    def get_my_approvals(self):
        voter = master()
        if voter in self.approvals:
            return self.approvals[voter].get_dict()
        return {}

    def get_issue(self):
        return {
            'name': self.get_name(),
            'description': self.get_description(),
            'proposals': self.get_proposals(),
            'votes': self.get_votes()
        }
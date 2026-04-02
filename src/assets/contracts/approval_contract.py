class ApprovalVoting:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.proposal_count = Storage('proposal_count')
        self.approvals = Storage('approvals')
        if not self.proposal_count.exists():
            self.proposal_count['count'] = 0

    def add_proposal(self, text):
        count = self.proposal_count['count']
        proposal_id = 'p' + str(count)
        self.proposals[proposal_id] = {
            'id': proposal_id,
            'text': text,
            'author': master(),
            'timestamp': timestamp(),
        }
        self.proposal_count['count'] = count + 1
        return proposal_id

    def approve(self, proposal_id):
        voter = master()
        if voter not in self.approvals:
            self.approvals[voter] = {}
        self.approvals[voter][proposal_id] = True

    def withdraw_approval(self, proposal_id):
        voter = master()
        if voter in self.approvals:
            voter_approvals = self.approvals[voter].get_dict()
            if proposal_id in voter_approvals:
                del self.approvals[voter][proposal_id]

    def get_proposals(self):
        result = {}
        for pid in self.proposals:
            result[pid] = self.proposals[pid].get_dict()
        return result

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

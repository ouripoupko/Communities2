class ApprovalVoting:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.approvals = Storage('approvals')

    def _clean_proposal_text(self, text):
        if type(text) != str:
            return None
        cleaned = text.strip()
        if cleaned == '' or len(cleaned) > 500:
            return None
        return cleaned

    def _proposal_exists(self, proposal_id):
        return type(proposal_id) == str and proposal_id in self.proposals

    def add_proposal(self, text):
        cleaned_text = self._clean_proposal_text(text)
        if cleaned_text is None:
            return {'error': 'Proposal text must be between 1 and 500 characters'}

        ts = timestamp()
        proposal_id = 'p' + str(ts)
        self.proposals[proposal_id] = {
            'id': proposal_id,
            'text': cleaned_text,
            'author': master(),
            'timestamp': ts,
        }
        return proposal_id

    def approve(self, proposal_id):
        if not self._proposal_exists(proposal_id):
            return {'error': 'Unknown proposal'}

        voter = master()
        if voter not in self.approvals:
            self.approvals[voter] = {}
        self.approvals[voter][proposal_id] = True

    def withdraw_approval(self, proposal_id):
        if not self._proposal_exists(proposal_id):
            return {'error': 'Unknown proposal'}

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

    def get_approval_counts(self):
        result = {}
        for pid in self.proposals:
            result[pid] = 0

        for voter in self.approvals:
            voter_approvals = self.approvals[voter].get_dict()
            for proposal_id in voter_approvals:
                if proposal_id in result and voter_approvals[proposal_id]:
                    result[proposal_id] = result[proposal_id] + 1
        return result

    def get_my_approvals(self):
        voter = master()
        if voter in self.approvals:
            return self.approvals[voter].get_dict()
        return {}

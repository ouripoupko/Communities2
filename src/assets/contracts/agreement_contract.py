class Agreement:

    def __init__(self):
        self.details = Storage('agreement_details')['details']
        self.votes = Storage('votes')

    def set_rule(self, rule):
        self.details['rule'] = rule

    def set_protection(self, protection):
        self.details['protection'] = protection

    def set_consensus_status(self, status):
        self.details['consensusStatus'] = status

    def set_created_at(self, created_at):
        self.details['createdAt'] = created_at

    def get_rule(self):
        return self.details['rule']

    def get_protection(self):
        return self.details['protection']

    def get_consensus_status(self):
        return self.details['consensusStatus']

    def get_created_at(self):
        return self.details['createdAt']

    def add_vote(self, voter, vote):
        self.votes[voter] = vote

    def get_votes(self):
        return {key: self.votes[key].get_dict() for key in self.votes}

    def get_agreement(self):
        return {
            'rule': self.get_rule(),
            'protection': self.get_protection(),
            'consensusStatus': self.get_consensus_status(),
            'createdAt': self.get_created_at(),
            'votes': self.get_votes()
        }

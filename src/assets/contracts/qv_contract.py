class QuadraticVote:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.proposal_count = Storage('proposal_count')
        self.config = Storage('config')
        self.allocations = Storage('allocations')
        if not self.proposal_count.exists():
            self.proposal_count['count'] = 0
        if not self.config.exists():
            self.config['credits_per_voter'] = 100
            self.config['status'] = 'open'

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

    def set_credits(self, credits):
        self.config['credits_per_voter'] = credits

    def set_status(self, status):
        self.config['status'] = status

    def get_config(self):
        return self.config.get_dict()

    def get_proposals(self):
        result = {}
        for pid in self.proposals:
            result[pid] = self.proposals[pid].get_dict()
        return result

    def allocate(self, allocations):
        status = self.config['status']
        if status != 'open':
            return {'error': 'Voting is not open'}
        credits_per_voter = self.config['credits_per_voter']
        total = 0
        for pid in allocations:
            total = total + allocations[pid]
        if total > credits_per_voter:
            return {'error': 'Exceeds credit budget'}
        voter = master()
        self.allocations[voter] = allocations

    def get_allocations(self):
        result = {}
        for voter in self.allocations:
            result[voter] = self.allocations[voter].get_dict()
        return result

    def get_my_allocation(self):
        voter = master()
        if voter in self.allocations:
            return self.allocations[voter].get_dict()
        return {}

    def get_results(self):
        proposal_votes = {}
        for voter in self.allocations:
            voter_alloc = self.allocations[voter].get_dict()
            for pid in voter_alloc:
                credits = voter_alloc[pid]
                votes = credits ** 0.5
                if pid in proposal_votes:
                    proposal_votes[pid] = proposal_votes[pid] + votes
                else:
                    proposal_votes[pid] = votes
        return proposal_votes

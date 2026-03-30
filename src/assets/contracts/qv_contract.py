class QuadraticVote:

    def __init__(self):
        self.config = Storage('config')['config']
        self.allocations = Storage('allocations')
        if 'admin' not in self.config:
            self.config['admin'] = master()

    def set_credits(self, credits):
        if master() != self.config['admin']:
            return False
        self.config['credits_per_voter'] = credits
        return True

    def set_status(self, status):
        if master() != self.config['admin']:
            return False
        self.config['status'] = status
        if status == 'open':
            self.config['opened_at'] = timestamp()
        if status == 'closed':
            self.config['closed_at'] = timestamp()
        return True

    def set_proposals(self, proposal_ids):
        if master() != self.config['admin']:
            return False
        self.config['proposal_ids'] = proposal_ids
        return True

    def get_config(self):
        return self.config.get_dict()

    def allocate(self, allocations):
        if 'status' not in self.config or self.config['status'] != 'open':
            return False
        credits_per_voter = 100
        if 'credits_per_voter' in self.config:
            credits_per_voter = self.config['credits_per_voter']
        total_used = 0
        for proposal_id in allocations:
            credits = allocations[proposal_id]
            if credits < 0:
                return False
            total_used = total_used + credits
        if total_used > credits_per_voter:
            return False
        voter = master()
        for proposal_id in allocations:
            self.allocations[voter][proposal_id] = allocations[proposal_id]
        return True

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
        results = {}
        if 'proposal_ids' in self.config:
            for pid in self.config['proposal_ids']:
                results[pid] = 0.0
        for voter in self.allocations:
            voter_alloc = self.allocations[voter].get_dict()
            for pid in voter_alloc:
                credits = voter_alloc[pid]
                if credits > 0:
                    votes = credits ** 0.5
                    if pid in results:
                        results[pid] = results[pid] + votes
                    else:
                        results[pid] = votes
        return results

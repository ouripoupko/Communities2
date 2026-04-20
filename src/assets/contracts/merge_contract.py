class MergeProposals:
    def __init__(self):
        self.proposals = Storage('merge_proposals')
        self.votes = Storage('merge_votes')
        self.count = Storage('merge_count')
        if not self.count.exists():
            self.count['n'] = 0

    def propose_merge(self, source_initiative_id, rationale):
        n = self.count['n']
        mid = 'm' + str(n)
        self.proposals[mid] = {
            'id': mid,
            'sourceInitiativeId': source_initiative_id,
            'proposer': master(),
            'rationale': rationale,
            'status': 'pending',
            'createdAt': timestamp(),
            'decidedAt': 0,
            'decidedBy': '',
        }
        self.count['n'] = n + 1
        return mid

    def vote_on_merge(self, merge_id, vote):
        if merge_id not in self.proposals:
            return {'error': 'merge not found'}
        voter = master()
        if merge_id not in self.votes:
            self.votes[merge_id] = {}
        if vote != 'for' and vote != 'against':
            return {'error': 'invalid vote'}
        self.votes[merge_id][voter] = vote
        return vote

    def author_decide_merge(self, merge_id, decision):
        if merge_id not in self.proposals:
            return {'error': 'merge not found'}
        p = self.proposals[merge_id].get_dict()
        if p['status'] != 'pending':
            return {'error': 'already decided'}
        if decision != 'accept' and decision != 'reject':
            return {'error': 'invalid decision'}
        if decision == 'accept':
            p['status'] = 'accepted'
        else:
            p['status'] = 'rejected'
        p['decidedAt'] = timestamp()
        p['decidedBy'] = master()
        self.proposals[merge_id] = p
        return p['status']

    def get_merge_proposals(self):
        result = []
        n = self.count['n']
        i = 0
        while i < n:
            mid = 'm' + str(i)
            if mid in self.proposals:
                p = self.proposals[mid].get_dict()
                for_count = 0
                against_count = 0
                if mid in self.votes:
                    vote_data = self.votes[mid].get_dict()
                    for voter in vote_data:
                        if vote_data[voter] == 'for':
                            for_count = for_count + 1
                        else:
                            against_count = against_count + 1
                p['forCount'] = for_count
                p['againstCount'] = against_count
                result.append(p)
            i = i + 1
        return result

    def get_my_vote(self, merge_id):
        if merge_id not in self.votes:
            return ''
        voter = master()
        vote_data = self.votes[merge_id].get_dict()
        if voter in vote_data:
            return vote_data[voter]
        return ''

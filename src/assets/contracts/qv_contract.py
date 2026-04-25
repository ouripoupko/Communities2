class QuadraticVote:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.config = Storage('config')
        self.allocations = Storage('allocations')

    def _ensure_owner(self):
        if 'owner' not in self.config:
            self.config['owner'] = master()

    def _require_owner(self):
        if 'owner' in self.config and self.config['owner'] != master():
            return {'error': 'Only the contract owner can update voting settings'}
        return None

    def _get_credits_per_voter(self):
        if 'credits_per_voter' in self.config:
            return self.config['credits_per_voter']
        return 100

    def _get_status(self):
        if 'status' in self.config:
            return self.config['status']
        return 'open'

    def _clean_proposal_text(self, text):
        if type(text) != str:
            return None
        cleaned = text.strip()
        if cleaned == '' or len(cleaned) > 500:
            return None
        return cleaned

    def _is_non_negative_int(self, value):
        return type(value) == int and value >= 0

    def _normalize_allocations(self, allocations):
        if type(allocations) != dict:
            return {'error': 'Allocations must be an object'}

        cleaned = {}
        total = 0
        for pid in allocations:
            if pid not in self.proposals:
                return {'error': 'Unknown proposal'}

            credits = allocations[pid]
            if not self._is_non_negative_int(credits):
                return {'error': 'Credits must be whole numbers'}

            if credits == 0:
                continue

            cleaned[pid] = credits
            total = total + credits

        return {'allocations': cleaned, 'total': total}

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

    def set_credits(self, credits):
        owner_error = self._require_owner()
        if owner_error is not None:
            return owner_error

        if type(credits) != int or credits <= 0:
            return {'error': 'Credits per voter must be a positive whole number'}

        self._ensure_owner()
        self.config['credits_per_voter'] = credits

    def set_status(self, status):
        owner_error = self._require_owner()
        if owner_error is not None:
            return owner_error

        if status != 'open' and status != 'closed':
            return {'error': 'Invalid voting status'}

        self._ensure_owner()
        self.config['status'] = status

    def get_config(self):
        return {
            'credits_per_voter': self._get_credits_per_voter(),
            'status': self._get_status(),
        }

    def get_proposals(self):
        result = {}
        for pid in self.proposals:
            result[pid] = self.proposals[pid].get_dict()
        return result

    def allocate(self, allocations):
        status = self._get_status()
        if status != 'open':
            return {'error': 'Voting is not open'}

        normalized = self._normalize_allocations(allocations)
        if 'error' in normalized:
            return normalized

        credits_per_voter = self._get_credits_per_voter()
        total = normalized['total']
        if total > credits_per_voter:
            return {'error': 'Exceeds credit budget'}

        voter = master()
        self.allocations[voter] = normalized['allocations']

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

    def get_summary(self):
        results = self.get_results()
        winner_id = None
        winner_credits = 0
        for pid in results:
            if results[pid] > winner_credits:
                winner_credits = results[pid]
                winner_id = pid
        winner_text = ''
        if winner_id is not None and winner_id in self.proposals:
            winner_text = self.proposals[winner_id].get_dict()['text']
        return {
            'voters': len(self.allocations),
            'winner_id': winner_id,
            'winner_text': winner_text,
            'winner_credits': winner_credits,
        }

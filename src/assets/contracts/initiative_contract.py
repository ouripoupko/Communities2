class Initiative:

    def __init__(self):
        self.db = Storage('initiative_data')

    def _get_list(self, key):
        if key not in self.db:
            return []
        doc = self.db[key].get_dict()
        items = doc.get('items', [])
        return list(items) if isinstance(items, list) else []

    def _set_list(self, key, items):
        self.db[key] = {'items': items}

    def _append_to_list(self, key, item):
        items = self._get_list(key)
        items.append(item)
        self._set_list(key, items)

    # Details
    def set_details(self, details):
        self.db['details'] = details

    def get_details(self):
        if 'details' not in self.db:
            return {}
        return self.db['details'].get_dict()

    # Contributions
    def add_contribution(self, contribution):
        self._append_to_list('contributions', contribution)

    def get_contributions(self):
        return self._get_list('contributions')

    # Segments
    def add_segment(self, segment):
        self._append_to_list('segments', segment)

    def get_segments(self):
        return self._get_list('segments')

    def set_segments(self, segments):
        self._set_list('segments', segments)

    # Edit proposals
    def add_edit_proposal(self, proposal):
        self._append_to_list('edit_proposals', proposal)

    def get_edit_proposals(self):
        return self._get_list('edit_proposals')

    def set_edit_proposals(self, proposals):
        self._set_list('edit_proposals', proposals)

    # Proposal votes
    def add_proposal_vote(self, vote):
        self._append_to_list('proposal_votes', vote)

    def get_proposal_votes(self):
        return self._get_list('proposal_votes')

    # Members
    def set_members(self, members):
        self._set_list('members', members)

    def get_members(self):
        return self._get_list('members')

    # Gaps
    def add_gap(self, gap):
        self._append_to_list('gaps', gap)

    def get_gaps(self):
        return self._get_list('gaps')

    # Steps
    def add_step(self, step):
        self._append_to_list('steps', step)

    def get_steps(self):
        return self._get_list('steps')

    # Convenience getters (no building, just retrieval)
    def get_initiative(self):
        return {'details': self.get_details(), 'contributions': self.get_contributions()}

    def get_roadmap(self):
        return {
            'segments': self.get_segments(),
            'edit_proposals': self.get_edit_proposals(),
            'proposal_votes': self.get_proposal_votes(),
            'members': self.get_members(),
        }

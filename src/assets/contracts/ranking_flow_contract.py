class RankingFlow:

    def __init__(self):
        self.db = Storage('ranking_flow')

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

    # Proposals
    def add_proposal(self, proposal):
        self._append_to_list('proposals', proposal)

    def get_proposals(self):
        return self._get_list('proposals')

    # Rankings (one per participant)
    def set_my_ranking(self, order):
        # Keyed by caller identity so each participant has exactly one ranking
        self.db['ranking_' + master()] = {'participantId': master(), 'order': order}

    def get_rankings(self):
        prefix = 'ranking_'
        return [self.db[key].get_dict() for key in self.db if key.startswith(prefix)]

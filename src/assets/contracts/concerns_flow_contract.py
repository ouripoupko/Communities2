class ConcernsFlow:

    def __init__(self):
        self.db = Storage('concerns_flow')

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

    # Concerns
    def add_concern(self, concern):
        self._append_to_list('concerns', concern)

    def get_concerns(self):
        return self._get_list('concerns')

    def set_concerns(self, concerns):
        self._set_list('concerns', concerns)

    # Votes (participant × concern × vote type)
    def add_vote(self, vote):
        self._append_to_list('votes', vote)

    def get_votes(self):
        return self._get_list('votes')

    def set_votes(self, votes):
        self._set_list('votes', votes)

class ScoringFlow:

    def __init__(self):
        self.db = Storage('scoring_flow')

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

    # Options
    def add_option(self, option):
        self._append_to_list('options', option)

    def get_options(self):
        return self._get_list('options')

    # Scores — one record per participant, keyed by identity
    def set_my_scores(self, scores):
        # scores is a dict of {optionId: value}
        self.db['scores_' + master()] = {'participantId': master(), 'scores': scores}

    def get_all_scores(self):
        prefix = 'scores_'
        return [self.db[key].get_dict() for key in self.db if key.startswith(prefix)]

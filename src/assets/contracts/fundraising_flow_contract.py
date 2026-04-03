class FundraisingFlow:

    def __init__(self):
        self.db = Storage('fundraising_flow')

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

    # Fund configuration (name, description, goal)
    def set_config(self, config):
        self.db['config'] = config

    def get_config(self):
        if 'config' not in self.db:
            return {}
        return self.db['config'].get_dict()

    # Contributions
    def add_contribution(self, contribution):
        self._append_to_list('contributions', contribution)

    def get_contributions(self):
        return self._get_list('contributions')

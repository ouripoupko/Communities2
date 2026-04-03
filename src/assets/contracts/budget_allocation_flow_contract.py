class BudgetAllocationFlow:

    def __init__(self):
        self.db = Storage('budget_allocation_flow')

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

    # Linked fundraising fund reference {id, server, agent}
    def set_fund_link(self, fund_link):
        self.db['fund_link'] = fund_link

    def get_fund_link(self):
        if 'fund_link' not in self.db:
            return {}
        return self.db['fund_link'].get_dict()

    # Budget items
    def add_item(self, item):
        self._append_to_list('items', item)

    def get_items(self):
        return self._get_list('items')

    def set_items(self, items):
        self._set_list('items', items)

    # Allocations — one record per participant, keyed by identity
    def set_my_allocation(self, allocation):
        # allocation is a dict of {itemId: points}
        self.db['alloc_' + master()] = {'participantId': master(), 'allocation': allocation}

    def get_all_allocations(self):
        prefix = 'alloc_'
        return [self.db[key].get_dict() for key in self.db if key.startswith(prefix)]

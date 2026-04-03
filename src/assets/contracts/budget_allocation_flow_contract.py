class BudgetAllocationFlow:

    def __init__(self):
        self.fund_link = Storage('fund_link')
        self.items = Storage('items')
        self.allocations = Storage('allocations')

    # Linked fundraising fund reference
    def set_fund_link(self, fund_link):
        self.fund_link['data'] = fund_link

    def get_fund_link(self):
        if 'data' not in self.fund_link:
            return {}
        return self.fund_link['data'].get_dict()

    # Budget items
    def add_item(self, item):
        self.items.append(item)

    def get_items(self):
        return [self.items[key].get_dict() for key in self.items]

    def set_items(self, items):
        pass  # TODO

    # Allocations — one record per participant
    def set_my_allocation(self, allocation):
        self.allocations[master()] = {'participantId': master(), 'allocation': allocation}

    def get_all_allocations(self):
        return [self.allocations[key].get_dict() for key in self.allocations]

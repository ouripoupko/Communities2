class FundraisingFlow:

    def __init__(self):
        self.config = Storage('config')
        self.contributions = Storage('contributions')

    # Fund configuration
    def set_config(self, config):
        self.config['data'] = config

    def get_config(self):
        if 'data' not in self.config:
            return {}
        return self.config['data'].get_dict()

    # Contributions
    def add_contribution(self, contribution):
        self.contributions.append(contribution)

    def get_contributions(self):
        return [self.contributions[key].get_dict() for key in self.contributions]

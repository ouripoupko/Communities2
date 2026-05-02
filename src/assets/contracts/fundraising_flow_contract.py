class FundraisingFlow:

    def __init__(self):
        self.parameters = Storage('parameters')
        self.config = Storage('config')
        self.contributions = Storage('contributions')

    def set_community_and_fund(self, community_server, community_agent, community_id, fund_account_name):
        if 'community_id' not in self.parameters:
            self.parameters['community_server'] = community_server
            self.parameters['community_agent'] = community_agent
            self.parameters['community_id'] = community_id
            self.parameters['fund_account_name'] = fund_account_name

    def get_community(self):
        return {
            'server': self.parameters['community_server'],
            'agent': self.parameters['community_agent'],
            'id': self.parameters['community_id'],
        }

    def get_fund_account_name(self):
        return self.parameters['fund_account_name']

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

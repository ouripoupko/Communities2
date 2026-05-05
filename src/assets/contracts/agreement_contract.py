class Agreement:

    def __init__(self, community_server=None, community_agent=None, community_id=None):
        self.db = Storage('agreement')
        self.parameters = self.db['parameters']
        if 'community_id' not in self.parameters:
            self.parameters['community_server'] = community_server
            self.parameters['community_agent'] = community_agent
            self.parameters['community_id'] = community_id
        self.flows = Storage('flows')

    def get_community(self):
        return {
            'server': self.parameters['community_server'],
            'agent': self.parameters['community_agent'],
            'id': self.parameters['community_id'],
        }

    # Flows
    def add_flow(self, flow):
        self.flows.append(flow)

    def get_flows(self):
        return [self.flows[key].get_dict() for key in self.flows]

class Wish:

    def __init__(self):
        self.flows = Storage('flows')

    # Flows
    def add_flow(self, flow):
        self.flows.append(flow)

    def get_flows(self):
        return [self.flows[key].get_dict() for key in self.flows]

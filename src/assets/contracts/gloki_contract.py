class Profile:

    def __init__(self):
        self.profile = Storage('profile')['profile']
        self.network = Storage('network')
        self.issues = Storage('issues')

    # profile
    def get_profile(self):
        return self.profile.get_dict()

    def set_value(self, key, value):
        self.profile[key] = value

    def set_values(self, items):
        for key, value in items.items():
            self.profile[key] = value

    def get_value(self, key):
        return self.profile[key]

    # network
    def add_contacts(self, contacts):
        me = master()
        for contact in contacts:
            if contact['agent'] not in self.network and contact['agent'] != me:
                self.network[contact['agent']] = {'server': contact['server'], 'agent': contact['agent'], 'contract': contact['contract']}

    def get_contacts(self):
        return [self.network[agent].get_dict() for agent in self.network]
    
    # issues
    def add_issue(self, contract):
        self.issues[contract] = {}

    def get_issues(self):
        return [key for key in self.issues]
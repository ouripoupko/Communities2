class Community:

    def __init__(self):
        self.db = Storage('community')
        self.members = self.db['members']
        self.nominates = self.db['nominates']
        self.approvals = self.db['approvals']
        self.properties = self.db['properties']
        self.sub_contracts = self.db['sub_contracts']

    def set_instructions(self, instructions):
        self.properties['instructions'] = instructions
    
    def set_sub_contract(self, name, invite):
        self.sub_contracts[name] = invite

    def get_sub_contract(self, name):
        return self.sub_contracts[name]

    def get_all(self):
        return {'tasks': self.get_tasks(),
                'members': self.get_members(),
                'nominates': self.get_nominates(),
                'properties': self.get_properties()}
    
    def get_tasks(self):
        reply = {}
        requester = master()
        if requester in self.nominates:
            for task in self.nominates[requester]:
                reply[task] = requester in self.approvals and task in self.approvals[requester]
        else:
            for task in self.nominates:
                if requester in self.nominates[task]:
                    reply[task] = requester in self.approvals and task in self.approvals[requester]
        return reply
    
    def get_members(self):
        return {key: self.members[key] for key in self.members}

    def is_member(self, agent):
        return agent in self.members

    def get_nominates(self):
        return [key for key in self.nominates]
    
    def set_property(self, key, value):
        self.properties[key] = value
    
    def get_properties(self):
        return self.properties.get_dict()

    def request_join(self):
        requester = master()
        if requester in self.members or requester in self.nominates:
            return False
        if len(self.members) == 0:
            self.members[requester] = []
        elif len(self.members) < 5:
            if len(self.nominates) == 0:
                self.nominates[requester] = [member for member in self.members]
            else:
                return False
        else:
            edges = [(key, value) for key in self.members for value in self.members[key]]
            for nominate in self.nominates:
                others = self.nominates[nominate]
                edges.remove((others[0], others[1]))
                edges.remove((others[1], others[0]))
                edges.remove((others[2], others[3]))
                edges.remove((others[3], others[2]))
            if len(edges) < 4:
                return False
            [r, s] = random(timestamp(), None, len(edges))
            first = edges[r]
            toRemove = {(first[0], value) for value in self.members[first[0]]} |\
                       {(value, first[0]) for value in self.members[first[0]]} |\
                       {(first[1], value) for value in self.members[first[1]]} |\
                       {(value, first[1]) for value in self.members[first[1]]}
            edges = [value for value in edges if value not in toRemove]
            [r, s] = random(None, s, len(edges))
            second = edges[r]
            self.nominates[requester] = [first[0], first[1], second[0], second[1]]
        return True

    def approve(self, approved):
        approver = master()
        (nominate, member) = (approved, approver) if approved in self.nominates else (approver, approved) if approver in self.nominates else (None, None)
        if nominate and member in self.nominates[nominate]:
            self.approvals[approver] = (self.approvals[approver] or []) + [approved]
            all_approved = True
            if nominate in self.approvals:
                for member in self.nominates[nominate]:
                    if not member in self.approvals[nominate] or not member in self.approvals or not nominate in self.approvals[member]:
                        all_approved = False
            else:
                all_approved = False
            if all_approved:
                order = self.nominates[nominate]
                click = len(self.members) < 5
                for i in range(len(order)):
                    previous = self.members[order[i]]
                    if not click:
                        previous.remove(order[i+1-2*(i % 2)])
                    previous.append(nominate)
                    self.members[order[i]] = previous
                self.members[nominate] = order
                del self.nominates[nominate]

    def disapprove(self, disapproved):
        approver = master()
        nominate = disapproved if disapproved in self.nominates else approver if approver in self.nominates else None
        if nominate:
            members = self.nominates[nominate]
            del self.nominates[nominate]
            if nominate in self.approvals:
                del self.approvals[nominate]
            for member in members:
                if member in self.approvals:
                    approvals = self.approvals[member]
                    if nominate in approvals:
                        approvals.remove(nominate)
                        if approvals:
                            self.approvals[member] = approvals
                        else:
                            del self.approvals[member]

class RolesFlow:

    def __init__(self):
        self.roles = Storage('roles')

    def add_role(self, role):
        self.roles[role['id']] = role

    def get_roles(self):
        return [self.roles[key].get_dict() for key in self.roles]

    def join_role(self, role_id, assignees):
        self.roles[role_id]['assignees'] = assignees

    def leave_role(self, role_id, assignee):
        pass  # TODO

    def delete_role(self, role_id):
        pass  # TODO

    def set_role_purpose(self, role_id, text):
        self.roles[role_id]['purpose'] = text

    def add_role_item(self, role_id, section, item):
        pass  # TODO

    def set_role_section(self, role_id, section, items):
        self.roles[role_id][section] = items

    def set_role_votes(self, role_id, votes):
        self.roles[role_id]['votes'] = votes

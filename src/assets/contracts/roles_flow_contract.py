class RolesFlow:

    def __init__(self):
        self.roles = Storage('roles')

    # Roles
    def add_role(self, role):
        self.roles.append(role)

    def get_roles(self):
        return [self.roles[key].get_dict() for key in self.roles]

    def set_roles(self, roles):
        pass  # TODO

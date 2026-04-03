class RolesFlow:

    def __init__(self):
        self.db = Storage('roles_flow')

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

    # Roles
    def add_role(self, role):
        self._append_to_list('roles', role)

    def get_roles(self):
        return self._get_list('roles')

    def set_roles(self, roles):
        self._set_list('roles', roles)

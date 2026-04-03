class TaskBoardFlow:

    def __init__(self):
        self.db = Storage('task_board_flow')

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

    # Tasks
    def add_task(self, task):
        self._append_to_list('tasks', task)

    def get_tasks(self):
        return self._get_list('tasks')

    def set_tasks(self, tasks):
        self._set_list('tasks', tasks)

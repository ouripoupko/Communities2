class TaskBoardFlow:

    def __init__(self):
        self.tasks = Storage('tasks')

    def add_task(self, task):
        self.tasks[task['id']] = task

    def get_tasks(self):
        return [self.tasks[key].get_dict() for key in self.tasks]

    def set_task_owner(self, task_id, owner_id):
        self.tasks[task_id]['ownerId'] = owner_id

    def set_task_status(self, task_id, status):
        self.tasks[task_id]['status'] = status

    def delete_task(self, task_id):
        pass  # TODO

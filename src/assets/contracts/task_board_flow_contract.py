class TaskBoardFlow:

    def __init__(self):
        self.tasks = Storage('tasks')

    # Tasks
    def add_task(self, task):
        self.tasks.append(task)

    def get_tasks(self):
        return [self.tasks[key].get_dict() for key in self.tasks]

    def set_tasks(self, tasks):
        pass  # TODO

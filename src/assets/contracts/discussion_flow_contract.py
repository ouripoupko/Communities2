class DiscussionFlow:

    def __init__(self):
        self.comments = Storage('comments')

    # Comments (recursive tree stored flat with parentId)
    def add_comment(self, comment):
        self.comments.append(comment)

    def get_comments(self):
        return [self.comments[key].get_dict() for key in self.comments]

    def set_comments(self, comments):
        pass  # TODO

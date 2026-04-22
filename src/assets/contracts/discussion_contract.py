class Discussion:
    def __init__(self):
        self.comments = Storage('comments')

    def add_comment(self, text, parent_id, category):
        ts = timestamp()
        comment_id = 'c' + str(ts)
        self.comments[comment_id] = {
            'id': comment_id,
            'author': master(),
            'text': text,
            'parentId': parent_id,
            'timestamp': ts,
            'category': category,
            'deleted': False,
        }
        return comment_id

    def delete_comment(self, comment_id):
        if comment_id in self.comments:
            c = self.comments[comment_id].get_dict()
            if c['author'] == master() and not c['deleted']:
                c['deleted'] = True
                self.comments[comment_id] = c

    def get_comments(self):
        result = {}
        for cid in self.comments:
            result[cid] = self.comments[cid].get_dict()
        return result

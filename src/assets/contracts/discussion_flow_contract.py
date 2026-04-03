class DiscussionFlow:

    def __init__(self):
        self.db = Storage('discussion_flow')

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

    # Comments (recursive tree stored flat with parentId)
    def add_comment(self, comment):
        self._append_to_list('comments', comment)

    def get_comments(self):
        return self._get_list('comments')

    def set_comments(self, comments):
        self._set_list('comments', comments)

class QAFlow:

    def __init__(self):
        self.db = Storage('qa_flow')

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

    # Questions
    def add_question(self, question):
        self._append_to_list('questions', question)

    def get_questions(self):
        return self._get_list('questions')

    def set_questions(self, questions):
        self._set_list('questions', questions)

    # Answers
    def add_answer(self, answer):
        self._append_to_list('answers', answer)

    def get_answers(self):
        return self._get_list('answers')

    def set_answers(self, answers):
        self._set_list('answers', answers)

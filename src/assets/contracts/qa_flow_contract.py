class QAFlow:

    def __init__(self):
        self.questions = Storage('questions')
        self.answers = Storage('answers')

    # Questions — keyed by question id
    def add_question(self, question):
        self.questions[question['id']] = question

    def get_questions(self):
        return [self.questions[key].get_dict() for key in self.questions]

    def delete_question(self, question_id):
        if question_id in self.questions:
            del self.questions[question_id]
        to_delete = [key for key in self.answers
                     if self.answers[key]['questionId'] == question_id]
        for key in to_delete:
            del self.answers[key]

    # Answers — keyed by answer id
    def add_answer(self, answer):
        self.answers[answer['id']] = answer

    def get_answers(self):
        return [self.answers[key].get_dict() for key in self.answers]

    def set_answer(self, answer):
        self.answers[answer['id']] = answer

    def delete_answer(self, answer_id):
        if answer_id in self.answers:
            del self.answers[answer_id]

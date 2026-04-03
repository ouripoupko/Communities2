class QAFlow:

    def __init__(self):
        self.questions = Storage('questions')
        self.answers = Storage('answers')

    # Questions
    def add_question(self, question):
        self.questions.append(question)

    def get_questions(self):
        return [self.questions[key].get_dict() for key in self.questions]

    def set_questions(self, questions):
        pass  # TODO

    # Answers
    def add_answer(self, answer):
        self.answers.append(answer)

    def get_answers(self):
        return [self.answers[key].get_dict() for key in self.answers]

    def set_answers(self, answers):
        pass  # TODO

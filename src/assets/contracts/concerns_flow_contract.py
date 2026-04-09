class ConcernsFlow:

    def __init__(self):
        self.concerns = Storage('concerns')

    # Concerns
    def add_concern(self, concern):
        self.concerns[concern['id']] = concern

    def get_concerns(self):
        return [self.concerns[key].get_dict() for key in self.concerns]

    def set_concern_votes(self, concern_id, votes):
        self.concerns[concern_id]['votes'] = votes

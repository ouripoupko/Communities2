class ConcernsFlow:

    def __init__(self):
        self.concerns = Storage('concerns')
        self.votes = Storage('votes')

    # Concerns
    def add_concern(self, concern):
        self.concerns.append(concern)

    def get_concerns(self):
        return [self.concerns[key].get_dict() for key in self.concerns]

    def set_concerns(self, concerns):
        pass  # TODO

    # Votes
    def add_vote(self, vote):
        self.votes.append(vote)

    def get_votes(self):
        return [self.votes[key].get_dict() for key in self.votes]

    def set_votes(self, votes):
        pass  # TODO

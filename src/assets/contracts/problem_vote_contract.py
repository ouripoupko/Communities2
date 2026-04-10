class ProblemVote:
    def __init__(self):
        self.votes = Storage('votes')

    def upvote(self):
        voter = master()
        self.votes[voter] = 'up'

    def downvote(self):
        voter = master()
        self.votes[voter] = 'down'

    def remove_vote(self):
        voter = master()
        if voter in self.votes:
            del self.votes[voter]

    def get_votes(self):
        result = {}
        for voter in self.votes:
            result[voter] = self.votes[voter]
        return result

    def get_my_vote(self):
        voter = master()
        if voter in self.votes:
            return self.votes[voter]
        return None

    def get_tally(self):
        up = 0
        down = 0
        for voter in self.votes:
            if self.votes[voter] == 'up':
                up = up + 1
            else:
                down = down + 1
        return {'up': up, 'down': down, 'total': up + down}

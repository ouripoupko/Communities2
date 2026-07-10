class ScoringFlow:

    def __init__(self):
        self.options = Storage('options')
        self.scores = Storage('scores')

    # Options
    def add_option(self, option):
        self.options.append(option)

    def get_options(self):
        return [self.options[key].get_dict() for key in self.options]

    # Scores — one record per participant
    def set_my_scores(self, participant_id, scores):
        self.scores[participant_id] = {'participantId': participant_id, 'scores': scores}

    def get_all_scores(self):
        return [self.scores[key].get_dict() for key in self.scores]

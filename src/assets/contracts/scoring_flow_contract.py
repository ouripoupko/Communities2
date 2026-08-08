class ScoringFlow:

    def __init__(self):
        self.db = Storage('scoring_flow')
        self.config = self.db['config']
        self.options = Storage('options')
        self.scores = Storage('scores')

    # Topic (what participants are proposing options for and scoring)
    def set_config(self, config):
        self.config['data'] = config

    def get_config(self):
        return self.config['data'] or {}

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

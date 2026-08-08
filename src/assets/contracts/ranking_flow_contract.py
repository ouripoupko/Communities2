class RankingFlow:

    def __init__(self):
        self.db = Storage('ranking_flow')
        self.config = self.db['config']
        self.proposals = Storage('proposals')
        self.rankings = Storage('rankings')

    # Topic (what participants are proposing options for and ranking)
    def set_config(self, config):
        self.config['data'] = config

    def get_config(self):
        return self.config['data'] or {}

    # Proposals
    def add_proposal(self, proposal, author):
        proposal = dict(proposal)
        proposal['author'] = author
        self.proposals.append(proposal)

    def get_proposals(self):
        return [self.proposals[key].get_dict() for key in self.proposals]

    # Rankings (one per participant)
    def set_my_ranking(self, participant_id, order):
        self.rankings[participant_id] = {'participantId': participant_id, 'order': order}

    def get_rankings(self):
        return [self.rankings[key].get_dict() for key in self.rankings]

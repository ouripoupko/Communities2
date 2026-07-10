class RankingFlow:

    def __init__(self):
        self.proposals = Storage('proposals')
        self.rankings = Storage('rankings')

    # Proposals
    def add_proposal(self, proposal):
        self.proposals.append(proposal)

    def get_proposals(self):
        return [self.proposals[key].get_dict() for key in self.proposals]

    # Rankings (one per participant)
    def set_my_ranking(self, participant_id, order):
        self.rankings[participant_id] = {'participantId': participant_id, 'order': order}

    def get_rankings(self):
        return [self.rankings[key].get_dict() for key in self.rankings]

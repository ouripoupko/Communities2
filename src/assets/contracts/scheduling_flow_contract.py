class SchedulingFlow:

    def __init__(self):
        self.db = Storage('scheduling_flow')
        self.config = self.db['config']
        self.selections = Storage('selections')

    # Range config (title, description, organizerId, startDate, endDate, dailyStart, dailyEnd, slotMinutes)
    def set_config(self, config):
        self.config['data'] = config

    def get_config(self):
        if 'data' not in self.config:
            return {}
        return self.config['data'].get_dict()

    # Participant selections — one record per participant, full slot-index list
    def set_my_selection(self, slots):
        self.selections[master()] = {'participantId': master(), 'slots': slots}

    def get_all_selections(self):
        return [self.selections[key].get_dict() for key in self.selections]

class SchedulingFlow:

    def __init__(self):
        self.config = Storage('config')
        self.slots = Storage('slots')
        self.availability = Storage('availability')
        self.confirmed = Storage('confirmed')

    # Event config
    def set_config(self, config):
        self.config['data'] = config

    def get_config(self):
        if 'data' not in self.config:
            return {}
        return self.config['data'].get_dict()

    # Time slots
    def add_slot(self, slot):
        self.slots.append(slot)

    def get_slots(self):
        return [self.slots[key].get_dict() for key in self.slots]

    def set_slots(self, slots):
        pass  # TODO

    # Availability — one record per participant
    def set_my_availability(self, responses):
        self.availability[master()] = {'participantId': master(), 'responses': responses}

    def get_all_availability(self):
        return [self.availability[key].get_dict() for key in self.availability]

    # Confirmed slot
    def set_confirmed_slot(self, slot_id):
        self.confirmed['data'] = {'slot_id': slot_id}

    def get_confirmed_slot(self):
        if 'data' not in self.confirmed:
            return {}
        return self.confirmed['data'].get_dict()

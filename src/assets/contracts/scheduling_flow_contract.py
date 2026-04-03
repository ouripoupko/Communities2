class SchedulingFlow:

    def __init__(self):
        self.db = Storage('scheduling_flow')

    def _get_list(self, key):
        if key not in self.db:
            return []
        doc = self.db[key].get_dict()
        items = doc.get('items', [])
        return list(items) if isinstance(items, list) else []

    def _set_list(self, key, items):
        self.db[key] = {'items': items}

    def _append_to_list(self, key, item):
        items = self._get_list(key)
        items.append(item)
        self._set_list(key, items)

    # Event config (title, description, organizer)
    def set_config(self, config):
        self.db['config'] = config

    def get_config(self):
        if 'config' not in self.db:
            return {}
        return self.db['config'].get_dict()

    # Time slots
    def add_slot(self, slot):
        self._append_to_list('slots', slot)

    def get_slots(self):
        return self._get_list('slots')

    def set_slots(self, slots):
        self._set_list('slots', slots)

    # Availability — one record per participant, keyed by identity
    def set_my_availability(self, responses):
        # responses is a dict of {slotId: availability}
        self.db['avail_' + master()] = {'participantId': master(), 'responses': responses}

    def get_all_availability(self):
        prefix = 'avail_'
        return [self.db[key].get_dict() for key in self.db if key.startswith(prefix)]

    # Confirmed slot
    def set_confirmed_slot(self, slot_id):
        self.db['confirmed_slot'] = {'slot_id': slot_id}

    def get_confirmed_slot(self):
        if 'confirmed_slot' not in self.db:
            return {}
        return self.db['confirmed_slot'].get_dict()

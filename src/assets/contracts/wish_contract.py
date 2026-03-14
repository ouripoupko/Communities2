class Wish:

    def __init__(self):
        self.db = Storage('wish_details')
        self.details = self.db['details']

    def _get_list(self, key):
        if key not in self.db:
            return []
        doc = self.db[key].get_dict()
        items = doc.get('items', [])
        return list(items) if isinstance(items, list) else []

    def _set_list(self, key, items):
        self.db[key] = {'items': items}

    def add_related_wish(self, related_wish_id):
        ids = self._get_list('relatedWishes')
        if related_wish_id not in ids:
            ids = list(ids) + [related_wish_id]
            self._set_list('relatedWishes', ids)

    def get_related_wishes(self):
        return self._get_list('relatedWishes')

    def add_offer(self, description):
        olist = self._get_list('offers')
        oid = 'offer_' + str(timestamp())
        offer = {
            'id': oid,
            'author': master(),
            'description': description,
            'createdAt': timestamp(),
            'acceptedBy': None,
            'acceptedAt': None,
            'compensated': False
        }
        olist.append(offer)
        self._set_list('offers', olist)

    def get_offers(self):
        return self._get_list('offers')

    def accept_offer(self, offer_id):
        olist = self._get_list('offers')
        if not olist:
            return
        for i, obj in enumerate(olist):
            obj = dict(obj) if isinstance(obj, dict) else {}
            if obj.get('id') == offer_id and obj.get('acceptedBy') is None:
                obj['acceptedBy'] = master()
                obj['acceptedAt'] = timestamp()
                olist[i] = obj
                self._set_list('offers', olist)
                return

    def compensate_offer(self, offer_id):
        olist = self._get_list('offers')
        if not olist:
            return
        for i, obj in enumerate(olist):
            obj = dict(obj) if isinstance(obj, dict) else {}
            if obj.get('id') == offer_id:
                obj['compensated'] = True
                olist[i] = obj
                self._set_list('offers', olist)
                return

    def add_seed(self, description):
        slist = self._get_list('seeds')
        sid = 'seed_' + str(timestamp())
        seed = {
            'id': sid,
            'author': master(),
            'description': description,
            'createdAt': timestamp(),
            'initiativeId': None,
            'hostServer': None,
            'hostAgent': None
        }
        slist.append(seed)
        self._set_list('seeds', slist)

    def get_seeds(self):
        return self._get_list('seeds')

    def launch_seed(self, seed_id, initiative_id, host_server, host_agent):
        slist = self._get_list('seeds')
        if not slist:
            return
        for i, obj in enumerate(slist):
            obj = dict(obj) if isinstance(obj, dict) else {}
            if obj.get('id') == seed_id and obj.get('initiativeId') is None:
                obj['initiativeId'] = initiative_id
                obj['hostServer'] = host_server
                obj['hostAgent'] = host_agent
                slist[i] = obj
                self._set_list('seeds', slist)
                return

    def set_title(self, title):
        self.details['title'] = title

    def set_dream_need(self, dream_need):
        self.details['dreamNeed'] = dream_need

    def set_created_at(self, created_at):
        self.details['createdAt'] = created_at

    def get_title(self):
        return self.details['title']

    def get_dream_need(self):
        return self.details['dreamNeed']

    def get_created_at(self):
        return self.details['createdAt']

    def get_wish(self):
        return {
            'title': self.get_title(),
            'dreamNeed': self.get_dream_need(),
            'createdAt': self.get_created_at()
        }

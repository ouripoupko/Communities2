class DocumentFlow:

    def __init__(self):
        self.db = Storage('document_flow')

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

    # Document elements (title, sections, paragraphs, sentences)
    def add_element(self, element):
        self._append_to_list('elements', element)

    def get_elements(self):
        return self._get_list('elements')

    def set_elements(self, elements):
        self._set_list('elements', elements)

    # Edit proposals
    def add_proposal(self, proposal):
        self._append_to_list('proposals', proposal)

    def get_proposals(self):
        return self._get_list('proposals')

    def set_proposals(self, proposals):
        self._set_list('proposals', proposals)

    # Votes on proposals
    def add_vote(self, vote):
        self._append_to_list('votes', vote)

    def get_votes(self):
        return self._get_list('votes')

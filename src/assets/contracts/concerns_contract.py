class ConcernResolution:
    def __init__(self):
        self.concerns = Storage('concerns')
        self.concern_count = Storage('concern_count')
        self.resolutions = Storage('resolutions')
        self.resolution_counts = Storage('resolution_counts')
        if not self.concern_count.exists():
            self.concern_count['count'] = 0

    def add_concern(self, text, severity):
        count = self.concern_count['count']
        concern_id = 'c' + str(count)
        self.concerns[concern_id] = {
            'id': concern_id,
            'text': text,
            'severity': severity,
            'author': master(),
            'timestamp': timestamp(),
            'resolved': False,
        }
        self.concern_count['count'] = count + 1
        return concern_id

    def add_resolution(self, concern_id, text):
        if concern_id not in self.resolution_counts:
            self.resolution_counts[concern_id] = 0
        idx = self.resolution_counts[concern_id]
        if concern_id not in self.resolutions:
            self.resolutions[concern_id] = {}
        self.resolutions[concern_id][str(idx)] = {
            'text': text,
            'author': master(),
            'timestamp': timestamp(),
        }
        self.resolution_counts[concern_id] = idx + 1

    def resolve_concern(self, concern_id):
        if concern_id in self.concerns:
            concern = self.concerns[concern_id].get_dict()
            if concern['author'] == master():
                concern['resolved'] = True
                self.concerns[concern_id] = concern

    def get_concerns(self):
        result = {}
        for cid in self.concerns:
            result[cid] = self.concerns[cid].get_dict()
        return result

    def get_resolutions(self, concern_id):
        result = []
        if concern_id in self.resolution_counts:
            count = self.resolution_counts[concern_id]
            idx = 0
            while idx < count:
                if concern_id in self.resolutions:
                    res_data = self.resolutions[concern_id]
                    if str(idx) in res_data:
                        result.append(res_data[str(idx)].get_dict())
                idx = idx + 1
        return result

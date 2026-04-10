class Modifications:
    def __init__(self):
        self.suggestions = Storage('suggestions')
        self.suggestion_count = Storage('suggestion_count')
        self.votes = Storage('votes')
        self.config = Storage('config')
        if not self.suggestion_count.exists():
            self.suggestion_count['count'] = 0

    def set_author(self, author):
        if 'author' not in self.config:
            self.config['author'] = author

    def suggest_modification(self, field, suggested_text):
        count = self.suggestion_count['count']
        suggestion_id = 's' + str(count)
        self.suggestions[suggestion_id] = {
            'id': suggestion_id,
            'field': field,
            'suggested_text': suggested_text,
            'author': master(),
            'timestamp': timestamp(),
            'status': 'open',
        }
        self.suggestion_count['count'] = count + 1
        return suggestion_id

    def vote_on_suggestion(self, suggestion_id, vote):
        if suggestion_id not in self.suggestions:
            return {'error': 'Suggestion not found'}
        s = self.suggestions[suggestion_id].get_dict()
        if s['status'] != 'open':
            return {'error': 'Suggestion is no longer open'}
        voter = master()
        if suggestion_id not in self.votes:
            self.votes[suggestion_id] = {}
        self.votes[suggestion_id][voter] = vote

    def author_decide(self, suggestion_id, decision):
        caller = master()
        if 'author' not in self.config:
            return {'error': 'Original author not configured'}
        if self.config['author'] != caller:
            return {'error': 'Only the original author can decide'}
        if suggestion_id not in self.suggestions:
            return {'error': 'Suggestion not found'}
        s = self.suggestions[suggestion_id].get_dict()
        if s['status'] != 'open':
            return {'error': 'Already decided'}
        if decision == 'accept':
            s['status'] = 'accepted'
        else:
            s['status'] = 'rejected'
        self.suggestions[suggestion_id] = s

    def get_suggestions(self):
        result = []
        count = self.suggestion_count['count']
        for i in range(count):
            sid = 's' + str(i)
            if sid in self.suggestions:
                s = self.suggestions[sid].get_dict()
                approve_count = 0
                reject_count = 0
                if sid in self.votes:
                    vote_data = self.votes[sid].get_dict()
                    for v in vote_data:
                        if vote_data[v] == 'approve':
                            approve_count = approve_count + 1
                        else:
                            reject_count = reject_count + 1
                s['votes_for'] = approve_count
                s['votes_against'] = reject_count
                result.append(s)
        return result

    def get_my_votes(self):
        voter = master()
        result = {}
        count = self.suggestion_count['count']
        for i in range(count):
            sid = 's' + str(i)
            if sid in self.votes:
                vote_data = self.votes[sid].get_dict()
                if voter in vote_data:
                    result[sid] = vote_data[voter]
        return result

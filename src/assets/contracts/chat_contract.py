class Chat:
    def __init__(self):
        self.topics = Storage('topics')
        self.messages = Storage('messages')

    def create_topic(self, title):
        ts = timestamp()
        topic_id = 't' + str(ts)
        self.topics[topic_id] = {
            'id': topic_id,
            'title': title,
            'author': master(),
            'createdAt': ts,
            'lastActivity': ts,
            'messageCount': 0,
        }
        return topic_id

    def add_message(self, topic_id, text):
        ts = timestamp()
        message_id = 'm' + str(ts)
        self.messages[message_id] = {
            'id': message_id,
            'topicId': topic_id,
            'author': master(),
            'text': text,
            'timestamp': ts,
        }
        if topic_id in self.topics:
            topic = self.topics[topic_id].get_dict()
            topic['lastActivity'] = ts
            topic['messageCount'] = topic['messageCount'] + 1
            self.topics[topic_id] = topic
        return message_id

    def get_topics(self):
        result = {}
        for tid in self.topics:
            result[tid] = self.topics[tid].get_dict()
        return result

    def get_messages(self, topic_id):
        result = {}
        for mid in self.messages:
            m = self.messages[mid].get_dict()
            if m['topicId'] == topic_id:
                result[mid] = m
        return result

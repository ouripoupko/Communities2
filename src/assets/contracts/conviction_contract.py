class ConvictionStaking:
    def __init__(self):
        self.stakes = Storage('stakes')
        self.meta = Storage('meta')

    def stake(self, amount, duration, country):
        voter = master()
        ts = timestamp()
        if voter in self.stakes:
            existing = self.stakes[voter]
            new_amount = existing['amount'] + amount
            self.stakes[voter] = {
                'amount': new_amount,
                'duration': duration,
                'timestamp': ts,
                'country': country,
                'voter': voter
            }
        else:
            self.stakes[voter] = {
                'amount': amount,
                'duration': duration,
                'timestamp': ts,
                'country': country,
                'voter': voter
            }

    def get_my_stake(self):
        voter = master()
        if voter in self.stakes:
            return self.stakes[voter]
        return None

    def get_stakes(self):
        result = {}
        for voter in self.stakes:
            result[voter] = self.stakes[voter]
        return result

    def get_total_conviction(self):
        multipliers = {'1w': 1, '1m': 2, '3m': 4, '6m': 7, '1y': 12}
        total = 0
        count = 0
        for voter in self.stakes:
            s = self.stakes[voter]
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            total = total + (s['amount'] * mult)
            count = count + 1
        return {'total': total, 'count': count}

    def get_conviction_by_country(self):
        multipliers = {'1w': 1, '1m': 2, '3m': 4, '6m': 7, '1y': 12}
        result = {}
        for voter in self.stakes:
            s = self.stakes[voter]
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            weight = s['amount'] * mult
            country = s['country'] if 'country' in s else 'OTHER'
            if country in result:
                result[country] = result[country] + weight
            else:
                result[country] = weight
        return result

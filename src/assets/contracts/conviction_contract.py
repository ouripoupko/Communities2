class ConvictionStaking:
    def __init__(self):
        self.stakes = Storage('stakes')
        self.meta = Storage('meta')

    def _allowed_durations(self):
        return {'1w': 1, '1m': 2, '3m': 4, '6m': 7, '1y': 12}

    def _is_positive_number(self, value):
        if type(value) != int and type(value) != float:
            return False
        if value != value:
            return False
        return value > 0

    def _normalize_country(self, country):
        if type(country) != str:
            return 'OTHER'
        normalized = country.strip().upper()
        if normalized == '' or len(normalized) > 16:
            return 'OTHER'
        return normalized

    def stake(self, amount, duration, country):
        if not self._is_positive_number(amount):
            return {'error': 'Stake amount must be positive'}

        multipliers = self._allowed_durations()
        if duration not in multipliers:
            return {'error': 'Invalid duration'}

        voter = master()
        ts = timestamp()
        normalized_country = self._normalize_country(country)

        if voter in self.stakes:
            existing = self.stakes[voter].get_dict()
            new_amount = existing['amount'] + amount
            self.stakes[voter] = {
                'amount': new_amount,
                'duration': duration,
                'timestamp': ts,
                'country': normalized_country,
                'voter': voter
            }
        else:
            self.stakes[voter] = {
                'amount': amount,
                'duration': duration,
                'timestamp': ts,
                'country': normalized_country,
                'voter': voter
            }

    def get_my_stake(self):
        voter = master()
        if voter in self.stakes:
            return self.stakes[voter].get_dict()
        return None

    def get_stakes(self):
        result = {}
        for voter in self.stakes:
            result[voter] = self.stakes[voter].get_dict()
        return result

    def get_total_conviction(self):
        multipliers = self._allowed_durations()
        total = 0
        count = 0
        for voter in self.stakes:
            s = self.stakes[voter].get_dict()
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            total = total + (s['amount'] * mult)
            count = count + 1
        return {'total': total, 'count': count}

    def get_conviction_by_country(self):
        multipliers = self._allowed_durations()
        result = {}
        for voter in self.stakes:
            s = self.stakes[voter].get_dict()
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            weight = s['amount'] * mult
            country = s['country'] if 'country' in s else 'OTHER'
            if country in result:
                result[country] = result[country] + weight
            else:
                result[country] = weight
        return result

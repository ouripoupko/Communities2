class Initiative:

    def __init__(self):
        self.db = Storage('initiative_data')

    def _allowed_stage_keys(self):
        return [
            'problemVoteContractId',
            'discussionModsContractId',
            'proposalsContractId',
            'proposalsModsContractId',
            'voteContractId',
            'convictionContractId',
            'mergeContractId',
        ]

    def _stage_order(self):
        return ['problem', 'discussion', 'proposals', 'vote', 'mandate']

    def _stage_index(self, stage):
        order = self._stage_order()
        idx = 0
        while idx < len(order):
            if order[idx] == stage:
                return idx
            idx = idx + 1
        return -1

    def _protected_details(self, details):
        current = self.get_details()
        next_details = {}

        if isinstance(details, dict):
            for key in details:
                next_details[key] = details[key]

        if 'author' in current:
            next_details['author'] = current['author']
        elif 'author' not in next_details:
            next_details['author'] = master()

        for key in self._allowed_stage_keys():
            if key in current:
                next_details[key] = current[key]

        return next_details

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

    # Details
    def set_details(self, details):
        self.db['details'] = self._protected_details(details)

    def get_details(self):
        if 'details' not in self.db:
            return {}
        return self.db['details'].get_dict()

    def register_stage_contract(self, stage_key, contract_id, address, agent):
        allowed_keys = self._allowed_stage_keys()
        if stage_key not in allowed_keys:
            return {'error': 'Invalid stage key'}

        details = self.get_details()
        if stage_key in details:
            return details[stage_key]

        details[stage_key] = {
            'contractId': contract_id,
            'address': address,
            'agent': agent,
        }
        self.db['details'] = self._protected_details(details)
        return details[stage_key]

    def get_stage_contract(self, stage_key):
        if stage_key not in self._allowed_stage_keys():
            return None

        details = self.get_details()
        if stage_key in details:
            return details[stage_key]
        return None

    # Pipeline stage
    def set_stage(self, stage):
        next_index = self._stage_index(stage)
        if next_index == -1:
            return {'error': 'Invalid stage'}

        current_stage = self.get_stage()
        current_index = self._stage_index(current_stage)
        if current_index == -1:
            current_index = 0

        if next_index != current_index + 1:
            return {'error': 'Stages can only advance one step at a time'}

        self.db['stage'] = stage
        return stage

    def get_stage(self):
        if 'stage' not in self.db:
            return 'problem'
        return self.db['stage']

    # Contributions
    def add_contribution(self, contribution):
        self._append_to_list('contributions', contribution)

    def get_contributions(self):
        return self._get_list('contributions')

    # Segments
    def add_segment(self, segment):
        self._append_to_list('segments', segment)

    def get_segments(self):
        return self._get_list('segments')

    def set_segments(self, segments):
        self._set_list('segments', segments)

    # Edit proposals
    def add_edit_proposal(self, proposal):
        self._append_to_list('edit_proposals', proposal)

    def get_edit_proposals(self):
        return self._get_list('edit_proposals')

    def set_edit_proposals(self, proposals):
        self._set_list('edit_proposals', proposals)

    # Proposal votes
    def add_proposal_vote(self, vote):
        self._append_to_list('proposal_votes', vote)

    def get_proposal_votes(self):
        return self._get_list('proposal_votes')

    # Members
    def set_members(self, members):
        self._set_list('members', members)

    def get_members(self):
        return self._get_list('members')

    # Gaps
    def add_gap(self, gap):
        self._append_to_list('gaps', gap)

    def get_gaps(self):
        return self._get_list('gaps')

    # Steps
    def add_step(self, step):
        self._append_to_list('steps', step)

    def get_steps(self):
        return self._get_list('steps')

    # Convenience getters (no building, just retrieval)
    def get_initiative(self):
        return {'details': self.get_details(), 'contributions': self.get_contributions()}

    def get_roadmap(self):
        return {
            'segments': self.get_segments(),
            'edit_proposals': self.get_edit_proposals(),
            'proposal_votes': self.get_proposal_votes(),
            'members': self.get_members(),
        }

    # Roles (earned)
    def add_co_author(self, public_key):
        details = self.get_details()
        if 'coAuthors' in details and isinstance(details['coAuthors'], list):
            co_authors = list(details['coAuthors'])
        else:
            co_authors = []
        if public_key in co_authors:
            return co_authors
        if 'author' in details and details['author'] == public_key:
            return co_authors
        co_authors.append(public_key)
        details['coAuthors'] = co_authors
        self.db['details'] = self._protected_details(details)
        return co_authors

    def endorse_expert(self, public_key):
        caller = master()
        if caller == public_key:
            return {'error': 'cannot endorse self'}

        details = self.get_details()
        if 'endorsements' in details and isinstance(details['endorsements'], dict):
            endorsements = dict(details['endorsements'])
        else:
            endorsements = {}

        if public_key in endorsements and isinstance(endorsements[public_key], list):
            endorsers = list(endorsements[public_key])
        else:
            endorsers = []

        if caller in endorsers:
            return endorsers
        endorsers.append(caller)
        endorsements[public_key] = endorsers
        details['endorsements'] = endorsements

        threshold = 3
        if len(endorsers) >= threshold:
            if 'experts' in details and isinstance(details['experts'], list):
                experts = list(details['experts'])
            else:
                experts = []
            if public_key not in experts:
                experts.append(public_key)
                details['experts'] = experts

        self.db['details'] = self._protected_details(details)
        return endorsers

    def unendorse_expert(self, public_key):
        caller = master()
        details = self.get_details()
        if 'endorsements' not in details or not isinstance(details['endorsements'], dict):
            return []
        endorsements = dict(details['endorsements'])
        if public_key not in endorsements or not isinstance(endorsements[public_key], list):
            return []
        endorsers = list(endorsements[public_key])
        if caller not in endorsers:
            return endorsers
        endorsers.remove(caller)
        endorsements[public_key] = endorsers
        details['endorsements'] = endorsements

        threshold = 3
        if len(endorsers) < threshold:
            if 'experts' in details and isinstance(details['experts'], list):
                experts = list(details['experts'])
                if public_key in experts:
                    experts.remove(public_key)
                    details['experts'] = experts

        self.db['details'] = self._protected_details(details)
        return endorsers

    # mark_merged_into: NO caller gate in v1 — the cross-contract acceptance flow
    # invokes this from the target-side author, who is usually not on the source.
    # Gate is idempotency only: once set, cannot be changed. Harden in v2 by
    # proving the call is backed by an accepted merge proposal.
    def mark_merged_into(self, target_initiative_id):
        if not isinstance(target_initiative_id, str) or len(target_initiative_id) == 0:
            return {'error': 'invalid target'}
        details = self.get_details()
        if 'status' in details and details['status'] == 'merged_into':
            existing = details['mergedInto'] if 'mergedInto' in details else ''
            return existing
        details['status'] = 'merged_into'
        details['mergedInto'] = target_initiative_id
        self.db['details'] = self._protected_details(details)
        return target_initiative_id

    def get_roles(self):
        details = self.get_details()
        author = details['author'] if 'author' in details else ''
        co_authors = details['coAuthors'] if 'coAuthors' in details and isinstance(details['coAuthors'], list) else []
        experts = details['experts'] if 'experts' in details and isinstance(details['experts'], list) else []
        endorsements = details['endorsements'] if 'endorsements' in details and isinstance(details['endorsements'], dict) else {}
        status = details['status'] if 'status' in details else 'active'
        merged_into = details['mergedInto'] if 'mergedInto' in details else None

        endorsement_counts = {}
        for key in endorsements:
            if isinstance(endorsements[key], list):
                endorsement_counts[key] = len(endorsements[key])
            else:
                endorsement_counts[key] = 0

        return {
            'author': author,
            'coAuthors': co_authors,
            'experts': experts,
            'endorsementCounts': endorsement_counts,
            'status': status,
            'mergedInto': merged_into,
        }

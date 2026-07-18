class Community:

    def __init__(self):
        self.db = Storage('community')
        self.members = self.db['members']
        self.nominates = self.db['nominates']
        self.approvals = self.db['approvals']
        self.properties = self.db['properties']
        self.collaborations = Storage('collaborations')
        self.accounts = Storage('accounts')
        self.policies = Storage('policies')
        self.pending_payments = Storage('pending_payments')

    # ==================================================================
    # COMMUNITY (properties of the community itself)
    # ==================================================================

    def set_property(self, key, value):
        self.properties[key] = value

    def get_properties(self):
        return self.properties.get_dict()

    # ==================================================================
    # MEMBERS (joining, web-of-trust nomination, approval)
    # ==================================================================

    def get_all_people(self):
        return {'tasks': self.get_tasks(),
                'members': self.get_members(),
                'nominates': self.get_nominates()}

    def get_tasks(self):
        reply = {}
        requester = master()
        if requester in self.nominates:
            for task in self.nominates[requester]:
                reply[task] = requester in self.approvals and task in self.approvals[requester]
        else:
            for task in self.nominates:
                if requester in self.nominates[task]:
                    reply[task] = requester in self.approvals and task in self.approvals[requester]
        return reply

    def get_members(self):
        return {key: self.members[key] for key in self.members}
        # return partners()

    def get_nominates(self):
        return [key for key in self.nominates]

    def become_member(self, key, value):
        self.members[key] = value
        initial_balance = self.properties['initial_balance']
        if initial_balance is None:
            initial_balance = 1000
        self.accounts[key] = {'balanceOf': initial_balance}

    def join_open(self):
        requester = master()
        if requester in self.members:
            return False
        self.become_member(requester, [])
        return True

    def request_join(self):
        requester = master()
        if requester in self.members or requester in self.nominates:
            return False
        if self.properties['open_join']:
            return self.join_open()
        if len(self.members) == 0:
            self.become_member(requester, [])
        elif len(self.members) < 5:
            if len(self.nominates) == 0:
                self.nominates[requester] = [member for member in self.members]
            else:
                return False
        else:
            edges = [(key, value) for key in self.members for value in self.members[key]]
            for nominate in self.nominates:
                others = self.nominates[nominate]
                edges.remove((others[0], others[1]))
                edges.remove((others[1], others[0]))
                edges.remove((others[2], others[3]))
                edges.remove((others[3], others[2]))
            if len(edges) < 4:
                return False
            [r, s] = random(timestamp(), None, len(edges))
            first = edges[r]
            toRemove = {(first[0], value) for value in self.members[first[0]]} |\
                       {(value, first[0]) for value in self.members[first[0]]} |\
                       {(first[1], value) for value in self.members[first[1]]} |\
                       {(value, first[1]) for value in self.members[first[1]]}
            edges = [value for value in edges if value not in toRemove]
            [r, s] = random(None, s, len(edges))
            second = edges[r]
            self.nominates[requester] = [first[0], first[1], second[0], second[1]]
        return True

    def approve(self, approved):
        approver = master()
        (nominate, member) = (approved, approver) if approved in self.nominates else (approver, approved) if approver in self.nominates else (None, None)
        if nominate and member in self.nominates[nominate]:
            self.approvals[approver] = (self.approvals[approver] or []) + [approved]
            all_approved = True
            if nominate in self.approvals:
                for member in self.nominates[nominate]:
                    if not member in self.approvals[nominate] or not member in self.approvals or not nominate in self.approvals[member]:
                        all_approved = False
            else:
                all_approved = False
            if all_approved:
                order = self.nominates[nominate]
                click = len(self.members) < 5
                for i in range(len(order)):
                    previous = self.members[order[i]]
                    if not click:
                        previous.remove(order[i+1-2*(i % 2)])
                    previous.append(nominate)
                    self.members[order[i]] = previous
                self.become_member(nominate, order)
                del self.nominates[nominate]

    def disapprove(self, disapproved):
        approver = master()
        nominate = disapproved if disapproved in self.nominates else approver if approver in self.nominates else None
        if nominate:
            members = self.nominates[nominate]
            del self.nominates[nominate]
            if nominate in self.approvals:
                del self.approvals[nominate]
            for member in members:
                if member in self.approvals:
                    approvals = self.approvals[member]
                    if nominate in approvals:
                        approvals.remove(nominate)
                        if approvals:
                            self.approvals[member] = approvals
                        else:
                            del self.approvals[member]

    # ==================================================================
    # COLLABORATIONS (initiatives, wishes, agreements)
    # ==================================================================

    def add_collaboration(self, collaboration):
        self.collaborations.append(collaboration)

    def get_collaborations(self):
        return [self.collaborations[key].get_dict() for key in self.collaborations]

    # ==================================================================
    # CURRENCY (accounts, balances, monetary policies, payments)
    # ==================================================================

    def create_fund_account(self, name, owner):
        if name in self.accounts:
            return False
        self.accounts[name] = {
            'balanceOf': 0,
            'type': 'fund',
            'owner': owner
        }
        return True

    def transfer(self, to, value):
        sender = master()
        if sender not in self.accounts or to not in self.accounts:
            return False
        sender_account = self.accounts[sender].get_dict()
        if sender_account.get('type') == 'fund':
            return False
        to_account = self.accounts[to].get_dict()
        if sender_account['balanceOf'] >= value:
            sender_account['balanceOf'] -= value
            to_account['balanceOf'] += value
            self.accounts[sender] = sender_account
            self.accounts[to] = to_account
            return True
        return False

    def get_balance(self):
        account = master()
        return self._project_balances().get(account, 0)

    def get_account_details(self):
        # Read-only: never writes. Every account's balance is projected live
        # via _project_balances (every pending policy tick applied on the
        # fly, including for fund accounts reached through an `everyAccount`
        # policy) - there's no more type-specific balance math.
        projected = self._project_balances()
        result = {}
        for account in self.accounts:
            data = self.accounts[account].get_dict()
            account_type = data.get('type', 'personal')
            balance = projected.get(account, data.get('balanceOf', 0))
            entry = {
                'type': account_type,
                'balance': balance,
            }
            if account_type in ('public', 'fund'):
                entry['name'] = data.get('name', account)
            if account_type == 'public':
                entry['signers'] = data.get('signers', [])
                entry['threshold'] = data.get('threshold', 1)
            result[account] = entry
        return result

    # ------------------------------------------------------------------
    # CURRENCY / Public accounts (signers/threshold)
    # ------------------------------------------------------------------

    def create_public_account(self, name):
        if name in self.accounts:
            return False
        self.accounts[name] = {
            'balanceOf': 0,
            'type': 'public',
            'name': name,
            'signers': [master()],
            'threshold': 1,
        }
        return name

    def add_signer(self, account, signer):
        caller = master()
        if account not in self.accounts:
            return False
        data = self.accounts[account].get_dict()
        if data.get('type') != 'public' or caller not in data.get('signers', []):
            return False
        signers = data.get('signers', [])
        if signer not in signers:
            signers.append(signer)
            data['signers'] = signers
            self.accounts[account] = data
        return True

    def remove_signer(self, account, signer):
        caller = master()
        if account not in self.accounts:
            return False
        data = self.accounts[account].get_dict()
        if data.get('type') != 'public' or caller not in data.get('signers', []):
            return False
        signers = data.get('signers', [])
        if signer in signers and len(signers) > 1:
            signers.remove(signer)
            data['signers'] = signers
            self.accounts[account] = data
            return True
        return False

    # ------------------------------------------------------------------
    # CURRENCY / Policies (generic monetary-policy primitive)
    # ------------------------------------------------------------------

    def create_policy(self, policy):
        policy['creator'] = master()
        policy['createdAt'] = timestamp()
        policy['lastAppliedTime'] = timestamp()
        policy['elapsedTicks'] = 0
        self.policies[policy['id']] = policy
        return policy['id']

    def set_policy_preference(self, policy_id, value):
        # Settle at the old rate before this member's new value shifts the
        # median, so past ticks are accounted at the rate that was actually
        # in effect during them.
        self._settle_all_policies()
        # The actual per-member value is captured by the runtime via the
        # `parameters` side-channel on this same call (key `p_<policy_id>`);
        # this method just validates the call is meaningful.
        if policy_id not in self.policies:
            return False
        policy = self.policies[policy_id].get_dict()
        return policy.get('rateType') == 'community-governed'

    def set_commitment_rate(self, policy_id, value):
        self._settle_all_policies()
        if policy_id not in self.policies:
            return False
        policy = self.policies[policy_id].get_dict()
        if policy.get('rateType') != 'self-set' or policy.get('creator') != master():
            return False
        policy['selfRate'] = value
        self.policies[policy_id] = policy
        return True

    def _is_involved_signer(self, policy, caller):
        for side in (policy.get('source'), policy.get('destination')):
            if side and side.get('kind') == 'account':
                account = side.get('account')
                if account in self.accounts:
                    data = self.accounts[account].get_dict()
                    if caller in data.get('signers', []):
                        return True
        return False

    def set_policy_details(self, policy_id, name, description):
        if policy_id not in self.policies:
            return False
        policy = self.policies[policy_id].get_dict()
        caller = master()
        if caller != policy.get('creator') and not self._is_involved_signer(policy, caller):
            return False
        policy['name'] = name
        policy['description'] = description
        self.policies[policy_id] = policy
        return True

    def delete_policy(self, policy_id):
        self._settle_all_policies()
        if policy_id not in self.policies:
            return False
        policy = self.policies[policy_id].get_dict()
        if master() != policy.get('creator'):
            return False
        if policy.get('rateType') == 'community-governed':
            if (parameters('p_' + policy_id) or 0) != 0:
                return False
        del self.policies[policy_id]
        return True

    def get_policies(self):
        # Read-only: never writes. Each policy's elapsedTicks/lastAppliedTime/
        # currentRate are projected live via _projected_policy.
        return [self._projected_policy(pid) for pid in self.policies]

    # ------------------------------------------------------------------
    # CURRENCY / Policy settlement (generic per-tick accrual engine)
    # ------------------------------------------------------------------

    def _resolve(self, side):
        kind = side.get('kind')
        if kind == 'account':
            account = side.get('account')
            return [account] if account in self.accounts else []
        if kind == 'everyPersonal':
            return [member for member in self.members]
        if kind == 'everyAccount':
            return [account for account in self.accounts]
        return []  # 'void'

    def _credit(self, account, amount):
        if account not in self.accounts or amount <= 0:
            return
        data = self.accounts[account].get_dict()
        data['balanceOf'] = data.get('balanceOf', 0) + amount
        self.accounts[account] = data

    def _debit(self, account, amount):
        if account not in self.accounts or amount <= 0:
            return
        data = self.accounts[account].get_dict()
        data['balanceOf'] = data.get('balanceOf', 0) - amount
        self.accounts[account] = data

    def _settle_policy(self, policy_id, balances=None):
        """Applies every elapsed tick of policy_id since it was last applied.

        With balances=None (used only by write methods), this is a real
        settlement: it debits/credits self.accounts for real and persists
        the policy's new lastAppliedTime/elapsedTicks.

        With balances given a dict of {account: balanceOf}, nothing is
        written anywhere - the same math is applied to that dict in place
        instead, so callers can compute the live, up-to-date numbers on a
        read without touching storage. Both modes share this one method so
        the two can't drift out of sync with each other.
        """
        if policy_id not in self.policies:
            return
        policy = self.policies[policy_id].get_dict()
        ticks = round(elapsed_time(policy['lastAppliedTime'], timestamp()) / 600 - 0.5)
        if ticks <= 0:
            return
        if policy.get('rateType') == 'self-set':
            rate = policy.get('selfRate') or 0
        else:
            rate = parameters('p_' + policy_id) or 0
        sources = self._resolve(policy['source'])
        destinations = self._resolve(policy['destination'])
        is_mint = policy['source'].get('kind') == 'void'
        is_burn = policy['destination'].get('kind') == 'void'

        def balance_of(account):
            if balances is not None:
                return balances.get(account, 0)
            return self.accounts[account].get_dict().get('balanceOf', 0) if account in self.accounts else 0

        def credit(account, amount):
            if amount <= 0:
                return
            if balances is not None:
                if account in balances:
                    balances[account] = balances[account] + amount
            else:
                self._credit(account, amount)

        def debit(account, amount):
            if amount <= 0:
                return
            if balances is not None:
                if account in balances:
                    balances[account] = balances[account] - amount
            else:
                self._debit(account, amount)

        def amount_for(account, rate, mode):
            balance = balance_of(account)
            if mode == 'percent':
                return balance * (rate / 100)
            return min(rate, balance)

        for i in range(ticks):
            if is_mint:
                if policy['mode'] == 'units' and rate:
                    for dest in destinations:
                        credit(dest, rate)
                # percent-of-void is undefined (no source balance) - no-op
            elif is_burn:
                for src in sources:
                    debit(src, amount_for(src, rate, policy['mode']))
            else:
                for src in sources:
                    amount = amount_for(src, rate, policy['mode'])
                    if amount > 0:
                        debit(src, amount)
                        for dest in destinations:
                            credit(dest, amount)

        if balances is None:
            policy['lastAppliedTime'] = timestamp()
            policy['elapsedTicks'] = policy.get('elapsedTicks', 0) + ticks
            self.policies[policy_id] = policy

    def _settle_all_policies(self):
        for policy_id in self.policies:
            self._settle_policy(policy_id)
        self.properties['last_balances_update'] = timestamp()

    def _project_balances(self):
        """Live account balances as of right now, without writing anything:
        starts from each account's persisted balanceOf and applies every
        policy's pending ticks (since its own lastAppliedTime) on top, in a
        local dict. Used by read methods so they always reflect the current
        state even if no write has settled things in a while."""
        balances = {
            account: self.accounts[account].get_dict().get('balanceOf', 0)
            for account in self.accounts
        }
        for policy_id in self.policies:
            self._settle_policy(policy_id, balances)
        return balances

    def _projected_policy(self, policy_id):
        """A policy's dict with live-projected elapsedTicks/lastAppliedTime
        and currentRate, without writing anything."""
        policy = self.policies[policy_id].get_dict()
        ticks = round(elapsed_time(policy['lastAppliedTime'], timestamp()) / 600 - 0.5)
        if ticks > 0:
            policy['elapsedTicks'] = policy.get('elapsedTicks', 0) + ticks
            policy['lastAppliedTime'] = timestamp()
        if policy.get('rateType') == 'self-set':
            policy['currentRate'] = policy.get('selfRate') or 0
        else:
            policy['currentRate'] = parameters('p_' + policy_id) or 0
        return policy

    # ------------------------------------------------------------------
    # CURRENCY / Wallet payments (threshold-aware; public account threshold
    # isn't yet editable client-side, so send_payment always resolves
    # immediately today. approve_payment - the second-signer approval for
    # a pending N-of-M payment - was removed as dead code; reintroduce it
    # once thresholds above 1 are actually reachable.)
    # ------------------------------------------------------------------

    def _move_funds(self, frm, to, value):
        if frm not in self.accounts or to not in self.accounts:
            return False
        frm_data = self.accounts[frm].get_dict()
        if frm_data.get('balanceOf', 0) >= value:
            self._debit(frm, value)
            self._credit(to, value)
            return True
        return False

    def _maybe_execute_payment(self, payment_id):
        payment = self.pending_payments[payment_id].get_dict()
        if payment.get('status') == 'pending' and len(payment.get('approvals', [])) >= payment.get('threshold', 1):
            ok = self._move_funds(payment['fromAccount'], payment['to'], payment['value'])
            payment['status'] = 'completed' if ok else 'failed'
            self.pending_payments[payment_id] = payment
        payment['id'] = payment_id
        return payment

    def send_payment(self, from_account, to, value):
        self._settle_all_policies()
        if from_account not in self.accounts or to not in self.accounts:
            return {'status': 'failed', 'reason': 'invalid_account'}
        acct = self.accounts[from_account].get_dict()
        caller = master()
        if acct.get('type') == 'public':
            if caller not in acct.get('signers', []):
                return {'status': 'failed', 'reason': 'not_a_signer'}
            payment_id = self.pending_payments.append({
                'fromAccount': from_account,
                'to': to,
                'value': value,
                'approvals': [caller],
                'threshold': acct.get('threshold', 1),
                'status': 'pending',
                'createdAt': timestamp(),
            })
            return self._maybe_execute_payment(payment_id)
        else:
            if from_account != caller:
                return {'status': 'failed', 'reason': 'not_owner'}
            ok = self._move_funds(from_account, to, value)
            return {
                'status': 'completed' if ok else 'failed',
                'fromAccount': from_account,
                'to': to,
                'value': value,
            }

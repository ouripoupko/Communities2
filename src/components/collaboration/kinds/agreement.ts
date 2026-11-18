import { Shield } from 'lucide-react';
import { defineKind } from './kind';

/** A rule the community keeps, and the harm it prevents. Its title is the rule. */
export const agreement = defineKind({
  type: 'agreement',
  label: 'Agreement',
  icon: Shield,
  createLabel: 'Propose Agreement',
  fields: [
    { slot: 'title', label: 'Rule', placeholder: 'The proposed rule or agreement', required: 'Please enter the rule' },
    {
      slot: 'detail', label: 'Protection', placeholder: 'What harm does this prevent?', rows: 4,
      required: 'Please describe what harm this prevents',
    },
  ],
  summary: (c) => c.detail,
});

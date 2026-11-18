import { Zap } from 'lucide-react';
import { defineKind } from './kind';

/** An action someone takes, and invites others into. */
export const initiative = defineKind({
  type: 'initiative',
  label: 'Initiative',
  icon: Zap,
  createLabel: 'Start Initiative',
  fields: [
    { slot: 'title', label: 'Title', placeholder: 'What action will you take?', required: 'Please enter a title' },
    { slot: 'description', label: 'Description', placeholder: 'Describe your initiative...', rows: 4 },
  ],
});

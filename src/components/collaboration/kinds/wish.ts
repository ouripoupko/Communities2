import { Heart } from 'lucide-react';
import { shortAgent } from '../../../utils/memberDisplay';
import { defineKind } from './kind';

/** A dream or a need, for the community to take up. */
export const wish = defineKind({
  type: 'wish',
  label: 'Wish',
  icon: Heart,
  createLabel: 'Make a Wish',
  submitLabel: 'Submit Wish',
  fields: [
    { slot: 'title', label: 'Title', placeholder: 'What do you wish for?', required: 'Please enter a title' },
    {
      slot: 'description', label: 'Dream / Need', rows: 6,
      placeholder: 'What do you dream of for this community or for yourself?',
      required: 'Please share your dream or need',
    },
  ],
  subtitle: (info) => `Author: ${shortAgent(info.creator)}`,
});

import React from 'react';
import type { IPolicySide, PolicyMode } from '../../../services/contracts/community';

interface RateInputProps {
  /** The rate as the contract keeps it: minted into each destination, or taken from each source. */
  value: string;
  onChange: (value: string) => void;
  source: IPolicySide;
  destination: IPolicySide;
  mode: PolicyMode;
  /** How many accounts the destination names now. */
  destinationCount: number;
  disabled?: boolean;
  className?: string;
}

const trim = (n: number) => String(Number(n.toFixed(6)));

/**
 * A policy's rate. A transfer takes the rate from each source and splits it
 * equally among the destinations, so it shows both sides, linked: changing
 * what each destination gets changes what each source gives, by the number
 * of destinations now (which changes as members join).
 */
const RateInput: React.FC<RateInputProps> = ({
  value, onChange, source, destination, mode, destinationCount, disabled, className,
}) => {
  const unit = mode === 'percent' ? '%' : 'units';
  const isTransfer = source.kind !== 'void' && destination.kind !== 'void';
  const label = source.kind === 'void' ? 'Minted into each destination' : 'Taken from each source';
  const input = (id: string, v: string, set: (v: string) => void) => (
    <input id={id} type="number" min="0" step="any" value={v} onChange={(e) => set(e.target.value)}
      disabled={disabled} className={className} />
  );

  if (!isTransfer || destinationCount <= 1) {
    return (
      <label>
        {label} ({unit} per day{mode === 'percent' ? ', of its balance' : ''})
        {input('rate', value, onChange)}
      </label>
    );
  }

  const perDestination = value === '' ? '' : trim(Number(value) / destinationCount);
  return (
    <>
      <label>
        Taken from each source ({unit} per day{mode === 'percent' ? ', of its balance' : ''})
        {input('rate-source', value, onChange)}
      </label>
      <label>
        Each of the {destinationCount} destinations gets ({unit} per day{mode === 'percent' ? ', of each source\'s balance' : ''})
        {input('rate-destination', perDestination, (v) => onChange(v === '' ? '' : trim(Number(v) * destinationCount)))}
      </label>
    </>
  );
};

export default RateInput;

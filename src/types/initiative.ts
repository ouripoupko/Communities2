export type PipelineStage = 'problem' | 'discussion' | 'proposals' | 'vote' | 'mandate';

export interface InitiativeData {
  id: string;
  title: string;
  description?: string;
  evidence?: string[];
  countries?: string[];
  stage?: PipelineStage;
  currencyGathered?: number;
  currencyGoal?: number;
  createdAt: number;
  activityCount?: number;
  hostServer?: string;
  hostAgent?: string;
}

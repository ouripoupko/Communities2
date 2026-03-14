import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getInitiative,
  getRoadmap,
  getGaps,
  getSteps,
  type InitiativeGap,
  type InitiativeStep,
} from '../../services/contracts/initiative';

export type { InitiativeGap, InitiativeStep };

export interface InitiativeDetails {
  title?: string;
  description?: string;
  currencyGoal?: number;
  currencyGathered?: number;
  createdAt?: number;
  activityCount?: number;
  contributions?: Array<{ contributor: string; amount: number }>;
}

export interface RoadmapSegment {
  id: string;
  author: string;
  text: string;
}

export interface EditProposal {
  id: string;
  author: string;
  segmentIds: string[];
  newText: string;
  status: 'pending' | 'applied';
}

export interface RoadmapData {
  segments: RoadmapSegment[];
  editProposals: EditProposal[];
  proposalVotes: Record<string, Record<string, boolean>>;
  members: string[];
}

interface InitiativeState {
  initiativeDetails: Record<string, InitiativeDetails>;
  roadmap: Record<string, RoadmapData>;
  gaps: Record<string, InitiativeGap[]>;
  steps: Record<string, InitiativeStep[]>;
  loading: Record<string, boolean>;
  roadmapLoading: Record<string, boolean>;
  gapsLoading: Record<string, boolean>;
  stepsLoading: Record<string, boolean>;
  error: string | null;
}

const initialState: InitiativeState = {
  initiativeDetails: {},
  roadmap: {},
  gaps: {},
  steps: {},
  loading: {},
  roadmapLoading: {},
  gapsLoading: {},
  stepsLoading: {},
  error: null,
};

export const fetchRoadmap = createAsyncThunk(
  'initiative/fetchRoadmap',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getRoadmap(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, roadmap: result };
  },
);

export const fetchGaps = createAsyncThunk(
  'initiative/fetchGaps',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getGaps(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, gaps: result };
  },
);

export const fetchSteps = createAsyncThunk(
  'initiative/fetchSteps',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getSteps(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, steps: result };
  },
);

export const fetchInitiative = createAsyncThunk(
  'initiative/fetchInitiative',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getInitiative(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, initiative: result };
  },
);

const initiativeSlice = createSlice({
  name: 'initiative',
  initialState,
  reducers: {
    clearInitiative: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.initiativeDetails[id];
      delete state.roadmap[id];
      delete state.gaps[id];
      delete state.steps[id];
      delete state.loading[id];
      delete state.roadmapLoading[id];
      delete state.gapsLoading[id];
      delete state.stepsLoading[id];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInitiative.pending, (state, action) => {
        state.loading[action.meta.arg.contractId] = true;
        state.error = null;
      })
      .addCase(fetchInitiative.fulfilled, (state, action) => {
        state.loading[action.payload.contractId] = false;
        state.initiativeDetails[action.payload.contractId] =
          action.payload.initiative as InitiativeDetails;
      })
      .addCase(fetchInitiative.rejected, (state, action) => {
        if (action.meta.arg) {
          state.loading[action.meta.arg.contractId] = false;
        }
        state.error = action.error.message || 'Failed to fetch initiative';
      });

    builder
      .addCase(fetchRoadmap.pending, (state, action) => {
        state.roadmapLoading[action.meta.arg.contractId] = true;
        state.error = null;
      })
      .addCase(fetchRoadmap.fulfilled, (state, action) => {
        state.roadmapLoading[action.payload.contractId] = false;
        const r = action.payload.roadmap as RoadmapData;
        state.roadmap[action.payload.contractId] = {
          segments: r?.segments ?? [],
          editProposals: r?.editProposals ?? [],
          proposalVotes: r?.proposalVotes ?? {},
          members: r?.members ?? [],
        };
      })
      .addCase(fetchRoadmap.rejected, (state, action) => {
        if (action.meta.arg) {
          state.roadmapLoading[action.meta.arg.contractId] = false;
        }
        state.error = action.error.message || 'Failed to fetch roadmap';
      });

    builder
      .addCase(fetchGaps.pending, (state, action) => {
        state.gapsLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchGaps.fulfilled, (state, action) => {
        state.gapsLoading[action.payload.contractId] = false;
        state.gaps[action.payload.contractId] = action.payload.gaps;
      })
      .addCase(fetchGaps.rejected, (state, action) => {
        if (action.meta.arg) {
          state.gapsLoading[action.meta.arg.contractId] = false;
        }
      });

    builder
      .addCase(fetchSteps.pending, (state, action) => {
        state.stepsLoading[action.meta.arg.contractId] = true;
      })
      .addCase(fetchSteps.fulfilled, (state, action) => {
        state.stepsLoading[action.payload.contractId] = false;
        state.steps[action.payload.contractId] = action.payload.steps;
      })
      .addCase(fetchSteps.rejected, (state, action) => {
        if (action.meta.arg) {
          state.stepsLoading[action.meta.arg.contractId] = false;
        }
      });
  },
});

export const { clearInitiative } = initiativeSlice.actions;
export default initiativeSlice.reducer;

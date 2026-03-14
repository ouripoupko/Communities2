import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getWish,
  getRelatedWishes,
  getOffers,
  getSeeds,
  addOffer as addOfferApi,
  addSeed as addSeedApi,
  launchSeed as launchSeedApi,
  acceptOffer as acceptOfferApi,
  compensateOffer as compensateOfferApi,
  type WishOffer,
  type WishSeed,
} from '../../services/contracts/wish';
import { transfer, createInitiative } from '../../services/contracts/community';

export type { WishSeed };

export interface WishDetails {
  title?: string;
  dreamNeed?: string;
  createdAt?: number;
}

interface WishState {
  wishDetails: Record<string, WishDetails>;
  relatedWishIds: Record<string, string[]>;
  offers: Record<string, WishOffer[]>;
  seeds: Record<string, WishSeed[]>;
  loading: Record<string, boolean>;
  relatedWishesLoading: Record<string, boolean>;
  offersLoading: Record<string, boolean>;
  seedsLoading: Record<string, boolean>;
  error: string | null;
}

const initialState: WishState = {
  wishDetails: {},
  relatedWishIds: {},
  offers: {},
  seeds: {},
  loading: {},
  relatedWishesLoading: {},
  offersLoading: {},
  seedsLoading: {},
  error: null,
};

export const fetchWish = createAsyncThunk(
  'wish/fetchWish',
  async (args: {
    serverUrl: string;
    publicKey: string;
    contractId: string;
  }) => {
    const result = await getWish(
      args.serverUrl,
      args.publicKey,
      args.contractId,
    );
    return { contractId: args.contractId, wish: result };
  },
);

export const fetchRelatedWishIds = createAsyncThunk(
  'wish/fetchRelatedWishIds',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
  }) => {
    const result = await getRelatedWishes(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
    );
    return { wishContractId: args.wishContractId, relatedIds: result };
  },
);

export const fetchOffers = createAsyncThunk(
  'wish/fetchOffers',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
  }) => {
    const result = await getOffers(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
    );
    return { wishContractId: args.wishContractId, offers: result };
  },
);

export const addOfferThunk = createAsyncThunk(
  'wish/addOffer',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
    description: string;
  }) => {
    await addOfferApi(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
      args.description,
    );
    return { wishContractId: args.wishContractId };
  },
);

export const acceptOfferThunk = createAsyncThunk(
  'wish/acceptOffer',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
    offerId: string;
  }) => {
    await acceptOfferApi(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
      args.offerId,
    );
    return { wishContractId: args.wishContractId, offerId: args.offerId };
  },
);

export const compensateOfferThunk = createAsyncThunk(
  'wish/compensateOffer',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
    offerId: string;
    amount: number;
    helperPublicKey: string;
    communityId: string;
  }) => {
    await transfer(
      args.serverUrl,
      args.publicKey,
      args.communityId,
      args.helperPublicKey,
      args.amount,
    );
    await compensateOfferApi(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
      args.offerId,
    );
    return { wishContractId: args.wishContractId, offerId: args.offerId };
  },
);

export const fetchSeeds = createAsyncThunk(
  'wish/fetchSeeds',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
  }) => {
    const result = await getSeeds(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
    );
    return { wishContractId: args.wishContractId, seeds: result };
  },
);

export const addSeedThunk = createAsyncThunk(
  'wish/addSeed',
  async (args: {
    serverUrl: string;
    publicKey: string;
    wishContractId: string;
    description: string;
  }) => {
    await addSeedApi(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
      args.description,
    );
    return { wishContractId: args.wishContractId };
  },
);

export const launchSeedThunk = createAsyncThunk(
  'wish/launchSeed',
  async (args: {
    serverUrl: string;
    publicKey: string;
    communityId: string;
    wishContractId: string;
    seedId: string;
    description: string;
  }) => {
    const title = args.description.length > 80
      ? args.description.slice(0, 77) + '...'
      : args.description;
    const initiativeId = await createInitiative(
      args.serverUrl,
      args.publicKey,
      args.communityId,
      { title, description: args.description },
    );
    await launchSeedApi(
      args.serverUrl,
      args.publicKey,
      args.wishContractId,
      args.seedId,
      initiativeId,
      args.serverUrl,
      args.publicKey,
    );
    return {
      wishContractId: args.wishContractId,
      seedId: args.seedId,
      initiativeId,
      hostServer: args.serverUrl,
      hostAgent: args.publicKey,
    };
  },
);

const wishSlice = createSlice({
  name: 'wish',
  initialState,
  reducers: {
    clearWish: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.wishDetails[id];
      delete state.loading[id];
      delete state.relatedWishIds[id];
      delete state.relatedWishesLoading[id];
      delete state.offers[id];
      delete state.offersLoading[id];
      delete state.seeds[id];
      delete state.seedsLoading[id];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWish.pending, (state, action) => {
        state.loading[action.meta.arg.contractId] = true;
        state.error = null;
      })
      .addCase(fetchWish.fulfilled, (state, action) => {
        state.loading[action.payload.contractId] = false;
        state.wishDetails[action.payload.contractId] =
          action.payload.wish as WishDetails;
      })
      .addCase(fetchWish.rejected, (state, action) => {
        if (action.meta.arg) {
          state.loading[action.meta.arg.contractId] = false;
        }
        state.error = action.error.message || 'Failed to fetch wish';
      })
      .addCase(fetchRelatedWishIds.pending, (state, action) => {
        state.relatedWishesLoading[action.meta.arg.wishContractId] = true;
      })
      .addCase(fetchRelatedWishIds.fulfilled, (state, action) => {
        state.relatedWishesLoading[action.payload.wishContractId] = false;
        state.relatedWishIds[action.payload.wishContractId] = action.payload.relatedIds;
      })
      .addCase(fetchRelatedWishIds.rejected, (state, action) => {
        if (action.meta.arg) {
          state.relatedWishesLoading[action.meta.arg.wishContractId] = false;
        }
      })
      .addCase(fetchOffers.pending, (state, action) => {
        state.offersLoading[action.meta.arg.wishContractId] = true;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.offersLoading[action.payload.wishContractId] = false;
        state.offers[action.payload.wishContractId] = action.payload.offers;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (action.meta.arg) {
          state.offersLoading[action.meta.arg.wishContractId] = false;
        }
      })
      .addCase(addOfferThunk.fulfilled, () => {
        // Refetch happens in component
      })
      .addCase(acceptOfferThunk.fulfilled, (state, action) => {
        const offers = state.offers[action.payload.wishContractId] ?? [];
        const o = offers.find((x) => x.id === action.payload.offerId);
        if (o && action.meta.arg) {
          o.acceptedBy = action.meta.arg.publicKey;
          o.acceptedAt = Date.now();
        }
      })
      .addCase(compensateOfferThunk.fulfilled, (state, action) => {
        const offers = state.offers[action.payload.wishContractId] ?? [];
        const o = offers.find((x) => x.id === action.payload.offerId);
        if (o) o.compensated = true;
      })
      .addCase(fetchSeeds.pending, (state, action) => {
        state.seedsLoading[action.meta.arg.wishContractId] = true;
      })
      .addCase(fetchSeeds.fulfilled, (state, action) => {
        state.seedsLoading[action.payload.wishContractId] = false;
        state.seeds[action.payload.wishContractId] = action.payload.seeds;
      })
      .addCase(fetchSeeds.rejected, (state, action) => {
        if (action.meta.arg) {
          state.seedsLoading[action.meta.arg.wishContractId] = false;
        }
      })
      .addCase(launchSeedThunk.fulfilled, (state, action) => {
        const seeds = state.seeds[action.payload.wishContractId] ?? [];
        const s = seeds.find((x) => x.id === action.payload.seedId);
        if (s) {
          s.initiativeId = action.payload.initiativeId;
          s.hostServer = action.payload.hostServer;
          s.hostAgent = action.payload.hostAgent;
        }
      });
  },
});

export const { clearWish } = wishSlice.actions;
export default wishSlice.reducer;

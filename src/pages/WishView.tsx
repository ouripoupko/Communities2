import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Gift, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import RelatedWishes from '../components/wish/RelatedWishes';
import Offers from '../components/wish/Offers';
import Seeds from '../components/wish/Seeds';
import styles from './Container.module.scss';
import type { Collaboration } from '../services/contracts/community';

const WishView: React.FC = () => {
  const { communityId, wishId } = useParams<{
    communityId: string;
    wishId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const wish = (location.state as { wish?: Collaboration })?.wish ?? getSyntheticWish(wishId!);

  const navItems = [
    { path: 'related', label: 'Related', icon: Heart },
    { path: 'offers', label: 'Offers', icon: Gift },
    { path: 'seeds', label: 'Seeds', icon: Sparkles },
  ];

  const authorKey = wish?.author;
  const authorDisplay = authorKey
    ? authorKey.length > 20
      ? `${authorKey.slice(0, 10)}...${authorKey.slice(-8)}`
      : authorKey
    : '—';

  return (
    <div className={styles.container}>
      <PageHeader
        showBackButton={true}
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}/collaborations`)}
        title={wish?.title ?? 'Wish'}
        subtitle={authorKey ? `Author: ${authorDisplay}` : undefined}
        layout="two-row"
      />

      <div className={styles.content}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() =>
                navigate(`/wish/${communityId}/${wishId}/${item.path}`)
              }
              className={`${styles.navItem} ${
                location.pathname.includes(`/${item.path}`) ? styles.active : ''
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
          <Routes>
            <Route path="" element={<Navigate to="related" replace />} />
            <Route
              path="related"
              element={<RelatedWishes wishId={wishId!} communityId={communityId!} />}
            />
            <Route
              path="offers"
              element={<Offers wishId={wishId!} communityId={communityId!} />}
            />
            <Route
              path="seeds"
              element={<Seeds wishId={wishId!} communityId={communityId!} />}
            />
            <Route
              path="*"
              element={<RelatedWishes wishId={wishId!} communityId={communityId!} />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
};

function getSyntheticWish(wishId: string): Partial<Collaboration> {
  return {
    id: wishId,
    type: 'wish',
    title: 'Wish',
    dreamNeed: '',
    createdAt: Date.now(),
    activityCount: 0,
  };
}

export default WishView;

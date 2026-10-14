import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import ProductCard from '../ProductCard';
import QuickView from '../QuickView';
import { EmptyState, Reveal, SectionHead, SkeletonGrid } from '../ui';

/**
 * Tabbed product explorer. One tab per category — plus "Featured Gifts"
 * (shown first and selected by default) and "All Products" — that loads the
 * matching real products from the API, with a View All link.
 */
export default function CategoryExplorer({ categories = [] }) {
  const tabs = [{ slug: 'featured', name: 'Featured Gifts' }, { slug: '', name: 'All Products' }, ...categories];
  const [active, setActive] = useState('featured');
  const [items, setItems] = useState(null);
  const [quick, setQuick] = useState(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    const params = active === 'featured'
      ? { featured: 1, limit: 8, sort: 'popular' }
      : active
        ? { category: active, limit: 8, sort: 'popular' }
        : { limit: 8, sort: 'popular' };
    api.products(params)
      .then((d) => { if (alive) setItems(d.products || []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [active]);

  if (!tabs.length) return null;

  const activeName = tabs.find((t) => t.slug === active)?.name || 'All Products';
  const viewAllTo = active === 'featured' ? '/products?featured=1' : active ? `/category/${active}` : '/products';
  const viewAllLabel = active === 'featured' ? 'View all featured gifts' : active ? `View all ${activeName}` : 'View all products';

  return (
    <section className="section" id="shop" style={{ background: 'linear-gradient(180deg, #fff 0%, var(--blush) 100%)' }}>
      <div className="container">
        <SectionHead
          eyebrow="Browse & buy"
          title={`Shop ${activeName}`}
          sub="Live products from our store — add to cart or open details."
          action={<Link to={viewAllTo} className="btn btn-primary btn-sm">{viewAllLabel} <ArrowRight size={15} /></Link>}
        />

        <div className="cat-tabs" role="tablist" aria-label="Product categories">
          {tabs.map((t) => (
            <button
              key={t.slug || 'all'}
              role="tab"
              aria-selected={active === t.slug}
              className={`cat-tab ${active === t.slug ? 'on' : ''}`}
              onClick={() => setActive(t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>

        {!items ? (
          <SkeletonGrid count={8} className="product-grid" />
        ) : items.length ? (
          <div className="product-grid">
            {items.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <ProductCard p={p} onQuickView={setQuick} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🎁"
            title={`No ${activeName} gifts yet`}
            text="New gifts are on the way — explore another category meanwhile."
            action={<Link to="/products" className="btn btn-primary">Browse all gifts</Link>}
          />
        )}
      </div>
      <QuickView product={quick} onClose={() => setQuick(null)} />
    </section>
  );
}

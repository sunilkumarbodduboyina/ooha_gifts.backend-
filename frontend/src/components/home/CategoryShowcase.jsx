import { Link } from 'react-router-dom';
import { ArrowUpRight, Briefcase, Cake, Gift, Heart, LayoutGrid, Sparkles, Star, Users } from 'lucide-react';
import { img } from '../../services/api';
import { Reveal, SectionHead } from '../ui';

/* Quick-entry chips so the most-shopped moments are always one tap away,
   alongside the full list of categories from the database. */
const QUICK = [
  { to: '/products?featured=1', label: 'Featured Gifts', icon: Star },
  { to: '/products', label: 'All Products', icon: LayoutGrid },
  { to: '/gifts/love', label: 'Love', icon: Heart },
  { to: '/occasion/birthday', label: 'Birthday Gifts', icon: Cake },
  { to: '/occasion/anniversary', label: 'Anniversary', icon: Gift },
  { to: '/occasions', label: 'Occasions', icon: Sparkles },
  { to: '/relationships', label: 'Relationship', icon: Users },
  { to: '/collection/corporate', label: 'Corporate', icon: Briefcase },
];

/** "Shop by category" — every category from the store + moment quick-links. */
export default function CategoryShowcase({ categories = [] }) {
  if (!categories.length) return null;

  return (
    <section className="section" id="categories">
      <div className="container">
        <SectionHead
          center
          eyebrow="Shop by category"
          title="Find the Perfect Gift"
          sub="Browse every Ooha Gifts category — or start with a moment."
        />

        <div className="quicklinks">
          {QUICK.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="quicklink">
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>

        <div className="folder-grid">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.06}>
              <Link to={`/category/${c.slug}`} className="folder">
                <div className="folder-media">
                  <img src={img(c.image)} alt={c.name} loading="lazy" />
                </div>
                <div className="folder-body">
                  <h3>{c.name}</h3>
                  <p>{c.description}</p>
                  <span className="folder-link">
                    Explore{c.product_count ? ` · ${c.product_count}` : ''} <span><ArrowUpRight size={16} /></span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

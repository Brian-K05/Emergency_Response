import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SCOPE_MUNICIPALITIES = [
  'San Isidro',
  'Victoria',
  'Allen',
  'Lavezares',
  'Rosario',
];

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [visible, setVisible] = useState({ hero: true });

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/dashboard', { replace: true });
      } else if (user.phone_number && user.municipality_id) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/account/setup', { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  // Scroll-triggered visibility for sections
  useEffect(() => {
    const sections = document.querySelectorAll('.landing-section[data-animate]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-animate');
            if (id) setVisible((v) => ({ ...v, [id]: true }));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="landing-loading">
        <div className="landing-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">ER</span>
            <span className="landing-logo-text">Emergency Response</span>
          </div>
          <nav className="landing-nav">
            <a href="#about">About</a>
            <a href="#scope">Scope</a>
            <a href="#features">Features</a>
            <a href="#get-started">Get Started</a>
            <Link to="/login" className="landing-nav-login">Log in</Link>
            <Link to="/register" className="landing-nav-cta">Create account</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero" data-animate="hero">
          <div className={`landing-hero-content ${visible.hero ? 'is-visible' : ''}`}>
            <p className="landing-hero-label">Northern Samar</p>
            <h1 className="landing-hero-title">
              Internet-based
              <br />
              <span className="landing-hero-title-accent">Emergency Response</span>
            </h1>
            <p className="landing-hero-subtitle">
              Report emergencies where mobile signal is weak. WiFi or mobile data is enough.
              MDRRMO coordinates and calls professional response teams—faster, clearer, traceable.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="landing-btn landing-btn-primary">
                Get started
              </Link>
              <Link to="/login" className="landing-btn landing-btn-ghost">
                I have an account
              </Link>
            </div>
          </div>
          <div className="landing-hero-bg" aria-hidden="true" />
        </section>

        <section id="about" className="landing-section landing-about" data-animate="about">
          <div className={`landing-section-inner ${visible.about ? 'is-visible' : ''}`}>
            <h2 className="landing-section-title">About the system</h2>
            <p className="landing-about-lead">
              Remote barangays often have no mobile signal for emergency calls. This platform lets residents and officials use <strong>WiFi or mobile data</strong> to report and manage incidents—so help can be requested and coordinated even when traditional phone lines fail.
            </p>
            <div className="landing-about-points">
              <div className="landing-about-card">
                <span className="landing-about-card-icon">📡</span>
                <h3>Internet-first</h3>
                <p>Report and coordinate over the web. No need for cellular voice signal.</p>
              </div>
              <div className="landing-about-card">
                <span className="landing-about-card-icon">🔄</span>
                <h3>MDRRMO coordination</h3>
                <p>Municipal Disaster Risk Reduction and Management Office assigns and calls response teams.</p>
              </div>
              <div className="landing-about-card">
                <span className="landing-about-card-icon">📍</span>
                <h3>Barangay to municipality</h3>
                <p>Structured by barangays and municipalities for clear accountability and coverage.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="scope" className="landing-section landing-scope" data-animate="scope">
          <div className={`landing-section-inner ${visible.scope ? 'is-visible' : ''}`}>
            <h2 className="landing-section-title">Coverage</h2>
            <p className="landing-scope-intro">
              The system is currently scoped to the following municipalities in <strong>Northern Samar</strong>.
            </p>
            <div className="landing-municipalities">
              {SCOPE_MUNICIPALITIES.map((name, i) => (
                <span key={name} className="landing-municipality-tag" style={{ animationDelay: `${i * 0.06}s` }}>
                  {name}
                </span>
              ))}
            </div>
            <p className="landing-scope-note">
              Residents and officials in these areas can register and use the platform for incident reporting and response coordination.
            </p>
          </div>
        </section>

        <section id="features" className="landing-section landing-features" data-animate="features">
          <div className={`landing-section-inner ${visible.features ? 'is-visible' : ''}`}>
            <h2 className="landing-section-title">What you can do</h2>
            <ul className="landing-features-list">
              <li>
                <span className="landing-features-dot" />
                Report incidents with type, location, urgency, and optional media
              </li>
              <li>
                <span className="landing-features-dot" />
                Real-time alerts for barangay officials and MDRRMO
              </li>
              <li>
                <span className="landing-features-dot" />
                Map view of incidents for admins and MDRRMO
              </li>
              <li>
                <span className="landing-features-dot" />
                Resident verification so only verified accounts can report
              </li>
              <li>
                <span className="landing-features-dot" />
                Role-based access: municipal admins, MDRRMO, barangay officials, residents
              </li>
            </ul>
          </div>
        </section>

        <section id="get-started" className="landing-section landing-cta" data-animate="get-started">
          <div className={`landing-section-inner landing-cta-inner ${visible['get-started'] ? 'is-visible' : ''}`}>
            <h2 className="landing-cta-title">Get started</h2>
            <p className="landing-cta-subtitle">
              New here? Create an account. Already have one? Log in.
            </p>
            <div className="landing-cta-buttons">
              <Link to="/register" className="landing-btn landing-btn-primary landing-btn-large">
                Create account
              </Link>
              <Link to="/login" className="landing-btn landing-btn-outline landing-btn-large">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo landing-logo-footer">
            <span className="landing-logo-icon">ER</span>
            <span className="landing-logo-text">Emergency Response</span>
          </div>
          <p className="landing-footer-tagline">Northern Samar · Internet-based emergency reporting and coordination</p>
          <div className="landing-footer-links">
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

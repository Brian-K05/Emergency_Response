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
  const [visible, setVisible] = useState({
    hero: true,
    about: false,
    scope: false,
    features: false,
    'get-started': false,
  });

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
    const sections = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-animate');
            if (id) setVisible((v) => ({ ...v, [id]: true }));
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Header shadow when scrolled
  useEffect(() => {
    const header = document.querySelector('.landing-header');
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 20) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
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
        {/* Hero — CitiRise: dark background, white text, one headline + one CTA */}
        <section className="landing-hero" data-animate="hero">
          <div className="landing-container landing-hero-inner">
            <div className={`landing-hero-content ${visible.hero ? 'is-visible' : ''}`}>
              <h1 className="landing-hero-title">
                Where emergencies meet
                <br />
                fast response.
              </h1>
              <p className="landing-hero-subtitle">
                Internet-based emergency reporting for Northern Samar. Use WiFi or mobile data where signal is weak—MDRRMO coordinates and calls response teams.
              </p>
              <div className="landing-hero-actions">
                <Link to="/register" className="landing-btn landing-btn-hero">Get started</Link>
                <Link to="/login" className="landing-hero-link">I have an account</Link>
              </div>
            </div>
          </div>
        </section>

        {/* About — CitiRise: About us + H2 + paragraph + stats row + service cards */}
        <section id="about" className="landing-block landing-about" data-animate="about">
          <div className="landing-container">
            <div className={`landing-section-inner ${visible.about ? 'is-visible' : ''}`}>
              <p className="landing-block-label">About the system</p>
              <h2 className="landing-block-title">Trusted emergency reporting for Northern Samar</h2>
              <p className="landing-about-lead">
                Remote barangays often have no mobile signal for emergency calls. This platform lets residents and officials use <strong>WiFi or mobile data</strong> to report and manage incidents—so help can be requested and coordinated even when traditional phone lines fail.
              </p>
              <div className="landing-stats-row">
                <div className="landing-stat">
                  <span className="landing-stat-value">5</span>
                  <span className="landing-stat-label">Municipalities</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat-value">Internet-based</span>
                  <span className="landing-stat-label">No cellular signal needed</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat-value">MDRRMO</span>
                  <span className="landing-stat-label">Coordinates response</span>
                </div>
              </div>
              <p className="landing-services-heading">Our platform</p>
              <div className="landing-services-grid">
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrap"><span className="landing-service-icon">📡</span></div>
                  <h3 className="landing-service-title">Internet-first</h3>
                  <p className="landing-service-desc">Report and coordinate over the web. No need for cellular voice signal.</p>
                </div>
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrap"><span className="landing-service-icon">🔄</span></div>
                  <h3 className="landing-service-title">MDRRMO coordination</h3>
                  <p className="landing-service-desc">Municipal Disaster Risk Reduction and Management Office assigns and calls response teams.</p>
                </div>
                <div className="landing-service-card">
                  <div className="landing-service-icon-wrap"><span className="landing-service-icon">📍</span></div>
                  <h3 className="landing-service-title">Barangay to municipality</h3>
                  <p className="landing-service-desc">Structured by barangays and municipalities for clear accountability and coverage.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Scope — Coverage / Municipalities in scope */}
        <section id="scope" className="landing-block landing-scope" data-animate="scope">
          <div className="landing-container">
            <div className={`landing-section-inner ${visible.scope ? 'is-visible' : ''}`}>
              <p className="landing-block-label">Coverage</p>
              <h2 className="landing-block-title">Municipalities in scope</h2>
              <p className="landing-scope-intro">
                The system is scoped to the following municipalities in <strong>Northern Samar</strong>. Residents and officials in these areas can register and use the platform.
              </p>
              <div className="landing-municipalities">
                {SCOPE_MUNICIPALITIES.map((name) => (
                  <span key={name} className="landing-municipality-tag">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features — Services-style: What you can do */}
        <section id="features" className="landing-block landing-features" data-animate="features">
          <div className="landing-container">
            <div className={`landing-section-inner ${visible.features ? 'is-visible' : ''}`}>
              <p className="landing-block-label">Platform</p>
              <h2 className="landing-block-title">What you can do</h2>
              <p className="landing-features-intro">Report incidents, get real-time alerts, and coordinate response across barangays and municipalities.</p>
              <ul className="landing-features-list">
                <li><span className="landing-features-dot" />Report incidents with type, location, urgency, and optional media</li>
                <li><span className="landing-features-dot" />Real-time alerts for barangay officials and MDRRMO</li>
                <li><span className="landing-features-dot" />Map view of incidents for admins and MDRRMO</li>
                <li><span className="landing-features-dot" />Resident verification so only verified accounts can report</li>
                <li><span className="landing-features-dot" />Role-based access: municipal admins, MDRRMO, barangay officials, residents</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA — CitiRise: "Ready to Build Your Dream Project?" single headline + Contact Us */}
        <section id="get-started" className="landing-block landing-cta" data-animate="get-started">
          <div className="landing-container">
            <div className={`landing-cta-inner ${visible['get-started'] ? 'is-visible' : ''}`}>
              <h2 className="landing-cta-title">Ready to get started?</h2>
              <p className="landing-cta-subtitle">Create an account to report or manage incidents. Already have one? Log in.</p>
              <div className="landing-cta-buttons">
                <Link to="/register" className="landing-btn landing-btn-cta">Create account</Link>
                <Link to="/login" className="landing-btn landing-btn-cta-outline">Log in</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-top">
            <div className="landing-logo">
              <span className="landing-logo-icon">ER</span>
              <span className="landing-logo-text">Emergency Response</span>
            </div>
            <p className="landing-footer-tagline">Northern Samar · Internet-based emergency reporting and coordination</p>
            <div className="landing-footer-links">
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p className="landing-footer-copy">© {new Date().getFullYear()} Emergency Response. Northern Samar.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

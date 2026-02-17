// Jest setup - runs before each test (Create React App)
import '@testing-library/jest-dom';

// JSDOM does not provide IntersectionObserver (used by Landing and others)
class MockIntersectionObserver {
  observe = () => null;
  disconnect = () => null;
  unobserve = () => null;
  root = null;
  rootMargin = '';
  thresholds = [];
}
window.IntersectionObserver = MockIntersectionObserver;

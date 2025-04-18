import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/images/transperentlogo.png';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAgricultureOpen, setMobileAgricultureOpen] = useState(false);
  const [mobileRealEstateOpen, setMobileRealEstateOpen] = useState(false);
  const { pathname } = useLocation();

  // Update navbar background based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top (and close mobile menu if open)
  const handleLinkClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  // Helper to determine active link class
  const linkClass = (path) =>
    `px-3 py-2 font-medium ${pathname === path ? 'text-green-500' : 'text-gray-700 hover:text-gray-900'}`;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-colors duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Side: Logo and Company Name */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img className="h-8 w-8" src={logo} alt="Logo" />
            </div>
            <span className="ml-2 font-bold text-xl">Africa Green Gate LTD</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center">
            <Link to="/" onClick={handleLinkClick} className={linkClass('/')}>Home</Link>
            <div className="border-l border-gray-300 h-6 mx-2" />
            <Link to="/about" onClick={handleLinkClick} className={linkClass('/about')}>About Us</Link>
            <div className="border-l border-gray-300 h-6 mx-2" />
            <Link to="/subsidiary" onClick={handleLinkClick} className={linkClass('/subsidiary')}>Subsidiary</Link>
            <div className="border-l border-gray-300 h-6 mx-2" />
            {/* Agriculture Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 text-gray-700 hover:text-gray-900 focus:outline-none">Agriculture</button>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to="/agriculture/crops" onClick={handleLinkClick}
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${pathname === '/agriculture/crops' ? 'text-green-500' : ''}`}>Crops</Link>
                <Link to="/agriculture/farming" onClick={handleLinkClick}
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${pathname === '/agriculture/farming' ? 'text-green-500' : ''}`}>Farming System</Link>
              </div>
            </div>
            <div className="border-l border-gray-300 h-6 mx-2" />
            {/* Real Estate Dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 text-gray-700 hover:text-gray-900 focus:outline-none">Real Estate</button>
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to="/real-estate/smart-city" onClick={handleLinkClick}
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${pathname === '/real-estate/smart-city' ? 'text-green-500' : ''}`}>Smart City</Link>
                <Link to="/real-estate/estates" onClick={handleLinkClick}
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${pathname === '/real-estate/estates' ? 'text-green-500' : ''}`}>Estates</Link>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-700 hover:text-gray-900 focus:outline-none">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" onClick={handleLinkClick} className="block px-3 py-2 text-gray-700 hover:text-gray-900">Home</Link>
            <div className="border-t border-gray-300" />
            <Link to="/about" onClick={handleLinkClick} className="block px-3 py-2 text-gray-700 hover:text-gray-900">About Us</Link>
            <div className="border-t border-gray-300" />
            <Link to="/subsidiary" onClick={handleLinkClick} className="block px-3 py-2 text-gray-700 hover:text-gray-900">Subsidiary</Link>
            <div className="border-t border-gray-300" />

            {/* Mobile Agriculture */}
            <div>
              <button
                onClick={() => setMobileAgricultureOpen(!mobileAgricultureOpen)}
                className="w-full flex justify-between items-center px-3 py-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <span>Agriculture</span>
                <svg
                  className={`w-5 h-5 transform transition-transform ${mobileAgricultureOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileAgricultureOpen && (
                <div className="pl-4 space-y-1">
                  <Link to="/agriculture/crops" onClick={handleLinkClick} className="block px-3 py-2 text-gray-600 hover:text-gray-800">Crops</Link>
                  <Link to="/agriculture/farming" onClick={handleLinkClick} className="block px-3 py-2 text-gray-600 hover:text-gray-800">Farming System</Link>
                </div>
              )}
            </div>
            <div className="border-t border-gray-300" />

            {/* Mobile Real Estate */}
            <div>
              <button
                onClick={() => setMobileRealEstateOpen(!mobileRealEstateOpen)}
                className="w-full flex justify-between items-center px-3 py-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <span>Real Estate</span>
                <svg
                  className={`w-5 h-5 transform transition-transform ${mobileRealEstateOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileRealEstateOpen && (
                <div className="pl-4 space-y-1">
                  <Link to="/real-estate/smart-city" onClick={handleLinkClick} className="block px-3 py-2 text-gray-600 hover:text-gray-800">Smart City</Link>
                  <Link to="/real-estate/estates" onClick={handleLinkClick} className="block px-3 py-2 text-gray-600 hover:text-gray-800">Estates</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

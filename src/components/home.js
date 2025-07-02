import React, { useState, useEffect } from 'react';
import Loader from './loader';

import Navbar from './Navbar';
import Home1 from './home1';
import Home2 from './home2';
import Home3 from './home3';
import Home4 from './home4';
import Home5 from './home5';
import Footer from './footer';

import { Helmet } from 'react-helmet';

const Home = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fake loading for 2 seconds — replace with your real loading logic if needed
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <Helmet>
        <title>Africa Green Gate</title>
      </Helmet>
      <Navbar />
      <Home1 />
      <Home2 />
      <Home3 />
      <Home4 />
      <Home5 />
      <Footer />
    </div>
  );
};

export default Home;

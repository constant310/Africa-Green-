// src/home.js
import React from 'react';

import Navbar from './Navbar';
import Home1 from './home1';
import Home2 from './home2';
import Home3 from './home3';
import Home4 from './home4';
import Home5 from './home5';
import Footer from './footer';

const Home = () => {
  return (
    <div>
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

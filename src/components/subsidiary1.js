import React from 'react';
import backgroundImage from '../assets/images/background.jpg';

const Subsidiary1 = () => {
  return (
    <section
      className="relative h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          Real Estate Redefined at Africa Green Gate Ltd
        </h1>
        <p className="text-white text-lg sm:text-xl md:text-2xl mb-6 max-w-2xl mx-auto">
          Pioneering Sustainable Living and Development. Unlock your potential.
        </p>
        <a
          href="#subsidiaries"
          className="inline-block bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded transition duration-300"
        >
          Get Started
        </a>
      </div>
    </section>
  );
};

export default Subsidiary1;

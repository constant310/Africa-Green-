import React from 'react';
import backgroundImage from '../assets/images/background.jpg';
const Subsidiary1 = () => {
  return (
    <section
      className="relative h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 text-center px-4 text-white max-w-4xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Real Estate Reimagined at Africa Green Gate Ltd
        </h1>
        <p className="text-xl md:text-2xl mb-6">
          Pioneering Sustainable Living and Development <br />
          Unlock your potential
        </p>
        <button className="bg-green-700 hover:bg-green-800 text-white py-2 px-6 rounded shadow-md transition-colors">
          Learn More
        </button>
      </div>
    </section>
  );
};

export default Subsidiary1;

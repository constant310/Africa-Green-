import React from 'react';

const Realestate1 = () => {
  return (
    <header
      className="mt-16 h-[80vh] bg-cover bg-center relative flex items-center justify-center"
      style={{
        backgroundImage: 'url("https://via.placeholder.com/1920x1080")', // Replace with your hero image URL or local asset
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      {/* Hero Content */}
      <div className="relative z-10 text-center text-white p-4">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Real Estate Redefined at Africa Green Gate Ltd
        </h1>
        <p className="text-xl md:text-2xl mb-6">
          Pioneering sustainable living and development<br />
          Unlock your potential
        </p>
        <button className="bg-green-700 hover:bg-green-800 text-white py-2 px-6 rounded shadow-md transition-colors">
          Get Started
        </button>
      </div>
    </header>
  );
};

export default Realestate1;

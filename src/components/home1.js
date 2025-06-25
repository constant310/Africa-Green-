import React from 'react';
import backgroundImage from '../assets/images/background.jpg'; // Replace with your background image

const Home1 = () => {
  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col justify-center items-center relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-green-900 bg-opacity-50"></div>

      {/* Content */}
      <div className="relative text-center px-4">
        <p className="text-white uppercase tracking-widest mb-2">Welcome to</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
          Africa Green Gate
        </h1>
        <p className="text-lg sm:text-xl text-yellow-300 mt-1">
          Your gateway to the world
        </p>
        <button className="mt-8 px-6 py-3 bg-yellow-400 text-green-900 font-semibold rounded-md hover:bg-yellow-500 transition">
          Get Started
        </button>
      </div>
    </div>
  );
}

export default Home1;

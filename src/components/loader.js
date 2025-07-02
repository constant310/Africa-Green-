// src/Loader.js
import React from 'react';
// ✅ Import your logo
import Logo from '../assets/images/transperentlogo.png';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="relative flex items-center justify-center">
        {/* Spinning green circle */}
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>

        {/* Company logo in the center */}
        <img
          src={Logo}
          alt="Africa Green Gate Logo"
          className="absolute w-16 h-16 object-contain"
        />
      </div>
    </div>
  );
};

export default Loader;

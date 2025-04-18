import React from 'react';
import { Link } from 'react-router-dom';
import constructionImg from '../assets/images/background.jpg';

const Construction = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 text-center">
      {/* Image or SVG */}
      <img
        src={constructionImg}
        alt="Under Construction"
        className="w-48 h-48 mb-6 animate-pulse"
      />

      {/* Main Title */}
      <h1 className="text-5xl font-bold text-gray-800 mb-4">
        Page Under Construction
      </h1>

      {/* Subtitle */}
      <p className="text-lg text-gray-600 mb-8">
        We're working hard to bring you something amazing. Please check back soon!
      </p>

      {/* Optional CTA */}
      <Link
        to="/"
        className="inline-block px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition"
      >
        Go Back Home
      </Link>

      {/* Footer note */}
      
    </div>
  );
};

export default Construction;

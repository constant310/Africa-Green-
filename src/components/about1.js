import React from 'react';
import backgroundImage from '../assets/images/background.jpg';

const About1 = () => {
  return (
    <section
      className="relative h-screen flex items-center justify-center bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-green-900 bg-opacity-60" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in-up">
          Discover More About Us
        </h1>
        <p className="text-lg md:text-xl text-gray-200 max-w-xl mx-auto">
          Learn about our mission, values, and the driving force behind Africa Green Gate.
        </p>
      </div>
    </section>
  );
};

export default About1;

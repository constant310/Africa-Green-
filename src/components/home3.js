import React from 'react';
import mapImage from '../assets/images/map.jpg';

export default function Home3() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Vision Text */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Our Vision</h2>
          <p className="text-gray-800 leading-relaxed">
            To build a transformed and developed society of civilized and self-reliant people in Africa.
          </p>
        </div>

        {/* Vision Illustration */}
        <div className="flex justify-center md:justify-end">
          <img
            src={mapImage}
            alt="Africa network illustration"
            className="w-64 h-auto"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

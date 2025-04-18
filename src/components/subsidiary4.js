// src/components/ExtraSection.jsx
import React from 'react';

const Subsidiary4 = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-gray-100 rounded shadow p-4 flex flex-col items-center">
              <div className="w-full h-32 bg-gray-300 mb-4 flex items-center justify-center">
                <span className="text-gray-600">Image {item}</span>
              </div>
              <p className="text-lg font-semibold mb-2">Another Section {item}</p>
              <button className="bg-green-700 text-white py-2 px-4 rounded hover:bg-green-800 transition-colors">
                LEARN MORE
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Subsidiary4;

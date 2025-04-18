// src/components/AffiliatesSection.jsx
import React from 'react';


const Subsidiary2 = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">OUR AFFILIATES</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex flex-col items-center justify-center bg-gray-100 p-4 rounded shadow">
              <div className="w-full h-32 bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600">Affiliate {item}</span>
              </div>
              <p className="mt-2 font-semibold">
                {item === 1
                  ? 'COMMI PROPERTIES'
                  : item === 2
                  ? 'KLASS Projects'
                  : item === 3
                  ? 'HOLLMARK OF NATURAL RESOURCES LIMITED'
                  : item === 4
                  ? 'Yet Another'
                  : 'CONSTANTINE'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Subsidiary2;

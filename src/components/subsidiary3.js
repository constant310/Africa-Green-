// src/components/PropertiesSection.jsx
import React from 'react';

const Subsidiary3 = () => {
  const properties = [
    { id: 1, title: 'Smart Estate', image: null },
    { id: 2, title: 'Luxury Apartments', image: null },
    { id: 3, title: 'City Villas', image: null },
    { id: 4, title: 'Green Village', image: null },
  ];

  return (
    <section className="py-12 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8">Our Properties</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-lg shadow p-4 flex flex-col items-center"
            >
              {/* Placeholder image area */}
              <div className="w-full h-32 bg-gray-300 mb-4 flex items-center justify-center rounded">
                <span className="text-gray-600">
                  {property.image ? (
                    <img src={property.image} alt={property.title} />
                  ) : (
                    `Image ${property.id}`
                  )}
                </span>
              </div>

              <p className="text-lg font-semibold text-center mb-2">
                {property.title}
              </p>

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

export default Subsidiary3;

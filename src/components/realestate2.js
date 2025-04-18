import React from 'react';

const Realestate2 = () => {
  // Example array of property objects
  const properties = [
    { id: 1, title: 'Agricultural Estate', image: null },
    { id: 2, title: 'Residential Estate One', image: null },
    { id: 3, title: 'Residential Estate Two', image: null },
    { id: 4, title: 'Industrial Estate', image: null },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Featured Properties</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {properties.map((property) => (
            <div key={property.id} className="bg-gray-100 rounded-md p-4 flex flex-col">
              <div className="h-40 bg-gray-300 mb-4 flex items-center justify-center">
                {property.image ? (
                  <img src={property.image} alt={property.title} className="object-cover w-full h-full rounded-md" />
                ) : (
                  <span className="text-gray-600">Image {property.id}</span>
                )}
              </div>
              <p className="text-lg font-semibold text-center mb-2">{property.title}</p>
              <button className="mt-auto bg-green-700 text-white py-2 px-4 rounded hover:bg-green-800 transition-colors">
                LEARN MORE
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Realestate2;

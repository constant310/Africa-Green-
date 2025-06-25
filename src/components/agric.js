import React from 'react';
import Navbar from './Navbar';
import Footer from './footer';
import Realestate1 from './realestate1';
import agricImage from '../assets/images/agric1.jpg'; // <-- import your image here

export default function Agricultural() {
  return (
    <div className="w-full">
      <Navbar />
      <Realestate1 />

      <main className="pt-20">
        {/* Page Header */}
        <header className="bg-white py-12">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold mb-4">Agricultural Estate</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our Agricultural Estate champions sustainable food production—combining fertile land,
              modern irrigation, and value-added processing facilities to empower farmers and agribusinesses
              for long-term growth.
            </p>
          </div>
        </header>

        {/* Content */}
        <section className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12">
          {/* Image */}
          <div className="md:w-1/2">
            <img
              src={agricImage}
              alt="Fertile farmland"
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>

          {/* Details */}
          <div className="md:w-1/2 space-y-6">
            <p className="text-gray-700">From seed to shelf, we provide everything you need to thrive:</p>
            <ul className="space-y-4">
              {[
                'Prime arable plots with proven yield records',
                'Automated drip-irrigation & water-harvesting systems',
                'On-site agro-processing and cold-storage units',
                'Access to agritech extension services and training',
                'Direct links to regional markets and export hubs',
              ].map((feature) => (
                <li key={feature} className="flex items-start">
                  <span className="inline-block bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">
                    ✓
                  </span>
                  <span className="text-gray-800">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import React from 'react';
import Navbar from './Navbar';
import Footer from './footer';
import Realestate1 from './realestate1';
import industEstateImg from '../assets/images/industestate.jpg'; // ✅ Image import

export default function Industrial() {
  return (
    <div className="w-full">
      <Navbar />
      <Realestate1 />

      <main className="pt-20">
        {/* Page Header */}
        <header className="bg-white py-12">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold mb-4">Industrial Estate</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A turnkey park outfitted for manufacturing, logistics and warehousing—designed
              to maximize uptime and operational efficiency.
            </p>
          </div>
        </header>

        {/* Content */}
        <section className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12">
          {/* Image */}
          <div className="md:w-1/2">
            <img
              src={industEstateImg}
              alt="Industrial logistics hub"
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>

          {/* Details */}
          <div className="md:w-1/2 space-y-6">
            <p className="text-gray-700">Engineered for seamless production and distribution:</p>
            <ul className="space-y-4">
              {[
                'High-capacity power substations & backup generators',
                'Direct highway & rail access',
                'Custom-build warehouses and light-manufacturing bays',
                'On-site customs clearance & value-added services',
                'Robust perimeter fencing & CCTV monitoring',
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

import React from 'react';
import Navbar from './Navbar';
import Footer from './footer';
import Realestate1 from './realestate1';
import resEstateImg from '../assets/images/resestate.jpg'; // ✅ import the image correctly

export default function Residential() {
  return (
    <div className="w-full">
      <Navbar />
      <Realestate1 />
      <main className="pt-20">
        {/* Page Header */}
        <header className="bg-white py-12">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl font-bold mb-4">Residential Estate</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Thoughtfully designed neighborhoods with modern homes, green spaces, and community amenities—
              making homeownership affordable, secure, and rewarding.
            </p>
          </div>
        </header>

        {/* Content */}
        <section className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-12">
          {/* Details */}
          <div className="md:w-1/2 md:order-2 space-y-6">
            <p className="text-gray-700">We blend comfort, convenience, and style:</p>
            <ul className="space-y-4">
              {[
                'Contemporary architectural designs & finishes',
                'Gated community with 24/7 security patrols',
                'Parks, playgrounds & walking trails',
                'Community clubhouse & fitness center',
                'Flexible mortgage & payment plans',
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

          {/* Image */}
          <div className="md:w-1/2 md:order-1">
            <img
              src={resEstateImg}
              alt="Modern residential apartments"
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

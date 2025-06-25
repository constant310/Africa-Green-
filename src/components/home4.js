import React from 'react';
import agricultureImg from '../assets/images/agriculture.jpg';
import industryImg from '../assets/images/industry.jpg';
import residentImg from '../assets/images/estate.jpg';

const services = [
  {
    title: 'Real Estate Development and Property Management',
    image: residentImg,
  },
  {
    title: 'Agriculture',
    image: agricultureImg,
  },
  {
    title: 'Agro Allied Production',
    image: industryImg,
  },
];

export default function Home4AndServices() {
  return (
    <>
      {/* Home4 Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-green-900 mb-4">
            What We Stand For
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
            Building prosperous economies in Africa through human capital development, engagement of best potentials,
            corporate partnerships, and moving Africans from collection and consumption to production and contribution.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-green-50 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-700 mb-10 text-lg">Our missions are centered around</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {services.map((service, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-24 h-24 object-cover rounded-full shadow-md mb-4"
                />
                <h3 className="text-lg font-semibold text-green-900 text-center px-2">{service.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

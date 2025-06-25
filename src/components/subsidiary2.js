import React from 'react';
import logo from '../assets/images/transperentlogo.png';

const subsidiaries = [
  { name: 'Maxx & Heights Global Ventures', link: '/subsidiaries/maxx-heights' },
  { name: 'Klass Properties', link: '/subsidiaries/klass-properties' },
  { name: 'Commii Properties', link: '/subsidiaries/commii-properties' },
  { name: 'Hollimark of Natural Resources', link: '/subsidiaries/hollimark-resources' },
  { name: 'Subsidiary Five', link: '/subsidiaries/subsidiary-5' },
  { name: 'Subsidiary Six', link: '/subsidiaries/subsidiary-6' },
  { name: 'Subsidiary Seven', link: '/subsidiaries/subsidiary-7' },
  { name: 'Subsidiary Eight', link: '/subsidiaries/subsidiary-8' },
];

const Subsidiary2 = () => {
  return (
    <section id="subsidiaries" className="py-16 bg-gray-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-semibold text-center mb-6">OUR SUBSIDIARIES</h2>
        <p className="text-center text-gray-700 mb-12 max-w-2xl mx-auto">
          For the purpose of devolution, easy work-spread, professional handling/engagement, networking,
          and marketing, Africa Green Gate Ltd has raised the following eight subsidiary companies.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {subsidiaries.map((s) => (
            <div
              key={s.name}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition duration-300 flex flex-col items-center text-center"
            >
              <img
                src={logo}
                alt={s.name}
                className="h-20 w-20 mb-4 object-contain"
              />
              <h3 className="text-lg font-medium mb-2">{s.name}</h3>
              <p className="text-gray-600 text-sm mb-4">
                Africa Green Gate Ltd is a private investment company committed to identifying and capitalizing
                on early-stage opportunities across key industries.
              </p>
              <a
                href={s.link}
                className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-700 transition"
              >
                Learn More
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Subsidiary2;

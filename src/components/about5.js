import React, { useState } from 'react';

const subsidiaries = [
  {
    name: 'Maxx and Heights Global Ventures',
    desc: 'Specializes in land banking and smart infrastructure investment across Nigeria.',
  },
  {
    name: 'Klass Properties',
    desc: 'Handles premium residential and commercial property developments in urban centers.',
  },
  {
    name: 'Commii Properties',
    desc: 'Focused on affordable housing solutions and community-based real estate projects.',
  },
  {
    name: 'Hollimark of Natural Resources',
    desc: 'Engages in sustainable agriculture, agro-processing, and natural resource investment.',
  },
];

const About5 = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="subsidiaries" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-6">Subsidiaries</h2>
        <p className="text-gray-700 mb-10 text-lg">
          To enhance development, execution, and expansion, Africa Green Gate Ltd has formed the following subsidiaries:
        </p>

        <div className="bg-white rounded-lg shadow-md divide-y">
          {subsidiaries.map((sub, i) => (
            <div key={i} className="text-left">
              <button
                onClick={() => toggle(i)}
                className="w-full flex justify-between items-center py-4 px-6 text-green-800 font-semibold text-lg hover:bg-green-100 transition"
              >
                {sub.name}
                <span className="text-xl">
                  {openIndex === i ? '▲' : '▼'}
                </span>
              </button>

              {openIndex === i && (
                <div className="px-6 pb-4 text-gray-700 text-sm">
                  {sub.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About5;

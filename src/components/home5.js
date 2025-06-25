import React, { useEffect, useState } from 'react';

import excellenceImg from '../assets/images/excellence.png';
import valueImg from '../assets/images/value.png';
import continuousImg from '../assets/images/continuous.png';
import accountabilityImg from '../assets/images/accountability.png';
import integrityImg from '../assets/images/integrity.png';
import innovationImg from '../assets/images/innovation.png';
import disciplineImg from '../assets/images/discipline.png';

const coreValues = [
  { title: 'Excellence', icon: excellenceImg },
  { title: 'Value', icon: valueImg },
  { title: 'Continuous Drive for Growth', icon: continuousImg },
  { title: 'Accountability', icon: accountabilityImg },
  { title: 'Integrity', icon: integrityImg },
  { title: 'Innovation and Improvement', icon: innovationImg },
  { title: 'Discipline', icon: disciplineImg },
];

export default function Homes5() {
  const [showCards, setShowCards] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCards(true);
    }, 2000); // Slide in after 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="core-values" className="py-16 bg-white px-4">
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-green-900">Our Core Values</h2>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
        {coreValues.map((cv, idx) => (
          <div
            key={idx}
            className={`w-36 h-36 sm:w-40 sm:h-40 bg-gray-100 rounded-lg p-4 flex flex-col justify-center items-center shadow-md transition-all duration-1000 ease-out transform ${
              showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <img
              src={cv.icon}
              alt={cv.title}
              className="w-10 h-10 object-contain mb-2"
              loading="lazy"
            />
            <h3 className="text-sm font-semibold text-green-800 text-center">{cv.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

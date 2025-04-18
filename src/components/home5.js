import React, { useState } from 'react';

// List of subsidiary companies
const subsidiaries = [
  'MAXX AND HEIGHTS GLOBAL VENTURES',
  'KLASS PROPERTIES',
  'COMMI PROPERTIES',
  'HOLLMARK OF NATURAL RESOURCES',
  'SOEPIC',
];

const Home5 = () => {
  // State to track which subsidiary descriptions are open
  const [openItems, setOpenItems] = useState(Array(subsidiaries.length).fill(false));

  const toggleItem = (index) => {
    setOpenItems((prev) => {
      const newOpen = [...prev];
      newOpen[index] = !newOpen[index];
      return newOpen;
    });
  };

  return (
    <section className="max-w-4xl mx-auto p-6">
      {/* Main Title */}
      <h2 className="text-4xl font-bold mb-4 text-center">AFFILIATES</h2>
      {/* Description */}
      <p className="text-gray-700 mb-6 text-center">
        Africa Green Gate Ltd has established a structured marketing system through the affiliation with renowned marketing companies now known as affiliates or subsidiaries of the Company.
      </p>

      {/* Card Container */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Subtitle Bar */}
        <div className="bg-gray-200 px-6 py-3">
          <h3 className="text-xl font-semibold uppercase">SUBSIDIARIES</h3>
        </div>

        {/* List of Subsidiaries */}
        <ul className="divide-y divide-gray-300">
          {subsidiaries.map((company, index) => (
            <li key={company} className="px-6 py-4">
              <button
                className="w-full flex justify-between items-center font-medium uppercase text-left"
                onClick={() => toggleItem(index)}
              >
                <span>{company}</span>
                <svg
                  className={`w-5 h-5 transform transition-transform ${openItems[index] ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {openItems[index] && (
                <p className="mt-3 text-gray-700">
                  Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Home5;
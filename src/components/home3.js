import React from 'react';

const WhatWeDo = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      {/* Page Heading (Optional) */}
      {/* Uncomment if you want a main heading at the top */}
      {/* <h2 className="text-3xl font-bold mb-8 text-center">WHAT WE DO</h2> */}

      {/* 2-column layout for each item */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1) LAND ACQUISITION AND SALES */}
        <div>
          <h3 className="text-2xl font-bold mb-2">LAND ACQUISITION AND SALES</h3>
          <p className="text-gray-700 mb-4">
            Africa Green Gate Ltd is a private investment company committed to the early 
            identification and capitalization of investment opportunities within core industries 
            and sectors for social and economic advancement.
          </p>
        </div>
        <div className="bg-gray-200 h-32 w-full" />
        
        {/* 2) PROPERTY DEVELOPMENT */}
        <div>
          <h3 className="text-2xl font-bold mb-2">PROPERTY DEVELOPMENT</h3>
          <p className="text-gray-700 mb-4">
            Africa Green Gate Ltd is a private investment company committed to the early 
            identification and capitalization of investment opportunities within core industries 
            and sectors for social and economic advancement.
          </p>
        </div>
        <div className="bg-gray-200 h-32 w-full" />

        {/* 3) SMART CITY */}
        <div>
          <h3 className="text-2xl font-bold mb-2">SMART CITY</h3>
          <p className="text-gray-700 mb-4">
            Africa Green Gate Ltd is a private investment company committed to the early 
            identification and capitalization of investment opportunities within core industries 
            and sectors for social and economic advancement.
          </p>
        </div>
        <div className="bg-gray-200 h-32 w-full" />

        {/* 4) AGRICULTURE */}
        <div>
          <h3 className="text-2xl font-bold mb-2">AGRICULTURE</h3>
          <p className="text-gray-700 mb-4">
            Africa Green Gate Ltd is a private investment company committed to the early 
            identification and capitalization of investment opportunities within core industries 
            and sectors for social and economic advancement.
          </p>
        </div>
        <div className="bg-gray-200 h-32 w-full" />
      </div>
    </section>
  );
};

export default WhatWeDo;

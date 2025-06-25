import React from 'react';

const OfferCard = () => (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 border mb-6 bg-gray-50 rounded-lg shadow-sm">
        <div className="md:w-2/3 mb-4 md:mb-0">
            <h3 className="text-md font-semibold uppercase mb-2">Community of Experts</h3>
            <p className="text-sm text-gray-700">
                Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.
            </p>
            <button className="mt-4 bg-green-900 text-white px-4 py-1 rounded hover:bg-green-800 transition">
                Learn More
            </button>
        </div>
        <div className="md:w-1/3 bg-gray-300 h-40 w-full md:h-32 md:ml-6 rounded-lg"></div>
    </div>
);

const WhatWeOffer = () => {
    return (
        <section className="px-4 md:px-20 py-10">
            <h2 className="text-xl font-semibold uppercase mb-8">What We Offer</h2>
            <OfferCard />
            <OfferCard />
            <OfferCard />
        </section>
    );
};

export default WhatWeOffer;

import React from 'react';

const Home2 = () => {
  return (
    <div 
      className="min-h-screen flex flex-col justify-center items-center px-4"
      style={{ backgroundColor: '#F6F6E7' }}
    >
      <div className="text-center text-green-900 max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">Who We Are?</h1>
        <p className="text-xl mb-4">
          Africa Green Gate is a private investment company committed to the early identification and capitalization of investment opportunities in core sectors that drive social and economic advancement.
        </p>
        <p className="text-xl mb-8">
          We specialize in innovative solutions across agriculture, real estate, and industry, ensuring sustainable growth and progress for communities around the world.
        </p>
        <a 
          href="about"
          className="inline-block px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded transition duration-300"
        >
          Read More
        </a>
      </div>
    </div>
  );
};

export default Home2;

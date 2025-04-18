import React from 'react';
import backgroundImage from '../assets/images/background.jpg'; // Replace with your background image

const Home2 = () => {
  return (
    <div 
     className="min-h-screen bg-cover bg-center flex flex-col justify-center items-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="text-center text-white max-w-2xl px-4">
        <h1 className="text-4xl font-bold mb-6">Who We Are?</h1>
        <p className="text-xl mb-4">
          Africa Green Gate is a private investment company committed to the early identification and capitalization of investment opportunities in core sectors that drive social and economic advancement.
        </p>
        <p className="text-xl mb-8">
          We specialize in innovative solutions across agriculture, real estate, and industry, ensuring sustainable growth and progress for communities around the world.
        </p>
        <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded">
          Read More
        </button>
      </div>
    </div>
  );
};

export default Home2;

import React from 'react';
import backgroundImage from '../assets/images/background.jpg';

const Home1 = () => {
    return (
        <div 
            className="min-h-screen bg-cover bg-center flex flex-col justify-center items-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
        >
            <div className="bg-black bg-opacity-50 p-10 text-center">
                <h1 className="text-4xl font-light mb-4">Welcome to</h1>
                <h2 className="text-5xl font-bold mb-4">Africa Green Gate</h2>
                <h3 className="text-3xl font-medium mb-8">Your gate to the world</h3>
                <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded">
                    Get Started
                </button>
            </div>
        </div>
    );
};

export default Home1;

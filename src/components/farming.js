import React from 'react';
import Farming1 from './farming1';
import Farming2 from './farming2';
import Farming3 from './farming3';
import Footer from './footer';
import Navbar from './Navbar';


const Farming = () => {
    return (
        <div className="w-full">
           <Navbar />
            <Farming1 />
            <Farming2 />
            <Farming3 />
            <Footer />
        </div>
    );
};

export default Farming;

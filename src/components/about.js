import React from 'react';
import About1 from './about1';
import About2 from './about2';
import About3 from './about3';
import About4 from './about4';
import About5 from './about5';
import Footer from './footer';
import Navbar from './Navbar';


const AboutPage = () => {
    return (
        <div>
           <Navbar />
            <About1 />
            <About2 />
            <About3 />
            <About4 />
            <About5 />
            <Footer />
        </div>
    );
};

export default AboutPage;

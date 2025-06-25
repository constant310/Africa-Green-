import React from 'react';

import agricImg from '../assets/images/agric.jpg';
import smartImg from '../assets/images/smart.jpg';
import developmentImg from '../assets/images/development.jpg';
import acquisitionImg from '../assets/images/acquisition.jpg';

const services = [
  {
    title: 'Land Acquisition & Sales',
    text: 'Africa Green Gate Ltd is committed to the early identification and capitalization of land acquisition and sales opportunities within core industries and sectors for social and economic advancement.',
    img: acquisitionImg,
  },
  {
    title: 'Property Development',
    text: 'We specialize in property development projects that drive growth, enhance communities, and create lasting value.',
    img: developmentImg,
  },
  {
    title: 'Smart City',
    text: 'Designing and implementing smart city initiatives that leverage technology for efficient urban living.',
    img: smartImg,
  },
  {
    title: 'Agriculture',
    text: 'Investing in agricultural ventures to promote food security and sustainable farming practices.',
    img: agricImg,
  },
];

const About4 = () => {
  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-green-900 mb-12">What We Do</h2>
        <div className="space-y-16">
          {services.map((s, i) => (
            <div
              key={i}
              className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="md:w-1/2">
                <img
                  src={s.img}
                  alt={s.title}
                  className="rounded-lg w-full h-auto object-cover shadow-md"
                />
              </div>
              <div className="md:w-1/2">
                <h3 className="text-2xl font-semibold text-green-800 mb-4">{s.title}</h3>
                <p className="text-gray-700 text-lg leading-relaxed">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About4;

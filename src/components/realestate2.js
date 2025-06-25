import React from 'react';
import farmlandImg from '../assets/images/farmland.jpg';
import residentialImg from '../assets/images/res.jpg'; // You confirmed this as correct
import industrialImg from '../assets/images/industrial.jpg';
import mapImg from '../assets/images/acres.webp'; // For the image on the side of the title section

const estates = [
  {
    key: 'agricultural',
    title: 'Agricultural Estate',
    img: farmlandImg,
    desc: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
    link: '/real-estate/estates/agricultural',
    reverse: false,
  },
  {
    key: 'residential',
    title: 'Residential Estate',
    img: residentialImg,
    desc: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
    link: '/real-estate/estates/residential',
    reverse: true,
  },
  {
    key: 'industrial',
    title: 'Industrial Estate',
    img: industrialImg,
    desc: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
    link: '/real-estate/estates/industrial',
    reverse: false,
  },
];

const Realestate2 = () => (
  <section id="dominion-estates" className="py-16 bg-white">
    {/* Header Section with Image Side-by-Side */}
    <div className="container mx-auto px-6 mb-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      {/* Left Side: Text */}
      <div className="text-left">
        <h2 className="text-3xl font-semibold mb-4">DOMINION ESTATES</h2>
        <p className="text-gray-700 leading-relaxed max-w-xl">
          To solve the housing deficit problem in Africa and to make real estate investment flexible,
          affordable, and highly profitable. Our desire in this regard is to build estates and smart cities
          with good infrastructure and modern technologies that can enhance best living standards. We hope
          to achieve this through corporate partnerships, engagement of highly skilled and well-motivated
          professionals, innovative strategies, and modern technologies.
        </p>
      </div>

      {/* Right Side: Map Image */}
      <div className="flex justify-center">
        <img
          src={mapImg}
          alt="Dominion Map"
          className="w-full max-w-sm h-auto rounded-lg shadow-md object-cover"
        />
      </div>
    </div>

    {/* Estates Section */}
    {estates.map((e) => (
      <div
        key={e.key}
        className={`container mx-auto px-6 flex flex-col md:flex-row items-center mb-16 ${
          e.reverse ? 'md:flex-row-reverse' : ''
        }`}
      >
        {/* Image Section */}
        <div className="md:w-1/2 mb-8 md:mb-0">
          <img
            src={e.img}
            alt={e.title}
            className="w-full h-auto rounded-lg shadow-lg object-cover"
          />
        </div>

        {/* Text Section */}
        <div className="md:w-1/2 md:px-12 text-center md:text-left">
          <h3 className="text-2xl font-semibold mb-4">{e.title}</h3>
          <p className="text-gray-700 mb-6">{e.desc}</p>
          <a
            href={e.link}
            className="inline-block bg-green-800 hover:bg-green-700 text-white font-medium py-3 px-6 rounded transition"
          >
            Learn More
          </a>
        </div>
      </div>
    ))}
  </section>
);

export default Realestate2;

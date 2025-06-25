import React from 'react';

const testimonials = [
  {
    name: 'Elliot',
    text: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.'
  },
  {
    name: 'Sophia',
    text: 'Working with Africa Green Gate has transformed our approach to real estate development, offering unparalleled insights and support.'
  },
  {
    name: 'Michael',
    text: 'Their commitment to sustainable projects and community development is truly inspiring.'
  }
];

const About3 = () => {
  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-10">Testimonials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <p className="text-gray-700 italic mb-4">"{t.text}"</p>
              <h3 className="text-lg font-semibold text-green-800">– {t.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About3;

import React from 'react';

const testimonials = [
  {
    name: 'ELLIOT',
    text: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
  },
  {
    name: 'ELLIOT',
    text: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
  },
  {
    name: 'ELLIOT',
    text: 'Africa Green Gate Ltd is a private investment company committed to the early identification and capitalization of investment opportunities within core industries and sectors for social and economic advancement.',
  },
];

const TestimonialsSection = () => (
  <section className="bg-gray-50 py-16 px-4">
    <h2 className="text-3xl font-bold text-center mb-12">TESTIMONIALS</h2>
    <div className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-1 md:grid-cols-3">
      {testimonials.map((t, idx) => (
        <div key={idx} className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold mb-4">{t.name}</h3>
          <p className="text-gray-700">{t.text}</p>
        </div>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;

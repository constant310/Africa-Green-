import React from 'react';
import Logo from '../assets/images/transperentlogo.png'; // adjust path to your logo

const Footer = () => (
  <footer className="bg-green-900 text-gray-200 py-12 px-6">
    {/* Main grid: Contact on left, Subscribe + Links on right */}
    <div className="max-w-7xl mx-auto grid gap-8 grid-cols-1 md:grid-cols-2">
      {/* Left column: Contact info */}
      <div>
        <div className="flex items-center mb-6">
          <img src={Logo} alt="Africa Green Gate" className="h-12 w-12 mr-3" />
          <span className="text-white text-xl font-semibold">AFRICA GREEN GATE</span>
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-semibold">EMAIL ADDRESS:</p>
            <p>info@africagreengate.com</p>
          </div>
          <div>
            <p className="font-semibold">PHONE NUMBER:</p>
            <p>07037984757</p>
          </div>
          <div>
            <p>Connect with us on Social Media</p>
            {/* add your social icons here */}
          </div>
        </div>
      </div>

      {/* Right column: Subscribe form + Links */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">STAY UPDATED</h3>
        {/* Updated Subscribe Form */}
        <form className="flex flex-col sm:flex-row max-w-md w-full">
          <input
            type="email"
            placeholder="YOUR EMAIL"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-t-md sm:rounded-l-md sm:rounded-t-none text-gray-800"
          />
          <button
            type="submit"
            className="bg-gray-200 text-green-900 px-6 py-2 border border-gray-300 sm:border-l-0 rounded-b-md sm:rounded-r-md sm:rounded-bl-none font-semibold mt-2 sm:mt-0"
          >
            SUBSCRIBE
          </button>
        </form>

        {/* Links moved under the subscribe box */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">PRIVATE LINK</li>
            <li className="hover:underline cursor-pointer">INQUIRY AND SUPPORT</li>
            <li className="hover:underline cursor-pointer">FAQ’s</li>
          </ul>
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">BUSINESS SCHOOL</li>
            <li className="hover:underline cursor-pointer">POPULAR SEARCH</li>
            <li className="hover:underline cursor-pointer">QUICK LINK</li>
          </ul>
        </div>
        <div className="max-w-7xl mx-auto text-sm text-right mt-4">
          Office address: 75 Effurun / Sapele Road, Beside Water Board Tower, Effurun, Delta State
        </div>
      </div>
    </div>

    {/* Bottom: Address & Copyright */}
    <div className="mt-8 border-t border-green-800 pt-4">
      <div className="mt-4 text-center text-sm text-gray-400">
        © Africa Green Gate Ltd – All rights reserved
      </div>
    </div>
  </footer>
);

export default Footer;

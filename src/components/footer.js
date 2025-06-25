import React from 'react';
import Logo from '../assets/images/transperentlogo.png';
import {
  Mail,
  Phone,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
} from 'lucide-react';

const Footer = () => (
  <footer className="bg-green-900 text-gray-200 py-12 px-6">
    <div className="max-w-7xl mx-auto grid gap-10 grid-cols-1 md:grid-cols-2">
      {/* Left Column */}
      <div>
        <div className="flex items-center mb-6">
          <img src={Logo} alt="Africa Green Gate" className="h-12 w-12 mr-3" />
          <span className="text-white text-xl font-semibold">AFRICA GREEN GATE</span>
        </div>

        <div className="space-y-4 text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <Mail size={18} />
            <div>
              <p className="font-semibold">EMAIL ADDRESS:</p>
              <p>info@africagreengate.com</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone size={18} />
            <div>
              <p className="font-semibold">PHONE NUMBER:</p>
              <p>07037984757</p>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Connect with us on Social Media</p>
            <div className="flex gap-4 mt-2 text-gray-200">
              <a href="#" className="hover:text-yellow-400"><Instagram /></a>
              <a href="#" className="hover:text-yellow-400"><Facebook /></a>
              <a href="#" className="hover:text-yellow-400"><Youtube /></a>
              <a href="#" className="hover:text-yellow-400"><MessageCircle /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div>
        <h3 className="text-white text-lg font-semibold mb-4">STAY UPDATED</h3>
        <form className="flex flex-col sm:flex-row max-w-md w-full">
          <input
            type="email"
            placeholder="Your Email"
            className="flex-1 px-4 py-3 rounded-md text-gray-900 mb-3 sm:mb-0 sm:rounded-r-none focus:outline-none"
          />
          <button
            type="submit"
            className="bg-yellow-400 text-green-900 px-6 py-3 font-semibold rounded-md sm:rounded-l-none hover:bg-yellow-500 transition"
          >
            Subscribe
          </button>
        </form>

        <div className="mt-8 grid grid-cols-2 gap-4 text-sm sm:text-base">
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">Private Link</li>
            <li className="hover:underline cursor-pointer">Inquiry & Support</li>
            <li className="hover:underline cursor-pointer">FAQ’s</li>
          </ul>
          <ul className="space-y-2">
            <li className="hover:underline cursor-pointer">Business School</li>
            <li className="hover:underline cursor-pointer">Popular Search</li>
            <li className="hover:underline cursor-pointer">Quick Link</li>
          </ul>
        </div>

        <div className="mt-6 text-sm text-gray-300">
          Office address: 75 Effurun / Sapele Road, Beside Water Board Tower, Effurun, Delta State
        </div>
      </div>
    </div>

    {/* Bottom Footer */}
    <div className="mt-12 border-t border-green-800 pt-4 text-center text-sm text-gray-400">
      © {new Date().getFullYear()} Africa Green Gate Ltd – All rights reserved
    </div>
  </footer>
);

export default Footer;

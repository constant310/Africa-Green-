
import React from "react";

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Home from "./components/home";
import About from "./components/about";
import Subsidiary from "./components/subsidiary";
import Realestate from "./components/realestate";
import Constructions from "./components/constructions";
import Farming from "./components/farming";
import Agricultural from "./components/agric";
import Residential from "./components/res";
import Industrial from "./components/industrial";
import AuthFlow from "./components/webapp";
import Login from "./components/login";
function App() {
  return (
    <div>
      <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/subsidiary" element={<Subsidiary />} />
        <Route path="/about" element={<About />} />
        <Route path="real-estate/estates" element={<Realestate />} />
        <Route path="real-estate/smart-city" element={<Constructions />} />
        <Route path="agriculture/farming" element={<Farming />} />
        <Route path="real-estate/estates/agricultural" element={<Agricultural />} />
        <Route path="real-estate/estates/residential" element={<Residential />} />
        <Route path="real-estate/estates/industrial" element={<Industrial />} />
        <Route path="/app" element={<AuthFlow />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      </Router>
    </div>
  );
}

export default App;

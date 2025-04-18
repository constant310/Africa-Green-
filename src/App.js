
import React from "react";

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Home from "./components/home";
import Subsidiary from "./components/subsidiary";
import Realestate from "./components/realestate";
import Constructions from "./components/constructions";

function App() {
  return (
    <div>
      <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/subsidiary" element={<Subsidiary />} />
        <Route path="/realestate" element={<Realestate />} />
        <Route path="/smartcity" element={<Constructions />} />
      </Routes>
      </Router>
    </div>
  );
}

export default App;

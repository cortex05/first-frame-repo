import React, { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import { Stage, Layer, Rect, Circle, Text, Transformer, Group } from 'react-konva';

import { initialStudentGeneration } from './utilities/studentUtilities';
import Home from './screens/home/HomeScreen';
import Start from './screens/start/StartScreen';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/start" element={<Start />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App

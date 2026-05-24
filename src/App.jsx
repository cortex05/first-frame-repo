import React, { useState, useRef, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import './App.css'
import { Stage, Layer, Rect, Circle, Text, Transformer, Group } from 'react-konva';

import { initialStudentGeneration } from './utilities/studentUtilities';
import useCaseStore from './store/useCaseStore';

import Home from './screens/home/HomeScreen';
import Start from './screens/start/StartScreen';
import CreateCaseScreen from './screens/create-case/CreateCaseScreen';
import CaseScreen from './screens/case/CaseScreen';
import QuestionsScreen from './screens/questions/QuestionsScreen';

function App() {
	const getAllCases = useCaseStore((state) => state.getAllCases);
	useEffect(() => {
		const storedCases = localStorage.getItem('cases') || [];
		getAllCases(JSON.parse(storedCases));
	}, []);

  	return (
    	<BrowserRouter>
      		<Routes>
        		<Route path="/" element={<Navigate to="/home" />} />
        		<Route path="/home" element={<Home />} />
        		<Route path="/start" element={<Start />} />
        		<Route path="/create-case" element={<CreateCaseScreen />} />
        		<Route path="/case/:id" element={<CaseScreen />} />
        		<Route path="/questions/:caseId" element={<QuestionsScreen />} />
      		</Routes>
    	</BrowserRouter>
  	);
}

export default App

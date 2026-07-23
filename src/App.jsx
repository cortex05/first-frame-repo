import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import './App.css'

import useCaseStore from './store/useCaseStore';
import useAuthStore from './store/useAuthStore';

import Home from './screens/home/HomeScreen';
import Start from './screens/start/StartScreen';
import CreateCaseScreen from './screens/create-case/CreateCaseScreen';
import CaseScreen from './screens/case/CaseScreen';
import QuestionsScreen from './screens/questions/QuestionsScreen';
import LoginScreen from './screens/auth/login/LoginScreen';
import RegisterScreen from './screens/auth/register/RegisterScreen';

const ProtectedRoutes = ({ isAuthenticated }) => {
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
};

const PublicOnlyRoutes = ({ isAuthenticated }) => {
	if (isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	return <Outlet />;
};

function App() {
	const getAllCases = useCaseStore((state) => state.getAllCases);
	const userInfo = useAuthStore((state) => state.userInfo);

	const isAuthenticated = Boolean(userInfo?.token && userInfo?.userId && userInfo?.username);

	useEffect(() => {
		const storedCases = localStorage.getItem('cases') || [];
		if(storedCases.length > 0) {
			getAllCases(JSON.parse(storedCases));
		} else {
			localStorage.setItem('cases', JSON.stringify([]));
			getAllCases([]);
		}
	}, []);

  	return (
    	<BrowserRouter>
      		<Routes>
				<Route
					path="/"
					element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
				/>

				<Route element={<PublicOnlyRoutes isAuthenticated={isAuthenticated} />}>
					<Route path="/login" element={<LoginScreen />} />
					<Route path="/register" element={<RegisterScreen />} />
				</Route>

				<Route element={<ProtectedRoutes isAuthenticated={isAuthenticated} />}>
					<Route path="/home" element={<Home />} />
					<Route path="/start/:caseId" element={<Start />} />
					<Route path="/create-case" element={<CreateCaseScreen />} />
					<Route path="/case/:id" element={<CaseScreen />} />
					<Route path="/questions/:caseId" element={<QuestionsScreen />} />
				</Route>
      		</Routes>
    	</BrowserRouter>
  	);
}

export default App
